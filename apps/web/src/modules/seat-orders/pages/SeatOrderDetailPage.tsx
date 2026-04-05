import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Send, CheckCircle, Clock, FileText, Mail, 
  ShieldAlert, History, Inbox, Loader2, RefreshCw, BadgeCheck, XCircle,
  PackageCheck, RotateCw, CheckCircle2, ShieldX, ShoppingCart
} from "lucide-react";
import { api } from "../../../api";
import { Button } from "../../../components/ui/Button";
import { SeatOrderPreviewPanel } from "../components/SeatOrderPreviewPanel";

// Unify Badge status rendering
const OrderStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-700/50 text-slate-300 border-slate-600/50",
    PENDING_APPROVAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    SENDING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    SENT: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    CONFIRMED: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    PARTIALLY_RECEIVED: "bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20",
    RECEIVED: "bg-[#059669]/20 text-[#10b981] border-[#059669]/30",
    INSTALLED: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    CLOSED: "bg-slate-800 text-slate-400 border-slate-700",
    CANCELLED: "bg-red-900/40 text-red-500 border-red-900/50"
  };
  const classes = map[status] || "bg-slate-800 text-slate-300 border-slate-700";
  return <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold tracking-wider uppercase border ${classes}`}>{status.replace(/_/g, " ")}</span>;
};

const EmailStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    QUEUED: "bg-slate-700/50 text-slate-300 border-slate-600/50",
    SENDING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    SENT: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    DELIVERED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    FAILED: "bg-red-500/10 text-red-400 border-red-500/20"
  };
  const classes = map[status] || "bg-slate-800 text-slate-400 border-slate-700";
  return <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold tracking-wider uppercase border ${classes}`}>{status.replace(/_/g, " ")}</span>;
};

export function SeatOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderRes, logsRes] = await Promise.all([
        api.get(`/seat-orders/${id}`),
        api.get(`/email-centre/logs?take=100`)
      ]);
      setOrder(orderRes.data);
      
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
    if (actionLoading) return;
    setActionLoading(action);
    try {
      if (action === "submit") await api.post(`/seat-orders/${id}/submit`);
      if (action === "approve") await api.post(`/seat-orders/${id}/approve`, { status: "APPROVED", notes: "" });
      if (action === "reject") await api.post(`/seat-orders/${id}/approve`, { status: "REJECTED", notes: "" });
      if (action === "send" || action === "resend") await api.post(`/seat-orders/${id}/${action}`);
      if (action === "receive") {
        await api.post(`/seat-orders/${id}/receive`, {
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
    if (actionLoading) return;
    setActionLoading(`retry-${emailId}`);
    try {
      await api.post(`/email-centre/logs/${emailId}/retry`);
      await fetchData();
    } catch (err) {
      alert("Failed to queue retry.");
    } finally {
      setActionLoading(null);
    }
  };

  const requiresApproval = order.totalQuantity > 500;

  // ── Received Quantity Derivation ──
  // Priority: 1) line-level receivedQty  2) sum from receipt entries  3) null (unavailable)
  const hasReceiptData = order.receipts && Array.isArray(order.receipts) && order.receipts.length > 0;
  const hasReceiptLines = hasReceiptData && order.receipts.some((r: any) => r.lines && r.lines.length > 0);

  // Per-line received qty: returns number | null (null = data unavailable)
  const getLineReceivedQty = (line: any): number | null => {
    // 1) Direct line-level field
    if (typeof line.receivedQty === "number") return line.receivedQty;
    // 2) Derive from receipt line entries
    if (hasReceiptLines) {
      return order.receipts.reduce((sum: number, r: any) => {
        const match = r.lines?.find((rl: any) => rl.seatOrderLineId === line.id);
        return sum + (match?.receivedQty || 0);
      }, 0);
    }
    // 3) Status-based inference (order fully received but no line detail)
    if (order.status === "RECEIVED") return line.quantity;
    return null;
  };

  // Aggregate totals
  let totalReceived: number | null = null;
  const lineReceivedMap = new Map<string, number | null>();
  order.lines.forEach((line: any) => {
    const recQty = getLineReceivedQty(line);
    lineReceivedMap.set(line.id, recQty);
    if (recQty !== null) totalReceived = (totalReceived ?? 0) + recQty;
  });
  const canShowReceived = totalReceived !== null;
  const pendingReceive = canShowReceived ? Math.max(0, order.totalQuantity - (totalReceived ?? 0)) : null;
  const receiveStatusDisplay = order.status === "RECEIVED" ? "Fully Received" : order.status === "PARTIALLY_RECEIVED" ? "Partially Received" : "Pending Vendor Delivery";

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6">
      
      {/* 2. Top Command Header */}
      <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghostDark" 
            onClick={() => navigate("/procurement/seat-orders")}
            className="!p-3 rounded-full border-[#334155] hover:!bg-[#1e293b]"
            aria-label="Back to orders"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-[#f8fafc]">
                Order {order.orderNumber}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="text-[#94a3b8] font-medium flex items-center gap-2">
              <span>{order.garage?.name || "Unknown Garage"}</span>
              <span className="text-[#334155]">|</span>
              <span>Created {new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:ml-auto">
          {order.status === "DRAFT" && (
            <Button onClick={() => handleAction("submit")} variant="primary" loading={actionLoading === "submit"} className="rounded-[12px] h-[44px]">
              <Send className="w-4 h-4 mr-2" /> Submit Draft
            </Button>
          )}
          
          {(order.status === "APPROVED" || order.status === "FAILED") && (
            <Button onClick={() => handleAction("send")} variant="primary" loading={actionLoading === "send"} className="rounded-[12px] h-[44px] shadow-blue-500/20 shadow-lg">
              <Mail className="w-4 h-4 mr-2" /> Dispatch Order Email
            </Button>
          )}
          
          {(order.status === "SENT" || order.status === "PARTIALLY_RECEIVED" || order.status === "CONFIRMED") && (
            <Button onClick={() => handleAction("receive")} variant="success" loading={actionLoading === "receive"} className="rounded-[12px] h-[44px] shadow-emerald-500/20 shadow-lg border border-emerald-500/50">
              <PackageCheck className="w-4 h-4 mr-2" /> Receive Items
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Main Workspace) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* 3. Order Summary Card */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="text-[15px] font-bold text-[#f8fafc] mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Order Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <div>
                <span className="block text-[11px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Requesting Location</span>
                <span className="text-[#f8fafc] font-medium text-sm">{order.garage?.name || "Unknown"}</span>
              </div>
              <div>
                <span className="block text-[11px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Authored By</span>
                <span className="text-[#f8fafc] font-medium text-sm flex items-center">
                  {order.createdByUser?.name || "System"}
                </span>
              </div>
              <div>
                <span className="block text-[11px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Created At</span>
                <span className="text-[#f8fafc] font-medium text-sm">{new Date(order.createdAt).toLocaleString()}</span>
              </div>
               <div>
                <span className="block text-[11px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Approval Required?</span>
                <span className={`font-bold text-sm ${requiresApproval ? 'text-amber-500' : 'text-slate-400'}`}>
                  {requiresApproval ? "Yes" : "No"}
                </span>
              </div>
              <div className="md:col-span-4 bg-[#1e293b]/40 rounded-xl p-4 border border-[#334155]/50">
                <span className="block text-[11px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Delivery Instructions</span>
                <p className="text-[#cbd5e1] text-sm">
                  {order.notes || <span className="italic text-slate-500">No delivery instructions provided.</span>}
                </p>
              </div>
            </div>
          </div>

          {/* 9. Receiving Summary Card */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-bold text-[#f8fafc] flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                Receiving Activity
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1e293b]/50 border border-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-[12px] uppercase text-[#94a3b8] font-bold tracking-wider mb-1">Total Ordered</p>
                <p className="text-2xl font-black text-[#f8fafc]">{order.totalQuantity}</p>
              </div>
              <div className="bg-[#1e293b]/50 border border-emerald-500/20 rounded-xl p-4 text-center ring-1 ring-inset ring-emerald-500/10">
                <p className="text-[12px] uppercase text-emerald-500/80 font-bold tracking-wider mb-1">Total Received</p>
                <p className="text-2xl font-black text-emerald-400">{canShowReceived ? totalReceived : <span className="text-sm font-medium text-slate-500 italic">No receipt logged</span>}</p>
              </div>
              <div className="bg-[#1e293b]/50 border border-amber-500/20 rounded-xl p-4 text-center ring-1 ring-inset ring-amber-500/10">
                <p className="text-[12px] uppercase text-amber-500/80 font-bold tracking-wider mb-1">Remaining</p>
                <p className="text-2xl font-black text-amber-400">{pendingReceive !== null ? pendingReceive : <span className="text-sm font-medium text-slate-500 italic">—</span>}</p>
              </div>
            </div>
            
            <div className="bg-[#020617]/50 rounded-lg p-4 border border-[#334155] flex justify-between items-center text-sm font-medium">
              <span className="text-[#94a3b8]">Overall Status: <span className="text-slate-300 ml-2">{receiveStatusDisplay}</span></span>
              {hasReceiptData && order.receipts[0].createdAt && (
                <span className="text-slate-500">Last Receipt: {new Date(order.receipts[0].createdAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* 4. Items Table Card */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden">
             <div className="bg-[#1e293b]/40 border-b border-[#334155] p-5 flex items-center space-x-2">
               <ShoppingCart className="w-5 h-5 text-indigo-400" />
               <h2 className="font-bold text-[#f8fafc]">Item Breakdown</h2>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-[#1e293b]/20 border-b border-[#334155] text-[#94a3b8] text-[12px] uppercase tracking-wider">
                      <th className="p-4 pl-6 font-semibold">SKU / Part Number</th>
                      <th className="p-4 font-semibold">Description</th>
                      <th className="p-4 font-semibold text-center">Ordered Qty</th>
                      <th className="p-4 font-semibold text-center">Received Qty</th>
                      <th className="p-4 pr-6 font-semibold text-center">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/50">
                    {order.lines.map((line: any) => {
                      const recQty = lineReceivedMap.get(line.id);
                      const recAvailable = recQty !== null && recQty !== undefined;
                      const remQty = recAvailable ? Math.max(0, line.quantity - recQty) : null;
                      return (
                        <tr key={line.id} className="hover:bg-[#1e293b]/30 transition-colors">
                          <td className="p-4 pl-6 font-bold text-[#cbd5e1]">{line.seatInsertType?.partNumber}</td>
                          <td className="p-4 font-medium text-[#94a3b8]">{line.seatInsertType?.description}</td>
                          <td className="p-4 text-center font-bold text-slate-300 bg-[#020617]/30">{line.quantity}</td>
                          <td className="p-4 text-center bg-emerald-950/20">
                            {recAvailable
                              ? <span className="font-bold text-emerald-400">{recQty}</span>
                              : <span className="text-[12px] italic text-slate-500">—</span>
                            }
                          </td>
                          <td className="p-4 pr-6 text-center bg-amber-950/10">
                            {remQty !== null
                              ? (remQty === 0 ? <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500/50" /> : <span className="font-bold text-amber-500">{remQty}</span>)
                              : <span className="text-[12px] italic text-slate-500">—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
             </div>
          </div>

          {/* 6. Email Preview Snapshot */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <div className="flex items-center space-x-2 mb-6">
               <Mail className="w-5 h-5 text-slate-400" />
               <h2 className="font-bold text-[#f8fafc]">Email Preview Snapshot</h2>
            </div>
            {/* Metadata Strip */}
            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-t-xl p-4 text-sm font-medium space-y-2">
               <div className="flex"><span className="w-20 text-[#94a3b8]">To:</span><span className="text-slate-300">Harvey Shop Procurement &lt;orders@harveyshop.internal&gt;</span></div>
               <div className="flex"><span className="w-20 text-[#94a3b8]">From:</span><span className="text-slate-300">{order.garage?.name} (SAMS Automated Agent)</span></div>
               <div className="flex"><span className="w-20 text-[#94a3b8]">Subject:</span><span className="text-slate-300">Seat Order {order.orderNumber} - {order.garage?.name}</span></div>
            </div>
            <div className="border border-t-0 border-[#334155] rounded-b-xl overflow-hidden">
               <SeatOrderPreviewPanel
                 garageName={order.garage?.name}
                 orderNumber={order.orderNumber}
                 date={new Date(order.createdAt).toLocaleDateString()}
                 notes={order.notes}
                 lines={order.lines.map((l: any) => ({
                   id: l.id,
                   partNumber: l.seatInsertType?.partNumber || "",
                   description: l.seatInsertType?.description || "",
                   quantity: l.quantity
                 }))}
               />
            </div>
          </div>

        </div>

        {/* Right Column (Context Sidebar) */}
        <div className="xl:col-span-4 flex flex-col gap-6">

          {/* 5. Approval Panel */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="font-bold text-[#f8fafc] flex items-center gap-2 mb-4 text-[15px]">
              <ShieldAlert className={`w-5 h-5 ${order.status === 'PENDING_APPROVAL' ? 'text-amber-500' : 'text-slate-400'}`} />
              Approval Control
            </h3>
            
            {requiresApproval ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${order.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20' : order.status === 'REJECTED' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <p className={`text-sm font-bold mb-1 ${order.status === 'APPROVED' ? 'text-emerald-500' : order.status === 'REJECTED' ? 'text-red-500' : 'text-amber-500'}`}>
                    {order.status === "APPROVED" ? "Manager Approved" : order.status === "REJECTED" ? "Manager Rejected" : "Pending Supervisor Override"}
                  </p>
                  <p className={`text-[13px] font-medium leading-relaxed ${order.status === 'APPROVED' ? 'text-emerald-500/80' : order.status === 'REJECTED' ? 'text-red-500/80' : 'text-amber-500/80'}`}>
                    Order total ({order.totalQuantity} items) exceeds standard threshold of 500 items.
                  </p>
                  
                  {/* Show actual approver details if logged */}
                  {(order.status === 'APPROVED' || order.status === 'REJECTED') && order.approvals && order.approvals.length > 0 && (
                     <div className="mt-3 pt-3 border-t border-black/10 flex justify-between items-center opacity-80">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-inherit">By: {order.approvals[0].approvedByUser?.name || "Unknown"}</span>
                     </div>
                  )}
                </div>

                {order.status === "PENDING_APPROVAL" && (
                  <div className="flex gap-2 pt-2 border-t border-[#334155]">
                    <Button onClick={() => handleAction("approve")} variant="success" loading={actionLoading === "approve"} className="flex-1 justify-center !px-2">
                       <BadgeCheck className="w-4 h-4 mr-1.5" /> Approve
                    </Button>
                    <Button onClick={() => handleAction("reject")} variant="danger" loading={actionLoading === "reject"} className="flex-1 justify-center !bg-red-500/10 hover:!bg-red-500/20 !text-red-500 !border-red-500/30 !px-2">
                       <ShieldX className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#1e293b]/40 border border-[#334155]/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500/70 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-300">Approval Not Required</p>
                  <p className="text-[12px] font-medium text-slate-500 mt-0.5">Order size falls within auto-approval boundaries.</p>
                </div>
              </div>
            )}
          </div>

          {/* 7. Email Log Table */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[400px]">
            <div className="bg-[#1e293b]/30 p-5 flex items-center space-x-2 border-b border-[#334155]">
              <Inbox className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-[#f8fafc] text-[15px]">Outbound Log</h2>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
               {emailLogs.length === 0 ? (
                 <div className="p-8 text-center bg-[#020617]/30 h-full flex flex-col justify-center items-center">
                   <Mail className="w-6 h-6 text-slate-600 mb-2 opacity-50" />
                   <p className="text-[13px] font-medium text-slate-500">No email activity logged yet.</p>
                 </div>
               ) : (
                 <div className="divide-y divide-[#334155]/40 text-[13px]">
                   {emailLogs.map((log: any) => (
                     <div key={log.id} className="p-4 hover:bg-[#1e293b]/20 transition-colors">
                       <div className="flex justify-between items-start mb-2">
                         <div className="font-bold text-[#cbd5e1] truncate mr-2" title={log.to}>{log.to}</div>
                         <EmailStatusBadge status={log.status} />
                       </div>
                       <div className="text-slate-500 font-mono text-[11px] mb-2 flex justify-between">
                         <span>{new Date(log.createdAt).toLocaleString()}</span>
                         <span>Att: {log.attempts}</span>
                       </div>
                       
                       {(log.status === "FAILED" || log.status === "BOUNCED") && (
                         <div className="pt-2 border-t border-[#334155]/30">
                           <Button 
                             onClick={() => handleRetryEmail(log.id)}
                             variant="outline" 
                             size="sm" 
                             className="w-full justify-center !text-slate-300 border-[#334155]"
                             loading={actionLoading === `retry-${log.id}`}
                           >
                             <RotateCw className="w-3 h-3 mr-2" /> Queue Retry
                           </Button>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>

          {/* 8. Timeline Card */}
          <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl p-6">
            <h3 className="font-bold text-[#f8fafc] mb-6 flex items-center gap-2 text-[15px]">
              <History className="w-5 h-5 text-blue-500" />
              Action History
            </h3>
            
            <div className="relative border-l-2 border-[#334155] ml-4 space-y-6 pb-2">
               
               {/* 1. Created */}
               <div className="relative pl-6 pt-1">
                 <div className="absolute w-[22px] h-[22px] bg-[#1e293b] rounded-full -left-[12px] top-0 ring-4 ring-[#0f172a] border border-[#334155] flex items-center justify-center">
                    <FileText className="w-3 h-3 text-slate-400" />
                 </div>
                 <p className="font-bold text-[#e2e8f0] text-[13px] tracking-wide leading-tight">Draft Authored</p>
                 <p className="text-[11px] text-slate-500 font-mono mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
                 <p className="text-[12px] text-slate-400 mt-1">{order.createdByUser?.name}</p>
               </div>
               
               {/* 2. Submitted */}
               {order.submittedAt && (
                 <div className="relative pl-6 pt-1">
                   <div className="absolute w-[22px] h-[22px] bg-[#1e293b] rounded-full -left-[12px] top-0 ring-4 ring-[#0f172a] border border-blue-500/30 flex items-center justify-center">
                      <Send className="w-3 h-3 text-blue-400" />
                   </div>
                   <p className="font-bold text-blue-400 text-[13px] tracking-wide leading-tight">Submitted to Pipeline</p>
                   <p className="text-[11px] text-slate-500 font-mono mt-0.5">{new Date(order.submittedAt).toLocaleString()}</p>
                 </div>
               )}

               {/* 3. Approvals */}
               {order.approvals?.map((app: any) => (
                 <div key={app.id} className="relative pl-6 pt-1">
                   <div className={`absolute w-[22px] h-[22px] bg-[#1e293b] rounded-full -left-[12px] top-0 ring-4 ring-[#0f172a] border ${app.status === 'APPROVED' ? 'border-emerald-500/30' : 'border-red-500/30'} flex items-center justify-center`}>
                      {app.status === 'APPROVED' ? <BadgeCheck className="w-3 h-3 text-emerald-400" /> : <ShieldX className="w-3 h-3 text-red-400" />}
                   </div>
                   <p className={`font-bold text-[13px] tracking-wide leading-tight ${app.status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'}`}>Manager {app.status}</p>
                   <p className="text-[11px] text-slate-500 font-mono mt-0.5">{new Date(app.createdAt).toLocaleString()}</p>
                   <p className="text-[12px] text-slate-400 mt-1">{app.approvedByUser?.name}</p>
                 </div>
               ))}

               {/* 4. Sent / Dispatched */}
               {order.sentAt && (
                 <div className="relative pl-6 pt-1">
                   <div className="absolute w-[22px] h-[22px] bg-[#1e293b] rounded-full -left-[12px] top-0 ring-4 ring-[#0f172a] border border-amber-500/30 flex items-center justify-center">
                      <Mail className="w-3 h-3 text-amber-400" />
                   </div>
                   <p className="font-bold text-amber-500 text-[13px] tracking-wide leading-tight">Dispatched to Harvey</p>
                   <p className="text-[11px] text-slate-500 font-mono mt-0.5">{new Date(order.sentAt).toLocaleString()}</p>
                 </div>
               )}

               {/* 5. Receipts */}
               {order.receipts?.map((rec: any, index: number) => (
                 <div key={rec.id || index} className="relative pl-6 pt-1">
                   <div className="absolute w-[22px] h-[22px] bg-emerald-950 rounded-full -left-[12px] top-0 ring-4 ring-[#0f172a] border border-emerald-500/50 flex items-center justify-center">
                      <PackageCheck className="w-3 h-3 text-emerald-400" />
                   </div>
                   <p className="font-bold text-emerald-400 text-[13px] tracking-wide leading-tight">Delivery Processed</p>
                   <p className="text-[11px] text-emerald-500/60 font-mono mt-0.5">{new Date(rec.createdAt).toLocaleString()}</p>
                   <p className="text-[12px] text-emerald-400/80 mt-1">{rec.receivedByUser?.name || 'Authorized Receiver'}</p>
                 </div>
               ))}
               
               {/* 6. Closed */}
               {order.status === "CLOSED" && (
                 <div className="relative pl-6 pt-1">
                   <div className="absolute w-[22px] h-[22px] bg-[#1e293b] rounded-full -left-[12px] top-0 ring-4 ring-[#0f172a] border border-slate-500/30 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-slate-400" />
                   </div>
                   <p className="font-bold text-slate-400 text-[13px] tracking-wide leading-tight">Order Finalized</p>
                   <p className="text-[11px] text-slate-500 font-mono mt-0.5">{new Date(order.updatedAt).toLocaleString()}</p>
                 </div>
               )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
