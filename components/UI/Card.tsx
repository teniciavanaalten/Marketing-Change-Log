import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-soft dark:shadow-none border border-slate-50 dark:border-slate-700 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-8 py-6 border-b border-dashed border-slate-100 dark:border-slate-700 flex justify-between items-center">
          {title && <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
};