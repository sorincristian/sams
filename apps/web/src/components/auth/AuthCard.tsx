import React from "react";

export function AuthCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden p-8 sm:p-10 ${className}`}>
      {children}
    </div>
  );
}
