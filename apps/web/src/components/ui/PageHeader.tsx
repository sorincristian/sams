import React from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="row">
      <div>
        <h1>{title}</h1>
        {description && <div className="muted">{description}</div>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
