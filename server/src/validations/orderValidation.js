const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/;
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian phone number'),
  line1: z.string().trim().min(3, 'Address line 1 must be at least 3 characters'),
  line2: z.string().trim().optional().default(''),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z.string().trim().regex(pincodeRegex, 'Valid 6-digit Indian PIN code required'),
});

const checkoutSchema = z.object({
  body: z.object({
    shippingAddress: addressSchema,
    billingAddress: addressSchema.optional().nullable(),
    businessName: z.string().trim().optional().default(''),
    gstNumber: z
      .string()
      .trim()
      .toUpperCase()
      .refine((val) => !val || gstinRegex.test(val), {
        message: 'Invalid GSTIN format (e.g. 27AABCU9603R1ZX)',
      })
      .optional()
      .default(''),
    paymentMethod: z.enum(['RAZORPAY', 'ONLINE', 'COD']).default('RAZORPAY'),
    notes: z.string().trim().max(500).optional().default(''),
  }),
});

const verifyRazorpaySchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
    razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
    razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
    orderId: z.string().regex(objectIdRegex, 'Invalid order ID'),
  }),
});

const cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(500).optional().default('Cancelled by customer'),
  }),
});

module.exports = {
  addressSchema,
  checkoutSchema,
  verifyRazorpaySchema,
  cancelOrderSchema,
};
