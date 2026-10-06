import api from './client';

export const fetchCategories = async () => {
  const res = await api.get('/categories');
  return res.data || [];
};

export const fetchProducts = async (params = {}) => {
  const cleanParams = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });

  const res = await api.get('/products', { params: cleanParams });
  return res.data || { products: [], total: 0, totalPages: 1 };
};

export const fetchFeaturedProducts = async (limit = 8) => {
  const res = await api.get('/products/featured', { params: { limit } });
  return res.data || [];
};

export const fetchProductBySlug = async (slug) => {
  const res = await api.get(`/products/${slug}`);
  return res.data;
};

export const fetchSearchSuggestions = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) return [];
  const res = await api.get('/products', {
    params: { search: searchTerm.trim(), limit: 5 },
  });
  return res.data?.products || [];
};
