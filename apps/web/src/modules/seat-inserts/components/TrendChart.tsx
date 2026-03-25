import React from "react";
import { Activity } from "lucide-react";

interface TrendChartProps {
  title: string;
  data: { reason: string; count: number }[];
  loading: boolean;
}

export function TrendChart({ title, data, loading }: TrendChartProps) {
  if (loading) {
    return <div className="bg-card border border-border rounded-xl h-64 flex items-center justify-center animate-pulse shadow-sm"></div>;
  }

  // Purely CSS-based simplified horizontal bar chart to avoid enormous Recharts bundles for simple dashboards
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5 h-full flex flex-col">
      <h3 className="font-bold text-sm mb-5 flex items-center gap-2">
        <Activity className="w-4 h-4 text-muted-foreground" />
        {title}
      </h3>
      
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm opacity-60">
          No sufficient data
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1 justify-center">
          {data.map((item, i) => (
            <div key={i} className="flex flex-col gap-1 w-full">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span className="uppercase tracking-wider">{item.reason.replace(/_/g, " ")}</span>
                <span className="font-bold">{item.count}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
