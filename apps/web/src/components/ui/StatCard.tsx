import React from 'react';

export function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card">
      <strong>{value}</strong>
      <div className="muted">{title}</div>
    </div>
  );
}
