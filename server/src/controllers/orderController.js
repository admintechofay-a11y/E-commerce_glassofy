const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const DiscountRule = require('../models/DiscountRule');
const { calculatePricing } = require('../services/discountEngine');
const { getPricingSettings } = require('../services/settingsService');
const { runInTransaction } = require('../utils/transaction');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const { generateInvoicePdf } = require('../services/invoiceService');

/**
 * Generate a unique human-friendly order number (e.g. GLAS-2026-8491)
 */
const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GLAS-${year}-${rand}-${Date.now().toString().slice(-4)}`;
};

/**
 * Initialize Razorpay client if credentials are configured
 */
const getRazorpayClient = async () => {
  const settings = await getPricingSettings();
  const key_id = process.env.RAZORPAY_KEY_ID || settings.razorpayKeyId;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || settings.razorpayKeySecret;

  if (key_id && key_secret && !key_id.includes('mock')) {
    return {
      client: new Razorpay({ key_id, key_secret }),
      keyId: key_id,
      keySecret: key_secret,
      isMock: false,
    };
  }

  return {
    client: null,
    keyId: key_id || 'rzp_test_mock_glassofy',
    keySecret: key_secret || 'rzp_mock_secret',
    isMock: true,
  };
};

/**
 * POST /api/orders/checkout
 * Initiate checkout from cart, validate stock & pricing, create order (or Razorpay order)
 */
const checkout = async (req, res) => {
  const {
    shippingAddress,
    billingAddress,
    businessName,
    gstNumber,
    paymentMethod = 'RAZORPAY',
    notes,
  } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Your cart is empty' });
  }

  // Snapshot & Stock Validation
  const orderItems = [];
  const pricingItems = [];
  const productStockUpdates = []; // [{ product, variantId, qty }]

  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive || !product.isPublished || product.status !== 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        message: `Product "${product?.name || 'Selected item'}" is no longer available`,
      });
    }

    let unitPrice = product.basePrice;
    let availableStock = 100;
    let variantSize = item.size || '';
    let variantFinish = item.finish || product.finish || '';
    let variantSku = product.code || '';
    let bulkPricing = product.bulkPricing || [];

    if (item.variantId && product.variants?.length > 0) {
      const variant = product.variants.id(item.variantId);
      if (!variant || !variant.isActive) {
        return res.status(400).json({
          success: false,
          message: `Selected variant for "${product.name}" is no longer available`,
        });
      }
      unitPrice = variant.price;
      availableStock = variant.stock;
      variantSize = variant.size || variantSize;
      variantFinish = variant.finish || variantFinish;
      variantSku = variant.sku || variantSku;
      if (variant.bulkPricing?.length > 0) {
        bulkPricing = variant.bulkPricing;
      }
    }

    if (availableStock < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${product.name}". Available: ${availableStock}, requested: ${item.quantity}`,
      });
    }

    productStockUpdates.push({
      product,
      variantId: item.variantId,
      quantity: item.quantity,
    });

    const itemSubtotal = Math.round((unitPrice * item.quantity + Number.EPSILON) * 100) / 100;

    orderItems.push({
      product: product._id,
      variantId: item.variantId || null,
      title: product.title || product.name,
      code: variantSku || product.code,
      finish: variantFinish,
      size: variantSize,
      price: unitPrice,
      quantity: item.quantity,
      subtotal: itemSubtotal,
    });

    pricingItems.push({
      productId: product._id,
      title: product.title || product.name,
      code: variantSku || product.code,
      price: unitPrice,
      quantity: item.quantity,
      bulkPricing,
    });
  }

  // Calculate authoritative pricing on the server
  const [discountRules, settings] = await Promise.all([
    DiscountRule.find({ isActive: true }).sort({ priority: -1 }),
    getPricingSettings(),
  ]);

  let couponDoc = null;
  let userCouponUsageCount = 0;

  if (cart.coupon) {
    couponDoc = await Coupon.findById(cart.coupon);
    if (couponDoc) {
      userCouponUsageCount = await Order.countDocuments({
        user: req.user._id,
        'couponApplied.coupon': couponDoc._id,
        paymentStatus: { $ne: 'FAILED' },
      });
    }
  }

  const pricing = calculatePricing({
    items: pricingItems,
    coupon: couponDoc,
    discountRules,
    settings,
    user: req.user,
    userCouponUsageCount,
  });

  const orderNumber = generateOrderNumber();

  // If Cash on Delivery, confirm immediately inside MongoDB transaction
  if (paymentMethod === 'COD') {
    const createdOrder = await runInTransaction(async (session) => {
      // 1. Decrement stock
      for (const update of productStockUpdates) {
        const prod = await Product.findById(update.product._id).session(session);
        if (update.variantId && prod.variants?.length > 0) {
          const v = prod.variants.id(update.variantId);
          if (v.stock < update.quantity) {
            throw new Error(`Insufficient stock for ${prod.name} variant`);
          }
          v.stock -= update.quantity;
        }
        await prod.save({ session });
      }

      // 2. Increment coupon usage
      if (couponDoc && !pricing.couponError && pricing.discounts.some((d) => d.type === 'COUPON')) {
        const c = await Coupon.findById(couponDoc._id).session(session);
        c.usageCount += 1;
        const userUsage = c.usedBy.find(
          (u) => u.user && u.user.toString() === req.user._id.toString()
        );
        if (userUsage) {
          userUsage.count += 1;
        } else {
          c.usedBy.push({ user: req.user._id, count: 1 });
        }
        await c.save({ session });
      }

      // 3. Create Order
      const newOrder = new Order({
        orderNumber,
        user: req.user._id,
        items: orderItems,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        businessName: businessName || req.user.businessName || '',
        gstNumber: gstNumber || req.user.gstNumber || '',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
        statusHistory: [
          {
            status: 'CONFIRMED',
            note: 'Order confirmed with Cash on Delivery (COD)',
            timestamp: new Date(),
          },
        ],
        subtotal: pricing.subtotal,
        discount: pricing.totalDiscount,
        tax: pricing.gst,
        shippingFee: pricing.shipping,
        total: pricing.grandTotal,
        pricingBreakdown: pricing,
        couponApplied:
          couponDoc && pricing.discounts.some((d) => d.type === 'COUPON')
            ? {
                coupon: couponDoc._id,
                code: couponDoc.code,
                amount: pricing.discounts.find((d) => d.type === 'COUPON')?.amount || 0,
              }
            : undefined,
        notes,
      });

      await newOrder.save({ session });

      // 4. Clear cart
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { items: [], coupon: null, totalDiscount: 0 } },
        { session }
      );

      return newOrder;
    });

    // Send confirmation email asynchronously
    sendOrderConfirmationEmail(createdOrder, req.user).catch((e) =>
      console.error('Confirmation email error:', e.message)
    );

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order: createdOrder,
      },
    });
  }

  // PaymentMethod is ONLINE / RAZORPAY
  const rzpInfo = await getRazorpayClient();
  let rzpOrderId = '';

  if (!rzpInfo.isMock && rzpInfo.client) {
    try {
      const rzpOrder = await rzpInfo.client.orders.create({
        amount: Math.round(pricing.grandTotal * 100),
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          orderNumber,
          userId: req.user._id.toString(),
        },
      });
      rzpOrderId = rzpOrder.id;
    } catch (err) {
      console.error(
        'Razorpay order creation failed, falling back to mock test order:',
        err.message
      );
      rzpOrderId = `order_test_${Date.now()}`;
    }
  } else {
    rzpOrderId = `order_test_${Date.now()}`;
  }

  // Create Order in PENDING status (Stock not decremented until payment succeeds)
  const pendingOrder = new Order({
    orderNumber,
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    businessName: businessName || req.user.businessName || '',
    gstNumber: gstNumber || req.user.gstNumber || '',
    paymentMethod: 'RAZORPAY',
    paymentStatus: 'PENDING',
    orderStatus: 'PENDING',
    statusHistory: [
      {
        status: 'PENDING',
        note: 'Order initiated, awaiting Razorpay payment',
        timestamp: new Date(),
      },
    ],
    razorpayOrderId: rzpOrderId,
    subtotal: pricing.subtotal,
    discount: pricing.totalDiscount,
    tax: pricing.gst,
    shippingFee: pricing.shipping,
    total: pricing.grandTotal,
    pricingBreakdown: pricing,
    couponApplied:
      couponDoc && pricing.discounts.some((d) => d.type === 'COUPON')
        ? {
            coupon: couponDoc._id,
            code: couponDoc.code,
            amount: pricing.discounts.find((d) => d.type === 'COUPON')?.amount || 0,
          }
        : undefined,
    notes,
  });

  await pendingOrder.save();

  return res.status(200).json({
    success: true,
    data: {
      order: pendingOrder,
      razorpay: {
        keyId: rzpInfo.keyId,
        orderId: rzpOrderId,
        amount: Math.round(pricing.grandTotal * 100),
        currency: 'INR',
        isMock: rzpInfo.isMock,
      },
    },
  });
};

/**
 * POST /api/orders/verify-payment
 * Verify server-side Razorpay signature and commit order inside a transaction
 */
const verifyPayment = async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  if (order.paymentStatus === 'PAID') {
    return res
      .status(200)
      .json({ success: true, message: 'Payment already verified', data: { order } });
  }

  // Server-side Signature Verification
  const rzpInfo = await getRazorpayClient();
  let isValidSignature = false;

  if (rzpInfo.isMock) {
    // In dev / mock test mode, accept simulated signature or HMAC with mock secret
    const expectedSignature = crypto
      .createHmac('sha256', rzpInfo.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    isValidSignature =
      razorpaySignature === expectedSignature ||
      razorpaySignature.startsWith('mock_sig_') ||
      razorpaySignature === 'valid_test_signature';
  } else {
    const expectedSignature = crypto
      .createHmac('sha256', rzpInfo.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    isValidSignature = razorpaySignature === expectedSignature;
  }

  if (!isValidSignature) {
    // A failed payment must leave stock unchanged
    order.paymentStatus = 'FAILED';
    order.orderStatus = 'CANCELLED';
    order.statusHistory.push({
      status: 'CANCELLED',
      note: 'Payment verification failed: invalid signature',
      timestamp: new Date(),
    });
    await order.save();

    return res.status(400).json({
      success: false,
      message: 'Payment verification failed. Stock remains unchanged.',
    });
  }

  // Execute in transaction: decrement stock, apply coupon usage, mark confirmed
  const confirmedOrder = await runInTransaction(async (session) => {
    const liveOrder = await Order.findById(orderId).session(session);

    // 1. Decrement stock
    for (const item of liveOrder.items) {
      const prod = await Product.findById(item.product).session(session);
      if (!prod) {
        throw new Error(`Product ${item.title} no longer exists`);
      }
      if (item.variantId && prod.variants?.length > 0) {
        const v = prod.variants.id(item.variantId);
        if (v.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${prod.name} (${v.size || v.finish})`);
        }
        v.stock -= item.quantity;
      }
      await prod.save({ session });
    }

    // 2. Increment coupon usage
    if (liveOrder.couponApplied?.coupon) {
      const c = await Coupon.findById(liveOrder.couponApplied.coupon).session(session);
      if (c) {
        c.usageCount += 1;
        const userUsage = c.usedBy.find(
          (u) => u.user && u.user.toString() === req.user._id.toString()
        );
        if (userUsage) {
          userUsage.count += 1;
        } else {
          c.usedBy.push({ user: req.user._id, count: 1 });
        }
        await c.save({ session });
      }
    }

    // 3. Mark paid and confirmed
    liveOrder.paymentStatus = 'PAID';
    liveOrder.orderStatus = 'CONFIRMED';
    liveOrder.razorpayOrderId = razorpayOrderId;
    liveOrder.razorpayPaymentId = razorpayPaymentId;
    liveOrder.razorpaySignature = razorpaySignature;
    liveOrder.statusHistory.push({
      status: 'CONFIRMED',
      note: `Payment verified successfully via Razorpay (Payment ID: ${razorpayPaymentId})`,
      timestamp: new Date(),
    });

    await liveOrder.save({ session });

    // 4. Clear user's cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], coupon: null, totalDiscount: 0 } },
      { session }
    );

    return liveOrder;
  });

  // Send confirmation email
  sendOrderConfirmationEmail(confirmedOrder, req.user).catch((e) =>
    console.error('Confirmation email error:', e.message)
  );

  return res.status(200).json({
    success: true,
    message: 'Payment verified and order confirmed',
    data: {
      order: confirmedOrder,
    },
  });
};

/**
 * GET /api/orders
 * Get list of orders for the current user
 */
const getMyOrders = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: req.user._id }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    },
  });
};

/**
 * GET /api/orders/:id
 * Get single order with tracking timeline
 */
const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  return res.status(200).json({
    success: true,
    data: {
      order,
    },
  });
};

/**
 * PUT /api/orders/:id/cancel
 * Cancel order (allowed when PENDING, CONFIRMED, or PACKED), restoring stock
 */
const cancelOrder = async (req, res) => {
  const { reason = 'Cancelled by customer' } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  if (['SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.orderStatus)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel an order that is already ${order.orderStatus}`,
    });
  }

  const cancelledOrder = await runInTransaction(async (session) => {
    const liveOrder = await Order.findById(req.params.id).session(session);

    // If order was confirmed (and stock was decremented), restore stock
    if (liveOrder.orderStatus === 'CONFIRMED' || liveOrder.orderStatus === 'PACKED') {
      for (const item of liveOrder.items) {
        const prod = await Product.findById(item.product).session(session);
        if (prod && item.variantId && prod.variants?.length > 0) {
          const v = prod.variants.id(item.variantId);
          if (v) {
            v.stock += item.quantity;
          }
          await prod.save({ session });
        }
      }

      // Restore coupon usage
      if (liveOrder.couponApplied?.coupon) {
        const c = await Coupon.findById(liveOrder.couponApplied.coupon).session(session);
        if (c && c.usageCount > 0) {
          c.usageCount -= 1;
          const userUsage = c.usedBy.find(
            (u) => u.user && u.user.toString() === req.user._id.toString()
          );
          if (userUsage && userUsage.count > 0) {
            userUsage.count -= 1;
          }
          await c.save({ session });
        }
      }
    }

    liveOrder.orderStatus = 'CANCELLED';
    liveOrder.cancelReason = reason;
    liveOrder.cancelledAt = new Date();
    liveOrder.statusHistory.push({
      status: 'CANCELLED',
      note: `Cancelled by ${req.user.role === 'ADMIN' ? 'Admin' : 'Customer'}: ${reason}`,
      timestamp: new Date(),
      updatedBy: req.user._id,
    });

    await liveOrder.save({ session });
    return liveOrder;
  });

  return res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      order: cancelledOrder,
    },
  });
};

/**
 * GET /api/orders/:id/invoice
 * Download tax invoice PDF
 */
const downloadInvoice = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.orderNumber}.pdf"`);

  generateInvoicePdf(order, req.user, res);
};

module.exports = {
  checkout,
  verifyPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
};
