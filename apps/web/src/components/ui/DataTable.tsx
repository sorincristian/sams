import React from 'react';

export function DataTable({ headers, children }: { headers: React.ReactNode; children: React.ReactNode }) {
  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
  );
}
