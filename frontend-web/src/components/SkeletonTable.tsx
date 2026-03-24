import React from 'react';
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 8, cols = 6 }) => (
  <div className="table-wrap">
    <table className="data-table">
      <thead>
        <tr>{Array(cols).fill(0).map((_, i) => <th key={i}><div className="skeleton" style={{ height: 12, width: 60 }} /></th>)}</tr>
      </thead>
      <tbody>
        {Array(rows).fill(0).map((_, r) => (
          <tr key={r}>{Array(cols).fill(0).map((_, c) => <td key={c}><div className="skeleton" style={{ height: 12, width: c === 0 ? 80 : 60 }} /></td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);
