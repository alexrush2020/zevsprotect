export function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const STATUS_LABEL: Record<string, string> = {
  accepted: "Заказ принят",
  picking: "Заказ в сборке",
  shipped: "Отгружен в ТК",
  delivery: "Заказ в доставке",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export const STATUS_FLOW = [
  "accepted",
  "picking",
  "shipped",
  "delivery",
  "delivered",
] as const;

export const CARRIER_LABEL: Record<string, string> = {
  pickup: "Самовывоз, Таганрог",
  cdek: "СДЭК",
  dl: "Деловые линии",
  pek: "ПЭК",
  energy: "Энергия",
};

export const PAYMENT_LABEL: Record<string, string> = {
  invoice_auto: "Счёт с сайта",
  invoice_manager: "Счёт от менеджера",
  online: "Онлайн-оплата",
  pending: "Ожидает оплаты",
  invoiced: "Счёт выставлен",
  paid: "Оплачен",
  failed: "Оплата не прошла",
};

export function formatRuPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const normalized = digits.startsWith("8")
    ? `7${digits.slice(1)}`
    : digits.startsWith("7")
      ? digits
      : `7${digits}`;
  const rest = normalized.slice(1);
  let out = "+7";
  if (!rest) return out;
  out += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) out += ")";
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
  return out;
}
