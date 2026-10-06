import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  showClose = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#2E2622]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidth} bg-[#FAF8F4] border border-[#DDD8CF] rounded-[2px] shadow-2xl p-6 md:p-8 z-10`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#DDD8CF]">
          {title && (
            <h3 className="text-xl md:text-2xl font-serif font-normal text-[#2E2622] tracking-tight">{title}</h3>
          )}
          {showClose && (
            <button
              onClick={onClose}
              className="text-[#7A726A] hover:text-[#2E2622] transition-colors p-1 rounded-[2px] hover:bg-[#F0EDE8]"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
