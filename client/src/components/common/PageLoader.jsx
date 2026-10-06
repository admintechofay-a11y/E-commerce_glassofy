import React from 'react';

export const PageLoader = () => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-8 h-8 rounded-full border border-[#DDD8CF] border-t-[#2E2622] animate-spin" />
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A] font-medium">
        Loading Glassofy Architectural Platform...
      </p>
    </div>
  );
};

export default PageLoader;
