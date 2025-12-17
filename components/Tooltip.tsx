import React, { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <span className="group relative inline-block cursor-help border-b border-dotted border-gray-500 hover:border-emerald-400 transition-colors">
      {children}
      <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-xs text-white rounded-md shadow-2xl border border-gray-600 w-56 text-center z-50 leading-relaxed pointer-events-none">
        {content}
        {/* Tooltip Arrow Border */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-gray-600"></div>
        {/* Tooltip Arrow Background (overlays border to create outline effect) */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-4 border-transparent border-t-gray-800"></div>
      </div>
    </span>
  );
};

export default Tooltip;