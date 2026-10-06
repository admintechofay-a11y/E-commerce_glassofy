import { create } from 'zustand';
import {
  fetchCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearServerCart,
  mergeGuestCart,
  applyCouponToCart,
  removeCouponFromCart,
} from '../api/cartApi';

const GUEST_CART_KEY = 'glassofy_guest_cart';

const getGuestCartItems = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveGuestCartItems = (items) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save guest cart to localStorage:', e);
  }
};

const calculateGuestPricing = (items = []) => {
  let subtotal = 0;
  for (const item of items) {
    subtotal += (item.price || 0) * (item.quantity || 1);
  }
  subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;
  const gst = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
  const shipping = subtotal >= 5000 || subtotal === 0 ? 0 : 250;
  const grandTotal = Math.round((subtotal + gst + shipping + Number.EPSILON) * 100) / 100;

  return {
    subtotal,
    discounts: [],
    totalDiscount: 0,
    taxableAmount: subtotal,
    gst,
    shipping,
    grandTotal,
  };
};

export const useCartStore = create((set, get) => ({
  items: [],
  coupon: null,
  pricing: {
    subtotal: 0,
    discounts: [],
    totalDiscount: 0,
    taxableAmount: 0,
    gst: 0,
    shipping: 0,
    grandTotal: 0,
  },
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadCart: async (isAuthenticated = false) => {
    if (isAuthenticated) {
      try {
        set({ isLoading: true, error: null });
        const res = await fetchCart();
        if (res.success && res.data) {
          set({
            items: res.data.items || [],
            coupon: res.data.coupon || null,
            pricing: res.data.pricing || calculateGuestPricing(res.data.items || []),
            isLoading: false,
          });
        }
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    } else {
      const guestItems = getGuestCartItems();
      set({
        items: guestItems,
        coupon: null,
        pricing: calculateGuestPricing(guestItems),
        isLoading: false,
      });
    }
  },

  addItem: async (product, variant, quantity = 1, isAuthenticated = false) => {
    const variantId = variant?._id || null;
    const unitPrice = variant?.price || product.basePrice;
    const stock = variant?.stock ?? 100;

    if (isAuthenticated) {
      try {
        set({ isLoading: true, error: null });
        const res = await addItemToCart(product._id, variantId, quantity);
        if (res.success && res.data) {
          set({
            items: res.data.items,
            pricing: res.data.pricing,
            isLoading: false,
          });
          return { success: true };
        }
      } catch (err) {
        const msg = err.message || 'Failed to add item to cart';
        set({ error: msg, isLoading: false });
        return { success: false, error: msg };
      }
    } else {
      // Guest localStorage management
      const currentItems = [...get().items];
      const existingIdx = currentItems.findIndex(
        (it) =>
          it.product._id === product._id && String(it.variantId || '') === String(variantId || '')
      );

      if (existingIdx > -1) {
        const newQty = Math.min(currentItems[existingIdx].quantity + quantity, stock);
        currentItems[existingIdx].quantity = newQty;
        currentItems[existingIdx].price = unitPrice;
        currentItems[existingIdx].subtotal = Math.round(newQty * unitPrice * 100) / 100;
      } else {
        currentItems.push({
          _id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          product: {
            _id: product._id,
            name: product.name,
            title: product.title || product.name,
            slug: product.slug,
            code: product.code,
            images: product.images || [],
            finish: product.finish,
          },
          variantId,
          sku: variant?.sku || product.code || '',
          size: variant?.size || '',
          finish: variant?.finish || product.finish || '',
          price: unitPrice,
          quantity: Math.min(quantity, stock),
          availableStock: stock,
          subtotal: Math.round(Math.min(quantity, stock) * unitPrice * 100) / 100,
        });
      }

      saveGuestCartItems(currentItems);
      set({
        items: currentItems,
        pricing: calculateGuestPricing(currentItems),
      });
      return { success: true };
    }
  },

  updateQuantity: async (itemId, quantity, isAuthenticated = false) => {
    if (isAuthenticated) {
      try {
        set({ isLoading: true, error: null });
        const res = await updateCartItemQuantity(itemId, quantity);
        if (res.success && res.data) {
          set({
            items: res.data.items,
            pricing: res.data.pricing,
            isLoading: false,
          });
        }
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    } else {
      let currentItems = [...get().items];
      if (quantity <= 0) {
        currentItems = currentItems.filter((i) => i._id !== itemId);
      } else {
        const target = currentItems.find((i) => i._id === itemId);
        if (target) {
          target.quantity = quantity;
          target.subtotal = Math.round(quantity * target.price * 100) / 100;
        }
      }
      saveGuestCartItems(currentItems);
      set({
        items: currentItems,
        pricing: calculateGuestPricing(currentItems),
      });
    }
  },

  removeItem: async (itemId, productId, variantId, isAuthenticated = false) => {
    if (isAuthenticated) {
      try {
        set({ isLoading: true, error: null });
        const res = await removeCartItem(itemId);
        if (res.success && res.data) {
          set({
            items: res.data.items,
            pricing: res.data.pricing,
            isLoading: false,
          });
        }
      } catch (err) {
        set({ error: err.message, isLoading: false });
      }
    } else {
      const filtered = get().items.filter(
        (i) => i._id !== itemId && !(i.product._id === productId && i.variantId === variantId)
      );
      saveGuestCartItems(filtered);
      set({
        items: filtered,
        pricing: calculateGuestPricing(filtered),
      });
    }
  },

  clearCart: async (isAuthenticated = false) => {
    if (isAuthenticated) {
      try {
        await clearServerCart();
      } catch (e) {
        console.error('Error clearing server cart:', e);
      }
    }
    localStorage.removeItem(GUEST_CART_KEY);
    set({
      items: [],
      coupon: null,
      pricing: {
        subtotal: 0,
        discounts: [],
        totalDiscount: 0,
        taxableAmount: 0,
        gst: 0,
        shipping: 0,
        grandTotal: 0,
      },
    });
  },

  mergeGuestCartOnLogin: async () => {
    const guestItems = getGuestCartItems();
    if (guestItems.length > 0) {
      try {
        set({ isLoading: true });
        const payload = guestItems.map((item) => ({
          productId: item.product._id,
          variantId: item.variantId || null,
          quantity: item.quantity,
        }));
        const res = await mergeGuestCart(payload);
        if (res.success && res.data) {
          localStorage.removeItem(GUEST_CART_KEY);
          set({
            items: res.data.items,
            pricing: res.data.pricing,
            isLoading: false,
          });
          return;
        }
      } catch (err) {
        console.error('Failed to merge guest cart on login:', err);
      }
    }
    // If no guest items, load server cart
    await get().loadCart(true);
  },

  applyCoupon: async (code) => {
    try {
      set({ isLoading: true, error: null });
      const res = await applyCouponToCart(code);
      if (res.success && res.data) {
        set({
          items: res.data.items,
          coupon: res.data.coupon,
          pricing: res.data.pricing,
          isLoading: false,
        });
        return { success: true, message: res.message };
      }
      throw new Error(res.message || 'Failed to apply coupon');
    } catch (err) {
      const msg = err.message || 'Invalid coupon';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  removeCoupon: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await removeCouponFromCart();
      if (res.success && res.data) {
        set({
          items: res.data.items,
          coupon: null,
          pricing: res.data.pricing,
          isLoading: false,
        });
        return { success: true };
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  getTotalItems: () => {
    return get().items.reduce((total, item) => total + (item.quantity || 0), 0);
  },

  getSubtotal: () => {
    return get().pricing.subtotal || 0;
  },
}));
