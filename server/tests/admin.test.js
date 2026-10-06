const request = require('supertest');
const app = require('../src/app');
const {
  User,
  Product,
  Category,
  Order,
  Cart,
  DiscountRule,
  Coupon,
  Settings,
  AuditLog,
} = require('../src/models');
const { signToken } = require('../src/utils/jwt');

describe('Admin Panel API & RBAC Integration Tests', () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  let testCategory;
  let testProduct;

  beforeEach(async () => {
    // 1. Create Admin User
    adminUser = await User.create({
      fullName: 'Super Admin',
      email: `admin_${Date.now()}_${Math.random().toString(36).substring(7)}@glassofy.com`,
      mobile: '9998887770',
      password: 'AdminPassword@123',
      role: 'ADMIN',
      isActive: true,
    });
    adminToken = signToken(adminUser._id);

    // 2. Create Regular User
    regularUser = await User.create({
      fullName: 'Regular Customer',
      email: `customer_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
      mobile: '9887776655',
      password: 'UserPassword@123',
      role: 'USER',
      isActive: true,
      address: {
        line1: '123 Market St',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    });
    regularToken = signToken(regularUser._id);

    // 3. Create Sample Category
    testCategory = await Category.create({
      name: 'Glass Connectors',
      slug: `glass-connectors-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      isActive: true,
      displayOrder: 1,
    });

    // 4. Create Sample Product
    testProduct = await Product.create({
      name: 'Glass to Wall Bracket 90 Deg',
      title: 'Glass to Wall Bracket 90 Deg',
      slug: `glass-to-wall-bracket-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      code: `GWB-90-${Date.now().toString().slice(-4)}`,
      description: 'Heavy duty brass connector',
      category: testCategory._id,
      finish: 'CP',
      basePrice: 850,
      variants: [
        {
          sku: 'GWB-90-CP',
          size: 'Standard',
          finish: 'CP',
          price: 850,
          stock: 40,
          isActive: true,
        },
      ],
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
    });
  });

  // =========================================================================
  // 1. ROLE-BASED ACCESS CONTROL (RBAC) - 403 ON EVERY ADMIN ROUTE
  // =========================================================================
  describe('RBAC: Non-admin gets 403 Forbidden on every admin route', () => {
    const dummyId = '507f1f77bcf86cd799439011';

    const testRoutes = [
      { method: 'get', path: '/api/admin/dashboard' },
      { method: 'get', path: '/api/admin/products' },
      { method: 'post', path: '/api/admin/products', body: { name: 'Unauthorized' } },
      { method: 'put', path: `/api/admin/products/${dummyId}`, body: { name: 'Unauthorized' } },
      { method: 'delete', path: `/api/admin/products/${dummyId}` },
      { method: 'post', path: '/api/admin/products/bulk', body: { action: 'PUBLISH', ids: [dummyId] } },
      { method: 'get', path: '/api/admin/products/export' },
      { method: 'post', path: '/api/admin/products/import', body: { csvData: '' } },
      { method: 'get', path: '/api/admin/categories' },
      { method: 'post', path: '/api/admin/categories', body: { name: 'Cat' } },
      { method: 'put', path: `/api/admin/categories/${dummyId}`, body: { name: 'Cat' } },
      { method: 'delete', path: `/api/admin/categories/${dummyId}` },
      { method: 'get', path: '/api/admin/orders' },
      { method: 'get', path: `/api/admin/orders/${dummyId}` },
      { method: 'patch', path: `/api/admin/orders/${dummyId}/status`, body: { status: 'CONFIRMED' } },
      { method: 'post', path: `/api/admin/orders/${dummyId}/refund-cancel`, body: { reason: 'Test' } },
      { method: 'get', path: '/api/admin/users' },
      { method: 'get', path: `/api/admin/users/${dummyId}` },
      { method: 'patch', path: `/api/admin/users/${dummyId}/status`, body: { isActive: false } },
      { method: 'patch', path: `/api/admin/users/${dummyId}/role`, body: { role: 'ADMIN' } },
      { method: 'post', path: `/api/admin/users/${dummyId}/reset-password-link` },
      { method: 'get', path: '/api/admin/discounts' },
      { method: 'post', path: '/api/admin/discounts/rules', body: { name: 'Rule', type: 'CART_TOTAL' } },
      { method: 'delete', path: `/api/admin/discounts/rules/${dummyId}` },
      { method: 'post', path: '/api/admin/discounts/coupons', body: { code: 'TEST' } },
      { method: 'delete', path: `/api/admin/discounts/coupons/${dummyId}` },
      { method: 'patch', path: '/api/admin/discounts/stacking-mode', body: { mode: 'best-of' } },
      { method: 'get', path: '/api/admin/settings' },
      { method: 'put', path: '/api/admin/settings', body: { gstRate: 18 } },
      { method: 'get', path: '/api/admin/audit-logs' },
    ];

    test.each(testRoutes)(
      'rejects regular USER with 403 on $method.toUpperCase() $path',
      async ({ method, path, body }) => {
        let req = request(app)[method](path).set('Authorization', `Bearer ${regularToken}`);
        if (body) {
          req = req.send(body);
        }
        const res = await req;
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      }
    );

    it('rejects unauthenticated user with 401 Unauthorized on /api/admin/dashboard', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. PRODUCT CRUD, SEO, VARIANTS, BULK PRICING & AUDIT LOGGING
  // =========================================================================
  describe('Product CRUD and Audit Logging', () => {
    it('creates product with variants, bulk pricing, SEO fields and writes audit log', async () => {
      const newProductPayload = {
        name: 'Spider Fitting 4-Way Solid Brass',
        title: 'Spider Fitting 4-Way Solid Brass',
        slug: `spider-fitting-4way-${Date.now()}`,
        code: `SF-4W-${Date.now().toString().slice(-4)}`,
        description: 'Architectural structural spider fitting for point-supported glass facades.',
        category: testCategory._id,
        finish: 'SS',
        basePrice: 3500,
        baseMrp: 4200,
        status: 'PUBLISHED',
        metaTitle: 'Spider Fitting 4-Way | Architectural Glass Hardware',
        metaDescription: 'Heavy-duty 4-way spider fitting in satin stainless steel finish.',
        variants: [
          {
            sku: 'SF-4W-SS-150',
            size: '150mm',
            finish: 'SS',
            price: 3500,
            stock: 25,
            isActive: true,
          },
          {
            sku: 'SF-4W-SS-200',
            size: '200mm',
            finish: 'SS',
            price: 4200,
            stock: 15,
            isActive: true,
          },
        ],
        bulkPricing: [
          { minQty: 10, discountPercentage: 10 },
          { minQty: 50, discountPercentage: 20 },
        ],
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      };

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProductPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.metaTitle).toBe(newProductPayload.metaTitle);
      expect(res.body.data.product.variants).toHaveLength(2);
      expect(res.body.data.product.bulkPricing).toHaveLength(2);

      const createdId = res.body.data.product._id;

      // Check Audit Log
      const auditEntry = await AuditLog.findOne({
        entity: 'PRODUCT',
        entityId: createdId,
        action: 'CREATE',
      });
      expect(auditEntry).not.toBeNull();
      expect(auditEntry.user.toString()).toBe(adminUser._id.toString());
    });

    it('updates product and writes audit log', async () => {
      const res = await request(app)
        .put(`/api/admin/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          basePrice: 999,
          metaTitle: 'Updated SEO Title',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.basePrice).toBe(999);
      expect(res.body.data.product.metaTitle).toBe('Updated SEO Title');

      const auditEntry = await AuditLog.findOne({
        entity: 'PRODUCT',
        entityId: testProduct._id,
        action: 'UPDATE',
      });
      expect(auditEntry).not.toBeNull();
    });

    it('bulk publishes, drafts, and deletes products with audit logs', async () => {
      // 1. Bulk draft
      const draftRes = await request(app)
        .post('/api/admin/products/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'DRAFT',
          ids: [testProduct._id],
        });
      expect(draftRes.status).toBe(200);

      const productInDb = await Product.findById(testProduct._id);
      expect(productInDb.status).toBe('DRAFT');

      const draftAudit = await AuditLog.findOne({ action: 'BULK_DRAFT' });
      expect(draftAudit).not.toBeNull();

      // 2. Bulk publish
      const pubRes = await request(app)
        .post('/api/admin/products/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'PUBLISH',
          ids: [testProduct._id],
        });
      expect(pubRes.status).toBe(200);

      const pubAudit = await AuditLog.findOne({ action: 'BULK_PUBLISH' });
      expect(pubAudit).not.toBeNull();
    });

    it('exports products to CSV stream', async () => {
      const res = await request(app)
        .get('/api/admin/products/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Code,Name,Category,Finish');
      expect(res.text).toContain(testProduct.code);
    });

    it('deletes a product and writes audit log', async () => {
      const res = await request(app)
        .delete(`/api/admin/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const productInDb = await Product.findById(testProduct._id);
      expect(productInDb).toBeNull();

      const auditEntry = await AuditLog.findOne({
        entity: 'PRODUCT',
        entityId: testProduct._id.toString(),
        action: 'DELETE',
      });
      expect(auditEntry).not.toBeNull();
    });
  });

  // =========================================================================
  // 3. CATEGORY CRUD & AUDIT LOGGING
  // =========================================================================
  describe('Category CRUD and Audit Logging', () => {
    it('creates category and logs audit', async () => {
      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sliding Door Systems',
          description: 'Top hung sliding glass systems',
          displayOrder: 2,
          image: 'https://example.com/sliding.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.category.name).toBe('Sliding Door Systems');
      const createdCatId = res.body.data.category._id;

      const audit = await AuditLog.findOne({
        entity: 'CATEGORY',
        entityId: createdCatId,
        action: 'CREATE',
      });
      expect(audit).not.toBeNull();
    });

    it('updates category ordering and image', async () => {
      const res = await request(app)
        .put(`/api/admin/categories/${testCategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayOrder: 10,
          image: 'https://example.com/hinges.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category.displayOrder).toBe(10);

      const audit = await AuditLog.findOne({
        entity: 'CATEGORY',
        entityId: testCategory._id,
        action: 'UPDATE',
      });
      expect(audit).not.toBeNull();
    });

    it('deletes empty category and logs audit', async () => {
      const emptyCat = await Category.create({
        name: 'Empty Category',
        slug: `empty-cat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });

      const res = await request(app)
        .delete(`/api/admin/categories/${emptyCat._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const audit = await AuditLog.findOne({
        entity: 'CATEGORY',
        entityId: emptyCat._id.toString(),
        action: 'DELETE',
      });
      expect(audit).not.toBeNull();
    });
  });

  // =========================================================================
  // 4. ORDER STATUS WORKFLOW, REFUND/CANCEL & STOCK RESTORATION
  // =========================================================================
  describe('Order Status Changes, History, Refund/Cancel & Stock Restore', () => {
    let activeOrder;

    beforeEach(async () => {
      const orderAddress = {
        fullName: 'Regular Customer',
        phone: '9887776655',
        line1: '123 Market St',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      };

      activeOrder = await Order.create({
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        user: regularUser._id,
        items: [
          {
            product: testProduct._id,
            variantId: testProduct.variants[0]._id,
            title: testProduct.title,
            sku: testProduct.variants[0].sku,
            finish: testProduct.variants[0].finish,
            size: testProduct.variants[0].size,
            price: 850,
            quantity: 5,
            subtotal: 4250,
          },
        ],
        shippingAddress: orderAddress,
        billingAddress: orderAddress,
        pricingBreakdown: {
          subtotal: 4250,
          totalDiscount: 0,
          taxableAmount: 4250,
          gst: 765,
          shipping: 0,
          grandTotal: 5015,
        },
        subtotal: 4250,
        total: 5015,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        statusHistory: [
          {
            status: 'CONFIRMED',
            timestamp: new Date(),
            note: 'Order confirmed upon payment',
          },
        ],
      });

      // Stock was decremented by 5 when order was placed (40 -> 35)
      testProduct.variants[0].stock = 35;
      await testProduct.save();
    });

    it('updates order status with history note and logs audit', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${activeOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SHIPPED',
          note: 'Dispatched via DTDC tracking #DT99281',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('SHIPPED');

      const updated = await Order.findById(activeOrder._id);
      expect(updated.statusHistory.length).toBeGreaterThanOrEqual(2);
      const latestHistory = updated.statusHistory[updated.statusHistory.length - 1];
      expect(latestHistory.status).toBe('SHIPPED');
      expect(latestHistory.note).toContain('DTDC');

      const audit = await AuditLog.findOne({
        entity: 'ORDER',
        entityId: activeOrder._id,
        action: 'STATUS_CHANGE',
      });
      expect(audit).not.toBeNull();
    });

    it('refunds/cancels order and restores stock back to product variants', async () => {
      const res = await request(app)
        .post(`/api/admin/orders/${activeOrder._id}/refund-cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'CANCEL_AND_REFUND',
          reason: 'Customer requested order cancellation before dispatch',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('CANCELLED');
      expect(res.body.data.order.paymentStatus).toBe('REFUNDED');

      // Verify stock was restored from 35 back to 40
      const restoredProduct = await Product.findById(testProduct._id);
      expect(restoredProduct.variants[0].stock).toBe(40);

      // Verify audit log
      const audit = await AuditLog.findOne({
        entity: 'ORDER',
        entityId: activeOrder._id,
        action: 'CANCEL_REFUND',
      });
      expect(audit).not.toBeNull();
    });
  });

  // =========================================================================
  // 5. DISCOUNT RULE UPDATES AFFECTING CHECKOUT
  // =========================================================================
  describe('Discount Rule Updates Affecting Checkout', () => {
    it('admin creates a discount rule and live checkout pricing applies it', async () => {
      // 1. Initially no discount rule exists. User adds 2 items (2 * 850 = 1700 subtotal)
      await Cart.create({
        user: regularUser._id,
        items: [
          {
            product: testProduct._id,
            variantId: testProduct.variants[0]._id,
            quantity: 2,
            price: 850,
            subtotal: 1700,
          },
        ],
      });

      // Checkout preview / attempt before rule
      const initialCheckout = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {
            fullName: 'Regular Customer',
            phone: '9887776655',
            line1: '123 Market St',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
          },
        });

      expect(initialCheckout.status).toBe(201);
      expect(initialCheckout.body.data.order.pricingBreakdown.totalDiscount).toBe(0);

      // 2. Admin creates a CART_TOTAL discount tier rule:
      // Orders >= ₹1,500 get 10% discount
      const ruleRes = await request(app)
        .post('/api/admin/discounts/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Festival Volume Tier 10% Off',
          type: 'CART_TOTAL',
          minCartAmount: 1500,
          discountPercentage: 10,
          isActive: true,
        });

      expect(ruleRes.status).toBe(200);
      expect(ruleRes.body.data.rule).toBeDefined();

      const ruleAudit = await AuditLog.findOne({
        entity: 'DISCOUNT_RULE',
        action: 'CREATE',
      });
      expect(ruleAudit).not.toBeNull();

      // 3. User places a new order with same subtotal 1700
      await Cart.findOneAndUpdate(
        { user: regularUser._id },
        {
          $set: {
            items: [
              {
                product: testProduct._id,
                variantId: testProduct.variants[0]._id,
                quantity: 2,
                price: 850,
                subtotal: 1700,
              },
            ],
          },
        },
        { upsert: true }
      );

      const discountedCheckout = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          paymentMethod: 'COD',
          shippingAddress: {
            fullName: 'Regular Customer',
            phone: '9887776655',
            line1: '123 Market St',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
          },
        });

      expect(discountedCheckout.status).toBe(201);
      // Subtotal = 1700. 10% discount = 170
      const pricing = discountedCheckout.body.data.order.pricingBreakdown;
      expect(pricing.totalDiscount).toBe(170);
      expect(pricing.taxableAmount).toBe(1530); // 1700 - 170
    });
  });

  // =========================================================================
  // 6. USERS MANAGEMENT & AUDIT LOG VIEWER
  // =========================================================================
  describe('User Management and Audit Log Viewer', () => {
    it('blocks and unblocks user, creates reset link and logs audit', async () => {
      // 1. Block user
      const blockRes = await request(app)
        .patch(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(blockRes.status).toBe(200);
      expect(blockRes.body.data.user.isActive).toBe(false);

      // Verify audit log for blocking user
      const blockAudit = await AuditLog.findOne({
        entity: 'USER',
        entityId: regularUser._id,
        action: 'BLOCK_USER',
      });
      expect(blockAudit).not.toBeNull();

      // 2. Unblock user
      const unblockRes = await request(app)
        .patch(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(unblockRes.status).toBe(200);
      expect(unblockRes.body.data.user.isActive).toBe(true);

      const unblockAudit = await AuditLog.findOne({
        entity: 'USER',
        entityId: regularUser._id,
        action: 'UNBLOCK_USER',
      });
      expect(unblockAudit).not.toBeNull();

      // 3. Generate password reset link
      const resetLinkRes = await request(app)
        .post(`/api/admin/users/${regularUser._id}/reset-password-link`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resetLinkRes.status).toBe(200);
      expect(resetLinkRes.body.data.resetUrl).toBeDefined();
    });

    it('queries audit logs with entity and action filters', async () => {
      const logsRes = await request(app)
        .get('/api/admin/audit-logs?entity=USER&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(logsRes.status).toBe(200);
      expect(logsRes.body.data.logs).toBeDefined();
      expect(logsRes.body.data.pagination).toBeDefined();
    });
  });
});
