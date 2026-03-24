import React from 'react';

export function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}
