import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Clock, XCircle, FileText, Mails } from "lucide-react";
import { api } from "../../../api";

export function SeatOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/api/seat-orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPreview = async () => {
    try {
      const res = await api.post(`/api/seat-orders/${id}/preview-email`);
      setPreviewHtml(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrder();
    fetchPreview();
  }, [id]);

  if (!order) return <div className="p-10 text-center">Loading...</div>;

  const handleAction = async (action: string) => {
    try {
      if (action === "submit") await api.post(`/api/seat-orders/${id}/submit`);
      if (action === "approve") await api.post(`/api/seat-orders/${id}/approve`, { status: "APPROVED", notes: "" });
      if (action === "reject") await api.post(`/api/seat-orders/${id}/approve`, { status: "REJECTED", notes: "" });
      if (action === "send" || action === "resend") await api.post(`/api/seat-orders/${id}/${action}`);
      if (action === "receive") {
        // Mock full-receive payload (normally this would be a specific Modal for partial lines)
        await api.post(`/api/seat-orders/${id}/receive`, {
          lines: order.lines.map((l: any) => ({ seatOrderLineId: l.id, receivedQty: l.quantity }))
        });
      }
      fetchOrder();
    } catch (error: any) {
      alert(`Action failed: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/procurement/seat-orders" className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-900 pb-1 inline-block">Order {order.orderNumber}</h1>
            <div className="flex items-center space-x-3 mt-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded font-semibold text-xs tracking-wide">
                {order.status}
              </span>
              <span className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex space-x-3">
          {order.status === "DRAFT" && (
            <button onClick={() => handleAction("submit")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold">
              Submit Draft
            </button>
          )}
          {order.status === "PENDING_APPROVAL" && (
            <>
              <button onClick={() => handleAction("reject")} className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-bold">Reject</button>
              <button onClick={() => handleAction("approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold">Approve</button>
            </>
          )}
          {order.status === "APPROVED" && (
            <button onClick={() => handleAction("send")} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2">
              <Send className="w-4 h-4" /> <span>Send Email</span>
            </button>
          )}
          {order.status === "SENT" && (
            <button onClick={() => handleAction("receive")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" /> <span>Mark Full Receipt</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Workspace (Left 8 Cols) */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-slate-800 flex items-center space-x-2">
               <FileText className="w-5 h-5 text-slate-400" />
               <span>Line Items</span>
             </div>
             <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-500">
                    <th className="p-4 font-semibold">Part Number</th>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold text-right">Quantity</th>
                    <th className="p-4 font-semibold text-right">Unit Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line: any) => (
                    <tr key={line.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                      <td className="p-4 font-mono text-slate-700">{line.seatInsertType?.partNumber}</td>
                      <td className="p-4 font-medium text-slate-900">{line.seatInsertType?.description}</td>
                      <td className="p-4 text-right font-bold text-slate-800">{line.quantity}</td>
                      <td className="p-4 text-right tabular-nums text-slate-600">\${(line.quantity * line.unitCost).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={2} className="p-4 font-bold text-right text-slate-600">Totals:</td>
                    <td className="p-4 text-right font-black text-slate-900">{order.totalQuantity}</td>
                    <td className="p-4 text-right font-black text-slate-900">\${order.totalCost.toFixed(2)}</td>
                  </tr>
                </tbody>
             </table>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-200 p-4 font-bold text-slate-800 flex items-center space-x-2">
               <Mails className="w-5 h-5 text-slate-400" />
               <span>Email Preview</span>
             </div>
             <div className="p-6">
                {previewHtml ? (
                  <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <div className="text-slate-400 italic text-sm">Preview unavailable</div>
                )}
             </div>
          </div>
        </div>

        {/* Context Sidebar (Right 4 Cols) */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Order Timeline</span>
            </h3>
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-2">
               {/* Timeline Node */}
               <div className="relative pl-6">
                 <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                 <p className="font-bold text-slate-800 text-sm">Draft Created</p>
                 <p className="text-xs text-slate-500 mt-1">{new Date(order.createdAt).toLocaleString()} by {order.createdByUser?.name}</p>
               </div>
               
               {/* Timeline Node */}
               {order.submittedAt && (
                 <div className="relative pl-6">
                   <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                   <p className="font-bold text-slate-800 text-sm">Submitted for Procurement</p>
                   <p className="text-xs text-slate-500 mt-1">{new Date(order.submittedAt).toLocaleString()}</p>
                 </div>
               )}

               {/* Timeline Node */}
               {order.approvals?.map((app: any) => (
                 <div key={app.id} className="relative pl-6">
                   <div className={`absolute w-3 h-3 ${app.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'} rounded-full -left-[7px] top-1.5 ring-4 ring-white`} />
                   <p className="font-bold text-slate-800 text-sm">Manager {app.status}</p>
                   <p className="text-xs text-slate-500 mt-1">{new Date(app.createdAt).toLocaleString()} by {app.approvedByUser?.name}</p>
                 </div>
               ))}

               {/* Timeline Node */}
               {order.sentAt && (
                 <div className="relative pl-6">
                   <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                   <p className="font-bold text-slate-800 text-sm">Dispatched via Notification Engine</p>
                   <p className="text-xs text-slate-500 mt-1">{new Date(order.sentAt).toLocaleString()}</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
