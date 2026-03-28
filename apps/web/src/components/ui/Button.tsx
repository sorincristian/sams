import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
}

export function Button({ 
  variant = 'primary', 
  loading, 
  children, 
  className = '', 
  disabled, 
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-bold transition-all select-none outline-none focus:ring-4 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed whitespace-nowrap";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md py-2.5 px-4 lg:py-3 lg:px-5 border border-transparent focus:ring-blue-600/20",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 px-4 lg:py-3 lg:px-5 border border-transparent focus:ring-slate-500/20",
    outline: "bg-white hover:bg-slate-50 text-slate-700 rounded-xl py-2.5 px-4 lg:py-3 lg:px-5 border border-slate-300 shadow-sm focus:ring-slate-500/20"
  };

  return (
    <button 
      disabled={disabled || loading} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-1 shrink-0" />
      )}
      {children}
    </button>
  );
}
