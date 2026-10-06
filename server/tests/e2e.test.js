const request = require('supertest');
const app = require('../src/app');
const {
  User,
  Category,
  Product,
  Cart,
  Order,
  Coupon,
  DiscountRule,
  WhatsappMessage,
  WhatsappWhitelist,
} = require('../src/models');
const { signToken } = require('../src/utils/jwt');

describe('Full End-to-End (E2E) Commercial Lifecycle Flow', () => {
  test('Complete End-to-End Lifecycle: Register -> Browse -> Cart -> Discount -> Checkout -> Admin Workflow -> WhatsApp Ingestion & Publishing', async () => {
    // -----------------------------------------------------------------------
    // INITIAL SETUP / SEEDING
    // -----------------------------------------------------------------------
    const testCategory = await Category.create({
      name: 'Shower Hinges',
      slug: 'shower-hinges',
      description: 'Heavy duty brass hinges',
      isActive: true,
    });

    const testProduct = await Product.create({
      name: 'Solid Brass 90 Deg Hinge',
      title: 'Solid Brass 90 Deg Hinge',
      slug: 'solid-brass-90-deg-hinge-sh90',
      code: 'SH-90-CP',
      category: testCategory._id,
      finish: 'CP',
      basePrice: 1250,
      baseMrp: 1600,
      variants: [
        {
          sku: 'SH-90-CP-STD',
          size: 'Standard',
          finish: 'CP',
          price: 1250,
          mrp: 1600,
          stock: 45,
          isActive: true,
        },
      ],
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
      isFeatured: true,
    });

    await Coupon.create({
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountAmount: 10,
      minOrderAmount: 1000,
      maxDiscountAmount: 500,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000 * 30),
      isActive: true,
      perUserLimit: 5,
    });

    const adminUser = await User.create({
      fullName: 'Master Admin',
      email: 'master.admin@glassofy.com',
      mobile: '9998887770',
      password: 'SuperAdminPassword123!',
      role: 'ADMIN',
    });
    const adminToken = signToken(adminUser._id);

    await WhatsappWhitelist.create({
      mobile: '919876543210',
      name: 'Rohan Sharma Lead Fabricator',
      role: 'DEALER',
      isActive: true,
    });

    // -----------------------------------------------------------------------
    // 1. CUSTOMER REGISTRATION & AUTHENTICATION
    // -----------------------------------------------------------------------
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Vikram Architectural Fabricators',
        email: 'vikram.orders@fabstore.in',
        mobile: '9876500001',
        password: 'CustomerPassword123!',
        confirmPassword: 'CustomerPassword123!',
        businessName: 'Vikram Glass Ltd',
        gstNumber: '27AAAAA0000A1Z5',
        address: {
          line1: 'Shop 14, Hardware Market',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.user.email).toBe('vikram.orders@fabstore.in');
    const userToken = registerRes.body.data.token;
    expect(userToken).toBeDefined();

    // -----------------------------------------------------------------------
    // 2. BROWSE CATALOGUE & PRODUCT DETAILS
    // -----------------------------------------------------------------------
    const catRes = await request(app).get('/api/categories');
    expect(catRes.status).toBe(200);
    expect(catRes.body.data.length).toBeGreaterThanOrEqual(1);

    const prodRes = await request(app)
      .get('/api/products')
      .query({ category: testCategory.slug, finish: 'CP' });
    expect(prodRes.status).toBe(200);
    expect(prodRes.body.data.products.length).toBeGreaterThanOrEqual(1);

    const detailRes = await request(app).get(`/api/products/${testProduct.slug}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.product.code).toBe('SH-90-CP');
    expect(detailRes.body.data.product.variants.length).toBe(1);

    // -----------------------------------------------------------------------
    // 3. ADD VARIANT TO CART
    // -----------------------------------------------------------------------
    const variantId = testProduct.variants[0]._id;
    const cartAddRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: testProduct._id,
        variantId,
        quantity: 4,
      });

    expect(cartAddRes.status).toBe(200);
    expect(cartAddRes.body.success).toBe(true);
    expect(cartAddRes.body.data.items.length).toBe(1);
    expect(cartAddRes.body.data.items[0].quantity).toBe(4);
    expect(cartAddRes.body.data.items[0].price).toBe(1250);
    expect(cartAddRes.body.data.pricing.subtotal).toBe(5000);

    // -----------------------------------------------------------------------
    // 4. APPLY COUPON DISCOUNT (WELCOME10)
    // -----------------------------------------------------------------------
    const couponRes = await request(app)
      .post('/api/cart/coupon')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        code: 'WELCOME10',
      });

    expect(couponRes.status).toBe(200);
    expect(couponRes.body.success).toBe(true);
    expect(couponRes.body.data.pricing.subtotal).toBe(5000);
    expect(couponRes.body.data.pricing.totalDiscount).toBe(500); // 10% of 5000 = 500
    expect(couponRes.body.data.pricing.taxableAmount).toBe(4500);
    expect(couponRes.body.data.pricing.gst).toBe(810); // 18% GST on 4500
    expect(couponRes.body.data.pricing.shipping).toBe(250); // Under 5000 free shipping threshold
    expect(couponRes.body.data.pricing.grandTotal).toBe(5560);

    // -----------------------------------------------------------------------
    // 5. CHECKOUT ORDER (Cash on Delivery)
    // -----------------------------------------------------------------------
    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethod: 'COD',
        shippingAddress: {
          fullName: 'Vikram Architect',
          phone: '9876500001',
          line1: 'Plot 45, MIDC Industrial Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400093',
        },
        businessName: 'Vikram Glass Ltd',
        gstNumber: '27AAAAA0000A1Z5',
        notes: 'Handle with care: Architectural glass fittings',
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.success).toBe(true);
    expect(checkoutRes.body.data.order.orderStatus).toBe('CONFIRMED');
    const orderId = checkoutRes.body.data.order._id;

    // Verify stock decremented: 45 - 4 = 41
    const productAfter = await Product.findById(testProduct._id);
    expect(productAfter.variants[0].stock).toBe(41);

    // Verify cart is now empty
    const cartVerifyRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(cartVerifyRes.body.data.items.length).toBe(0);

    // -----------------------------------------------------------------------
    // 6. ADMIN MANAGES ORDER STATUS (PACKED -> SHIPPED -> DELIVERED)
    // -----------------------------------------------------------------------
    // 6.1 Packed
    const packRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'PACKED',
        note: 'All items boxed and foam-padded at Mumbai Central Depot',
      });
    expect(packRes.status).toBe(200);
    expect(packRes.body.data.order.orderStatus).toBe('PACKED');

    // 6.2 Shipped
    const shipRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'SHIPPED',
        note: 'Handed over to BlueDart Express',
        trackingNumber: 'BD-EXP-987654321',
      });
    expect(shipRes.status).toBe(200);
    expect(shipRes.body.data.order.orderStatus).toBe('SHIPPED');

    // 6.3 Delivered
    const delRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'DELIVERED',
        note: 'Delivered and verified by client representative',
      });
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.order.orderStatus).toBe('DELIVERED');

    // 6.4 Customer views their updated order
    const custOrderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(custOrderRes.status).toBe(200);
    expect(custOrderRes.body.data.order.orderStatus).toBe('DELIVERED');

    // -----------------------------------------------------------------------
    // 7. WHATSAPP INGESTION & STOREFRONT PUBLISHING
    // -----------------------------------------------------------------------
    const caption = 'Spider Bracket 4 Way | SB-4W-SS | Glass Connectors | SS | 2800 | 30 | Heavy 304 cast stainless steel spider';

    const ingestRes = await request(app)
      .post('/api/whatsapp/simulate')
      .send({
        from: '919876543210',
        senderName: 'Rohan Sharma Lead Fabricator',
        messageType: 'image',
        caption,
      });

    expect(ingestRes.status).toBe(200);
    expect(ingestRes.body.success).toBe(true);

    const msg = await WhatsappMessage.findOne({ senderMobile: '919876543210' }).sort({ createdAt: -1 });
    expect(msg).toBeDefined();
    expect(msg.status).toBe('DRAFT_CREATED');
    expect(msg.product).toBeDefined();

    // Verify draft product is not visible on public storefront
    const publicBeforeRes = await request(app)
      .get('/api/products')
      .query({ search: 'SB-4W-SS' });
    expect(publicBeforeRes.body.data.products.length).toBe(0);

    // Admin publishes draft product
    const publishRes = await request(app)
      .post(`/api/admin/whatsapp/messages/${msg._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.success).toBe(true);
    expect(publishRes.body.data.product.status).toBe('PUBLISHED');

    // Verify product is now instantly searchable on public storefront!
    const publicAfterRes = await request(app)
      .get('/api/products')
      .query({ search: 'SB-4W-SS' });

    expect(publicAfterRes.status).toBe(200);
    expect(publicAfterRes.body.data.products.length).toBe(1);
    expect(publicAfterRes.body.data.products[0].code).toBe('SB-4W-SS');
    expect(publicAfterRes.body.data.products[0].basePrice).toBe(2800);
  });
});
