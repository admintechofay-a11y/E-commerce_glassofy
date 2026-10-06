const express = require('express');
const { auth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const asyncWrapper = require('../middleware/asyncWrapper');
const {
  getDashboardMetrics,
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  bulkActionProducts,
  exportProductsCsv,
  importProductsCsv,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  refundOrCancelAdminOrder,
  getAdminUsers,
  getAdminUserDetail,
  toggleAdminUserStatus,
  changeAdminUserRole,
  generatePasswordResetLink,
  getAdminDiscounts,
  createOrUpdateDiscountRule,
  deleteDiscountRule,
  createOrUpdateCoupon,
  deleteCoupon,
  updateStackingMode,
  getAdminSettings,
  updateAdminSettings,
  getAdminAuditLogs,
  uploadAdminImage,
} = require('../controllers/adminController');
const {
  getInboxMessages,
  publishDraft,
  rejectDraft,
  retryMessage,
  getWhitelist,
  addWhitelistNumber,
  toggleWhitelistNumber,
  deleteWhitelistNumber,
} = require('../controllers/whatsappController');

const router = express.Router();

// Guard all admin routes with authentication and requireRole('ADMIN')
router.use(auth);
router.use(requireRole('ADMIN'));

// 1. Dashboard
router.get('/dashboard', asyncWrapper(getDashboardMetrics));

// Image Uploads (strictly validated MIME types and 5MB size limit)
router.post('/upload-image', asyncWrapper(uploadAdminImage));
router.post('/products/upload-image', asyncWrapper(uploadAdminImage));

// 2. Products (Specific subpaths before :id)
router.get('/products/export', asyncWrapper(exportProductsCsv));
router.post('/products/import', asyncWrapper(importProductsCsv));
router.post('/products/bulk', asyncWrapper(bulkActionProducts));
router.get('/products', asyncWrapper(getAdminProducts));
router.get('/products/:id', asyncWrapper(getAdminProductById));
router.post('/products', asyncWrapper(createAdminProduct));
router.put('/products/:id', asyncWrapper(updateAdminProduct));
router.delete('/products/:id', asyncWrapper(deleteAdminProduct));

// 3. Categories
router.get('/categories', asyncWrapper(getAdminCategories));
router.post('/categories', asyncWrapper(createAdminCategory));
router.put('/categories/:id', asyncWrapper(updateAdminCategory));
router.delete('/categories/:id', asyncWrapper(deleteAdminCategory));

// 4. Orders
router.get('/orders', asyncWrapper(getAdminOrders));
router.get('/orders/:id', asyncWrapper(getAdminOrderById));
router.patch('/orders/:id/status', asyncWrapper(updateAdminOrderStatus));
router.post('/orders/:id/refund-cancel', asyncWrapper(refundOrCancelAdminOrder));

// 5. Users
router.get('/users', asyncWrapper(getAdminUsers));
router.get('/users/:id', asyncWrapper(getAdminUserDetail));
router.patch('/users/:id/status', asyncWrapper(toggleAdminUserStatus));
router.patch('/users/:id/role', asyncWrapper(changeAdminUserRole));
router.post('/users/:id/reset-password-link', asyncWrapper(generatePasswordResetLink));

// 6. Discounts & Rules
router.get('/discounts', asyncWrapper(getAdminDiscounts));
router.post('/discounts/rules', asyncWrapper(createOrUpdateDiscountRule));
router.delete('/discounts/rules/:id', asyncWrapper(deleteDiscountRule));
router.post('/discounts/coupons', asyncWrapper(createOrUpdateCoupon));
router.delete('/discounts/coupons/:id', asyncWrapper(deleteCoupon));
router.patch('/discounts/stacking-mode', asyncWrapper(updateStackingMode));

// 7. Settings
router.get('/settings', asyncWrapper(getAdminSettings));
router.put('/settings', asyncWrapper(updateAdminSettings));

// 8. Audit Logs
router.get('/audit-logs', asyncWrapper(getAdminAuditLogs));

// 9. WhatsApp Inbox & Whitelist
router.get('/whatsapp/messages', asyncWrapper(getInboxMessages));
router.post('/whatsapp/messages/:id/publish', asyncWrapper(publishDraft));
router.post('/whatsapp/messages/:id/reject', asyncWrapper(rejectDraft));
router.post('/whatsapp/messages/:id/retry', asyncWrapper(retryMessage));
router.get('/whatsapp/whitelist', asyncWrapper(getWhitelist));
router.post('/whatsapp/whitelist', asyncWrapper(addWhitelistNumber));
router.patch('/whatsapp/whitelist/:id/toggle', asyncWrapper(toggleWhitelistNumber));
router.delete('/whatsapp/whitelist/:id', asyncWrapper(deleteWhitelistNumber));

module.exports = router;

