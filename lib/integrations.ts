import type { Order } from "@/lib/types";
import { brand } from "@/lib/brand";

export function mockIntegrations(order: Order) {
  const events: {
    at: string;
    system: string;
    status: "ok" | "queued";
    message: string;
  }[] = [
    {
      at: order.createdAt,
      system: "1С КА 2",
      status: "ok",
      message: `Заказ ${order.id} поставлен в очередь обмена. Цены и остатки сверены.`,
    },
  ];
  if (order.guest) {
    events.push({
      at: order.createdAt,
      system: "Битрикс24",
      status: "ok",
      message: `Лид ${order.id.replace("ZP", "L")} · гость, компания не создана.`,
    });
  } else {
    events.push({
      at: order.createdAt,
      system: "Битрикс24",
      status: "ok",
      message: `Компания «${order.profile.company || order.profile.name}» · сделка ${order.id.replace("ZP", "B24")}.`,
    });
  }
  if (order.payment === "invoice_auto") {
    events.push({
      at: order.createdAt,
      system: "Email",
      status: "ok",
      message: `Счёт PDF отправлен на ${order.profile.email}.`,
    });
  }
  if (order.payment === "invoice_manager") {
    events.push({
      at: order.createdAt,
      system: "Email",
      status: "queued",
      message: "Менеджер выставит счёт вручную, сайт письмо не шлёт.",
    });
  }
  if (order.payment === "online") {
    events.push({
      at: order.createdAt,
      system: "ЮKassa",
      status: order.paymentStatus === "paid" ? "ok" : order.paymentStatus === "failed" ? "queued" : "queued",
      message:
        order.paymentStatus === "paid"
          ? `payment.succeeded · ${order.id}`
          : order.paymentStatus === "failed"
            ? "payment.canceled · можно повторить"
            : "Ожидание оплаты в виджете ЮKassa (мок).",
    });
  }
  events.push({
    at: order.createdAt,
    system: "Битрикс24",
    status: "ok",
    message: `Статус «${order.status}» — источник CRM, сайт только отображает.`,
  });
  return events.map((e) => ({ ...e, message: `${e.message} · мок ${brand.mark}` }));
}
