import React from "react";

export function DataTable({ headers, children }: { headers: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <table className="shared-data-table">
      <thead>
        <tr>
          {headers.map((header, i) => <th key={i}>{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
  );
}
