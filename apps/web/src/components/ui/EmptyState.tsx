import React from 'react';

export function EmptyState({ message }: { message: string }) {
  return <div className="muted">{message}</div>;
}
