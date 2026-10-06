const mongoose = require('mongoose');

const BulkPricingTierSchema = new mongoose.Schema(
  {
    minQty: {
      type: Number,
      required: true,
      min: [1, 'Minimum quantity must be at least 1'],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100'],
    },
    fixedPrice: {
      type: Number,
      default: 0,
      min: [0, 'Fixed price cannot be negative'],
    },
  },
  { _id: false }
);

const ProductVariantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: String,
      trim: true,
      default: '',
    },
    finish: {
      type: String,
      trim: true,
      default: '',
    },
    mrp: {
      type: Number,
      default: 0,
      min: [0, 'MRP cannot be negative'],
    },
    price: {
      type: Number,
      required: [true, 'Variant price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stock: {
      type: Number,
      default: 100,
      min: [0, 'Stock cannot be negative'],
    },
    bulkPricing: {
      type: [BulkPricingTierSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
      index: true,
    },
    finish: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
      index: true,
    },
    baseMrp: {
      type: Number,
      default: 0,
      min: [0, 'Base MRP cannot be negative'],
    },
    variants: {
      type: [ProductVariantSchema],
      default: [],
    },
    bulkPricing: {
      type: [BulkPricingTierSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
      default: 'PUBLISHED',
      index: true,
    },
    source: {
      type: String,
      enum: ['manual', 'csv', 'whatsapp'],
      default: 'manual',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    metaTitle: {
      type: String,
      trim: true,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      default: '',
    },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    page: {
      type: Number,
      default: 1,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Synchronize title with name if title not explicitly provided
ProductSchema.pre('save', function (next) {
  if (!this.title && this.name) {
    this.title = this.name;
  }
  if (!this.name && this.title) {
    this.name = this.title;
  }
  if (this.status === 'PUBLISHED') {
    this.isPublished = true;
  } else if (this.status === 'DRAFT' || this.status === 'ARCHIVED') {
    this.isPublished = false;
  }
  next();
});

// Compound indexes for searching and filtering
ProductSchema.index({ name: 'text', code: 'text', description: 'text' });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ status: 1, isFeatured: 1 });
ProductSchema.index({ basePrice: 1, status: 1 });
ProductSchema.index({ finish: 1, status: 1 });

module.exports = mongoose.model('Product', ProductSchema);
