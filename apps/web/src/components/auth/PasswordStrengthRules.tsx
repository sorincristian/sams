import React from "react";
import { Check } from "lucide-react";

interface PasswordStrengthRulesProps {
  password: string;
}

export function PasswordStrengthRules({ password }: PasswordStrengthRulesProps) {
  const rules = [
    { label: "At least 8 characters", valid: (password || "").length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password || "") },
    { label: "One number or symbol", valid: /[^a-z]/i.test(password || "") && !/^[A-Za-z]+$/.test(password || "") }
  ];

  if (password === undefined || password === null) return null;

  return (
    <div className="flex flex-col gap-2 mb-6 mt-2">
      {rules.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-sm font-medium transition-colors">
          {r.valid ? (
            <Check className="w-4 h-4 text-green-500 shrink-0" />
          ) : (
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
          )}
          <span className={r.valid ? "text-slate-700" : "text-slate-400"}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}
