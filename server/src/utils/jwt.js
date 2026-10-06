const jwt = require('jsonwebtoken');
const {
  JWT_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRE,
  NODE_ENV,
} = require('../config/env');

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  const isProduction = NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };

  // 1 day for access token
  res.cookie('token', token, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });

  // 7 days for refresh token
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: typeof user.toJSON === 'function' ? user.toJSON() : user,
      token,
      refreshToken,
    },
  });
};

const clearTokenCookies = (res) => {
  const isProduction = NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };

  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

module.exports = {
  signToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken,
  sendTokenResponse,
  clearTokenCookies,
};
