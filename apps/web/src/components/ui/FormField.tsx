import React from 'react';

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <label className="muted"><strong>{label}</strong></label>
      {children}
    </div>
  );
}
