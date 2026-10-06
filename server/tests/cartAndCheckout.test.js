const request = require('supertest');
const app = require('../src/app');
const { Product, Category, User, Coupon, Order, Cart } = require('../src/models');
const { signToken } = require('../src/utils/jwt');

describe('Cart and Checkout Integration Tests', () => {
  let userToken;
  let userId;
  let testCategory;
  let testProduct;
  let variantId;
  let testCoupon;

  beforeEach(async () => {
    // 1. Create Test User
    const user = await User.create({
      fullName: 'Rohan Sharma',
      email: `rohan_${Date.now()}@example.com`,
      mobile: '9876543210',
      password: 'Password@123',
      role: 'USER',
      businessName: 'Sharma Glass Fabricators',
      gstNumber: '27AABCU9603R1ZX',
      address: {
        line1: 'Plot 42, Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400013',
      },
    });
    userId = user._id;
    userToken = signToken(user._id);

    // 2. Create Category
    testCategory = await Category.create({
      name: 'Shower Hinges',
      slug: `shower-hinges-${Date.now()}`,
      isActive: true,
    });

    // 3. Create Product with Variants and Stock
    testProduct = await Product.create({
      name: 'Heavy Brass Shower Hinge 90 Deg',
      title: 'Heavy Brass Shower Hinge 90 Deg',
      slug: `heavy-brass-shower-hinge-90-${Date.now()}`,
      code: `SH-90-${Date.now()}`,
      description: 'Solid brass shower hinge with chrome finish',
      category: testCategory._id,
      finish: 'CP',
      basePrice: 1200,
      variants: [
        {
          sku: 'SH-90-CP',
          size: 'Standard',
          finish: 'CP',
          price: 1200,
          stock: 50,
          isActive: true,
        },
      ],
      status: 'PUBLISHED',
      isPublished: true,
      isActive: true,
    });
    variantId = testProduct.variants[0]._id;

    // 4. Create Active Coupon
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);

    testCoupon = await Coupon.create({
      code: `SAVE10_${Date.now()}`,
      discountType: 'PERCENTAGE',
      discountAmount: 10,
      minOrderAmount: 1000,
      endDate: futureDate,
      usageLimit: 100,
      perUserLimit: 2,
      isActive: true,
    });
  });

  describe('Cart Operations', () => {
    it('GET /api/cart - should return empty cart for new user', async () => {
      const res = await request(app).get('/api/cart').set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.pricing.grandTotal).toBe(0);
    });

    it('POST /api/cart/items - should add item and calculate server price & stock', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id.toString(),
          variantId: variantId.toString(),
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].price).toBe(1200);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.pricing.subtotal).toBe(2400);
    });

    it('POST /api/cart/items - should reject quantity exceeding stock', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id.toString(),
          variantId: variantId.toString(),
          quantity: 100, // available is 50
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only 50 unit(s) available');
    });

    it('PUT /api/cart/items/:itemId - should update quantity', async () => {
      // Add first
      const addRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct._id.toString(),
          variantId: variantId.toString(),
          quantity: 2,
        });

      const itemId = addRes.body.data.items[0]._id;

      // Update quantity
      const updateRes = await request(app)
        .put(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 5 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.items[0].quantity).toBe(5);
      expect(updateRes.body.data.pricing.subtotal).toBe(6000);
    });

    it('POST /api/cart/merge - should merge guest localStorage items into user cart', async () => {
      const guestItems = [
        {
          productId: testProduct._id.toString(),
          variantId: variantId.toString(),
          quantity: 3,
        },
      ];

      const res = await request(app)
        .post('/api/cart/merge')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ items: guestItems });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(3);
    });

    it('POST /api/cart/coupon - should apply coupon to cart', async () => {
      // Add item to cart first (2 units @ 1200 = 2400)
      await request(app).post('/api/cart/items').set('Authorization', `Bearer ${userToken}`).send({
        productId: testProduct._id.toString(),
        variantId: variantId.toString(),
        quantity: 2,
      });

      const couponRes = await request(app)
        .post('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: testCoupon.code });

      expect(couponRes.status).toBe(200);
      expect(couponRes.body.success).toBe(true);
      // 10% of 2400 = 240 discount
      expect(couponRes.body.data.pricing.totalDiscount).toBe(240);
      expect(couponRes.body.data.pricing.taxableAmount).toBe(2160);
    });
  });

  describe('Checkout and Orders', () => {
    const validShippingAddress = {
      fullName: 'Rohan Sharma',
      phone: '9876543210',
      line1: 'Shop 14, Trade Center',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400013',
    };

    it('POST /api/orders/checkout (COD) - should create order, decrement stock, and clear cart', async () => {
      // Add 4 units to cart
      await request(app).post('/api/cart/items').set('Authorization', `Bearer ${userToken}`).send({
        productId: testProduct._id.toString(),
        variantId: variantId.toString(),
        quantity: 4,
      });

      const initialStock = testProduct.variants[0].stock; // 50

      const checkoutRes = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          paymentMethod: 'COD',
        });

      expect(checkoutRes.status).toBe(201);
      expect(checkoutRes.body.success).toBe(true);
      const order = checkoutRes.body.data.order;
      expect(order.orderStatus).toBe('CONFIRMED');
      expect(order.paymentMethod).toBe('COD');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(4);

      // Verify stock was decremented in database
      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.variants[0].stock).toBe(initialStock - 4);

      // Verify cart was cleared
      const cart = await Cart.findOne({ user: userId });
      expect(cart.items).toHaveLength(0);
    });

    it('Razorpay checkout flow: failed payment must leave stock unchanged', async () => {
      // Add 2 units
      await request(app).post('/api/cart/items').set('Authorization', `Bearer ${userToken}`).send({
        productId: testProduct._id.toString(),
        variantId: variantId.toString(),
        quantity: 2,
      });

      const initialStock = 50;

      // 1. Checkout (pending order created)
      const checkoutRes = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          paymentMethod: 'RAZORPAY',
        });

      expect(checkoutRes.status).toBe(200);
      const orderId = checkoutRes.body.data.order._id;
      const rzpOrderId = checkoutRes.body.data.razorpay.orderId;

      // Verify stock has NOT decremented yet
      let prod = await Product.findById(testProduct._id);
      expect(prod.variants[0].stock).toBe(initialStock);

      // 2. Simulate failed signature verification
      const verifyRes = await request(app)
        .post('/api/orders/verify-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: 'pay_test_failed_123',
          razorpaySignature: 'invalid_fraudulent_signature',
        });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.message).toContain('Payment verification failed');

      // Verify stock STILL completely untouched
      prod = await Product.findById(testProduct._id);
      expect(prod.variants[0].stock).toBe(initialStock);

      // Verify order is marked CANCELLED / FAILED
      const order = await Order.findById(orderId);
      expect(order.paymentStatus).toBe('FAILED');
      expect(order.orderStatus).toBe('CANCELLED');
    });

    it('Razorpay checkout flow: valid payment confirms order and decrements stock', async () => {
      // Add 3 units
      await request(app).post('/api/cart/items').set('Authorization', `Bearer ${userToken}`).send({
        productId: testProduct._id.toString(),
        variantId: variantId.toString(),
        quantity: 3,
      });

      const initialStock = 50;

      const checkoutRes = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          paymentMethod: 'RAZORPAY',
        });

      const orderId = checkoutRes.body.data.order._id;
      const rzpOrderId = checkoutRes.body.data.razorpay.orderId;

      // Verify with test signature
      const verifyRes = await request(app)
        .post('/api/orders/verify-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: 'pay_test_success_999',
          razorpaySignature: 'valid_test_signature',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      const confirmedOrder = verifyRes.body.data.order;
      expect(confirmedOrder.paymentStatus).toBe('PAID');
      expect(confirmedOrder.orderStatus).toBe('CONFIRMED');

      // Stock is decremented now
      const prod = await Product.findById(testProduct._id);
      expect(prod.variants[0].stock).toBe(initialStock - 3);
    });

    it('PUT /api/orders/:id/cancel - should cancel order and restore stock', async () => {
      // Create confirmed COD order with 5 units
      await request(app).post('/api/cart/items').set('Authorization', `Bearer ${userToken}`).send({
        productId: testProduct._id.toString(),
        variantId: variantId.toString(),
        quantity: 5,
      });

      const checkoutRes = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          paymentMethod: 'COD',
        });

      const orderId = checkoutRes.body.data.order._id;
      let prod = await Product.findById(testProduct._id);
      expect(prod.variants[0].stock).toBe(45); // 50 - 5

      // Cancel order
      const cancelRes = await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Project plan revised' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.order.orderStatus).toBe('CANCELLED');

      // Verify stock restored to 50
      prod = await Product.findById(testProduct._id);
      expect(prod.variants[0].stock).toBe(50);
    });

    it('GET /api/orders/:id/invoice - should generate and stream PDF invoice', async () => {
      await request(app).post('/api/cart/items').set('Authorization', `Bearer ${userToken}`).send({
        productId: testProduct._id.toString(),
        variantId: variantId.toString(),
        quantity: 2,
      });

      const checkoutRes = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: validShippingAddress,
          paymentMethod: 'COD',
        });

      const orderId = checkoutRes.body.data.order._id;

      const invoiceRes = await request(app)
        .get(`/api/orders/${orderId}/invoice`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(invoiceRes.status).toBe(200);
      expect(invoiceRes.header['content-type']).toContain('application/pdf');
      expect(invoiceRes.header['content-disposition']).toContain('attachment');
      expect(invoiceRes.body).toBeDefined();
    });
  });
});
