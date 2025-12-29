import React from "react";

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

const base = "inline-flex items-center justify-center font-bold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";

const variants: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:text-slate-400",
  ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-400"
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm"
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = "", children, ...rest }) => (
  <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
    {children}
  </button>
);

