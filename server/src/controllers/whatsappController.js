const {
  verifyMetaSignature,
  processIncomingWebhookPayload,
  processIncomingMessage,
  parseCaption,
} = require('../services/whatsappService');
const { WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_MOCK } = require('../config/env');
const WhatsappMessage = require('../models/WhatsappMessage');
const WhatsappWhitelist = require('../models/WhatsappWhitelist');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');
const { logAudit } = require('../utils/auditLogger');
const { invalidateCatalogCache } = require('../middleware/cache');

// ==========================================
// 1. PUBLIC META WEBHOOK HANDSHAKE & INGESTION
// ==========================================

/**
 * GET /api/whatsapp/webhook
 * Meta Webhook verification handshake
 */
const verifyWebhook = async (req, res) => {
  const mode = req.query['hub.mode'] || req.query.hub?.mode || req.query.mode;
  const token =
    req.query['hub.verify_token'] || req.query.hub?.verify_token || req.query.verify_token;
  const challenge =
    req.query['hub.challenge'] || req.query.hub?.challenge || req.query.challenge;

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Handshake verified successfully with Meta.');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook] Verification token mismatch or invalid mode.');
  return res.status(403).send('Forbidden: Token mismatch');
};

/**
 * POST /api/whatsapp/webhook
 * Meta Webhook message delivery. Fast 200 response & async processing.
 */
const handleWebhook = async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];

  // Signature verification when secret is present or signature header sent
  if (signature) {
    const isValid = verifyMetaSignature(req.rawBody, signature, WHATSAPP_APP_SECRET);
    if (!isValid) {
      console.warn('[WhatsApp Webhook] Invalid X-Hub-Signature-256 detected.');
      return sendError(res, 'Invalid request signature', null, 401);
    }
  }

  // Fast acknowledgment as required by Meta webhook SLA
  res.status(200).send('EVENT_RECEIVED');

  // Asynchronous message processing in background
  setImmediate(async () => {
    try {
      await processIncomingWebhookPayload(req.body);
    } catch (err) {
      console.error('[WhatsApp Webhook Async Processing Error]:', err);
    }
  });
};

/**
 * POST /api/whatsapp/mock
 * Simulator endpoint for local testing without live Meta developer credentials
 */
const mockWebhook = async (req, res) => {
  if (!WHATSAPP_MOCK && process.env.NODE_ENV !== 'test') {
    return sendError(res, 'Mock mode is not enabled on this environment', null, 403);
  }

  const {
    from = '919876543210',
    senderName = 'Rohan Sharma (Mock Fabricator)',
    caption = 'Shower Hinge 90 | SH-90-CP | Shower Hinges | CP | 1250 | 50 | Heavy brass 90 deg glass hinge',
    image = 'sample_hardware.jpg',
    messageType = 'image',
  } = req.body;

  const mockMessageId = `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Synthesize standard Meta payload
  const mockPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_MOCK_ACCOUNT',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919876543210',
                phone_number_id: '100609346426457',
              },
              contacts: [
                {
                  profile: { name: senderName },
                  wa_id: from,
                },
              ],
              messages: [
                {
                  from,
                  id: mockMessageId,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: messageType,
                  image:
                    messageType === 'image'
                      ? {
                          caption,
                          mime_type: 'image/jpeg',
                          sha256: 'mock-sha256',
                          id: image || `media-mock-${Date.now()}`,
                        }
                      : undefined,
                  text: messageType === 'text' ? { body: caption } : undefined,
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const results = await processIncomingWebhookPayload(mockPayload);
  const firstResult = Array.isArray(results) ? results[0] : null;

  let feedbackMessage = 'Mock WhatsApp message processed successfully';
  if (firstResult?.status === 'DRAFT_CREATED') {
    feedbackMessage = `Draft product created: ${firstResult.product?.name || 'New Hardware Item'} (${firstResult.product?.code || ''})`;
  } else if (firstResult?.status === 'IGNORED') {
    feedbackMessage = `Mock message ignored: Number +${from} is not in WhatsApp Whitelist. Add it to whitelist first.`;
  } else if (firstResult?.status === 'FAILED') {
    feedbackMessage = `Mock message failed: ${firstResult.message?.error || 'Validation error in caption format'}`;
  }

  return sendSuccess(res, feedbackMessage, {
    messageId: mockMessageId,
    results,
  });
};

// ==========================================
// 2. ADMIN WHATSAPP INBOX MANAGEMENT
// ==========================================

/**
 * GET /api/admin/whatsapp/messages
 * List incoming messages with status filter, search, and pagination
 */
const getInboxMessages = async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const query = {};

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { senderMobile: searchRegex },
      { senderName: searchRegex },
      { caption: searchRegex },
      { 'parsedFields.name': searchRegex },
      { 'parsedFields.code': searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [messages, total] = await Promise.all([
    WhatsappMessage.find(query)
      .populate('product', 'name code basePrice status images slug isPublished')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    WhatsappMessage.countDocuments(query),
  ]);

  return sendSuccess(res, 'WhatsApp inbox messages retrieved successfully', {
    messages,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    },
  });
};

/**
 * POST /api/admin/whatsapp/messages/:id/publish
 * Publish a draft created via WhatsApp to the public store
 */
const publishDraft = async (req, res) => {
  const { id } = req.params;

  const message = await WhatsappMessage.findById(id).populate('product');
  if (!message) {
    return sendError(res, 'WhatsApp message not found', null, 404);
  }

  if (!message.product) {
    return sendError(res, 'No linked product draft found for this message', null, 400);
  }

  const product = await Product.findById(message.product._id);
  if (!product) {
    return sendError(res, 'Linked product record not found', null, 404);
  }

  // Update product to published
  product.status = 'PUBLISHED';
  product.isPublished = true;
  await product.save();

  // Update message status
  message.status = 'PUBLISHED';
  await message.save();

  await logAudit({
    user: req.user,
    action: 'PUBLISH',
    entity: 'WHATSAPP_DRAFT',
    entityId: message._id,
    details: {
      productId: product._id,
      productName: product.name,
      productCode: product.code,
    },
    req,
  });

  invalidateCatalogCache();

  return sendSuccess(res, `Product "${product.name}" published to store successfully`, {
    message,
    product,
  });
};

/**
 * POST /api/admin/whatsapp/messages/:id/reject
 * Reject a draft created via WhatsApp
 */
const rejectDraft = async (req, res) => {
  const { id } = req.params;
  const { reason = 'Rejected by administrator' } = req.body;

  const message = await WhatsappMessage.findById(id).populate('product');
  if (!message) {
    return sendError(res, 'WhatsApp message not found', null, 404);
  }

  if (message.product) {
    await Product.findByIdAndUpdate(message.product._id, {
      status: 'ARCHIVED',
      isPublished: false,
    });
  }

  message.status = 'REJECTED';
  message.error = reason;
  await message.save();

  invalidateCatalogCache();

  await logAudit({
    user: req.user,
    action: 'REJECT',
    entity: 'WHATSAPP_DRAFT',
    entityId: message._id,
    details: {
      productId: message.product?._id,
      reason,
    },
    req,
  });

  return sendSuccess(res, 'WhatsApp draft rejected', { message });
};

/**
 * POST /api/admin/whatsapp/messages/:id/retry
 * Retry a failed incoming message
 */
const retryMessage = async (req, res) => {
  const { id } = req.params;

  const message = await WhatsappMessage.findById(id);
  if (!message) {
    return sendError(res, 'WhatsApp message not found', null, 404);
  }

  // If already published or draft created, cannot retry
  if (message.status === 'PUBLISHED' || message.status === 'DRAFT_CREATED') {
    return sendError(res, `Message already has status: ${message.status}`, null, 400);
  }

  // Re-run caption parsing if caption exists
  if (message.caption) {
    const parseResult = parseCaption(message.caption);
    if (!parseResult.success) {
      return sendError(res, `Caption still invalid: ${parseResult.error}`, null, 400);
    }

    // Process fresh payload
    const synthesizedMsg = {
      from: message.senderMobile,
      id: `retry_${Date.now()}_${message.messageId || 'msg'}`,
      type: 'image',
      image: {
        caption: message.caption,
        mime_type: 'image/jpeg',
        id: message.mediaId || `media_${Date.now()}`,
      },
    };

    const processRes = await processIncomingMessage(synthesizedMsg, {
      profile: { name: message.senderName },
    });

    if (processRes.status === 'DRAFT_CREATED') {
      message.status = 'DRAFT_CREATED';
      message.product = processRes.product._id;
      message.parsedFields = processRes.message.parsedFields;
      message.mediaUrl = processRes.message.mediaUrl;
      message.error = '';
      await message.save();
    }

    await logAudit({
      user: req.user,
      action: 'RETRY',
      entity: 'WHATSAPP_MESSAGE',
      entityId: message._id,
      details: { retryStatus: processRes.status },
      req,
    });

    return sendSuccess(res, 'Message re-processed successfully', { message, processRes });
  }

  return sendError(res, 'Message contains no caption to parse and retry', null, 400);
};

// ==========================================
// 3. ADMIN WHITELIST MANAGEMENT
// ==========================================

/**
 * GET /api/admin/whatsapp/whitelist
 * Retrieve list of all whitelisted numbers
 */
const getWhitelist = async (req, res) => {
  const whitelist = await WhatsappWhitelist.find().sort({ createdAt: -1 });
  return sendSuccess(res, 'WhatsApp whitelist retrieved', { whitelist });
};

/**
 * POST /api/admin/whatsapp/whitelist
 * Add a new phone number to the whitelist
 */
const addWhitelistNumber = async (req, res) => {
  const { mobile, name, label = 'Fabricator', businessName = '' } = req.body;

  if (!mobile || !name) {
    return sendError(res, 'Mobile number and Contact Name are required', null, 400);
  }

  const cleanMobile = mobile.replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    return sendError(res, 'Please provide a valid 10+ digit mobile number', null, 400);
  }

  const existing = await WhatsappWhitelist.findOne({ mobile: cleanMobile });
  if (existing) {
    return sendError(res, `Mobile number ${cleanMobile} is already in the whitelist`, null, 400);
  }

  const newEntry = await WhatsappWhitelist.create({
    mobile: cleanMobile,
    name: name.trim(),
    label: label.trim(),
    businessName: businessName.trim(),
    approvedBy: req.user?._id || null,
    isActive: true,
  });

  await logAudit({
    user: req.user,
    action: 'CREATE',
    entity: 'WHATSAPP_WHITELIST',
    entityId: newEntry._id,
    details: { mobile: cleanMobile, name, label },
    req,
  });

  return sendSuccess(res, `${cleanMobile} added to whitelist successfully`, { entry: newEntry }, 201);
};

/**
 * PATCH /api/admin/whatsapp/whitelist/:id/toggle
 * Toggle active status of a whitelisted number
 */
const toggleWhitelistNumber = async (req, res) => {
  const { id } = req.params;

  const entry = await WhatsappWhitelist.findById(id);
  if (!entry) {
    return sendError(res, 'Whitelist entry not found', null, 404);
  }

  entry.isActive = !entry.isActive;
  await entry.save();

  await logAudit({
    user: req.user,
    action: 'UPDATE',
    entity: 'WHATSAPP_WHITELIST',
    entityId: entry._id,
    details: { mobile: entry.mobile, isActive: entry.isActive },
    req,
  });

  return sendSuccess(res, `Whitelist status for ${entry.mobile} updated to ${entry.isActive ? 'ACTIVE' : 'PAUSED'}`, {
    entry,
  });
};

/**
 * DELETE /api/admin/whatsapp/whitelist/:id
 * Remove a number from the whitelist
 */
const deleteWhitelistNumber = async (req, res) => {
  const { id } = req.params;

  const entry = await WhatsappWhitelist.findByIdAndDelete(id);
  if (!entry) {
    return sendError(res, 'Whitelist entry not found', null, 404);
  }

  await logAudit({
    user: req.user,
    action: 'DELETE',
    entity: 'WHATSAPP_WHITELIST',
    entityId: id,
    details: { mobile: entry.mobile, name: entry.name },
    req,
  });

  return sendSuccess(res, `Contact ${entry.name} (${entry.mobile}) removed from whitelist`, {
    entry,
  });
};

module.exports = {
  verifyWebhook,
  handleWebhook,
  mockWebhook,
  getInboxMessages,
  publishDraft,
  rejectDraft,
  retryMessage,
  getWhitelist,
  addWhitelistNumber,
  toggleWhitelistNumber,
  deleteWhitelistNumber,
};
