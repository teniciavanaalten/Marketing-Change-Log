import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-sm hover:shadow-md active:scale-95";

  const variants = {
    primary: "bg-brand-300 hover:bg-brand-400 text-slate-900 font-bold focus:ring-brand-300",
    secondary: "bg-secondary-300 hover:bg-secondary-400 text-slate-900 font-bold focus:ring-secondary-300",
    outline: "border-2 border-brand-200 text-brand-700 hover:bg-brand-50 hover:border-brand-300 focus:ring-brand-200",
    ghost: "text-slate-600 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-slate-200",
    danger: "bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 focus:ring-red-200",
  };

  const sizes = {
    sm: "text-xs px-4 py-2 gap-1.5",
    md: "text-sm px-6 py-3 gap-2",
    lg: "text-base px-8 py-4 gap-2.5",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};