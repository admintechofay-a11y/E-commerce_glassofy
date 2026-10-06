const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry for admin actions
 * @param {Object} params
 * @param {Object|string} params.user - User document or ID
 * @param {string} params.action - CREATE, UPDATE, DELETE, STATUS_CHANGE, etc.
 * @param {string} params.entity - PRODUCT, ORDER, CATEGORY, USER, DISCOUNT_RULE, COUPON, SETTINGS
 * @param {string} [params.entityId] - Target ID
 * @param {Object} [params.details] - Changed fields, before/after snapshots, notes
 * @param {Object} [params.req] - Express request for IP & User-Agent capture
 */
const logAudit = async ({ user, action, entity, entityId = '', details = {}, req = null }) => {
  try {
    await AuditLog.create({
      user: user?._id || user || null,
      action: action.toUpperCase(),
      entity: entity.toUpperCase(),
      entityId: entityId ? String(entityId) : '',
      details,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (err) {
    console.error('[AuditLogger Error]:', err.message);
  }
};

module.exports = {
  logAudit,
};
