import api from './client';

let staticProductsCache = null;
let staticCategoriesCache = null;

const getStaticCategories = async () => {
  if (staticCategoriesCache) return staticCategoriesCache;
  try {
    const res = await fetch('/data/categories.json');
    if (res.ok) {
      staticCategoriesCache = await res.json();
      return staticCategoriesCache;
    }
  } catch (err) {
    console.warn('[Catalog Fallback] Error fetching categories.json:', err);
  }
  return [];
};

const getStaticProducts = async () => {
  if (staticProductsCache) return staticProductsCache;
  try {
    const res = await fetch('/data/products.json');
    if (res.ok) {
      staticProductsCache = await res.json();
      return staticProductsCache;
    }
  } catch (err) {
    console.warn('[Catalog Fallback] Error fetching products.json:', err);
  }
  return [];
};

export const CATEGORY_ALIASES = {
  hinges: 'shower-hinges',
  'f-brackets-clamps': 'brackets-and-clamps',
  'd-brackets': 'brackets-and-clamps',
  brackets: 'brackets-and-clamps',
  'bullet-studs-floor-pivots': 'bullet-studs-and-pivots',
  'spider-fittings-canopy': 'spider-fittings',
};

export const resolveCategorySlug = (slug) => {
  if (!slug || typeof slug !== 'string') return slug;
  const normalized = slug.toLowerCase().trim();
  return CATEGORY_ALIASES[normalized] || normalized;
};

export const fetchCategories = async () => {
  try {
    const res = await api.get('/categories', { timeout: 3500 });
    const payload = res?.data !== undefined ? res.data : res;
    if (Array.isArray(payload) && payload.length > 0) {
      return payload;
    }
  } catch (_err) {
    console.warn('[API /categories offline, using fallback dataset]');
  }
  return await getStaticCategories();
};

export const fetchProducts = async (params = {}) => {
  const cleanParams = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });

  if (cleanParams.category && cleanParams.category !== 'all') {
    cleanParams.category = resolveCategorySlug(cleanParams.category);
  }

  let apiFailed = false;
  try {
    const res = await api.get('/products', { params: cleanParams, timeout: 3500 });
    const payload =
      res?.data?.products !== undefined
        ? res.data
        : res?.products !== undefined
          ? res
          : null;
    if (payload && Array.isArray(payload.products)) {
      return payload;
    }
  } catch (_err) {
    apiFailed = true;
    console.warn('[API /products offline or timed out, loading catalogue from static CDN]');
  }

  // Graceful Fallback: Filter & paginate from local dataset
  try {
    const [allProducts, allCategories] = await Promise.all([
      getStaticProducts(),
      getStaticCategories(),
    ]);

    let filtered = Array.isArray(allProducts) ? [...allProducts] : [];
    const safeCategories = Array.isArray(allCategories) ? allCategories : [];

    // 1. Search Filter
    if (cleanParams.search) {
      const q = cleanParams.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter (with alias resolution)
    if (cleanParams.category && cleanParams.category !== 'all') {
      const resolvedCat = resolveCategorySlug(cleanParams.category);
      const targetCat = safeCategories.find(
        (c) => c._id === resolvedCat || c.slug === resolvedCat
      );
      const catId = targetCat ? targetCat._id : resolvedCat;
      filtered = filtered.filter((p) => p.category === catId || p.category?._id === catId);
    }

    // 3. Finish Filter
    if (cleanParams.finish && cleanParams.finish !== 'all') {
      const f = cleanParams.finish.toUpperCase();
      filtered = filtered.filter((p) => p.finish && p.finish.toUpperCase() === f);
    }

    // 4. Variant Size Filter
    if (cleanParams.size && cleanParams.size !== 'all') {
      const s = cleanParams.size.toLowerCase();
      filtered = filtered.filter((p) =>
        Array.isArray(p.variants) &&
        p.variants.some((v) => v.size && v.size.toLowerCase().includes(s))
      );
    }

    // 5. Price Filter
    if (cleanParams.minPrice) {
      filtered = filtered.filter((p) => (p.basePrice || 0) >= Number(cleanParams.minPrice));
    }
    if (cleanParams.maxPrice) {
      filtered = filtered.filter((p) => (p.basePrice || 0) <= Number(cleanParams.maxPrice));
    }

    // 6. Sorting
    if (cleanParams.sort === 'price-low' || cleanParams.sort === 'price_asc') {
      filtered.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (cleanParams.sort === 'price-high' || cleanParams.sort === 'price_desc') {
      filtered.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (cleanParams.sort === 'name' || cleanParams.sort === 'name_asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (cleanParams.sort === 'name_desc') {
      filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    const page = Number(cleanParams.page) || 1;
    const limit = Number(cleanParams.limit) || 12;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const products = filtered.slice(startIndex, startIndex + limit);

    // Compute distinct finishes and sizes for availableFilters
    const distinctFinishes = Array.from(
      new Set(
        allProducts
          .map((p) => p.finish)
          .filter((f) => f && typeof f === 'string' && !/^\d/.test(f.trim()))
          .map((f) => f.trim().toUpperCase())
      )
    ).sort();

    return {
      products,
      total,
      totalPages,
      currentPage: page,
      availableFilters: {
        finishes: distinctFinishes.length > 0 ? distinctFinishes : ['BRASS', 'CP', 'SS', 'MATT BLACK'],
        sizes: ['Standard', '10mm', '12mm', '19mm', '25mm', '32mm'],
      },
    };
  } catch (fallbackErr) {
    console.error('[Catalog Fallback Error]:', fallbackErr);
    if (apiFailed) {
      throw new Error('Failed to load products. Please check connection and try again.');
    }
    return {
      products: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      availableFilters: {
        finishes: ['BRASS', 'CP', 'SS', 'MATT BLACK'],
        sizes: ['Standard', '10mm', '12mm', '19mm', '25mm', '32mm'],
      },
    };
  }
};

export const fetchFeaturedProducts = async (limit = 8) => {
  try {
    const res = await api.get('/products/featured', { params: { limit } });
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (_err) {
    console.warn('[API /products/featured offline, using fallback]');
  }

  const all = await getStaticProducts();
  return all.filter((p) => p.isFeatured).slice(0, limit);
};

export const fetchProductBySlug = async (slug) => {
  if (!slug) return { product: null, relatedProducts: [] };
  const rawSlug = String(slug).trim();
  const decodedSlug = decodeURIComponent(rawSlug).toLowerCase();

  try {
    const res = await api.get(`/products/${encodeURIComponent(rawSlug)}`);
    const payload = res?.data || res;
    if (payload?.product) {
      return {
        product: payload.product,
        relatedProducts: Array.isArray(payload.relatedProducts) ? payload.relatedProducts : [],
      };
    } else if (payload && (payload._id || payload.slug || payload.name)) {
      return {
        product: payload,
        relatedProducts: Array.isArray(payload.relatedProducts) ? payload.relatedProducts : [],
      };
    }
  } catch (_err) {
    console.warn(`[API /products/${rawSlug} offline, using fallback dataset]`);
  }

  const all = await getStaticProducts();
  const allCategories = await getStaticCategories();
  const categoryMap = new Map(allCategories.map((c) => [c._id, c]));

  let found = all.find(
    (p) =>
      (p.slug && p.slug.toLowerCase() === decodedSlug) ||
      (p._id && String(p._id) === rawSlug) ||
      (p.code && p.code.toLowerCase() === decodedSlug)
  );

  // If still not found, try relaxed slug matching
  if (!found) {
    found = all.find((p) => {
      const pSlug = (p.slug || '').toLowerCase();
      return pSlug.includes(decodedSlug) || decodedSlug.includes(pSlug);
    });
  }

  if (!found) {
    return { product: null, relatedProducts: [] };
  }

  let populatedProduct = { ...found };
  if (typeof populatedProduct.category === 'string' && categoryMap.has(populatedProduct.category)) {
    populatedProduct.category = categoryMap.get(populatedProduct.category);
  }

  const catId =
    typeof populatedProduct.category === 'object'
      ? populatedProduct.category?._id
      : populatedProduct.category;

  const related = all
    .filter(
      (p) =>
        (p.category === catId || p.category?._id === catId) &&
        p._id !== populatedProduct._id
    )
    .slice(0, 4)
    .map((p) => {
      if (typeof p.category === 'string' && categoryMap.has(p.category)) {
        return { ...p, category: categoryMap.get(p.category) };
      }
      return p;
    });

  return {
    product: populatedProduct,
    relatedProducts: related,
  };
};

export const fetchSearchSuggestions = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) return [];
  const q = searchTerm.toLowerCase().trim();
  try {
    const res = await api.get('/products', {
      params: { search: q, limit: 5 },
    });
    if (res.data?.products && Array.isArray(res.data.products) && res.data.products.length > 0) {
      return res.data.products;
    }
  } catch (_e) {
    // fallback
  }

  const all = await getStaticProducts();
  return all
    .filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.finish && p.finish.toLowerCase().includes(q))
    )
    .slice(0, 5);
};

