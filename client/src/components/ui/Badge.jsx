import React from 'react';

export const Badge = ({ children, variant = 'brass', size = 'md', className = '' }) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-[2px] select-none uppercase tracking-[0.08em]';

  const variants = {
    brass: 'bg-[#F0EDE8] text-[#B08D57] border border-[#DDD8CF]',
    slate: 'bg-[#F0EDE8] text-[#7A726A] border border-[#DDD8CF]',
    emerald: 'bg-[#EDF2EC] text-[#4F6B4A] border border-[#4F6B4A]/30',
    amber: 'bg-[#F7F3EC] text-[#B08D57] border border-[#B08D57]/30',
    rose: 'bg-[#F9ECEB] text-[#A4493D] border border-[#A4493D]/30',
  };

  const sizes = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant] || variants.brass} ${sizes[size] || sizes.md} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
