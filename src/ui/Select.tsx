import React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export const Select: React.FC<SelectProps> = ({ label, className = "", children, ...rest }) => (
  <label className="block w-full">
    {label && <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">{label}</span>}
    <select className={`w-full border border-slate-200 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 ${className}`} {...rest}>
      {children}
    </select>
  </label>
);

