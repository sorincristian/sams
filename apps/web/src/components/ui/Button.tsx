import React from 'react';

export function Button({ onClick, disabled, variant = 'primary', children }: { onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'secondary'; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className={variant === 'secondary' ? 'muted' : ''}>
      {children}
    </button>
  );
}
