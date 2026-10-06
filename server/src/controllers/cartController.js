const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const DiscountRule = require('../models/DiscountRule');
const Order = require('../models/Order');
const { calculatePricing } = require('../services/discountEngine');
const { getPricingSettings } = require('../services/settingsService');

/**
 * Validates, syncs live prices and stock, and calculates current pricing breakdown for a cart
 * @param {Object} cart
 * @param {Object} user
 * @returns {Promise<{ cart: Object, enrichedItems: Array, pricingBreakdown: Object }>}
 */
const syncAndEnrichCart = async (cart, user) => {
  let hasModifications = false;
  const enrichedItems = [];
  const validItems = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive || !product.isPublished || product.status !== 'PUBLISHED') {
      hasModifications = true;
      continue; // Skip unpublished or deleted products
    }

    let unitPrice = product.basePrice;
    let availableStock = 100;
    let variantSize = '';
    let variantFinish = product.finish || '';
    let variantSku = product.code || '';
    let bulkPricing = product.bulkPricing || [];

    if (item.variantId && product.variants && product.variants.length > 0) {
      const variant = product.variants.id(item.variantId);
      if (variant && variant.isActive) {
        unitPrice = variant.price;
        availableStock = variant.stock;
        variantSize = variant.size || '';
        variantFinish = variant.finish || product.finish || '';
        variantSku = variant.sku || product.code || '';
        if (variant.bulkPricing && variant.bulkPricing.length > 0) {
          bulkPricing = variant.bulkPricing;
        }
      }
    }

    // Live price update
    if (item.price !== unitPrice) {
      item.price = unitPrice;
      hasModifications = true;
    }

    // Stock check
    if (availableStock <= 0) {
      hasModifications = true;
      continue; // Remove out of stock items
    }

    let finalQuantity = item.quantity;
    if (finalQuantity > availableStock) {
      finalQuantity = availableStock;
      item.quantity = finalQuantity;
      hasModifications = true;
    }

    item.size = variantSize;
    item.finish = variantFinish;

    validItems.push(item);

    enrichedItems.push({
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        title: product.title || product.name,
        slug: product.slug,
        code: product.code,
        images: product.images,
        finish: product.finish,
        category: product.category,
      },
      variantId: item.variantId,
      sku: variantSku,
      size: variantSize,
      finish: variantFinish,
      price: unitPrice,
      quantity: finalQuantity,
      availableStock,
      bulkPricing,
      subtotal: Math.round((unitPrice * finalQuantity + Number.EPSILON) * 100) / 100,
    });
  }

  if (hasModifications || cart.items.length !== validItems.length) {
    cart.items = validItems;
    await cart.save();
  }

  // Load active discount rules and settings
  const [discountRules, settings] = await Promise.all([
    DiscountRule.find({ isActive: true }).sort({ priority: -1 }),
    getPricingSettings(),
  ]);

  // Load coupon and check user usage count
  let couponDoc = null;
  let userCouponUsageCount = 0;

  if (cart.coupon) {
    couponDoc = await Coupon.findById(cart.coupon);
    if (couponDoc && user?._id) {
      userCouponUsageCount = await Order.countDocuments({
        user: user._id,
        'couponApplied.coupon': couponDoc._id,
        paymentStatus: { $ne: 'FAILED' },
      });
    }
  }

  // Pure pricing calculation
  const pricingItems = enrichedItems.map((item) => ({
    productId: item.product._id,
    title: item.product.title,
    code: item.product.code,
    price: item.price,
    quantity: item.quantity,
    bulkPricing: item.bulkPricing,
  }));

  const pricingBreakdown = calculatePricing({
    items: pricingItems,
    coupon: couponDoc,
    discountRules,
    settings,
    user,
    userCouponUsageCount,
  });

  // If coupon is no longer valid, unbind it
  if (couponDoc && pricingBreakdown.couponError) {
    cart.coupon = null;
    cart.totalDiscount = 0;
    await cart.save();
  } else {
    cart.totalDiscount = pricingBreakdown.totalDiscount;
    await cart.save();
  }

  return {
    cart,
    items: enrichedItems,
    pricingBreakdown,
  };
};

/**
 * GET /api/cart
 * Fetch authenticated user's cart with live prices and discounts
 */
const getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const { items, pricingBreakdown } = await syncAndEnrichCart(cart, req.user);

  return res.status(200).json({
    success: true,
    data: {
      items,
      coupon: cart.coupon
        ? await Coupon.findById(cart.coupon).select('code discountType discountAmount')
        : null,
      pricing: pricingBreakdown,
    },
  });
};

/**
 * POST /api/cart/items
 * Add an item to user's cart
 */
const addItem = async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive || !product.isPublished || product.status !== 'PUBLISHED') {
    return res
      .status(404)
      .json({ success: false, message: 'Product is not available for purchase' });
  }

  let unitPrice = product.basePrice;
  let availableStock = 100;
  let variantSize = '';
  let variantFinish = product.finish || '';

  if (variantId && product.variants?.length > 0) {
    const variant = product.variants.id(variantId);
    if (!variant || !variant.isActive) {
      return res
        .status(400)
        .json({ success: false, message: 'Selected variant is currently unavailable' });
    }
    unitPrice = variant.price;
    availableStock = variant.stock;
    variantSize = variant.size || '';
    variantFinish = variant.finish || product.finish || '';
  }

  if (availableStock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${availableStock} unit(s) available in stock`,
    });
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // Check if item already in cart
  const existingIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      String(item.variantId || '') === String(variantId || '')
  );

  if (existingIndex > -1) {
    const newQty = cart.items[existingIndex].quantity + quantity;
    if (newQty > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more. You have ${cart.items[existingIndex].quantity} in cart and stock is ${availableStock}`,
      });
    }
    cart.items[existingIndex].quantity = newQty;
    cart.items[existingIndex].price = unitPrice;
  } else {
    cart.items.push({
      product: productId,
      variantId: variantId || null,
      quantity,
      price: unitPrice,
      size: variantSize,
      finish: variantFinish,
    });
  }

  await cart.save();

  const { items, pricingBreakdown } = await syncAndEnrichCart(cart, req.user);

  return res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: {
      items,
      pricing: pricingBreakdown,
    },
  });
};

/**
 * PUT /api/cart/items/:itemId
 * Update quantity of a cart item
 */
const updateQuantity = async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  const item = cart.items.id(itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found in cart' });
  }

  if (quantity <= 0) {
    cart.items.pull(itemId);
  } else {
    // Check available stock
    const product = await Product.findById(item.product);
    let availableStock = 100;
    if (product) {
      if (item.variantId && product.variants?.length > 0) {
        const variant = product.variants.id(item.variantId);
        if (variant) availableStock = variant.stock;
      }
    }

    if (quantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} units available in stock`,
      });
    }

    item.quantity = quantity;
  }

  await cart.save();

  const { items, pricingBreakdown } = await syncAndEnrichCart(cart, req.user);

  return res.status(200).json({
    success: true,
    message: 'Cart updated',
    data: {
      items,
      pricing: pricingBreakdown,
    },
  });
};

/**
 * DELETE /api/cart/items/:itemId
 * Remove an item from the cart
 */
const removeItem = async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  cart.items.pull(itemId);
  await cart.save();

  const { items, pricingBreakdown } = await syncAndEnrichCart(cart, req.user);

  return res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: {
      items,
      pricing: pricingBreakdown,
    },
  });
};

/**
 * DELETE /api/cart
 * Clear all items and coupons from the cart
 */
const clearCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    cart.coupon = null;
    cart.totalDiscount = 0;
    await cart.save();
  }

  return res.status(200).json({
    success: true,
    message: 'Cart cleared',
    data: {
      items: [],
      pricing: {
        subtotal: 0,
        discounts: [],
        totalDiscount: 0,
        taxableAmount: 0,
        gst: 0,
        shipping: 0,
        grandTotal: 0,
      },
    },
  });
};

/**
 * POST /api/cart/merge
 * Merge guest localStorage cart items into the user's MongoDB cart on login
 */
const mergeCart = async (req, res) => {
  const { items = [] } = req.body;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  for (const guestItem of items) {
    const product = await Product.findById(guestItem.productId);
    if (!product || !product.isActive || !product.isPublished || product.status !== 'PUBLISHED') {
      continue;
    }

    let unitPrice = product.basePrice;
    let availableStock = 100;
    let variantSize = '';
    let variantFinish = product.finish || '';

    if (guestItem.variantId && product.variants?.length > 0) {
      const variant = product.variants.id(guestItem.variantId);
      if (variant && variant.isActive) {
        unitPrice = variant.price;
        availableStock = variant.stock;
        variantSize = variant.size || '';
        variantFinish = variant.finish || product.finish || '';
      }
    }

    if (availableStock <= 0) continue;

    const existingIndex = cart.items.findIndex(
      (ci) =>
        ci.product.toString() === guestItem.productId.toString() &&
        String(ci.variantId || '') === String(guestItem.variantId || '')
    );

    const reqQty = Number(guestItem.quantity) || 1;

    if (existingIndex > -1) {
      const mergedQty = Math.min(cart.items[existingIndex].quantity + reqQty, availableStock);
      cart.items[existingIndex].quantity = mergedQty;
      cart.items[existingIndex].price = unitPrice;
    } else {
      cart.items.push({
        product: guestItem.productId,
        variantId: guestItem.variantId || null,
        quantity: Math.min(reqQty, availableStock),
        price: unitPrice,
        size: variantSize,
        finish: variantFinish,
      });
    }
  }

  await cart.save();

  const { items: enrichedItems, pricingBreakdown } = await syncAndEnrichCart(cart, req.user);

  return res.status(200).json({
    success: true,
    message: 'Cart merged successfully',
    data: {
      items: enrichedItems,
      pricing: pricingBreakdown,
    },
  });
};

/**
 * POST /api/cart/coupon
 * Apply coupon to cart
 */
const applyCoupon = async (req, res) => {
  const { code } = req.body;

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid coupon code' });
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  cart.coupon = coupon._id;
  await cart.save();

  const { items, pricingBreakdown } = await syncAndEnrichCart(cart, req.user);

  if (pricingBreakdown.couponError) {
    cart.coupon = null;
    await cart.save();
    return res.status(400).json({ success: false, message: pricingBreakdown.couponError });
  }

  return res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} applied successfully!`,
    data: {
      items,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountAmount: coupon.discountAmount,
      },
      pricing: pricingBreakdown,
    },
  });
};

/**
 * DELETE /api/cart/coupon
 * Remove active coupon
 */
const removeCoupon = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.coupon = null;
    cart.totalDiscount = 0;
    await cart.save();
  }

  const { items, pricingBreakdown } = await syncAndEnrichCart(cart, req.user);

  return res.status(200).json({
    success: true,
    message: 'Coupon removed',
    data: {
      items,
      pricing: pricingBreakdown,
    },
  });
};

module.exports = {
  syncAndEnrichCart,
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  mergeCart,
  applyCoupon,
  removeCoupon,
};
