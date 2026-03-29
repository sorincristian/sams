import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghostDark';
  size?: 'default' | 'sm';
  loading?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'default',
  loading, 
  children, 
  className = '', 
  disabled, 
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-bold transition-all select-none outline-none focus:ring-4 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed whitespace-nowrap rounded-xl border";
  
  const sizeStyles = {
    default: "py-2.5 px-4 lg:py-3 lg:px-5",
    sm: "py-1.5 px-3 text-xs"
  };

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md border-transparent focus:ring-blue-600/20",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent focus:ring-slate-500/20",
    outline: "bg-white hover:bg-slate-50 text-slate-700 shadow-sm border-slate-300 focus:ring-slate-500/20",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-md border-transparent focus:ring-red-600/20",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-transparent focus:ring-emerald-600/20",
    ghostDark: "bg-transparent hover:bg-slate-400/10 text-[#cbd5e1] border-slate-400/20 focus:ring-slate-400/20"
  };

  return (
    <button 
      disabled={disabled || loading} 
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-1 shrink-0" />
      )}
      {children}
    </button>
  );
}
