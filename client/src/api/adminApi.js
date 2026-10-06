import api from './client';

export const adminApi = {
  // 1. Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // 2. Products
  getProducts: (params) => api.get('/admin/products', { params }),
  getProductById: (id) => api.get(`/admin/products/${id}`),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  bulkActionProducts: (action, ids) => api.post('/admin/products/bulk', { action, ids }),
  exportProductsCsv: () => api.get('/admin/products/export', { responseType: 'blob' }),
  importProductsCsv: (csvData, dryRun = false) =>
    api.post('/admin/products/import', { csvData, dryRun }),

  // 3. Categories
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  // 4. Orders
  getOrders: (params) => api.get('/admin/orders', { params }),
  getOrderById: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, status, note) =>
    api.patch(`/admin/orders/${id}/status`, { status, note }),
  refundOrCancelOrder: (id, action, reason) =>
    api.post(`/admin/orders/${id}/refund-cancel`, { action, reason }),

  // 5. Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  toggleUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }),
  changeUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  generateResetPasswordLink: (id) => api.post(`/admin/users/${id}/reset-password-link`),

  // 6. Discounts & Rules
  getDiscounts: () => api.get('/admin/discounts'),
  saveDiscountRule: (data) => api.post('/admin/discounts/rules', data),
  deleteDiscountRule: (id) => api.delete(`/admin/discounts/rules/${id}`),
  saveCoupon: (data) => api.post('/admin/discounts/coupons', data),
  deleteCoupon: (id) => api.delete(`/admin/discounts/coupons/${id}`),
  updateStackingMode: (mode) => api.patch('/admin/discounts/stacking-mode', { mode }),

  // 7. Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),

  // 8. Audit Logs
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),

  // 9. WhatsApp Automation & Inbox
  getWhatsappMessages: (params) => api.get('/admin/whatsapp/messages', { params }),
  publishWhatsappDraft: (id) => api.post(`/admin/whatsapp/messages/${id}/publish`),
  rejectWhatsappDraft: (id, reason) => api.post(`/admin/whatsapp/messages/${id}/reject`, { reason }),
  retryWhatsappMessage: (id) => api.post(`/admin/whatsapp/messages/${id}/retry`),
  getWhatsappWhitelist: () => api.get('/admin/whatsapp/whitelist'),
  addWhatsappWhitelist: (data) => api.post('/admin/whatsapp/whitelist', data),
  toggleWhatsappWhitelist: (id) => api.patch(`/admin/whatsapp/whitelist/${id}/toggle`),
  deleteWhatsappWhitelist: (id) => api.delete(`/admin/whatsapp/whitelist/${id}`),
  sendMockWhatsappWebhook: (data) => api.post('/whatsapp/mock', data),
};

export default adminApi;
