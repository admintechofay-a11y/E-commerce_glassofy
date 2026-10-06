const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED', 'FLAT'],
      required: true,
      default: 'PERCENTAGE',
    },
    discountAmount: {
      type: Number,
      required: [true, 'Discount amount is required'],
      min: [0, 'Discount amount cannot be negative'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 0, // 0 means unlimited per user
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        count: {
          type: Number,
          default: 1,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CouponSchema.methods.isValid = function (orderAmount = 0, userId = null) {
  const now = new Date();
  if (!this.isActive) return { valid: false, message: 'Coupon is inactive' };
  if (this.startDate && now < this.startDate)
    return { valid: false, message: 'Coupon not yet active' };
  if (this.endDate && now > this.endDate) return { valid: false, message: 'Coupon has expired' };
  if (this.usageLimit > 0 && this.usageCount >= this.usageLimit)
    return { valid: false, message: 'Coupon usage limit reached' };
  if (orderAmount < this.minOrderAmount)
    return { valid: false, message: `Minimum order amount of ₹${this.minOrderAmount} required` };
  if (this.perUserLimit > 0 && userId) {
    const userUsage = this.usedBy.find(
      (entry) => entry.user && entry.user.toString() === userId.toString()
    );
    if (userUsage && userUsage.count >= this.perUserLimit) {
      return { valid: false, message: 'Coupon usage limit reached for your account' };
    }
  }
  return { valid: true };
};

module.exports = mongoose.model('Coupon', CouponSchema);
