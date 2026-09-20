import {
  formatPairs,
  productMinQty,
  productOrderStep,
  snapOrderQty,
} from "@/lib/order-qty";
import type { Product } from "@/lib/types";

export type VolumeThreshold = {
  qty: number;
  unitPrice: number;
  discountPct: number;
  label: string;
};

export type VolumeQuote = {
  qty: number;
  unitPrice: number;
  basePrice: number;
  total: number;
  discountPct: number;
  label: string;
  min: number;
  max: number;
  step: number;
  ticks: VolumeThreshold[];
  next?: VolumeThreshold;
  shifts: number;
  perShift: number;
};

export const VOLUME_DISCOUNTS = [
  { qty: 1000, pct: 5 },
  { qty: 3000, pct: 7 },
  { qty: 5000, pct: 9 },
  { qty: 10000, pct: 11 },
] as const;

const LIFE_SHIFTS: Record<string, number> = {
  "p-fenix": 12,
  "p-fenix-lite": 8,
  "p-prometey": 6,
  "p-optima": 1,
  "p-universal": 1,
  "p-standart": 2,
  "p-standart-plus": 2,
  "p-atlant": 3,
  "p-atlant-2": 3,
  "p-lux": 3,
  "p-lux-max": 3,
  "p-atlant-plus": 4,
  "p-atlant-2-plus": 4,
  "p-malahit": 4,
  "p-yashma": 4,
  "p-yashma-lux": 5,
  "p-profi-micro": 2,
  "p-profi-vl": 4,
  "p-profi-vl-strong": 5,
  "p-profi-rl": 4,
  "p-profi-s-vl": 4,
  "p-profi-strong-gn": 5,
  "p-profi-pu": 4,
  "p-profi-khaki": 5,
  "p-profi-gn": 4,
  "p-profi-lite": 3,
  "p-hvat": 3,
  "p-hvat-12": 3,
  "p-hvat-34": 3,
  "p-cut": 8,
  "p-floragrip": 5,
  "p-floragrip-lite": 4,
  "p-frost": 4,
  "p-frost-lux": 5,
  "p-frost-lite": 3,
  "p-frost-rl": 4,
  "p-frost-vl": 4,
  "p-frost-strong-lux": 5,
  "p-frost-palm": 4,
  "p-fleece": 4,
  "p-shield": 5,
  "p-shield-sm": 6,
  "p-shield-lite": 4,
  "p-strongshell": 8,
  "p-shield-km": 5,
  "p-oilmax": 6,
  "p-kshs": 4,
  "p-kshs-t2": 3,
  "p-gloves": 3,
  "p-lotus": 4,
  "p-manual": 1,
  "p-crystal": 1,
  "p-kragi-lux": 20,
  "p-kragi-kevlar": 24,
  "p-kragi-krs": 16,
  "p-kragi-spf": 20,
  "p-kragi-spf-lux": 22,
  "p-driver": 16,
  "p-docker": 16,
  "p-ruk-brez": 6,
  "p-ruk-hb-brez": 5,
  "p-ruk-od": 4,
  "p-ruk-pvh": 4,
  "p-ruk-vat": 5,
  "p-ruk-suk": 5,
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function productLifeShifts(product: Pick<Product, "id">) {
  return LIFE_SHIFTS[product.id] ?? 2;
}

export function formatShiftCount(shifts: number) {
  const n = Math.abs(shifts) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${shifts} смен`;
  if (n1 === 1) return `${shifts} смена`;
  if (n1 >= 2 && n1 <= 4) return `${shifts} смены`;
  return `${shifts} смен`;
}

export function formatVolumeQty(qty: number, unit: string) {
  if (unit === "пара") return formatPairs(qty);
  return `${qty} ${unit}`;
}

function unitPriceAt(basePrice: number, qty: number) {
  let pct = 0;
  for (const row of VOLUME_DISCOUNTS) {
    if (qty >= row.qty) pct = row.pct;
  }
  return { unitPrice: roundMoney(basePrice * (1 - pct / 100)), discountPct: pct };
}

export function volumeUnitPrice(product: Pick<Product, "price">, qty: number) {
  return unitPriceAt(product.price, Math.max(0, qty)).unitPrice;
}

export function volumeThresholds(product: Product): VolumeThreshold[] {
  const min = productMinQty(product);
  const basePrice = product.price;
  const rows: VolumeThreshold[] = [
    {
      qty: min,
      unitPrice: basePrice,
      discountPct: 0,
      label: `от ${formatVolumeQty(min, product.unit)}`,
    },
  ];
  for (const row of VOLUME_DISCOUNTS) {
    if (row.qty <= min) continue;
    const priced = unitPriceAt(basePrice, row.qty);
    rows.push({
      qty: row.qty,
      unitPrice: priced.unitPrice,
      discountPct: row.pct,
      label: `−${row.pct}%`,
    });
  }
  return rows;
}

export function volumeBounds(product: Product) {
  const thresholds = volumeThresholds(product);
  const step = productOrderStep(product);
  const min = thresholds[0]?.qty ?? step;
  const last = VOLUME_DISCOUNTS.at(-1)?.qty ?? 10000;
  const max = snapOrderQty(Math.max(last, min), product);
  return { min, max, step, thresholds };
}

export function defaultVolumeQty(product: Product) {
  return volumeBounds(product).min;
}

export function snapVolumeQty(product: Product, qty: number) {
  const { min, max } = volumeBounds(product);
  const snapped = snapOrderQty(qty, product);
  return Math.min(max, Math.max(min, snapped || min));
}

export function quoteVolume(product: Product, qty: number): VolumeQuote {
  const { min, max, step, thresholds } = volumeBounds(product);
  const snapped = snapOrderQty(qty, product);
  const priced = unitPriceAt(product.price, snapped);
  const current =
    [...thresholds].reverse().find((row) => row.qty <= snapped) ?? thresholds[0];
  const next = thresholds.find((row) => row.qty > snapped);
  const shifts = productLifeShifts(product);

  return {
    qty: snapped,
    unitPrice: priced.unitPrice,
    basePrice: product.price,
    total: roundMoney(priced.unitPrice * snapped),
    discountPct: priced.discountPct,
    label: current?.label ?? "",
    min,
    max,
    step,
    ticks: thresholds.filter((row) => row.qty >= min && row.qty <= max),
    next,
    shifts,
    perShift: roundMoney(priced.unitPrice / Math.max(1, shifts)),
  };
}

export type ShiftCompareRow = {
  product: Product;
  unitPrice: number;
  shifts: number;
  perShift: number;
  current: boolean;
  bestShift: boolean;
};

export function shiftCompareRows(
  product: Product,
  catalog: Product[],
): ShiftCompareRow[] {
  const peers = catalog.filter(
    (item) => item.category === product.category && item.unit === product.unit,
  );
  const scored = peers.map((item) => {
    const quote = quoteVolume(item, defaultVolumeQty(item));
    return {
      product: item,
      unitPrice: quote.unitPrice,
      shifts: quote.shifts,
      perShift: quote.perShift,
      current: item.id === product.id,
      bestShift: false,
    };
  });
  if (!scored.length) return [];

  const cheapestPair = [...scored].sort((a, b) => a.unitPrice - b.unitPrice)[0];
  const cheapestShift = [...scored].sort((a, b) => a.perShift - b.perShift)[0];
  const current = scored.find((row) => row.current) ?? scored[0];
  const picked: ShiftCompareRow[] = [];
  for (const row of [cheapestPair, current, cheapestShift]) {
    if (!picked.some((item) => item.product.id === row.product.id)) picked.push(row);
  }
  if (picked.length < 3) {
    const upgrades = [...scored]
      .filter((row) => row.perShift < current.perShift)
      .sort((a, b) => a.unitPrice - b.unitPrice);
    for (const row of upgrades) {
      if (picked.length >= 3) break;
      if (!picked.some((item) => item.product.id === row.product.id)) picked.push(row);
    }
  }
  if (picked.length < 3) {
    for (const row of [...scored].sort((a, b) => a.perShift - b.perShift)) {
      if (picked.length >= 3) break;
      if (!picked.some((item) => item.product.id === row.product.id)) picked.push(row);
    }
  }

  const best = Math.min(...picked.map((row) => row.perShift));
  return picked
    .map((row) => ({ ...row, bestShift: row.perShift === best }))
    .sort((a, b) => a.unitPrice - b.unitPrice);
}
