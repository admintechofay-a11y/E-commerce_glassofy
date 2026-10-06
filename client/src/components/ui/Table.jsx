import React from 'react';

export const Table = ({ children, className = '' }) => (
  <div className="w-full overflow-x-auto rounded-[2px] border border-[#DDD8CF] bg-[#FAF8F4]">
    <table className={`w-full text-left text-sm text-[#2E2622] border-collapse ${className}`}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, className = '' }) => (
  <thead
    className={`bg-[#F0EDE8] border-b border-[#DDD8CF] text-[11px] uppercase tracking-[0.08em] text-[#7A726A] ${className}`}
  >
    {children}
  </thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-[#DDD8CF] ${className}`}>{children}</tbody>
);

export const TableRow = ({ children, className = '', hover = true }) => (
  <tr className={`transition-colors duration-150 ${hover ? 'hover:bg-[#F0EDE8]/60' : ''} ${className}`}>
    {children}
  </tr>
);

export const TableHead = ({ children, className = '' }) => (
  <th className={`px-4 py-3 font-medium text-[#7A726A] ${className}`}>{children}</th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-4 py-3 text-[#2E2622] align-middle ${className}`}>{children}</td>
);

export default Table;
