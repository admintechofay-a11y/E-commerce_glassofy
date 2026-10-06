const mongoose = require('mongoose');

const DiscountRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Rule name is required'],
      trim: true,
    },
    ruleType: {
      type: String,
      enum: ['CATEGORY', 'CART_TOTAL', 'ROLE_BASED', 'QUANTITY_TIER'],
      required: true,
      index: true,
    },
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: Number,
      default: 0,
    },
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

module.exports = mongoose.model('DiscountRule', DiscountRuleSchema);
