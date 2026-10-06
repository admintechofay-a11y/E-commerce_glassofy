import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = React.forwardRef(
  (
    {
      label,
      error,
      options = [],
      placeholder = 'Select an option',
      className = '',
      id,
      name,
      required = false,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-[11px] font-medium tracking-[0.08em] text-[#7A726A] uppercase">
            {label} {required && <span className="text-[#A4493D]">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            name={name}
            required={required}
            className={`w-full appearance-none bg-[#FAF8F4] text-[#2E2622] text-sm rounded-[2px] border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#2E2622] focus:border-[#2E2622] px-3 py-2.5 pr-9 cursor-pointer ${
              error
                ? 'border-[#A4493D] focus:border-[#A4493D]'
                : 'border-[#DDD8CF] hover:border-[#9E978F]'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-[#FAF8F4] text-[#9E978F]">
                {placeholder}
              </option>
            )}
            {children
              ? children
              : options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#FAF8F4] text-[#2E2622] py-1">
                    {opt.label}
                  </option>
                ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#7A726A]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-[#A4493D] mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
