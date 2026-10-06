import { RotateCcw, Filter, Check } from 'lucide-react';
import { Button } from '../ui';

export const FilterSidebar = ({
  filters,
  onFilterChange,
  onResetFilters,
  categories = [],
  availableFilters = {},
  className = '',
}) => {
  const currentCategory = filters.category || 'all';
  const currentFinish = filters.finish || 'all';
  const currentSize = filters.size || 'all';

  const hasActiveFilters =
    (filters.category && filters.category !== 'all') ||
    (filters.finish && filters.finish !== 'all') ||
    (filters.size && filters.size !== 'all') ||
    Boolean(filters.search) ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice);

  return (
    <aside className={`space-y-6 ${className}`}>
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CF]">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#2E2622]" />
          <h3 className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E2622]">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] hover:text-[#2E2622] flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 1. Category Filter */}
      <div className="space-y-2 pb-6 border-b border-[#DDD8CF]">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A726A]">
          Categories
        </h4>
        <div className="space-y-0.5">
          <button
            onClick={() => onFilterChange('category', 'all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-xs transition-colors ${
              currentCategory === 'all'
                ? 'bg-[#F0EDE8] text-[#2E2622] font-semibold'
                : 'text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8]/50'
            }`}
          >
            <span>All Categories</span>
            {currentCategory === 'all' && <Check className="w-3.5 h-3.5 text-[#2E2622]" />}
          </button>

          {categories.map((cat) => {
            const isSelected = currentCategory === cat.slug || currentCategory === cat._id;
            return (
              <button
                key={cat._id || cat.slug}
                onClick={() => onFilterChange('category', cat.slug)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-xs transition-colors text-left ${
                  isSelected
                    ? 'bg-[#F0EDE8] text-[#2E2622] font-semibold'
                    : 'text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8]/50'
                }`}
              >
                <span className="truncate pr-2">{cat.name}</span>
                {cat.productCount !== undefined && (
                  <span className="text-[10px] text-[#7A726A]">({cat.productCount})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Finish Filter */}
      <div className="space-y-2 pb-6 border-b border-[#DDD8CF]">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A726A]">
          Finish & Material
        </h4>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onFilterChange('finish', 'all')}
            className={`px-2.5 py-1 rounded-[2px] text-[11px] uppercase tracking-[0.08em] transition-colors ${
              currentFinish === 'all'
                ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                : 'bg-[#F0EDE8] text-[#2E2622] border border-[#DDD8CF] hover:bg-[#DDD8CF]'
            }`}
          >
            All
          </button>
          {(availableFilters.finishes || ['BRASS', 'CP', 'SS', 'MATT BLACK']).map((fin) => {
            const isSelected = currentFinish.toUpperCase() === fin.toUpperCase();
            return (
              <button
                key={fin}
                onClick={() => onFilterChange('finish', isSelected ? 'all' : fin)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  isSelected
                    ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                    : 'bg-[#F0EDE8] text-[#2E2622] border border-[#DDD8CF] hover:bg-[#DDD8CF]'
                }`}
              >
                {fin}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Variant Size Filter */}
      {availableFilters.sizes && availableFilters.sizes.length > 0 && (
        <div className="space-y-2 pb-6 border-b border-[#DDD8CF]">
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A726A]">
            Dimensions & Sizing
          </h4>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onFilterChange('size', 'all')}
              className={`px-2.5 py-1 rounded-[2px] text-[11px] uppercase tracking-[0.08em] transition-colors ${
                currentSize === 'all'
                  ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                  : 'bg-[#F0EDE8] text-[#2E2622] border border-[#DDD8CF] hover:bg-[#DDD8CF]'
              }`}
            >
              All
            </button>
            {availableFilters.sizes.slice(0, 10).map((sz) => {
              const isSelected = currentSize === sz;
              return (
                <button
                  key={sz}
                  onClick={() => onFilterChange('size', isSelected ? 'all' : sz)}
                  className={`px-2.5 py-1 rounded-[2px] text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    isSelected
                      ? 'bg-[#3A2F2B] text-[#FAF8F4]'
                      : 'bg-[#F0EDE8] text-[#2E2622] border border-[#DDD8CF] hover:bg-[#DDD8CF]'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Price Range Filter */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#7A726A]">
          Price Range (₹)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase text-[#7A726A] block mb-1">Min (₹)</label>
            <input
              type="number"
              value={filters.minPrice || ''}
              onChange={(e) => onFilterChange('minPrice', e.target.value)}
              placeholder="0"
              className="w-full bg-[#FAF8F4] text-[#2E2622] text-xs p-2 rounded-[2px] border border-[#DDD8CF] focus:outline-none focus:border-[#2E2622]"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-[#7A726A] block mb-1">Max (₹)</label>
            <input
              type="number"
              value={filters.maxPrice || ''}
              onChange={(e) => onFilterChange('maxPrice', e.target.value)}
              placeholder="50000"
              className="w-full bg-[#FAF8F4] text-[#2E2622] text-xs p-2 rounded-[2px] border border-[#DDD8CF] focus:outline-none focus:border-[#2E2622]"
            />
          </div>
        </div>
        {(filters.minPrice || filters.maxPrice) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onFilterChange('minPrice', '');
              onFilterChange('maxPrice', '');
            }}
            className="w-full mt-2"
          >
            Clear Price Filter
          </Button>
        )}
      </div>
    </aside>
  );
};

export default FilterSidebar;
