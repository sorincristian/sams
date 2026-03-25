import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPIBoxProps {
  title: string;
  value: string | number;
  trendValue: number;
  trendLabel?: string;
  state?: "normal" | "warning" | "critical";
  icon?: React.ReactNode;
}

export function KPIBox({ title, value, trendValue, trendLabel = "vs prior period", state = "normal", icon }: KPIBoxProps) {
  const getColors = () => {
    switch (state) {
      case "critical": return { border: "border-red-500", bg: "bg-red-500/10", text: "text-red-600" };
      case "warning": return { border: "border-yellow-500", bg: "bg-yellow-500/10", text: "text-yellow-600" };
      default: return { border: "border-border", bg: "bg-card", text: "text-foreground" };
    }
  };

  const colors = getColors();
  
  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5 shadow-sm flex flex-col gap-2 transition-all hover:shadow-md`}>
      <div className="flex justify-between items-center text-muted-foreground">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {icon && <div className="opacity-70">{icon}</div>}
      </div>
      <div className="flex flex-col gap-1 mt-1">
        <span className={`text-3xl font-bold tracking-tight ${colors.text}`}>{value}</span>
        
        {trendValue !== 0 ? (
          <div className="flex items-center gap-1 text-xs">
            {trendValue > 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-500" />
            )}
            <span className={trendValue > 0 ? "text-emerald-500 font-medium" : "text-rose-500 font-medium"}>
              {trendValue > 0 ? "+" : ""}{trendValue}%
            </span>
            <span className="text-muted-foreground ml-1">{trendLabel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Minus className="w-3 h-3" />
            <span>No change {trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
