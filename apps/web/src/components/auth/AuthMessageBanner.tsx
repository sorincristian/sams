import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface AuthMessageBannerProps {
  type: "error" | "success" | "info";
  message: string;
}

export function AuthMessageBanner({ type, message }: AuthMessageBannerProps) {
  if (!message) return null;

  const styles = {
    error: "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info: "bg-blue-50 border-blue-200 text-blue-700"
  };

  const Icon = type === "error" ? AlertCircle : type === "success" ? CheckCircle2 : Info;
  const iconColor = type === "error" ? "text-red-500" : type === "success" ? "text-green-500" : "text-blue-500";

  return (
    <div className={`w-full p-4 rounded-xl border flex items-start gap-3 text-sm font-medium mb-6 ${styles[type]}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}
