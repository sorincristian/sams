import React from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-4 mb-8 pb-4 border-b border-slate-200">
      <div className="flex flex-col gap-1 w-full">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 m-0">{title}</h1>
        {description && <div className="text-sm lg:text-base text-slate-500 mt-1">{description}</div>}
      </div>
      {actions && (
        <div className="flex items-center shrink-0 w-full md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
