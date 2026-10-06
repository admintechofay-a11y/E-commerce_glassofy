/**
 * Glassofy Pure Discount & Pricing Engine
 *
 * Responsibilities:
 * - Cart-total tiers from DiscountRule collection
 * - Per-product bulk quantity tiers
 * - Coupons (expiry, usageLimit, perUserLimit, minOrderAmount, percentage or flat/fixed)
 * - Stacking modes from Settings ("best-of" or "stack")
 * - Full financial breakdown with consistent 2-decimal money rounding
 */

/**
 * Standard rounding to 2 decimal places with epsilon precision
 * @param {number} num
 * @returns {number}
 */
const round2 = (num) => {
  const val = Number(num);
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Validates whether a coupon is eligible for given subtotal and user context
 * @param {Object} coupon
 * @param {number} subtotal
 * @param {Object|null} user
 * @param {number} userUsageCount
 * @param {Date} [referenceDate]
 * @returns {{ valid: boolean, error?: string }}
 */
const validateCoupon = (
  coupon,
  subtotal,
  _user = null,
  userUsageCount = 0,
  referenceDate = new Date()
) => {
  if (!coupon) {
    return { valid: false, error: 'No coupon provided' };
  }

  if (coupon.isActive === false) {
    return { valid: false, error: 'Coupon is inactive' };
  }

  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { valid: false, error: 'Coupon is not yet active' };
  }

  if (coupon.endDate && new Date(coupon.endDate) < now) {
    return { valid: false, error: 'Coupon has expired' };
  }

  const minOrder = Number(coupon.minOrderAmount) || 0;
  if (subtotal < minOrder) {
    return { valid: false, error: `Minimum order amount of ₹${minOrder} required` };
  }

  const totalLimit = Number(coupon.usageLimit) || 0;
  const currentTotalUsage = Number(coupon.usageCount) || 0;
  if (totalLimit > 0 && currentTotalUsage >= totalLimit) {
    return { valid: false, error: 'Coupon usage limit has been reached' };
  }

  const perUserLimit = Number(coupon.perUserLimit) || 0;
  if (perUserLimit > 0 && userUsageCount >= perUserLimit) {
    return { valid: false, error: 'Coupon usage limit reached for your account' };
  }

  return { valid: true };
};

/**
 * Calculate per-product bulk quantity discounts
 * @param {Array} items
 * @returns {{ bulkDiscounts: Array, totalBulkDiscount: number }}
 */
const calculateBulkDiscounts = (items = []) => {
  const bulkDiscounts = [];
  let totalBulkDiscount = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    if (qty <= 0 || price <= 0) continue;

    const tiers = Array.isArray(item.bulkPricing) ? item.bulkPricing : [];
    if (!tiers.length) continue;

    // Filter tiers where item quantity meets or exceeds minQty
    const qualifyingTiers = tiers.filter((t) => qty >= (Number(t.minQty) || 1));
    if (!qualifyingTiers.length) continue;

    // Pick highest minQty tier
    qualifyingTiers.sort((a, b) => (Number(b.minQty) || 0) - (Number(a.minQty) || 0));
    const bestTier = qualifyingTiers[0];

    let itemDiscount = 0;
    let label = '';

    if (bestTier.discountPercentage && Number(bestTier.discountPercentage) > 0) {
      const pct = Number(bestTier.discountPercentage);
      const discountPerUnit = round2(price * (pct / 100));
      itemDiscount = round2(discountPerUnit * qty);
      label = `Bulk discount: ${pct}% off (${item.title || item.name || 'Item'})`;
    } else if (
      bestTier.fixedPrice &&
      Number(bestTier.fixedPrice) > 0 &&
      Number(bestTier.fixedPrice) < price
    ) {
      const fp = Number(bestTier.fixedPrice);
      const discountPerUnit = round2(price - fp);
      itemDiscount = round2(discountPerUnit * qty);
      label = `Bulk special pricing (₹${fp}/unit) for ${item.title || item.name || 'Item'}`;
    }

    if (itemDiscount > 0) {
      bulkDiscounts.push({
        type: 'BULK',
        label,
        amount: itemDiscount,
        productId: item.productId || item.product,
        variantId: item.variantId || null,
        code: item.code || '',
      });
      totalBulkDiscount = round2(totalBulkDiscount + itemDiscount);
    }
  }

  return { bulkDiscounts, totalBulkDiscount: round2(totalBulkDiscount) };
};

/**
 * Calculate Cart-total tier discounts from DiscountRule collection
 * @param {number} subtotal
 * @param {Array} discountRules
 * @returns {Object|null}
 */
const calculateCartTierDiscount = (subtotal, discountRules = []) => {
  if (!discountRules || !discountRules.length || subtotal <= 0) return null;

  const cartRules = discountRules.filter(
    (r) => r.ruleType === 'CART_TOTAL' && r.isActive !== false
  );

  const qualifyingRules = [];

  for (const rule of cartRules) {
    const conditions = rule.conditions || {};
    const min = Number(conditions.minAmount ?? conditions.minCartTotal ?? 0);
    const max = conditions.maxAmount ?? conditions.maxCartTotal;

    if (subtotal < min) continue;
    if (max !== undefined && max !== null && subtotal > Number(max)) continue;

    let discountAmount = 0;
    if (rule.discountPercentage && Number(rule.discountPercentage) > 0) {
      discountAmount = round2(subtotal * (Number(rule.discountPercentage) / 100));
    } else if (rule.discountAmount && Number(rule.discountAmount) > 0) {
      discountAmount = round2(Number(rule.discountAmount));
    }

    if (discountAmount > 0) {
      qualifyingRules.push({
        type: 'CART_TIER',
        ruleId: rule._id,
        label: rule.name || `Cart Tier Discount (${rule.discountPercentage || 0}%)`,
        amount: discountAmount,
        priority: Number(rule.priority) || 0,
      });
    }
  }

  if (!qualifyingRules.length) return null;

  // Pick rule with largest discount, or highest priority if amounts equal
  qualifyingRules.sort((a, b) => b.amount - a.amount || b.priority - a.priority);
  return qualifyingRules[0];
};

/**
 * Calculate coupon discount
 * @param {Object} coupon
 * @param {number} subtotal
 * @returns {Object|null}
 */
const calculateCouponDiscount = (coupon, subtotal) => {
  if (!coupon || subtotal <= 0) return null;

  const dtype = (coupon.discountType || 'PERCENTAGE').toUpperCase();
  const damount = Number(coupon.discountAmount) || 0;
  let amount = 0;

  if (dtype === 'PERCENTAGE') {
    amount = round2(subtotal * (damount / 100));
    const maxDiscount = Number(coupon.maxDiscountAmount) || 0;
    if (maxDiscount > 0 && amount > maxDiscount) {
      amount = maxDiscount;
    }
  } else if (dtype === 'FIXED' || dtype === 'FLAT') {
    amount = Math.min(damount, subtotal);
  }

  amount = round2(amount);
  if (amount <= 0) return null;

  return {
    type: 'COUPON',
    code: coupon.code,
    label: `Coupon (${coupon.code})`,
    amount,
    couponId: coupon._id || null,
  };
};

/**
 * Main Pure Pricing Calculation Function
 *
 * @param {Object} options
 * @param {Array} options.items - Cart items [{ price, quantity, bulkPricing, title, code, ... }]
 * @param {Object|null} [options.coupon] - Coupon document
 * @param {Array} [options.discountRules] - Active discount rules
 * @param {Object} [options.settings] - App settings { stackingMode, gstRate, freeShippingThreshold, flatShippingRate }
 * @param {Object|null} [options.user] - User object
 * @param {number} [options.userCouponUsageCount] - Number of times user used this coupon
 * @param {Date} [options.referenceDate] - Date for validity testing
 * @returns {Object} Full breakdown
 */
const calculatePricing = ({
  items = [],
  coupon = null,
  discountRules = [],
  settings = {},
  user = null,
  userCouponUsageCount = 0,
  referenceDate = new Date(),
} = {}) => {
  // 1. Calculate raw subtotal
  let subtotal = 0;
  for (const item of items) {
    const p = Number(item.price) || 0;
    const q = Number(item.quantity) || 1;
    subtotal = round2(subtotal + round2(p * q));
  }
  subtotal = round2(subtotal);

  if (subtotal <= 0) {
    return {
      subtotal: 0,
      discounts: [],
      totalDiscount: 0,
      taxableAmount: 0,
      gst: 0,
      gstRate: Number(settings?.gstRate ?? 0.18),
      shipping: 0,
      grandTotal: 0,
      couponError: null,
      stackingMode: settings?.stackingMode || 'best-of',
    };
  }

  // 2. Calculate bulk quantity discounts
  const { bulkDiscounts, totalBulkDiscount } = calculateBulkDiscounts(items);

  // 3. Calculate cart tier discount from DiscountRule collection
  const cartTierDiscount = calculateCartTierDiscount(subtotal, discountRules);

  // 4. Validate and calculate coupon discount
  let couponDiscount = null;
  let couponError = null;

  if (coupon) {
    const validation = validateCoupon(coupon, subtotal, user, userCouponUsageCount, referenceDate);

    if (validation.valid) {
      couponDiscount = calculateCouponDiscount(coupon, subtotal);
    } else {
      couponError = validation.error;
    }
  }

  // 5. Stacking Mode Logic ("best-of" or "stack")
  const stackingMode = (settings?.stackingMode || 'best-of').toLowerCase();
  let appliedDiscounts = [];

  if (stackingMode === 'stack') {
    // In stack mode, all qualifying discounts combine
    if (bulkDiscounts.length > 0) {
      appliedDiscounts.push(...bulkDiscounts);
    }
    if (cartTierDiscount) {
      appliedDiscounts.push(cartTierDiscount);
    }
    if (couponDiscount) {
      appliedDiscounts.push(couponDiscount);
    }
  } else {
    // "best-of" mode: Compare options and award the highest discount
    // Option A: Bulk discounts
    // Option B: Cart-total tier discount
    // Option C: Coupon discount
    const candidates = [];

    if (bulkDiscounts.length > 0) {
      candidates.push({
        name: 'BULK',
        total: totalBulkDiscount,
        discounts: bulkDiscounts,
      });
    }

    if (cartTierDiscount) {
      candidates.push({
        name: 'CART_TIER',
        total: cartTierDiscount.amount,
        discounts: [cartTierDiscount],
      });
    }

    if (couponDiscount) {
      candidates.push({
        name: 'COUPON',
        total: couponDiscount.amount,
        discounts: [couponDiscount],
      });
    }

    if (candidates.length > 0) {
      // Sort candidates by total discount descending
      candidates.sort((a, b) => b.total - a.total);
      appliedDiscounts = [...candidates[0].discounts];
    }
  }

  // Calculate sum of applied discounts, capped at subtotal
  const rawDiscountSum = appliedDiscounts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalDiscount = round2(Math.min(rawDiscountSum, subtotal));

  // 6. Taxable Amount
  const taxableAmount = round2(Math.max(0, subtotal - totalDiscount));

  // 7. GST Calculation
  const gstRate =
    settings?.gstRate !== undefined && settings?.gstRate !== null ? Number(settings.gstRate) : 0.18; // Default 18% for architectural glass & hardware fittings
  const gst = round2(taxableAmount * gstRate);

  // 8. Shipping Calculation
  const freeShippingThreshold =
    settings?.freeShippingThreshold !== undefined ? Number(settings.freeShippingThreshold) : 5000;
  const flatShippingRate =
    settings?.flatShippingRate !== undefined ? Number(settings.flatShippingRate) : 250;

  let shipping = 0;
  if (taxableAmount > 0) {
    shipping = taxableAmount >= freeShippingThreshold ? 0 : flatShippingRate;
  }
  shipping = round2(shipping);

  // 9. Grand Total
  const grandTotal = round2(taxableAmount + gst + shipping);

  return {
    subtotal,
    discounts: appliedDiscounts,
    totalDiscount,
    taxableAmount,
    gst,
    gstRate,
    shipping,
    grandTotal,
    couponError,
    stackingMode,
  };
};

module.exports = {
  round2,
  validateCoupon,
  calculateBulkDiscounts,
  calculateCartTierDiscount,
  calculateCouponDiscount,
  calculatePricing,
};
