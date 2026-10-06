import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-[2px] transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#2E2622]/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none';

    const variants = {
      primary:
        'bg-[#3A2F2B] text-[#FAF8F4] hover:bg-[#2E2622] active:bg-[#1A1412] border border-[#3A2F2B]',
      secondary:
        'bg-[#F0EDE8] text-[#2E2622] border border-[#DDD8CF] hover:bg-[#E7E2DA] active:bg-[#DDD8CF]',
      outline:
        'border border-[#2E2622] text-[#2E2622] bg-transparent hover:bg-[#2E2622] hover:text-[#FAF8F4] active:bg-[#1A1412]',
      ghost:
        'text-[#7A726A] hover:text-[#2E2622] hover:bg-[#F0EDE8] border border-transparent',
      danger:
        'bg-[#A4493D] text-[#FAF8F4] hover:bg-[#8A3B31] active:bg-[#702F27] border border-[#A4493D]',
    };

    const sizes = {
      sm: 'text-[11px] uppercase tracking-[0.08em] px-3 py-1.5 gap-1.5',
      md: 'text-xs uppercase tracking-[0.08em] px-4 py-2.5 gap-2',
      lg: 'text-xs uppercase tracking-[0.08em] px-6 py-3.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
