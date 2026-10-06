import { useEffect } from 'react';
import { X } from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import { Button } from '../ui';

export const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onResetFilters,
  categories,
  availableFilters,
  totalResults,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#2E2622]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-xs h-full bg-[#FAF8F4] border-l border-[#DDD8CF] p-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#DDD8CF] mb-6">
            <h3 className="font-serif text-xl font-normal text-[#2E2622]">Filter Products</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-[2px] text-[#7A726A] hover:text-[#2E2622]"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <FilterSidebar
            filters={filters}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
            categories={categories}
            availableFilters={availableFilters}
          />
        </div>

        <div className="pt-6 border-t border-[#DDD8CF] mt-8">
          <Button size="md" className="w-full justify-center" onClick={onClose}>
            Show Results {totalResults !== undefined ? `(${totalResults})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileFilterDrawer;
