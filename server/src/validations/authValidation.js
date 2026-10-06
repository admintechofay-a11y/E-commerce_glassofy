const { z } = require('zod');

const registerSchema = z.object({
  body: z
    .object({
      fullName: z
        .string({ required_error: 'Full name is required' })
        .trim()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name cannot exceed 100 characters'),
      email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .email('Please enter a valid email address'),
      mobile: z
        .string({ required_error: 'Mobile number is required' })
        .trim()
        .regex(/^[0-9+\s-]{10,15}$/, 'Please enter a valid mobile number (10-15 digits)'),
      password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters long'),
      confirmPassword: z.string({ required_error: 'Please confirm your password' }),
      businessName: z.string().trim().optional().default(''),
      gstNumber: z
        .string()
        .trim()
        .toUpperCase()
        .regex(
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
          'Invalid GST format (e.g. 22AAAAA0000A1Z5)'
        )
        .optional()
        .or(z.literal('')),
      address: z
        .object({
          line1: z.string().trim().optional().default(''),
          line2: z.string().trim().optional().default(''),
          city: z.string().trim().optional().default(''),
          state: z.string().trim().optional().default(''),
          pincode: z.string().trim().optional().default(''),
        })
        .optional()
        .default({}),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please enter a valid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z
    .object({
      password: z
        .string({ required_error: 'New password is required' })
        .min(6, 'Password must be at least 6 characters long'),
      confirmPassword: z.string({ required_error: 'Please confirm your new password' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

const updateProfileSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters')
      .optional(),
    mobile: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]{10,15}$/, 'Please enter a valid mobile number (10-15 digits)')
      .optional(),
    businessName: z.string().trim().optional(),
    gstNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid GST format (e.g. 22AAAAA0000A1Z5)'
      )
      .optional()
      .or(z.literal('')),
    address: z
      .object({
        line1: z.string().trim().optional(),
        line2: z.string().trim().optional(),
        city: z.string().trim().optional(),
        state: z.string().trim().optional(),
        pincode: z.string().trim().optional(),
      })
      .optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, 'Current password is required'),
      newPassword: z
        .string({ required_error: 'New password is required' })
        .min(6, 'New password must be at least 6 characters long'),
      confirmNewPassword: z.string({ required_error: 'Confirm new password is required' }),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: 'New passwords do not match',
      path: ['confirmNewPassword'],
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
};
