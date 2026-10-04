// Minimal CSV writer for test fixtures (quotes every field).
export function stringify(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(q).join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n') + '\n';
}
