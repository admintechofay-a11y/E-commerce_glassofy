import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts, fetchCategories } from '../api/catalogApi';
import ProductCard from '../components/products/ProductCard';
import FilterSidebar from '../components/products/FilterSidebar';
import MobileFilterDrawer from '../components/products/MobileFilterDrawer';
import { Pagination, Skeleton, EmptyState, Button, Select } from '../components/ui';
import { Filter, SlidersHorizontal, AlertCircle } from 'lucide-react';
import SEO from '../components/common/SEO';

export const ProductListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Extract filters from URL search params
  const currentCategory = searchParams.get('category') || 'all';
  const currentFinish = searchParams.get('finish') || 'all';
  const currentSize = searchParams.get('size') || 'all';
  const currentSearch = searchParams.get('search') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentSort = searchParams.get('sort') || 'featured';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const activeFilters = {
    category: currentCategory,
    finish: currentFinish,
    size: currentSize,
    search: currentSearch,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    sort: currentSort,
    page: currentPage,
  };

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategories(data || []);
    } catch (_err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRetry = () => {
    if (!categories || categories.length === 0) {
      loadCategories();
    }
    loadProducts();
  };

  // Fetch products with active params
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProducts({
        category: currentCategory !== 'all' ? currentCategory : undefined,
        finish: currentFinish !== 'all' ? currentFinish : undefined,
        size: currentSize !== 'all' ? currentSize : undefined,
        search: currentSearch || undefined,
        minPrice: currentMinPrice || undefined,
        maxPrice: currentMaxPrice || undefined,
        sort: currentSort,
        page: currentPage,
        limit: 12,
      });

      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.availableFilters) {
        setAvailableFilters(data.availableFilters);
      }
    } catch (err) {
      setError(err.message || 'Failed to load products. Please check connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [
    currentCategory,
    currentFinish,
    currentSize,
    currentSearch,
    currentMinPrice,
    currentMaxPrice,
    currentSort,
    currentPage,
  ]);

  useEffect(() => {
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadProducts]);

  // Update URL search parameters
  const updateFilterParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);

    if (value === 'all' || value === '' || value === undefined || value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }

    // Reset to page 1 on filter changes unless changing page itself
    if (key !== 'page') {
      newParams.delete('page');
    }

    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage) => {
    updateFilterParam('page', newPage.toString());
  };

  // Sort dropdown options
  const sortOptions = [
    { value: 'featured', label: 'Featured Collections' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newly Extracted' },
    { value: 'name_asc', label: 'Alphabetical: A-Z' },
  ];

  const categoryObj = categories.find((c) => c.slug === currentCategory);
  const pageTitle = currentCategory !== 'all'
    ? `${categoryObj?.name || 'Category'} Hardware`
    : currentSearch
      ? `Search results for "${currentSearch}"`
      : 'Architectural Hardware Catalogue';

  const pageDescription = categoryObj?.description ||
    'Browse premium architectural glass hardware, heavy-duty shower hinges, floor springs, connectors, and patch fittings in CP, SS, PVD Gold and Matt Black.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <SEO
        title={pageTitle}
        description={pageDescription}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: pageTitle,
          description: pageDescription,
          url: window.location.href,
        }}
      />

      {/* Top Banner / Editorial Header */}
      <div className="pb-6 sm:pb-8 border-b border-[#DDD8CF] mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="editorial-label block text-[#7A726A]">
            Architectural Hardware Catalogue
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#2E2622] mt-1">
            {currentCategory !== 'all'
              ? categories.find((c) => c.slug === currentCategory)?.name || 'Category Products'
              : currentSearch
                ? `Results for "${currentSearch}"`
                : 'All Hardware Fittings'}
          </h1>
          <p className="text-xs text-[#7A726A] mt-2">
            Heavy-duty brass & SS 304 architectural fittings engineered for Frameless Glass Systems.
          </p>
        </div>

        {/* Count & Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden gap-1.5"
          >
            <Filter className="w-3.5 h-3.5 text-[#2E2622]" />
            <span>Filters</span>
          </Button>

          {/* Sort Selector */}
          <div className="w-48">
            <Select
              value={currentSort}
              onChange={(e) => updateFilterParam('sort', e.target.value)}
              options={sortOptions}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 xl:gap-12">
        {/* Desktop Sidebar (1 col) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-28 bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] p-6">
            <FilterSidebar
              filters={activeFilters}
              onFilterChange={updateFilterParam}
              onResetFilters={handleResetFilters}
              categories={categories}
              availableFilters={availableFilters}
            />
          </div>
        </div>

        {/* Product Grid (3 cols) */}
        <div className="lg:col-span-3 space-y-8">
          {/* Active Search Banner */}
          {currentSearch && (
            <div className="p-3 bg-[#F0EDE8] border border-[#DDD8CF] rounded-[2px] flex items-center justify-between text-xs text-[#2E2622]">
              <span>
                Search results for <strong className="font-semibold">&quot;{currentSearch}&quot;</strong> ({total} items found)
              </span>
              <button
                onClick={() => updateFilterParam('search', '')}
                className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#2E2622] hover:underline"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-8 bg-[#F9ECEB] border border-[#A4493D]/30 rounded-[2px] text-center space-y-3">
              <AlertCircle className="w-6 h-6 text-[#A4493D] mx-auto" />
              <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#2E2622]">Error Loading Catalogue</h4>
              <p className="text-xs text-[#7A726A] max-w-md mx-auto">{error}</p>
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full rounded-[2px]" />
                  <Skeleton className="h-3 w-3/4 rounded-[2px]" />
                  <Skeleton className="h-3 w-1/3 rounded-[2px]" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && products.length === 0 && (
            <EmptyState
              icon={SlidersHorizontal}
              title="No Architectural Products Found"
              description="No fittings matched your current filter criteria. Try clearing some filters or searching for alternative hardware names."
              action={
                <Button variant="primary" size="sm" onClick={handleResetFilters}>
                  Clear All Filters
                </Button>
              }
            />
          )}

          {/* Product Cards Grid */}
          {!isLoading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {products.map((product) => (
                  <ProductCard key={product._id || product.slug} product={product} />
                ))}
              </div>

              {/* Pagination */}
              <div className="pt-6 border-t border-[#DDD8CF] flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">
                  Showing {(currentPage - 1) * 12 + 1} to {Math.min(currentPage * 12, total)} of{' '}
                  {total} products
                </span>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <MobileFilterDrawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={activeFilters}
        onFilterChange={updateFilterParam}
        onResetFilters={handleResetFilters}
        categories={categories}
        availableFilters={availableFilters}
        totalResults={total}
      />
    </div>
  );
};

export default ProductListingPage;
