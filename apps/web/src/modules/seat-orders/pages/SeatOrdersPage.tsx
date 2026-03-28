import React, { useEffect, useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../api";

export function SeatOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/api/seat-orders");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Seat Orders</h1>
          <p className="text-slate-500 mt-1">Manage Harvey Shop procurement and email dispatch.</p>
        </div>
        <Link 
          to="/procurement/seat-orders/new"
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          <Plus className="w-5 h-5" />
          <span>New Order</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <th className="p-4 font-semibold">Order Number</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Garage</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr 
                  key={o.id} 
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                  onClick={() => navigate(`/procurement/seat-orders/${o.id}`)}
                >
                  <td className="p-4 font-medium text-slate-900">{o.orderNumber}</td>
                  <td className="p-4 text-slate-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-slate-600">{o.garage?.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700">
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">{o.totalQuantity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
