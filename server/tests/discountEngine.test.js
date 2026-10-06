const {
  round2,
  validateCoupon,
  calculateBulkDiscounts,
  calculateCartTierDiscount,
  calculateCouponDiscount,
  calculatePricing,
} = require('../src/services/discountEngine');

describe('Discount Engine Unit Tests', () => {
  describe('round2 (Financial Rounding)', () => {
    it('should round numbers to 2 decimal places with epsilon precision', () => {
      expect(round2(10.255)).toBe(10.26);
      expect(round2(10.254)).toBe(10.25);
      expect(round2(100)).toBe(100);
      expect(round2('49.95')).toBe(49.95);
      expect(round2(null)).toBe(0);
      expect(round2(undefined)).toBe(0);
    });
  });

  describe('Per-Product Bulk Quantity Tiers', () => {
    const bulkPricing = [
      { minQty: 10, discountPercentage: 5 },
      { minQty: 25, discountPercentage: 10 },
      { minQty: 50, discountPercentage: 15 },
    ];

    it('should not apply discount if quantity is below minimum tier', () => {
      const items = [{ price: 500, quantity: 5, bulkPricing }];
      const result = calculateBulkDiscounts(items);
      expect(result.totalBulkDiscount).toBe(0);
      expect(result.bulkDiscounts).toHaveLength(0);
    });

    it('should apply 5% discount when quantity reaches 10', () => {
      const items = [{ price: 500, quantity: 10, bulkPricing, title: 'Shower Hinge' }];
      const result = calculateBulkDiscounts(items);
      // 5% of 500 = 25 per unit * 10 units = 250
      expect(result.totalBulkDiscount).toBe(250);
      expect(result.bulkDiscounts[0].amount).toBe(250);
    });

    it('should apply highest qualifying tier (15% for qty 60)', () => {
      const items = [{ price: 200, quantity: 60, bulkPricing, title: 'F Bracket' }];
      const result = calculateBulkDiscounts(items);
      // 15% of 200 = 30 per unit * 60 = 1800
      expect(result.totalBulkDiscount).toBe(1800);
    });

    it('should support fixed price bulk pricing tier', () => {
      const fixedTier = [{ minQty: 20, fixedPrice: 150 }];
      const items = [{ price: 180, quantity: 20, bulkPricing: fixedTier, title: 'Bullet Stud' }];
      const result = calculateBulkDiscounts(items);
      // 180 - 150 = 30 discount per unit * 20 = 600
      expect(result.totalBulkDiscount).toBe(600);
    });
  });

  describe('Cart-Total Volume Tiers', () => {
    const discountRules = [
      {
        name: 'Tier 1',
        ruleType: 'CART_TOTAL',
        conditions: { minAmount: 5000 },
        discountPercentage: 5,
        priority: 1,
      },
      {
        name: 'Tier 2',
        ruleType: 'CART_TOTAL',
        conditions: { minAmount: 15000 },
        discountPercentage: 10,
        priority: 2,
      },
    ];

    it('should return null when subtotal is below tier threshold', () => {
      expect(calculateCartTierDiscount(4999, discountRules)).toBeNull();
    });

    it('should qualify for Tier 1 at exactly threshold ₹5,000', () => {
      const res = calculateCartTierDiscount(5000, discountRules);
      expect(res).not.toBeNull();
      expect(res.amount).toBe(250); // 5% of 5000
    });

    it('should qualify for higher Tier 2 above ₹15,000', () => {
      const res = calculateCartTierDiscount(20000, discountRules);
      expect(res).not.toBeNull();
      expect(res.amount).toBe(2000); // 10% of 20000
    });
  });

  describe('Coupon Validation & Calculation', () => {
    const validCoupon = {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountAmount: 10,
      minOrderAmount: 1000,
      maxDiscountAmount: 500,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 100,
      usageCount: 10,
      perUserLimit: 1,
      isActive: true,
    };

    it('should validate active coupon when criteria met', () => {
      const check = validateCoupon(validCoupon, 2000, { _id: 'u1' }, 0, new Date('2026-06-01'));
      expect(check.valid).toBe(true);
    });

    it('should reject coupon below minOrderAmount', () => {
      const check = validateCoupon(validCoupon, 999, null, 0, new Date('2026-06-01'));
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Minimum order amount');
    });

    it('should allow coupon at exact minOrderAmount threshold', () => {
      const check = validateCoupon(validCoupon, 1000, null, 0, new Date('2026-06-01'));
      expect(check.valid).toBe(true);
    });

    it('should reject expired coupon', () => {
      const check = validateCoupon(validCoupon, 2000, null, 0, new Date('2027-01-01'));
      expect(check.valid).toBe(false);
      expect(check.error).toContain('expired');
    });

    it('should reject coupon when perUserLimit reached', () => {
      const check = validateCoupon(validCoupon, 2000, { _id: 'u1' }, 1, new Date('2026-06-01'));
      expect(check.valid).toBe(false);
      expect(check.error).toContain('usage limit reached for your account');
    });

    it('should cap percentage discount at maxDiscountAmount', () => {
      // 10% of 10000 = 1000, capped at 500
      const calc = calculateCouponDiscount(validCoupon, 10000);
      expect(calc.amount).toBe(500);
    });

    it('should calculate FLAT coupon discount', () => {
      const flatCoupon = {
        code: 'FLAT300',
        discountType: 'FLAT',
        discountAmount: 300,
      };
      const calc = calculateCouponDiscount(flatCoupon, 2000);
      expect(calc.amount).toBe(300);
    });
  });

  describe('Stacking Modes ("best-of" vs "stack") and Pricing Breakdown', () => {
    const items = [
      {
        productId: 'p1',
        title: 'Brass Hinge',
        price: 1000,
        quantity: 10, // subtotal = 10,000
        bulkPricing: [{ minQty: 10, discountPercentage: 10 }], // Bulk discount = 1,000
      },
    ];

    const discountRules = [
      {
        name: 'Cart Tier 5%',
        ruleType: 'CART_TOTAL',
        conditions: { minAmount: 5000 },
        discountPercentage: 5, // Cart tier discount = 500
      },
    ];

    const coupon = {
      code: 'SPECIAL15',
      discountType: 'PERCENTAGE',
      discountAmount: 15, // Coupon discount = 1,500
      minOrderAmount: 1000,
      isActive: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    };

    it('in "best-of" mode, customer gets the single highest discount (Coupon: 1500 > Bulk: 1000 > Cart: 500)', () => {
      const result = calculatePricing({
        items,
        coupon,
        discountRules,
        settings: {
          stackingMode: 'best-of',
          gstRate: 0.18,
          freeShippingThreshold: 5000,
          flatShippingRate: 250,
        },
        referenceDate: new Date('2026-06-01'),
      });

      expect(result.subtotal).toBe(10000);
      expect(result.totalDiscount).toBe(1500);
      expect(result.discounts).toHaveLength(1);
      expect(result.discounts[0].type).toBe('COUPON');

      // Taxable = 10000 - 1500 = 8500
      expect(result.taxableAmount).toBe(8500);
      // GST 18% of 8500 = 1530
      expect(result.gst).toBe(1530);
      // Shipping: 8500 >= 5000 => FREE (0)
      expect(result.shipping).toBe(0);
      // Grand Total = 8500 + 1530 = 10030
      expect(result.grandTotal).toBe(10030);
    });

    it('in "stack" mode, all eligible discounts combine (Bulk 1000 + Cart 500 + Coupon 1500 = 3000)', () => {
      const result = calculatePricing({
        items,
        coupon,
        discountRules,
        settings: {
          stackingMode: 'stack',
          gstRate: 0.18,
          freeShippingThreshold: 5000,
          flatShippingRate: 250,
        },
        referenceDate: new Date('2026-06-01'),
      });

      expect(result.subtotal).toBe(10000);
      expect(result.totalDiscount).toBe(3000);
      expect(result.discounts).toHaveLength(3);

      // Taxable = 10000 - 3000 = 7000
      expect(result.taxableAmount).toBe(7000);
      // GST 18% of 7000 = 1260
      expect(result.gst).toBe(1260);
      // Free shipping
      expect(result.shipping).toBe(0);
      // Grand Total = 7000 + 1260 = 8260
      expect(result.grandTotal).toBe(8260);
    });

    it('applies flat shipping fee when taxable amount is below free shipping threshold', () => {
      const smallItems = [{ price: 1000, quantity: 2 }]; // subtotal = 2000
      const result = calculatePricing({
        items: smallItems,
        settings: {
          freeShippingThreshold: 5000,
          flatShippingRate: 250,
          gstRate: 0.18,
        },
      });

      expect(result.subtotal).toBe(2000);
      expect(result.taxableAmount).toBe(2000);
      expect(result.shipping).toBe(250);
      expect(result.gst).toBe(360); // 18% of 2000
      expect(result.grandTotal).toBe(2610); // 2000 + 360 + 250
    });

    it('handles exact shipping threshold (₹5000 gives free shipping)', () => {
      const edgeItems = [{ price: 2500, quantity: 2 }]; // subtotal = 5000
      const result = calculatePricing({
        items: edgeItems,
        settings: {
          freeShippingThreshold: 5000,
          flatShippingRate: 250,
          gstRate: 0.18,
        },
      });

      expect(result.subtotal).toBe(5000);
      expect(result.shipping).toBe(0);
    });
  });
});
