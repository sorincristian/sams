import React from "react";
import { Shield } from "lucide-react";

export function AuthBrand() {
  return (
    <div className="flex flex-col items-center justify-center mb-6">
      <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md mb-4 ring-4 ring-blue-50">
        <Shield className="w-7 h-7 text-white" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 m-0">SAMS Platform</h1>
    </div>
  );
}
