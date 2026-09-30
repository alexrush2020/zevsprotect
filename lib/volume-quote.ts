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

/** Ресурс модели в сменах; ключ — slug товара (стабилен между моком и Payload). */
const LIFE_SHIFTS: Record<string, number> = {
  feniks: 12,
  "feniks-layt": 8,
  prometey: 6,
  optima: 1,
  universal: 1,
  standart: 2,
  "standart-plyus": 2,
  atlant: 3,
  "atlant-2-sloy": 3,
  lyuks: 3,
  "lyuks-maks": 3,
  "atlant-plyus": 4,
  "atlant-2-sloy-plyus": 4,
  malahit: 4,
  yashma: 4,
  "yashma-lyuks": 5,
  "profi-mikrotochka": 2,
  "profi-vl-3-4": 4,
  "profi-vl-3-4-strong": 5,
  "profi-rl-1-2": 4,
  "profi-s-vl-3-4": 4,
  "profi-strong-gn-3-4": 5,
  "profi-pu-1-2": 4,
  "profi-khaki-rl-3-4": 5,
  "profi-gn-1-2": 4,
  "profi-layt": 3,
  "hvat-hb-rl-1-2": 3,
  "hvat-hb-rl-1-2-standart": 3,
  "hvat-hb-rl-3-4": 3,
  "antiporez-pu-1-2": 8,
  floragrip: 5,
  "floragrip-layt": 4,
  "frost-strong-vl-3-4": 4,
  "frostlyuks-vl-3-4": 5,
  "frostlayt-1-2": 3,
  "frost-rl-1-2": 4,
  "frost-vl-3-4": 4,
  "frost-stronglyuks-vl-3-4": 5,
  "frost-palm-vl-3-4": 4,
  "frost-flis": 4,
  "zevs-shchit-sk": 5,
  "zevs-shchit-sm": 6,
  "zevs-shchit-layt": 4,
  "strongshell-cbc": 8,
  "zevs-shchit-km": 5,
  "oilresist-maks": 6,
  "zashchita-import-kshs-t1": 4,
  "zashchita-import-kshs-t2": 3,
  "gloves-hoz": 3,
  "lotos-hoz": 4,
  "manual-smotr": 1,
  "crystal-xp": 1,
  "zevs-trk-lyuks": 20,
  "zevs-sb": 24,
  "zevs-krs": 16,
  "zevs-spf": 20,
  "zevs-spf-lyuks": 22,
  "zevs-drv": 16,
  "zevs-dkr": 16,
  "ruk-dv-br": 6,
  "ruk-hb-brez-400": 5,
  "ruk-od420-200": 4,
  "ruk-hb-pvh-500": 4,
  "ruk-hb-vat-100": 5,
  "ruk-suk-100": 5,
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function productLifeShifts(product: Pick<Product, "slug">) {
  return LIFE_SHIFTS[product.slug] ?? 2;
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
