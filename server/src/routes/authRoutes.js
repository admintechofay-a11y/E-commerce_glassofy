const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
} = require('../controllers/authController');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const asyncWrapper = require('../middleware/asyncWrapper');
const { authLimiter } = require('../middleware/rateLimiter');
const { sendSuccess } = require('../utils/response');

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../validations/authValidation');

// Public Auth Endpoints
router.post('/register', authLimiter, validate(registerSchema), asyncWrapper(register));
router.post('/login', authLimiter, validate(loginSchema), asyncWrapper(login));
router.post('/logout', asyncWrapper(logout));
router.post('/refresh', asyncWrapper(refresh));
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncWrapper(forgotPassword)
);
router.post(
  '/reset-password/:token',
  authLimiter,
  validate(resetPasswordSchema),
  asyncWrapper(resetPassword)
);

// Protected Auth Endpoints
router.get('/me', auth, asyncWrapper(getMe));
router.put('/profile', auth, validate(updateProfileSchema), asyncWrapper(updateProfile));
router.post('/change-password', auth, validate(changePasswordSchema), asyncWrapper(changePassword));

// Role-Protected Verification Endpoint
router.get('/admin-only', auth, requireRole('ADMIN'), (req, res) => {
  return sendSuccess(res, 'Welcome Admin! Access granted to protected administrative area.', {
    user: req.user,
  });
});

module.exports = router;
