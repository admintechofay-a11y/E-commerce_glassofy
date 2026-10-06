const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const {
  User,
  Product,
  Category,
  WhatsappMessage,
  WhatsappWhitelist,
} = require('../src/models');
const {
  verifyMetaSignature,
  parseCaption,
  isNumberWhitelisted,
} = require('../src/services/whatsappService');
const { signToken } = require('../src/utils/jwt');
const { WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET } = require('../src/config/env');

describe('WhatsApp Automation & Ingestion Integration Tests', () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  let whitelistedNumber = '919876543210';
  let nonWhitelistedNumber = '919111222333';
  let testCategory;

  beforeEach(async () => {
    // 1. Create Admin User
    adminUser = await User.create({
      fullName: 'WhatsApp Admin',
      email: `admin_${Date.now()}_${Math.random().toString(36).substring(7)}@glassofy.com`,
      mobile: '9876543210',
      password: 'AdminPassword@123',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = signToken(adminUser._id);

    // 2. Create Regular Customer
    regularUser = await User.create({
      fullName: 'Regular User',
      email: `user_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
      mobile: '9123456780',
      password: 'UserPassword@123',
      role: 'USER',
      isActive: true,
    });
    regularToken = signToken(regularUser._id);

    // 3. Create Sample Category
    testCategory = await Category.create({
      name: 'Shower Hinges',
      slug: `shower-hinges-${Date.now()}`,
      isActive: true,
      displayOrder: 1,
    });

    // 4. Create Active Whitelisted Number
    await WhatsappWhitelist.create({
      name: 'Rohan Sharma',
      mobile: whitelistedNumber,
      label: 'Lead Fabricator',
      isActive: true,
      approvedBy: adminUser._id,
    });
  });

  // ==========================================
  // 1. CAPTION PARSING UNIT TESTS
  // ==========================================
  describe('Caption Parser (parseCaption)', () => {
    it('should correctly parse full 7-part caption', () => {
      const caption =
        'Heavy Duty Shower Hinge | SH-90-CP | Shower Hinges | CP | 1450 | 75 | Solid brass 90 degree glass hinge';
      const result = parseCaption(caption);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Heavy Duty Shower Hinge');
      expect(result.data.code).toBe('SH-90-CP');
      expect(result.data.category).toBe('Shower Hinges');
      expect(result.data.finish).toBe('CP');
      expect(result.data.price).toBe(1450);
      expect(result.data.stock).toBe(75);
      expect(result.data.description).toBe('Solid brass 90 degree glass hinge');
    });

    it('should be tolerant of extra spaces and format variations', () => {
      const caption =
        '   Brass Glass Bracket   |   BGB-01   |   Brackets   |   Gold Satin   |   ₹ 850.50   |   120   |   Wall to glass   ';
      const result = parseCaption(caption);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Brass Glass Bracket');
      expect(result.data.code).toBe('BGB-01');
      expect(result.data.category).toBe('Brackets');
      expect(result.data.finish).toBe('Gold Satin');
      expect(result.data.price).toBe(850.5);
      expect(result.data.stock).toBe(120);
    });

    it('should handle partial format with 5 parts (omitting stock and description)', () => {
      const caption = 'Patch Fitting Bottom | PF-702 | Patch Fittings | SS | 920';
      const result = parseCaption(caption);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Patch Fitting Bottom');
      expect(result.data.code).toBe('PF-702');
      expect(result.data.category).toBe('Patch Fittings');
      expect(result.data.finish).toBe('SS');
      expect(result.data.price).toBe(920);
      expect(result.data.stock).toBe(50); // Default stock
      expect(result.data.description).toBeTruthy(); // Auto-generated description
    });

    it('should handle minimal 2-part format (Name | Price)', () => {
      const caption = 'Spider Fitting 2-Way | 1800';
      const result = parseCaption(caption);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Spider Fitting 2-Way');
      expect(result.data.price).toBe(1800);
      expect(result.data.code).toMatch(/SPIDER|WA/);
      expect(result.data.finish).toBe('CP');
      expect(result.data.stock).toBe(50);
    });

    it('should reject malformed caption with no price', () => {
      const caption = 'Just some random text without price';
      const result = parseCaption(caption);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.formatExample).toContain('Format: Name | Code');
    });

    it('should reject caption with non-positive price', () => {
      const caption = 'Shower Hinge | SH-01 | Hardware | CP | 0';
      const result = parseCaption(caption);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Price must be greater than 0');
    });

    it('should reject empty or whitespace caption', () => {
      const result = parseCaption('   ');
      expect(result.success).toBe(false);
    });
  });

  // ==========================================
  // 2. SIGNATURE VERIFICATION TESTS
  // ==========================================
  describe('HMAC-SHA256 Signature Verification', () => {
    it('should verify matching sha256 signature generated with app secret', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const rawBuffer = Buffer.from(payload, 'utf8');
      const hash = crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(rawBuffer).digest('hex');
      const header = `sha256=${hash}`;

      const isValid = verifyMetaSignature(rawBuffer, header, WHATSAPP_APP_SECRET);
      expect(isValid).toBe(true);
    });

    it('should reject signature if payload has been tampered', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const tamperedPayload = JSON.stringify({ object: 'hacked_payload' });
      const rawBuffer = Buffer.from(payload, 'utf8');
      const hash = crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(rawBuffer).digest('hex');
      const header = `sha256=${hash}`;

      const isValid = verifyMetaSignature(Buffer.from(tamperedPayload), header, WHATSAPP_APP_SECRET);
      expect(isValid).toBe(false);
    });

    it('should reject missing or malformed signature header', () => {
      expect(verifyMetaSignature('test', '', WHATSAPP_APP_SECRET)).toBe(false);
      expect(verifyMetaSignature('test', 'md5=1234', WHATSAPP_APP_SECRET)).toBe(false);
      expect(verifyMetaSignature('test', 'sha256=short', WHATSAPP_APP_SECRET)).toBe(false);
    });
  });

  // ==========================================
  // 3. META WEBHOOK HANDSHAKE TESTS
  // ==========================================
  describe('GET /api/whatsapp/webhook (Handshake)', () => {
    it('should return challenge with 200 when hub.verify_token matches', async () => {
      const challengeCode = '1158201244';
      const res = await request(app)
        .get('/api/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': WHATSAPP_VERIFY_TOKEN,
          'hub.challenge': challengeCode,
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe(challengeCode);
    });

    it('should return 403 Forbidden when hub.verify_token does not match', async () => {
      const res = await request(app)
        .get('/api/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': '12345',
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 4. WEBHOOK INGESTION, FAST 200 & ASYNC PIPELINE
  // ==========================================
  describe('POST /api/whatsapp/webhook (Ingestion)', () => {
    it('should respond with 200 EVENT_RECEIVED immediately and accept valid signature', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [],
      };
      const rawString = JSON.stringify(payload);
      const hash = crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(rawString).digest('hex');

      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', `sha256=${hash}`)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('EVENT_RECEIVED');
    });

    it('should reject webhook with 401 when signature is invalid', async () => {
      const payload = { object: 'whatsapp_business_account', entry: [] };
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', 'sha256=0000000000000000000000000000000000000000000000000000000000000000')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 5. WHITELIST, IDEMPOTENCY, AND DRAFT CREATION
  // ==========================================
  describe('End-to-End Ingestion Flow (via Mock Simulator)', () => {
    it('should accept whitelisted sender and create DRAFT product with source "whatsapp"', async () => {
      const res = await request(app)
        .post('/api/whatsapp/mock')
        .send({
          from: whitelistedNumber,
          senderName: 'Rohan Sharma',
          caption:
            'Floor Spring 1000 | FS-1000 | Floor Springs | Satin | 3500 | 40 | Heavy duty double action floor spring',
          messageType: 'image',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify product was created in MongoDB
      const product = await Product.findOne({ code: 'FS-1000' });
      expect(product).toBeTruthy();
      expect(product.name).toBe('Floor Spring 1000');
      expect(product.status).toBe('DRAFT');
      expect(product.isPublished).toBe(false);
      expect(product.source).toBe('whatsapp');
      expect(product.basePrice).toBe(3500);
      expect(product.variants[0].stock).toBe(40);

      // Verify WhatsappMessage record exists and links to product
      const waMsg = await WhatsappMessage.findOne({ product: product._id });
      expect(waMsg).toBeTruthy();
      expect(waMsg.status).toBe('DRAFT_CREATED');
      expect(waMsg.senderMobile).toBe(whitelistedNumber);
      expect(waMsg.replyText).toContain('Draft created: Floor Spring 1000');
    });

    it('should reject unwhitelisted sender with status IGNORED and not create product', async () => {
      const res = await request(app)
        .post('/api/whatsapp/mock')
        .send({
          from: nonWhitelistedNumber,
          senderName: 'Unknown Intruder',
          caption: 'Secret Fitting | SF-99 | Other | CP | 9999 | 10',
          messageType: 'image',
        });

      expect(res.status).toBe(200);

      // Product must NOT be created
      const product = await Product.findOne({ code: 'SF-99' });
      expect(product).toBeNull();

      // Message should be logged as IGNORED
      const waMsg = await WhatsappMessage.findOne({ senderMobile: nonWhitelistedNumber });
      expect(waMsg).toBeTruthy();
      expect(waMsg.status).toBe('IGNORED');
      expect(waMsg.replyText).toContain('not authorized');
    });

    it('should reject paused whitelist entry (isActive: false)', async () => {
      // Pause the whitelisted contact
      await WhatsappWhitelist.findOneAndUpdate({ mobile: whitelistedNumber }, { isActive: false });

      await request(app)
        .post('/api/whatsapp/mock')
        .send({
          from: whitelistedNumber,
          caption: 'Shower Lock | SL-10 | Locks | SS | 600',
          messageType: 'image',
        });

      const product = await Product.findOne({ code: 'SL-10' });
      expect(product).toBeNull();

      const waMsg = await WhatsappMessage.findOne({ senderMobile: whitelistedNumber, status: 'IGNORED' });
      expect(waMsg).toBeTruthy();
    });

    it('should handle non-image message with FAILED status and helpful reply', async () => {
      const res = await request(app)
        .post('/api/whatsapp/mock')
        .send({
          from: whitelistedNumber,
          caption: 'Hello, do you have shower hinges?',
          messageType: 'text',
        });

      expect(res.status).toBe(200);

      const waMsg = await WhatsappMessage.findOne({
        senderMobile: whitelistedNumber,
        messageType: 'text',
      });
      expect(waMsg).toBeTruthy();
      expect(waMsg.status).toBe('FAILED');
      expect(waMsg.replyText).toContain('Please send a product photo');
    });

    it('should handle bad caption with FAILED status and format example reply', async () => {
      const res = await request(app)
        .post('/api/whatsapp/mock')
        .send({
          from: whitelistedNumber,
          caption: 'Invalid Caption Without Pipes Or Price',
          messageType: 'image',
        });

      expect(res.status).toBe(200);

      const waMsg = await WhatsappMessage.findOne({
        senderMobile: whitelistedNumber,
        caption: 'Invalid Caption Without Pipes Or Price',
      });
      expect(waMsg).toBeTruthy();
      expect(waMsg.status).toBe('FAILED');
      expect(waMsg.replyText).toContain('Format: Name | Code | Category');
    });

    it('should enforce idempotency by ignoring duplicate messageId', async () => {
      const uniqueMsgId = `wamid.test_idem_${Date.now()}`;

      // 1. First ingestion
      const payload1 = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'ACC1',
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: whitelistedNumber,
                      id: uniqueMsgId,
                      type: 'image',
                      image: {
                        caption: 'Towel Rod 24 | TR-24 | Accessories | CP | 750 | 20',
                        mime_type: 'image/jpeg',
                        id: 'media-1',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await request(app).post('/api/whatsapp/webhook').send(payload1);

      // Wait a moment for async execution
      await new Promise((resolve) => setTimeout(resolve, 150));

      const countBefore = await Product.countDocuments({ code: 'TR-24' });
      expect(countBefore).toBe(1);

      // 2. Second ingestion with identical message ID
      await request(app).post('/api/whatsapp/webhook').send(payload1);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const countAfter = await Product.countDocuments({ code: 'TR-24' });
      expect(countAfter).toBe(1); // Still exactly 1, no duplicate created
    });
  });

  // ==========================================
  // 6. ADMIN INBOX & PUBLISHING TO LIVE STORE
  // ==========================================
  describe('Admin WhatsApp Inbox & Storefront Publishing', () => {
    let testDraftProduct;
    let testDraftMessage;

    beforeEach(async () => {
      testDraftProduct = await Product.create({
        name: 'Curtain Fitting Heavy',
        title: 'Curtain Fitting Heavy',
        slug: `curtain-fitting-heavy-${Date.now()}`,
        code: 'CF-HEAVY',
        description: 'Heavy duty curtain fitting for toughened glass',
        category: testCategory._id,
        finish: 'SS',
        basePrice: 1100,
        status: 'DRAFT',
        isPublished: false,
        source: 'whatsapp',
        variants: [
          {
            sku: 'CF-HEAVY-SS',
            finish: 'SS',
            price: 1100,
            stock: 30,
            isActive: true,
          },
        ],
      });

      testDraftMessage = await WhatsappMessage.create({
        messageId: `wamid.draft_${Date.now()}`,
        senderMobile: whitelistedNumber,
        senderName: 'Rohan Sharma',
        messageType: 'image',
        caption: 'Curtain Fitting Heavy | CF-HEAVY | Accessories | SS | 1100 | 30',
        product: testDraftProduct._id,
        status: 'DRAFT_CREATED',
        parsedFields: {
          name: 'Curtain Fitting Heavy',
          code: 'CF-HEAVY',
          category: 'Accessories',
          finish: 'SS',
          price: 1100,
          stock: 30,
        },
      });
    });

    it('should list inbox messages for admin and filter by status', async () => {
      const res = await request(app)
        .get('/api/admin/whatsapp/messages?status=DRAFT_CREATED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.messages[0].product.name).toBe('Curtain Fitting Heavy');
    });

    it('should reject regular user from accessing admin inbox (403)', async () => {
      const res = await request(app)
        .get('/api/admin/whatsapp/messages')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('publishing from inbox should set status to PUBLISHED and make product visible on public storefront', async () => {
      // 1. Verify product is hidden from public API before publishing
      const preCheck = await request(app).get(`/api/products/${testDraftProduct.slug}`);
      expect(preCheck.status).toBe(404); // Drafts are hidden from public API

      // 2. Admin publishes from WhatsApp Inbox
      const publishRes = await request(app)
        .post(`/api/admin/whatsapp/messages/${testDraftMessage._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.data.message.status).toBe('PUBLISHED');
      expect(publishRes.body.data.product.status).toBe('PUBLISHED');
      expect(publishRes.body.data.product.isPublished).toBe(true);

      // 3. Verify product is now visible on public API!
      const postCheck = await request(app).get(`/api/products/${testDraftProduct.slug}`);
      expect(postCheck.status).toBe(200);
      expect(postCheck.body.data.product.name).toBe('Curtain Fitting Heavy');
    });

    it('rejecting from inbox should mark message as REJECTED and product as ARCHIVED', async () => {
      const rejectRes = await request(app)
        .post(`/api/admin/whatsapp/messages/${testDraftMessage._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate item already in stock' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.message.status).toBe('REJECTED');

      const updatedProduct = await Product.findById(testDraftProduct._id);
      expect(updatedProduct.status).toBe('ARCHIVED');
      expect(updatedProduct.isPublished).toBe(false);
    });
  });

  // ==========================================
  // 7. ADMIN WHITELIST CRUD TESTS
  // ==========================================
  describe('Admin Whitelist Management', () => {
    it('should allow admin to add, toggle, and delete whitelist entries', async () => {
      const newNumber = '919988776655';

      // 1. Add number
      const addRes = await request(app)
        .post('/api/admin/whatsapp/whitelist')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Vikram Glazing',
          mobile: newNumber,
          label: 'Glazing Contractor',
          businessName: 'Vikram Architectural Systems',
        });

      expect(addRes.status).toBe(201);
      const entryId = addRes.body.data.entry._id;

      // Verify number is recognized
      const check = await isNumberWhitelisted(newNumber);
      expect(check.whitelisted).toBe(true);
      expect(check.contact.name).toBe('Vikram Glazing');

      // 2. Toggle status to PAUSED
      const toggleRes = await request(app)
        .patch(`/api/admin/whatsapp/whitelist/${entryId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.entry.isActive).toBe(false);

      // Verify number is now inactive
      const checkPaused = await isNumberWhitelisted(newNumber);
      expect(checkPaused.whitelisted).toBe(false);

      // 3. Delete number
      const deleteRes = await request(app)
        .delete(`/api/admin/whatsapp/whitelist/${entryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      const findDeleted = await WhatsappWhitelist.findById(entryId);
      expect(findDeleted).toBeNull();
    });
  });
});
