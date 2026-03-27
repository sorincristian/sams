import React from "react";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl font-semibold text-slate-900 mb-1.5">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
