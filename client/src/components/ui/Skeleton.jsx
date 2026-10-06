import React from 'react';

export const Skeleton = ({ className = '', count = 1 }) => {
  if (count > 1) {
    return (
      <div className="space-y-2.5 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`animate-pulse bg-[#F0EDE8] rounded-[2px] ${className}`} />
        ))}
      </div>
    );
  }

  return <div className={`animate-pulse bg-[#F0EDE8] rounded-[2px] ${className}`} />;
};

export default Skeleton;
