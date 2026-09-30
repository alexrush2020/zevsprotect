export type CarrierId = "pickup" | "cdek" | "dl" | "pek" | "energy";

export const carriers: {
  id: CarrierId;
  name: string;
  days: [number, number];
  base: number;
  kg: number;
  note: string;
}[] = [
  { id: "pickup", name: "Самовывоз, Таганрог", days: [0, 1], base: 0, kg: 0, note: "Поляковское шоссе, 17" },
  { id: "cdek", name: "СДЭК", days: [2, 5], base: 420, kg: 28, note: "Мок API 2.0 · ПВЗ и курьер" },
  { id: "dl", name: "Деловые линии", days: [3, 7], base: 380, kg: 22, note: "Мок калькулятора ДЛ" },
  { id: "pek", name: "ПЭК", days: [3, 8], base: 360, kg: 24, note: "Мок терминал–терминал" },
  { id: "energy", name: "Энергия", days: [2, 6], base: 450, kg: 26, note: "Мок экспресс / сборные" },
];

const cityFactor: Record<string, number> = {
  москва: 1,
  "санкт-петербург": 1.05,
  ростов: 0.55,
  краснодар: 0.6,
  таганрог: 0.15,
  новосибирск: 1.55,
  екатеринбург: 1.25,
  казань: 1.1,
};

export function quoteCarriers(city: string, weightKg: number) {
  const key = city.toLowerCase();
  const factor =
    Object.entries(cityFactor).find(([k]) => key.includes(k))?.[1] ?? 1.15;
  const kg = Math.max(0.5, weightKg || 1);
  return carriers
    .map((c) => ({
      ...c,
      price: c.id === "pickup" ? 0 : Math.round((c.base + kg * c.kg) * factor),
      eta:
        c.id === "pickup"
          ? "в день отгрузки"
          : `${c.days[0] + (factor > 1.2 ? 2 : 0)}–${c.days[1] + (factor > 1.2 ? 3 : 0)} дн.`,
    }))
    .sort((a, b) => a.price - b.price);
}

export function cartWeightKg(
  items: { productId: string; qty: number }[],
  products: { slug: string; weight?: string }[]
) {
  return items.reduce((s, i) => {
    const p = products.find((x) => x.slug === i.productId);
    const grams = p?.weight ? parseInt(p.weight, 10) || 50 : 50;
    return s + (grams / 1000) * i.qty;
  }, 0);
}
