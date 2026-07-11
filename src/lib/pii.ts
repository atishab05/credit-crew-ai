// DPDP-aligned display helpers. Never mutate stored values — mask only at render time.

export function maskPan(pan?: string | null) {
  if (!pan) return "—";
  const p = pan.toUpperCase();
  if (p.length !== 10) return p;
  return `${p.slice(0, 3)}•••${p.slice(-2)}`;
}

export function maskGstin(gstin?: string | null) {
  if (!gstin) return "—";
  const g = gstin.toUpperCase();
  if (g.length !== 15) return g;
  return `${g.slice(0, 4)}•••••${g.slice(-4)}`;
}
