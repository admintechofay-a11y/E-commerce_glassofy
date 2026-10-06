const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const slugify = (text, options = {}) => {
  let str = String(text || '').trim();
  if (options.lower !== false) {
    str = str.toLowerCase();
  }
  str = str.replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
  return str;
};

const {
  WHATSAPP_APP_SECRET,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_MOCK,
  CLIENT_URL,
} = require('../config/env');
const WhatsappMessage = require('../models/WhatsappMessage');
const WhatsappWhitelist = require('../models/WhatsappWhitelist');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { sendAdminWhatsAppDraftNotification } = require('./emailService');

// Storage directory for WhatsApp media assets
const WHATSAPP_UPLOAD_DIR = path.join(__dirname, '../../public/images/whatsapp');
const PUBLIC_IMAGES_DIR = path.join(__dirname, '../../public/images');

// Ensure directory exists
if (!fs.existsSync(WHATSAPP_UPLOAD_DIR)) {
  fs.mkdirSync(WHATSAPP_UPLOAD_DIR, { recursive: true });
}

/**
 * 1. Verify Meta X-Hub-Signature-256 header using raw body bytes and App Secret
 */
const verifyMetaSignature = (rawBody, signatureHeader, secret = WHATSAPP_APP_SECRET) => {
  if (!signatureHeader || !secret) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const signatureHash = parts[1];
  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8');

  const expectedHash = crypto.createHmac('sha256', secret).update(bodyBuffer).digest('hex');

  const sigBuf = Buffer.from(signatureHash, 'utf8');
  const expBuf = Buffer.from(expectedHash, 'utf8');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
};

/**
 * 2. Zod Caption Schema & Tolerant Pipe-Delimited Parser
 * Format: Name | Code | Category | Finish | Price | Stock | Description
 */
const captionZodSchema = z.object({
  name: z.string().min(2, 'Product name must have at least 2 characters'),
  code: z.string().optional().default(''),
  category: z.string().optional().default('Architectural Hardware'),
  finish: z.string().optional().default('CP'),
  price: z.number().positive('Price must be greater than 0'),
  stock: z.number().int().min(0, 'Stock cannot be negative').default(50),
  description: z.string().optional().default(''),
});

const parseCaption = (captionText) => {
  if (!captionText || typeof captionText !== 'string' || !captionText.trim()) {
    return {
      success: false,
      error: 'Empty caption provided',
      formatExample: getFormatExample(),
    };
  }

  const parts = captionText.split('|').map((part) => part.trim());

  let rawName = '';
  let rawCode = '';
  let rawCategory = 'Architectural Hardware';
  let rawFinish = 'CP';
  let rawPrice = null;
  let rawStock = 50;
  let rawDescription = '';

  const cleanNumeric = (val) => {
    if (!val) return NaN;
    const cleaned = String(val).replace(/[^0-9.]/g, '');
    return cleaned ? parseFloat(cleaned) : NaN;
  };

  if (parts.length >= 7) {
    // Full 7-part format: Name | Code | Category | Finish | Price | Stock | Description
    rawName = parts[0];
    rawCode = parts[1];
    rawCategory = parts[2] || 'Architectural Hardware';
    rawFinish = parts[3] || 'CP';
    rawPrice = cleanNumeric(parts[4]);
    rawStock = isNaN(cleanNumeric(parts[5])) ? 50 : Math.floor(cleanNumeric(parts[5]));
    rawDescription = parts.slice(6).join(' | ');
  } else if (parts.length === 6) {
    // 6 parts: Name | Code | Category | Finish | Price | Stock
    rawName = parts[0];
    rawCode = parts[1];
    rawCategory = parts[2] || 'Architectural Hardware';
    rawFinish = parts[3] || 'CP';
    rawPrice = cleanNumeric(parts[4]);
    rawStock = isNaN(cleanNumeric(parts[5])) ? 50 : Math.floor(cleanNumeric(parts[5]));
  } else if (parts.length === 5) {
    // 5 parts: Name | Code | Category | Finish | Price
    rawName = parts[0];
    rawCode = parts[1];
    rawCategory = parts[2] || 'Architectural Hardware';
    rawFinish = parts[3] || 'CP';
    rawPrice = cleanNumeric(parts[4]);
  } else if (parts.length === 4) {
    // 4 parts: could be Name | Code | Category | Price OR Name | Code | Finish | Price
    rawName = parts[0];
    rawCode = parts[1];
    rawPrice = cleanNumeric(parts[3]);
    if (isNaN(rawPrice)) {
      rawPrice = cleanNumeric(parts[2]);
      rawFinish = parts[3] || 'CP';
    } else {
      rawCategory = parts[2] || 'Architectural Hardware';
    }
  } else if (parts.length === 3) {
    // 3 parts: Name | Code | Price
    rawName = parts[0];
    rawCode = parts[1];
    rawPrice = cleanNumeric(parts[2]);
  } else if (parts.length === 2) {
    // 2 parts: Name | Price
    rawName = parts[0];
    rawPrice = cleanNumeric(parts[1]);
  } else {
    // Single part or unparseable
    return {
      success: false,
      error: 'Caption missing pipe delimiters (|)',
      formatExample: getFormatExample(),
    };
  }

  // Auto-generate code if missing
  if (!rawCode) {
    const codePrefix = slugify(rawName, { lower: false, strict: true }).slice(0, 8).toUpperCase();
    rawCode = `${codePrefix || 'WA'}-${Date.now().toString().slice(-5)}`;
  }

  // Auto-fill description if missing
  if (!rawDescription) {
    rawDescription = `${rawName} (${rawCode}) in ${rawFinish} finish.`;
  }

  const candidateData = {
    name: rawName,
    code: rawCode,
    category: rawCategory,
    finish: rawFinish,
    price: rawPrice,
    stock: rawStock,
    description: rawDescription,
  };

  const validationResult = captionZodSchema.safeParse(candidateData);

  if (!validationResult.success) {
    const errorIssues = validationResult.error.issues.map((i) => i.message).join(', ');
    return {
      success: false,
      error: errorIssues,
      formatExample: getFormatExample(),
      candidateData,
    };
  }

  return {
    success: true,
    data: validationResult.data,
  };
};

/**
 * Standard format instruction and example for WhatsApp replies
 */
function getFormatExample() {
  return (
    'Format: Name | Code | Category | Finish | Price | Stock | Description\n\n' +
    'Example:\n' +
    'Shower Hinge 90 | SH-90-CP | Shower Hinges | CP | 1250 | 50 | Heavy brass 90 deg glass hinge'
  );
}

/**
 * 3. Normalizes and validates sender against WhatsappWhitelist
 */
const normalizePhoneNumber = (number) => {
  if (!number) return '';
  return String(number).replace(/\D/g, '');
};

const isNumberWhitelisted = async (rawMobile) => {
  const normalizedIncoming = normalizePhoneNumber(rawMobile);
  if (!normalizedIncoming) {
    return { whitelisted: false, contact: null };
  }

  // Fetch all active whitelisted entries
  const activeEntries = await WhatsappWhitelist.find({ isActive: true });

  const matched = activeEntries.find((entry) => {
    const entryNorm = normalizePhoneNumber(entry.mobile);
    if (!entryNorm) return false;
    return (
      entryNorm === normalizedIncoming ||
      normalizedIncoming.endsWith(entryNorm) ||
      entryNorm.endsWith(normalizedIncoming)
    );
  });

  return {
    whitelisted: !!matched,
    contact: matched || null,
  };
};

/**
 * 4. Download media from Meta Graph API or simulate in mock mode
 */
const downloadMedia = async (mediaId, mimeType = 'image/jpeg') => {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `wa_${mediaId || Date.now()}_${Date.now()}.${ext}`;
  const targetPath = path.join(WHATSAPP_UPLOAD_DIR, fileName);
  const relativeUrl = `/images/whatsapp/${fileName}`;

  // If mock mode, or test environment, or missing live token:
  if (WHATSAPP_MOCK || !WHATSAPP_ACCESS_TOKEN) {
    try {
      // Copy an existing catalog image if available, or generate a 1x1 dummy jpg
      const existingImages = fs
        .readdirSync(PUBLIC_IMAGES_DIR)
        .filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));

      if (existingImages.length > 0) {
        const sourceFile = path.join(PUBLIC_IMAGES_DIR, existingImages[0]);
        fs.copyFileSync(sourceFile, targetPath);
      } else {
        // Fallback minimal buffer
        fs.writeFileSync(targetPath, Buffer.from('mock-whatsapp-image-buffer'));
      }
    } catch {
      fs.writeFileSync(targetPath, Buffer.from('mock-whatsapp-image-buffer'));
    }
    return relativeUrl;
  }

  // Live Meta Graph API download
  try {
    const mediaMetaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    if (!mediaMetaRes.ok) {
      throw new Error(`Failed to fetch media metadata from Meta: ${mediaMetaRes.statusText}`);
    }

    const mediaMetaData = await mediaMetaRes.json();
    const downloadUrl = mediaMetaData.url;

    if (!downloadUrl) {
      throw new Error('Media metadata returned no download URL');
    }

    const downloadRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    if (!downloadRes.ok) {
      throw new Error(`Failed to download media binary from Meta: ${downloadRes.statusText}`);
    }

    const arrayBuffer = await downloadRes.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return relativeUrl;
  } catch (err) {
    console.error('[WhatsApp Service] Media download error:', err.message);
    // Fallback to sample image so workflow does not crash
    fs.writeFileSync(targetPath, Buffer.from('whatsapp-download-fallback'));
    return relativeUrl;
  }
};

/**
 * 5. Outgoing WhatsApp Reply via Cloud API or Mock Log
 */
const sendWhatsAppReply = async (toMobile, replyText) => {
  if (WHATSAPP_MOCK || !WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp Outgoing MOCK] To: ${toMobile}\nMessage: ${replyText}\n`);
    return {
      success: true,
      mock: true,
      recipient: toMobile,
      text: replyText,
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toMobile,
          type: 'text',
          text: {
            preview_url: false,
            body: replyText,
          },
        }),
      }
    );

    const json = await res.json();
    return { success: res.ok, data: json };
  } catch (err) {
    console.error('[WhatsApp Outgoing Error]:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 6. Resolve or Create Category for WhatsApp Draft Products
 */
const resolveCategory = async (categoryName) => {
  const trimmed = (categoryName || '').trim() || 'Architectural Hardware';
  let category = await Category.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${trimmed}$`, 'i') } },
      { slug: slugify(trimmed, { lower: true, strict: true }) },
    ],
  });

  if (!category) {
    // If no match found, create a new active category
    const catSlug = slugify(trimmed, { lower: true, strict: true }) || `cat-${Date.now()}`;
    category = await Category.create({
      name: trimmed,
      slug: catSlug,
      description: `Hardware items under ${trimmed}`,
      isActive: true,
      order: 99,
    });
  }

  return category;
};

/**
 * 7. End-to-End Processing of an Incoming WhatsApp Message
 */
const processIncomingMessage = async (messageData, contactData = {}) => {
  const { from, id: messageId, type: messageType, image, text } = messageData;
  const senderName = contactData?.profile?.name || '';

  // 1. Idempotency Check: Ignore duplicate messages
  const existingRecord = await WhatsappMessage.findOne({ messageId });
  if (existingRecord) {
    console.log(`[WhatsApp Idempotency] Message ${messageId} already processed. Skipping.`);
    return { status: 'DUPLICATE', message: existingRecord };
  }

  // 2. Whitelist Check
  const { whitelisted, contact } = await isNumberWhitelisted(from);

  if (!whitelisted) {
    const politeRejectReply =
      `Your number (+${from}) is not authorized to upload catalogue items to Glassofy.\n` +
      `Please contact the administrator to get whitelisted.`;

    const savedRecord = await WhatsappMessage.create({
      messageId,
      senderMobile: from,
      senderName: senderName || 'Unknown Fabricator',
      messageType: messageType || 'other',
      status: 'IGNORED',
      replyText: politeRejectReply,
      rawPayload: messageData,
      error: 'Sender mobile number is not whitelisted',
    });

    await sendWhatsAppReply(from, politeRejectReply);
    return { status: 'IGNORED', message: savedRecord };
  }

  // 3. Message Type Check (Must be an image)
  if (messageType !== 'image' || !image) {
    const nonImageReply =
      `Hello ${contact?.name || senderName || ''}! Please send a product photo with the caption formatted as:\n\n` +
      getFormatExample();

    const savedRecord = await WhatsappMessage.create({
      messageId,
      senderMobile: from,
      senderName: contact?.name || senderName || 'Whitelisted Fabricator',
      messageType: messageType || 'text',
      text: text?.body || '',
      status: 'FAILED',
      replyText: nonImageReply,
      rawPayload: messageData,
      error: 'Non-image message received',
    });

    await sendWhatsAppReply(from, nonImageReply);
    return { status: 'FAILED', message: savedRecord };
  }

  // 4. Image received - Parse caption
  const rawCaption = (image.caption || '').trim();
  const parseResult = parseCaption(rawCaption);

  if (!parseResult.success) {
    const malformedReply =
      `Invalid caption format. Please use the exact structure:\n\n` +
      getFormatExample() +
      `\n\nIssue detected: ${parseResult.error}`;

    const savedRecord = await WhatsappMessage.create({
      messageId,
      senderMobile: from,
      senderName: contact?.name || senderName || 'Whitelisted Fabricator',
      messageType: 'image',
      caption: rawCaption,
      mediaId: image.id || '',
      status: 'FAILED',
      replyText: malformedReply,
      rawPayload: messageData,
      error: parseResult.error,
    });

    await sendWhatsAppReply(from, malformedReply);
    return { status: 'FAILED', message: savedRecord };
  }

  // 5. Download & Store Image
  const parsedData = parseResult.data;
  const storedMediaUrl = await downloadMedia(image.id, image.mime_type);

  // 6. Resolve Category
  const category = await resolveCategory(parsedData.category);

  // 7. Generate unique slug
  let baseSlug = slugify(`${parsedData.name}-${parsedData.code}`, { lower: true, strict: true });
  if (!baseSlug) baseSlug = `product-${Date.now()}`;

  let finalSlug = baseSlug;
  let counter = 1;
  while (await Product.findOne({ slug: finalSlug })) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  // 8. Create Product as DRAFT with source "whatsapp"
  const createdProduct = await Product.create({
    name: parsedData.name,
    title: parsedData.name,
    slug: finalSlug,
    code: parsedData.code,
    description: parsedData.description,
    category: category._id,
    finish: parsedData.finish,
    images: [storedMediaUrl],
    basePrice: parsedData.price,
    baseMrp: Math.round(parsedData.price * 1.25),
    status: 'DRAFT',
    isPublished: false,
    source: 'whatsapp',
    variants: [
      {
        sku: `${parsedData.code}-${parsedData.finish}`,
        finish: parsedData.finish,
        price: parsedData.price,
        mrp: Math.round(parsedData.price * 1.25),
        stock: parsedData.stock,
        isActive: true,
      },
    ],
  });

  // 9. Save WhatsappMessage record
  const adminEditUrl = `${CLIENT_URL}/admin/products?search=${encodeURIComponent(parsedData.code)}`;
  const successReply =
    `Received. Draft created: ${createdProduct.name} (ID: ${createdProduct._id})\n` +
    `Admin review link: ${adminEditUrl}`;

  const savedMessage = await WhatsappMessage.create({
    messageId,
    senderMobile: from,
    senderName: contact?.name || senderName || 'Whitelisted Fabricator',
    messageType: 'image',
    caption: rawCaption,
    mediaId: image.id || '',
    mediaUrl: storedMediaUrl,
    parsedFields: parsedData,
    product: createdProduct._id,
    status: 'DRAFT_CREATED',
    replyText: successReply,
    rawPayload: messageData,
  });

  // 10. Send WhatsApp Confirmation
  await sendWhatsAppReply(from, successReply);

  // 11. Send Admin Email Alert (asynchronous, non-blocking)
  sendAdminWhatsAppDraftNotification({
    product: createdProduct,
    senderMobile: from,
    senderName: contact?.name || senderName || 'Whitelisted Fabricator',
  }).catch((err) => console.error('[WhatsApp Service] Email notification error:', err.message));

  return {
    status: 'DRAFT_CREATED',
    message: savedMessage,
    product: createdProduct,
  };
};

/**
 * 8. Process full Meta Webhook Entry payload asynchronously
 */
const processIncomingWebhookPayload = async (payload) => {
  if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
    return [];
  }

  const results = [];

  for (const entry of payload.entry) {
    if (!entry.changes || !Array.isArray(entry.changes)) continue;

    for (const change of entry.changes) {
      const val = change.value;
      if (!val || !val.messages || !Array.isArray(val.messages)) continue;

      const contacts = val.contacts || [];
      const contactMap = {};
      contacts.forEach((c) => {
        if (c.wa_id) contactMap[c.wa_id] = c;
      });

      for (const msg of val.messages) {
        const contact = contactMap[msg.from] || null;
        try {
          const res = await processIncomingMessage(msg, contact);
          results.push(res);
        } catch (msgErr) {
          console.error('[WhatsApp Service] Error processing message:', msgErr);
          results.push({ status: 'ERROR', error: msgErr.message, messageId: msg.id });
        }
      }
    }
  }

  return results;
};

module.exports = {
  verifyMetaSignature,
  parseCaption,
  getFormatExample,
  normalizePhoneNumber,
  isNumberWhitelisted,
  downloadMedia,
  sendWhatsAppReply,
  resolveCategory,
  processIncomingMessage,
  processIncomingWebhookPayload,
};
