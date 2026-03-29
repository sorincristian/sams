import React from "react";
import { Mail, FileText } from "lucide-react";

interface PreviewLine {
  id: string;
  partNumber: string;
  description: string;
  quantity: string | number;
}

interface SeatOrderPreviewPanelProps {
  garageName?: string;
  lines: PreviewLine[];
  notes?: string;
  orderNumber?: string;
  date?: string;
}

export function SeatOrderPreviewPanel({
  garageName,
  lines,
  notes,
  orderNumber,
  date
}: SeatOrderPreviewPanelProps) {
  const isReady = garageName && lines.length > 0;
  const totalQuantity = lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
  const totalItems = lines.length;

  return (
    <div className="bg-[#0f172a] rounded-[24px] border border-[#334155] shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="bg-[#1e293b]/50 border-b border-[#334155] p-5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-[#f8fafc]">Compiled Email Snapshot</h2>
        </div>
      </div>
      
      <div className="p-6 bg-[#020617]/50 flex-1">
        {!isReady ? (
          <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#334155] rounded-xl bg-[#1e293b]/30">
            <FileText className="w-8 h-8 opacity-40 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-400">Complete garage and line item details to generate email preview.</p>
          </div>
        ) : (
          <div className="bg-white text-slate-900 rounded-lg p-8 sm:p-12 shadow-inner font-sans max-w-2xl mx-auto border border-slate-200">
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Seat Insert Order</h1>
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Order No: <span className="text-slate-900 font-bold">{orderNumber || "DRAFT-PENDING"}</span></span>
                <span>Date: <span className="text-slate-900 font-bold">{date || new Date().toLocaleDateString()}</span></span>
              </div>
            </div>

            {/* Recipient / Auth Block */}
            <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
              <div>
                <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-1">To</h3>
                <p className="font-bold text-slate-900">Harvey Shop</p>
                <p className="text-slate-600">orders@harveyshop.internal</p>
              </div>
              <div>
                <h3 className="font-bold text-slate-400 uppercase tracking-wider text-xs mb-1">From</h3>
                <p className="font-bold text-slate-900">{garageName}</p>
                <p className="text-slate-600">SAMS Automated Procurement</p>
              </div>
            </div>

            {/* Delivery Block */}
            <div className="mb-8 p-4 bg-slate-50 border-l-4 border-slate-300 rounded-r text-sm">
              <h3 className="font-bold text-slate-700 mb-1">Delivery Location / Garage</h3>
              <p className="font-bold text-slate-900 mb-3">{garageName}</p>
              
              {notes && (
                <>
                  <h3 className="font-bold text-slate-700 mb-1">Delivery Instructions</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{notes}</p>
                </>
              )}
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 font-bold text-slate-700 uppercase tracking-wider text-xs w-[120px]">SKU / Part #</th>
                    <th className="py-3 font-bold text-slate-700 uppercase tracking-wider text-xs">Description</th>
                    <th className="py-3 font-bold text-slate-700 uppercase tracking-wider text-xs text-right w-[80px]">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map(line => (
                    <tr key={line.id}>
                      <td className="py-3 font-bold text-slate-700">{line.partNumber}</td>
                      <td className="py-3 text-slate-600">{line.description}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{line.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="text-sm font-medium text-slate-500 italic max-w-xs">
                Please confirm receipt of this order and advise delivery timing.
              </div>
              <div className="text-right flex space-x-8">
                <div>
                  <div className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">Total Items</div>
                  <div className="text-xl font-bold text-slate-700">{totalItems}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">Total Quantity</div>
                  <div className="text-2xl font-black text-slate-900">{totalQuantity}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
