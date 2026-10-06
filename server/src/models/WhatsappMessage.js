const mongoose = require('mongoose');

const WhatsappMessageSchema = new mongoose.Schema(
  {
    // Incoming message metadata
    messageId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    senderMobile: {
      type: String,
      trim: true,
      index: true,
      default: '',
    },
    senderName: {
      type: String,
      trim: true,
      default: '',
    },
    messageType: {
      type: String,
      enum: ['image', 'text', 'interactive', 'other'],
      default: 'image',
    },
    caption: {
      type: String,
      trim: true,
      default: '',
    },
    text: {
      type: String,
      trim: true,
      default: '',
    },
    mediaId: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },

    // Parsed product fields from caption
    parsedFields: {
      name: { type: String, default: '' },
      code: { type: String, default: '' },
      category: { type: String, default: '' },
      finish: { type: String, default: '' },
      price: { type: Number, default: 0 },
      stock: { type: Number, default: 0 },
      description: { type: String, default: '' },
    },

    // Linked product draft
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },

    // Processing & Lifecycle Status
    status: {
      type: String,
      enum: [
        'RECEIVED',
        'DRAFT_CREATED',
        'PUBLISHED',
        'REJECTED',
        'FAILED',
        'IGNORED',
        'QUEUED',
        'SENT',
        'DELIVERED',
        'READ',
      ],
      default: 'RECEIVED',
      index: true,
    },

    // Outgoing WhatsApp reply content
    replyText: {
      type: String,
      default: '',
    },

    // Error details if parsing or creation failed
    error: {
      type: String,
      default: '',
    },

    // Full webhook payload preserved for diagnostics
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Outgoing notification support (Phase 1 compatibility)
    recipientMobile: {
      type: String,
      trim: true,
      default: '',
    },
    templateName: {
      type: String,
      trim: true,
      default: '',
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
WhatsappMessageSchema.index({ createdAt: -1 });
WhatsappMessageSchema.index({ status: 1, createdAt: -1 });
WhatsappMessageSchema.index({ senderMobile: 1, status: 1 });

module.exports = mongoose.model('WhatsappMessage', WhatsappMessageSchema);
