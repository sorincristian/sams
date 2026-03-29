import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Send, CheckCircle, Clock, FileText, Mail, 
  ShieldAlert, History, Inbox, Loader2, RefreshCw, BadgeCheck, XCircle
} from "lucide-react";
import { api } from "../../../api";
import { Button } from "../../../components/ui/Button";

export function SeatOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderRes, previewRes, logsRes] = await Promise.all([
        api.get(`/api/seat-orders/${id}`),
        api.post(`/api/seat-orders/${id}/preview-email`).catch(() => ({ data: "" })),
        api.get(`/api/email-centre/logs?take=100`)
      ]);
      setOrder(orderRes.data);
      setPreviewHtml(previewRes.data);
      
      // Filter logs manually without altering backend
      const relatedLogs = logsRes.data.data.filter((l: any) => l.seatOrderId === id || l.seatOrder?.orderNumber === orderRes.data.orderNumber);
      setEmailLogs(relatedLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center p-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 opacity-50" />
      </div>
    );
  }

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === "submit") await api.post(`/api/seat-orders/${id}/submit`);
      if (action === "approve") await api.post(`/api/seat-orders/${id}/approve`, { status: "APPROVED", notes: "" });
      if (action === "reject") await api.post(`/api/seat-orders/${id}/approve`, { status: "REJECTED", notes: "" });
      if (action === "send" || action === "resend") await api.post(`/api/seat-orders/${id}/${action}`);
      if (action === "receive") {
        await api.post(`/api/seat-orders/${id}/receive`, {
          lines: order.lines.map((l: any) => ({ seatOrderLineId: l.id, receivedQty: l.quantity }))
        });
      }
      await fetchData();
    } catch (error: any) {
      alert(`Action failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryEmail = async (emailId: string) => {
    try {
      await api.post(`/api/email-centre/logs/${emailId}/retry`);
      fetchData();
    } catch (err) {
      alert("Failed to queue retry.");
    }
  };

  const requiresApproval = order.totalQuantity > 20 || order.totalCost > 1000;
  
  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "bg-slate-700/50 text-slate-300 border-slate-600/50",
      PENDING_APPROVAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      SENDING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      SENT: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
      PARTIALLY_RECEIVED: "bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20",
      RECEIVED: "bg-[#059669]/20 text-[#10b981] border-[#059669]/30",
      CANCELLED: "bg-slate-800 text-slate-400 border-slate-700"
    };
    const classes = map[status] || "bg-slate-800 text-slate-300 border-slate-700";
    return <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold tracking-wider uppercase border ${classes}`}>{status.replace(/_/g, " ")}</span>;
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghostDark" 
            onClick={() => navigate("/procurement/seat-orders")}
            className="!p-3 rounded-full border-[#334155] !bg-[#1e293b]"
            aria-label="Back to orders"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Button>
          <div>
             <h1 className="text-3xl font-bold tracking-tight text-[#f8fafc] flex items-center gap-3">
               Order {order.orderNumber}
             </h1>
             <div className="flex items-center space-x-3 mt-1.5">
               {getStatusBadge(order.status)}
               <span className="text-sm font-medium text-slate-500">
                 Created {new Date(order.createdAt).toLocaleDateString()}
               </span>
             </div>
          </div>
        </div>

        {/* Global Action Panel */}
        <div className="flex flex-wrap items-center gap-3">
          {order.status === "DRAFT" && (
            <Button onClick={() => handleAction("submit")} variant="primary" loading={actionLoading === "submit"} className="rounded-[14px]">
              <Send className="w-4 h-4 mr-2" />
              Submit Draft for Processing
            </Button>
          )}
          
          {(order.status === "APPROVED" || order.status === "FAILED") && (
            <Button onClick={() => handleAction("send")} variant="primary" loading={actionLoading === "send"} className="rounded-[14px] shadow-blue-500/20 shadow-lg">
              <Mail className="w-4 h-4 mr-2" />
              Dispatch Order Email
            </Button>
          )}
          
          {order.status === "SENT" && (
            <Button onClick={() => handleAction("receive")} variant="success" loading={actionLoading === "receive"} className="rounded-[14px] shadow-emerald-500/20 shadow-lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Full Receipt
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Main Workspace (Left 8 Cols) */}
        <div className="xl:col-span-8 space-y-6">
          
           {/* Items Table */}
           <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden">
             <div className="bg-[#1e293b]/50 border-b border-[#334155] p-5 flex items-center space-x-2">
               <FileText className="w-5 h-5 text-blue-400" />
               <h2 className="font-bold text-[#f8fafc]">Line Items & Costs</h2>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-[#1e293b]/20 border-b border-[#334155] text-[#94a3b8] text-[13px] uppercase tracking-wider">
                      <th className="p-4 pl-6 font-semibold">SKU / Part Number</th>
                      <th className="p-4 font-semibold">Description</th>
                      <th className="p-4 font-semibold text-right">Qty</th>
                      <th className="p-4 pr-6 font-semibold text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/50">
                    {order.lines.map((line: any) => (
                      <tr key={line.id} className="hover:bg-[#1e293b]/50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-[#cbd5e1]">{line.seatInsertType?.partNumber}</td>
                        <td className="p-4 font-medium text-[#94a3b8]">{line.seatInsertType?.description}</td>
                        <td className="p-4 text-right font-bold text-[#f8fafc]">{line.quantity}</td>
                        <td className="p-4 pr-6 text-right font-mono text-[#94a3b8]">${(line.quantity * line.unitCost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
             <div className="bg-[#1e293b]/80 p-5 flex justify-end gap-10 border-t border-[#334155]">
               <div className="text-right">
                 <div className="text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Total OrderedQty</div>
                 <div className="text-lg font-bold text-[#f8fafc]">{order.totalQuantity}</div>
               </div>
               <div className="text-right pr-2">
                 <div className="text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Estimated Cost</div>
                 <div className="text-lg font-black text-[#f8fafc]">${order.totalCost.toFixed(2)}</div>
               </div>
             </div>
           </div>

           {/* Email Log Table */}
           <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden">
             <div className="bg-[#1e293b]/50 border-b border-[#334155] p-5 flex items-center space-x-2">
               <Inbox className="w-5 h-5 text-indigo-400" />
               <h2 className="font-bold text-[#f8fafc]">Dispatch & Delivery Logs</h2>
             </div>
             <div className="overflow-x-auto p-4 sm:p-6 bg-[#020617]/50">
               <table className="w-full text-left border-collapse min-w-[700px] border border-[#334155] rounded-xl overflow-hidden bg-[#0f172a]">
                 <thead className="bg-[#1e293b]/50">
                   <tr className="text-[#94a3b8] text-[12px] uppercase tracking-wider">
                     <th className="p-3 font-semibold">Delivery Status</th>
                     <th className="p-3 font-semibold">Recipient</th>
                     <th className="p-3 font-semibold">Attempts</th>
                     <th className="p-3 font-semibold">Sent At</th>
                     <th className="p-3 font-semibold text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#334155]/50">
                   {emailLogs.length === 0 ? (
                     <tr>
                       <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                         No outbound emails generated yet.
                       </td>
                     </tr>
                   ) : emailLogs.map((log: any) => (
                     <tr key={log.id} className="hover:bg-[#1e293b]/20 transition-colors">
                       <td className="p-3">{getStatusBadge(log.status)}</td>
                       <td className="p-3 text-[13px] font-medium text-[#cbd5e1] truncate max-w-[200px]">{log.to}</td>
                       <td className="p-3 text-[13px] font-mono text-[#94a3b8]">{log.attempts} / 5</td>
                       <td className="p-3 text-[13px] font-mono text-[#94a3b8]">
                         {new Date(log.createdAt).toLocaleString()}
                       </td>
                       <td className="p-3 text-right">
                         {(log.status === "FAILED" || log.status === "BOUNCED") && (
                           <Button 
                             onClick={() => handleRetryEmail(log.id)}
                             variant="outline" 
                             size="sm" 
                             className="!bg-[#1e293b] border-[#334155] text-white"
                           >
                             <RefreshCw className="w-3 h-3 mr-1.5" /> Retry
                           </Button>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>

           {/* Email Preview Snapshot */}
           <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden">
             <div className="bg-[#1e293b]/50 border-b border-[#334155] p-5 flex items-center space-x-2">
               <Mail className="w-5 h-5 text-amber-400" />
               <h2 className="font-bold text-[#f8fafc]">Compiled Email Snapshot</h2>
             </div>
             <div className="p-6 sm:p-8 bg-white text-black min-h-[300px]">
                {previewHtml ? (
                  <div className="prose max-w-none text-[15px] text-slate-800" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center pt-10 text-slate-400">
                    <Mail className="w-8 h-8 opacity-50 mb-3" />
                    <p className="font-medium">Raw payload preview is currently unavailable.</p>
                  </div>
                )}
             </div>
           </div>

        </div>

        {/* Context Sidebar (Right 4 Cols) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Order Summary */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="font-bold text-[#f8fafc] mb-4 text-[15px]">Order Summary</h3>
            <div className="space-y-4">
              <div>
                <span className="block text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Requesting Garage</span>
                <span className="text-[#f8fafc] font-medium">{order.garage?.name || "Unknown"}</span>
              </div>
              <div>
                <span className="block text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Authored By</span>
                <span className="text-[#f8fafc] font-medium">{order.createdByUser?.name || "System"}</span>
              </div>
              <div>
                <span className="block text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Notes / Instructions</span>
                <p className="text-[#cbd5e1] text-sm italic border-l-2 border-[#334155] pl-3 py-1">
                  {order.notes || "None attached."}
                </p>
              </div>
            </div>
          </div>

          {/* Approval Panel */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="font-bold text-[#f8fafc] flex items-center gap-2 mb-4 text-[15px]">
              <ShieldAlert className={`w-5 h-5 ${order.status === 'PENDING_APPROVAL' ? 'text-amber-500' : 'text-slate-400'}`} />
              Approval Requirements
            </h3>
            
            {requiresApproval ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${order.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20' : order.status === 'REJECTED' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <p className={`text-sm font-bold mb-1 ${order.status === 'APPROVED' ? 'text-emerald-500' : order.status === 'REJECTED' ? 'text-red-500' : 'text-amber-500'}`}>
                    {order.status === "APPROVED" ? "Manager Approved" : order.status === "REJECTED" ? "Manager Rejected" : "Pending Supervisor Override"}
                  </p>
                  <div className={`text-[13px] font-medium ${order.status === 'APPROVED' ? 'text-emerald-500/80' : order.status === 'REJECTED' ? 'text-red-500/80' : 'text-amber-500/80'}`}>
                    {order.totalQuantity > 20 && <div>• High Volume: Qty &gt; 20 ({order.totalQuantity})</div>}
                    {order.totalCost > 1000 && <div>• High Cost: Cost &gt; $1,000 (${order.totalCost.toFixed(2)})</div>}
                  </div>
                </div>

                {order.status === "PENDING_APPROVAL" && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#334155]">
                    <Button onClick={() => handleAction("approve")} variant="success" loading={actionLoading === "approve"} className="w-full justify-center">
                      <BadgeCheck className="w-4 h-4 mr-2" /> Approve Order
                    </Button>
                    <Button onClick={() => handleAction("reject")} variant="danger" loading={actionLoading === "reject"} className="w-full justify-center !bg-red-500/10 hover:!bg-red-500/20 !text-red-500 !border-red-500/30">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-sm font-medium text-slate-400">Order falls within auto-approval thresholds.</p>
              </div>
            )}
          </div>

          {/* Timeline UI */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="font-bold text-[#f8fafc] mb-6 flex items-center gap-2 text-[15px]">
              <History className="w-5 h-5 text-blue-500" />
              Operational Timeline
            </h3>
            
            <div className="relative border-l-2 border-[#334155] ml-3 space-y-7 pb-2">
               
               {/* 1. Created */}
               <div className="relative pl-6">
                 <div className="absolute w-3 h-3 bg-slate-600 rounded-full -left-[7px] top-1.5 ring-4 ring-[#0f172a]" />
                 <p className="font-bold text-[#e2e8f0] text-[13px] tracking-wide">Draft Authored</p>
                 <p className="text-[12px] text-slate-500 font-mono mt-1">{new Date(order.createdAt).toLocaleString()} <span className="text-slate-600">•</span> {order.createdByUser?.name}</p>
               </div>
               
               {/* 2. Submitted */}
               {order.submittedAt && (
                 <div className="relative pl-6">
                   <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-[#0f172a]" />
                   <p className="font-bold text-[#e2e8f0] text-[13px] tracking-wide">Submitted to Pipeline</p>
                   <p className="text-[12px] text-slate-500 font-mono mt-1">{new Date(order.submittedAt).toLocaleString()}</p>
                 </div>
               )}

               {/* 3. Approvals */}
               {order.approvals?.map((app: any) => (
                 <div key={app.id} className="relative pl-6">
                   <div className={`absolute w-3 h-3 ${app.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'} rounded-full -left-[7px] top-1.5 ring-4 ring-[#0f172a]`} />
                   <p className="font-bold text-[#e2e8f0] text-[13px] tracking-wide">Manager {app.status}</p>
                   <p className="text-[12px] text-slate-500 font-mono mt-1">{new Date(app.createdAt).toLocaleString()} <span className="text-slate-600">•</span> {app.approvedByUser?.name}</p>
                 </div>
               ))}

               {/* 4. Sent / Dispatched */}
               {order.sentAt && (
                 <div className="relative pl-6">
                   <div className="absolute w-3 h-3 bg-amber-500 rounded-full -left-[7px] top-1.5 ring-4 ring-[#0f172a]" />
                   <p className="font-bold text-[#e2e8f0] text-[13px] tracking-wide">Dispatched to Harvey</p>
                   <p className="text-[12px] text-slate-500 font-mono mt-1">{new Date(order.sentAt).toLocaleString()}</p>
                 </div>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
