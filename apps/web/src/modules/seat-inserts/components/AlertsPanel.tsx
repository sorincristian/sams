import React from "react";
import { AlertCircle, CheckCircle2, Clock, MapPin, Eye, CheckCircle } from "lucide-react";
import { api } from "../../../api";

interface Alert {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  triggeredAt: string;
  location?: { name: string };
}

export function AlertsPanel({ locationId }: { locationId?: string }) {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [locationId]);

  const fetchAlerts = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const query = locationId ? `?status=OPEN&locationId=${locationId}` : `?status=OPEN`;
      const res = await api.get(`/seat-inserts/alerts${query}`);
      setAlerts(res.data);
      setError(null);
    } catch (err: any) {
      if (!isBackground) setError(err.message || "Failed to load alerts");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "acknowledge" | "resolve") => {
    if (!window.confirm(`Are you sure you want to ${action} this alert?`)) return;
    
    // Optimistic UI update
    setAlerts(prev => prev.filter(a => a.id !== id));
    
    try {
      await api.post(`/seat-inserts/alerts/${id}/${action}`);
      // re-fetch to ensure consistency if desired, but optimistic is enough here
    } catch (err: any) {
      alert(`Failed to ${action} alert: ${err.message}`);
      fetchAlerts(); // rollback on error
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "CRITICAL": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "HIGH": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "MEDIUM": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default: return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  if (loading && alerts.length === 0) return <div className="p-6 text-center text-muted-foreground animate-pulse">Scanning surveillance vectors...</div>;
  if (error && alerts.length === 0) return <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg">{error}</div>;

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="p-5 border-b border-border bg-slate-50/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Active Exceptions
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Rule engine evaluated detections requiring operator clearance</p>
        </div>
        <div className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">{alerts.length} OPEN</div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 relative">
        {loading && <div className="absolute top-2 right-2 flex space-x-1"><div className="w-2 h-2 rounded-full bg-primary animate-ping"></div></div>}
        
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 h-full text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3 opacity-50" />
            <p className="font-medium text-sm">All operations nominal</p>
            <p className="text-xs opacity-70">No active alerts detected across the fleet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} transition-all hover:shadow-sm`}>
                <div className="flex flex-col gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-background/50 border border-current/10">
                        {alert.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-medium flex items-center gap-1 opacity-80">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.triggeredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                    <p className="text-xs opacity-90 leading-relaxed">{alert.description}</p>
                    {alert.location && (
                      <div className="flex items-center gap-1 text-xs mt-3 font-medium opacity-80">
                        <MapPin className="w-3 h-3" />
                        {alert.location.name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-current/10 pt-2 mt-1">
                    <button 
                      onClick={() => handleAction(alert.id, "acknowledge")}
                      className="bg-background/80 hover:bg-background text-foreground text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Ack
                    </button>
                    <button 
                      onClick={() => handleAction(alert.id, "resolve")}
                      className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
