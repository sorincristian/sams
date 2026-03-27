import React from "react";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-blue-100">
      <div className="z-10 w-full flex flex-col items-center justify-center translate-y-[-5vh]">
        {children}
      </div>
    </div>
  );
}
