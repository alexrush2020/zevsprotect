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
