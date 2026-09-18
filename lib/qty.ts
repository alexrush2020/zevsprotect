export function snapPackQty(qty: number, packQty: number) {
  const pack = Math.max(1, packQty || 1);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  return Math.max(pack, Math.ceil(qty / pack) * pack);
}
