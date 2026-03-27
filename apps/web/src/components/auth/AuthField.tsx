import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function AuthField({ label, error, type = "text", ...props }: AuthFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5 w-full text-left mb-4">
      <label className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative w-full">
        <input
          type={inputType}
          className={`w-full bg-white border ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20'
          } rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-sm focus:ring-4`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 outline-none transition-colors select-none"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && (
        <span className="text-xs text-red-500 font-medium ml-1">
          {error}
        </span>
      )}
    </div>
  );
}
