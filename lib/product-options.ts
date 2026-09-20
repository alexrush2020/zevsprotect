import type { Product } from "@/lib/types";

function splitCoatingChoices(raw?: string) {
  if (!raw) return [];
  const parts = raw
    .split(/\s*[,/]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^без покрытия$/i.test(part)) return "Без покрытия";
      if (/^рисунок$/i.test(part)) return "Рисунок";
      if (/^рисунок пвх$/i.test(part)) return "Рисунок ПВХ";
      return part;
    });
  if (parts.length < 2) return [];
  if (!parts.some((part) => part === "Без покрытия")) return [];
  return [...new Set(parts)];
}

export function productCoatingOptions(product: Product) {
  const fromType = splitCoatingChoices(product.coatingType);
  if (fromType.length) return fromType;
  const fromCoating = splitCoatingChoices(product.coating);
  if (fromCoating.length) return fromCoating;
  if (product.coating === "ПВХ") return ["Без покрытия", "Рисунок"];
  return product.coating ? [product.coating] : [];
}

function coatingLabels(product: Product) {
  const coating =
    product.coating === "ПВХ" ? "Без покрытия, ПВХ" : product.coating;
  const coatingType =
    product.coatingType ||
    (product.coating === "ПВХ" ? "Без покрытия, Рисунок" : "");
  return { coating, coatingType };
}

function dash(value?: string) {
  return value?.trim() ? value : "—";
}

export function productSpecRows(
  product: Product,
  { fixed = false }: { fixed?: boolean } = {},
) {
  const { coating, coatingType } = coatingLabels(product);
  const knitClass = product.knitClass?.replace(".", ",");
  const weight = product.weight?.replace(/ г$/, " гр");
  const size = product.sizes.join(", ");

  if (fixed) {
    return [
      { label: "Основа", value: dash(product.base) },
      { label: "Класс вязки", value: dash(knitClass) },
      { label: "Покрытие", value: dash(coating) },
      { label: "Вид покрытия", value: dash(coatingType) },
      { label: "ТЕКС", value: dash(product.tex) },
      { label: "Цвет", value: dash(product.color) },
      { label: "Размер", value: dash(size) },
      { label: "Вес пары", value: dash(weight) },
      { label: "Длина модели", value: dash(product.length) },
    ];
  }

  const rows: { label: string; value: string }[] = [
    { label: "Основа", value: product.base },
  ];
  if (knitClass) rows.push({ label: "Класс вязки", value: knitClass });
  rows.push({ label: "Покрытие", value: coating });
  if (coatingType) rows.push({ label: "Вид покрытия", value: coatingType });
  if (product.tex) rows.push({ label: "ТЕКС", value: product.tex });
  rows.push({ label: "Цвет", value: product.color });
  rows.push({ label: "Размер", value: size });
  if (weight) rows.push({ label: "Вес пары", value: weight });
  if (product.length) rows.push({ label: "Длина модели", value: product.length });
  return rows;
}
