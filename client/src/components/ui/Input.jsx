import React from 'react';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      className = '',
      id,
      name,
      type = 'text',
      required = false,
      ...props
    },
    ref
  ) => {
    const inputId = id || name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[11px] font-medium tracking-[0.08em] text-[#7A726A] uppercase">
            {label} {required && <span className="text-[#A4493D]">*</span>}
          </label>
        )}
        <div className="relative">
          {LeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7A726A]">
              <LeftIcon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            required={required}
            className={`w-full bg-[#FAF8F4] text-[#2E2622] placeholder-[#9E978F] text-sm rounded-[2px] border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#2E2622] focus:border-[#2E2622] ${
              LeftIcon ? 'pl-9' : 'pl-3'
            } ${RightIcon ? 'pr-9' : 'pr-3'} py-2.5 ${
              error
                ? 'border-[#A4493D] focus:border-[#A4493D] focus:ring-[#A4493D]'
                : 'border-[#DDD8CF] hover:border-[#9E978F]'
            } ${className}`}
            {...props}
          />
          {RightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#7A726A]">
              {RightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#A4493D] mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#7A726A] mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
