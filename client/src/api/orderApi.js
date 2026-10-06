import api from './client';

export const initiateCheckout = async (checkoutData) => {
  return await api.post('/orders/checkout', checkoutData);
};

export const verifyPayment = async (paymentData) => {
  return await api.post('/orders/verify-payment', paymentData);
};

export const fetchMyOrders = async (page = 1, limit = 10) => {
  return await api.get(`/orders?page=${page}&limit=${limit}`);
};

export const fetchOrderById = async (orderId) => {
  return await api.get(`/orders/${orderId}`);
};

export const cancelOrder = async (orderId, reason) => {
  return await api.put(`/orders/${orderId}/cancel`, { reason });
};

export const getInvoiceUrl = (orderId) => {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return `${baseURL}/orders/${orderId}/invoice`;
};
