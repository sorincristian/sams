import React from 'react';

export function ErrorState({ error }: { error: string }) {
  return <div className="card"><strong>Error:</strong> <span className="muted">{error}</span></div>;
}
