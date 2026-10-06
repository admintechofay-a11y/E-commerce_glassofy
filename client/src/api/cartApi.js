import api from './client';

export const fetchCart = async () => {
  return await api.get('/cart');
};

export const addItemToCart = async (productId, variantId, quantity = 1) => {
  return await api.post('/cart/items', { productId, variantId, quantity });
};

export const updateCartItemQuantity = async (itemId, quantity) => {
  return await api.put(`/cart/items/${itemId}`, { quantity });
};

export const removeCartItem = async (itemId) => {
  return await api.delete(`/cart/items/${itemId}`);
};

export const clearServerCart = async () => {
  return await api.delete('/cart');
};

export const mergeGuestCart = async (items) => {
  return await api.post('/cart/merge', { items });
};

export const applyCouponToCart = async (code) => {
  return await api.post('/cart/coupon', { code });
};

export const removeCouponFromCart = async () => {
  return await api.delete('/cart/coupon');
};
