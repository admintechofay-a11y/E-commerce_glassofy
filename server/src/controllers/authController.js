const crypto = require('crypto');
const { User, AuditLog } = require('../models');
const { sendTokenResponse, clearTokenCookies, verifyRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  const { fullName, email, mobile, password, businessName, gstNumber, address } = req.body;

  // Check if email already registered
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendError(res, 'An account with this email address already exists.', null, 409);
  }

  // Create user
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    mobile,
    password,
    role: 'USER',
    businessName: businessName || '',
    gstNumber: gstNumber || '',
    address: address || {},
  });

  // Log audit event
  try {
    await AuditLog.create({
      user: user._id,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user._id.toString(),
      details: { email: user.email, fullName: user.fullName },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (_err) {
    // Non-blocking audit error
  }

  return sendTokenResponse(user, 201, res, 'Registration successful. Welcome to Glassofy!');
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    return sendError(res, 'Invalid email or password.', null, 401);
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return sendError(res, 'Invalid email or password.', null, 401);
  }

  // Check active state
  if (!user.isActive) {
    return sendError(res, 'Your account has been deactivated. Please contact support.', null, 403);
  }

  // Log audit event
  try {
    await AuditLog.create({
      user: user._id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      details: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (_err) {
    // Non-blocking audit error
  }

  return sendTokenResponse(user, 200, res, 'Logged in successfully.');
};

/**
 * @desc    Logout user & clear cookies
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res) => {
  clearTokenCookies(res);
  return sendSuccess(res, 'Logged out successfully.');
};

/**
 * @desc    Refresh access token using refreshToken cookie
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refresh = async (req, res) => {
  const refreshToken = (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;

  if (!refreshToken) {
    return sendError(res, 'Refresh token not found. Please log in again.', null, 401);
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return sendError(res, 'Invalid session. Please log in again.', null, 401);
    }

    return sendTokenResponse(user, 200, res, 'Session refreshed successfully.');
  } catch (_err) {
    clearTokenCookies(res);
    return sendError(res, 'Invalid or expired refresh token. Please log in again.', null, 401);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  return sendSuccess(res, 'User profile retrieved successfully.', {
    user: req.user,
  });
};

/**
 * @desc    Initiate forgot password request
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return friendly message without disclosing email existence
    return sendSuccess(
      res,
      'If an account exists with that email, a password reset link has been dispatched.',
      null
    );
  }

  // Generate 20-byte random hex token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field (valid for 1 hour)
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // In production, an email would be sent with the reset link.
  // We include resetToken in development mode so tests and local verification work seamlessly.
  const isDev = process.env.NODE_ENV !== 'production';

  return sendSuccess(
    res,
    'If an account exists with that email, a password reset link has been dispatched.',
    isDev ? { resetToken, message: 'Token provided for development / testing' } : null
  );
};

/**
 * @desc    Reset password using reset token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash received token to match database
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    return sendError(res, 'Invalid or expired password reset token.', null, 400);
  }

  // Update password and clear reset fields
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Log audit event
  try {
    await AuditLog.create({
      user: user._id,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (_err) {
    // Non-blocking
  }

  return sendTokenResponse(user, 200, res, 'Password reset successfully. You are now logged in.');
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return sendError(res, 'User not found.', null, 404);
  }

  const { fullName, mobile, businessName, gstNumber, address } = req.body;

  if (fullName !== undefined) user.fullName = fullName;
  if (mobile !== undefined) user.mobile = mobile;
  if (businessName !== undefined) user.businessName = businessName;
  if (gstNumber !== undefined) user.gstNumber = gstNumber;
  if (address !== undefined) {
    user.address = {
      ...user.address,
      ...address,
    };
  }

  await user.save();

  return sendSuccess(res, 'Profile updated successfully.', {
    user,
  });
};

/**
 * @desc    Change password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return sendError(res, 'User not found.', null, 404);
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return sendError(res, 'Current password is incorrect.', null, 400);
  }

  user.password = newPassword;
  await user.save();

  return sendSuccess(res, 'Password changed successfully.');
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
};
