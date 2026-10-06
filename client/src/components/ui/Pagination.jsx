import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export const Pagination = ({ currentPage = 1, totalPages = 1, onPageChange, className = '' }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={`flex items-center justify-center gap-1.5 py-4 ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous Page"
        className="px-2.5 py-1.5 border-[#DDD8CF]"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </Button>

      {startPage > 1 && (
        <>
          <Button
            variant={currentPage === 1 ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(1)}
            className="px-3"
          >
            1
          </Button>
          {startPage > 2 && <span className="text-[#7A726A] px-1 text-xs">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onPageChange(page)}
          className="px-3"
        >
          {page}
        </Button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-[#7A726A] px-1 text-xs">...</span>}
          <Button
            variant={currentPage === totalPages ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(totalPages)}
            className="px-3"
          >
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="secondary"
        size="sm"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next Page"
        className="px-2.5 py-1.5 border-[#DDD8CF]"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default Pagination;
