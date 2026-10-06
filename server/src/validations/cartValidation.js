const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const addItemSchema = z.object({
  body: z.object({
    productId: z.string().regex(objectIdRegex, 'Invalid product ID'),
    variantId: z.string().regex(objectIdRegex, 'Invalid variant ID').nullable().optional(),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  }),
});

const updateQuantitySchema = z.object({
  body: z.object({
    quantity: z.coerce
      .number()
      .int()
      .min(0, 'Quantity must be at least 0')
      .max(1000, 'Quantity cannot exceed 1000'),
  }),
});

const mergeCartSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().regex(objectIdRegex, 'Invalid product ID'),
          variantId: z.string().regex(objectIdRegex, 'Invalid variant ID').nullable().optional(),
          quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
        })
      )
      .default([]),
  }),
});

const applyCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, 'Coupon code is required').toUpperCase(),
  }),
});

module.exports = {
  addItemSchema,
  updateQuantitySchema,
  mergeCartSchema,
  applyCouponSchema,
};
