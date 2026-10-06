import React from 'react';
import { PackageOpen } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-[#DDD8CF] rounded-[2px] bg-[#F0EDE8]/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-[2px] bg-[#F0EDE8] border border-[#DDD8CF] flex items-center justify-center text-[#2E2622] mb-4">
        <Icon className="w-5 h-5 text-[#2E2622]" />
      </div>
      <h4 className="text-xl font-serif font-normal text-[#2E2622] mb-1">{title}</h4>
      <p className="text-xs text-[#7A726A] max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
