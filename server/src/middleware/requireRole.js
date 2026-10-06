const { sendError } = require('../utils/response');

/**
 * Restricts access to users with specified role(s)
 * Example: requireRole('ADMIN') or requireRole('ADMIN', 'MANAGER')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', null, 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        null,
        403
      );
    }

    next();
  };
};

module.exports = requireRole;
