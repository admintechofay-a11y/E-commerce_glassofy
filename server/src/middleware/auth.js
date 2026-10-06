const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const { User } = require('../models');

const auth = async (req, res, next) => {
  let token;

  // 1. Check cookies first (httpOnly cookie)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fall back to Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Authentication required. Please log in to proceed.', null, 401);
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return sendError(res, 'The user belonging to this token no longer exists.', null, 401);
    }

    if (!user.isActive) {
      return sendError(
        res,
        'Your account has been deactivated. Please contact support.',
        null,
        403
      );
    }

    req.user = user;
    next();
  } catch (_error) {
    return sendError(res, 'Invalid or expired session. Please log in again.', null, 401);
  }
};

auth.auth = auth;
module.exports = auth;
