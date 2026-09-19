import { formatPrice } from "@/lib/format";
import { catalogPrice } from "@/lib/lots";
import type { Product } from "@/lib/types";

export const MANAGER_CHAT_REPLY_DELAY_MS = 1000;

export const managerProfile = {
  id: "anna",
  name: "Анна",
  role: "менеджер",
  initials: "АМ",
} as const;

export type ManagerChatChipId =
  | "connect"
  | "stock"
  | "price"
  | "delivery"
  | "request";

export const managerChatChips: readonly { id: ManagerChatChipId; label: string }[] = [
  { id: "connect", label: "связать с менеджером" },
  { id: "stock", label: "наличие" },
  { id: "price", label: "цена" },
  { id: "delivery", label: "доставка" },
  { id: "request", label: "оформить заявку" },
] as const;

export type ManagerChatProductRef = {
  slug: string;
  title: string;
  sku: string;
  price: number;
  unit: string;
  image: string;
  inStock: boolean;
};

export type ManagerChatContext =
  | { kind: "none" }
  | (ManagerChatProductRef & { kind: "pdp" });

export function toManagerChatProduct(product: Product): ManagerChatProductRef {
  return {
    slug: product.slug,
    title: product.name,
    sku: product.sku,
    price: catalogPrice(product),
    unit: product.unit,
    image: product.image,
    inStock: product.stock > 0,
  };
}

export function contextFromProduct(product: ManagerChatProductRef): ManagerChatContext {
  return { kind: "pdp", ...product };
}

export function productMetaLine(product: Pick<ManagerChatProductRef, "price" | "unit" | "inStock">) {
  return `${formatPrice(product.price)} / ${product.unit} · ${
    product.inStock ? "в наличии" : "под заказ"
  }`;
}

export function buildClarifyMessage(product: ManagerChatProductRef): string {
  return `Уточнить по товару: ${product.title}`;
}

export function buildWelcomeMessage(context: ManagerChatContext): string {
  if (context.kind === "pdp") {
    return `Здравствуйте! Я Анна, менеджер зевспротект. Вижу, смотрите ${context.title}. Чем помочь по оптовой партии?`;
  }
  return "Здравствуйте! Я Анна, менеджер зевспротект. Подберу модель под задачу и посчитаю партию.";
}

export function resolveManagerReply(
  input: { text: string; chipId?: ManagerChatChipId },
  context: ManagerChatContext,
): string {
  const chip = input.chipId;
  const text = input.text.toLowerCase();

  if (
    chip === "connect" ||
    text.includes("связать с менеджером") ||
    text.includes("уточнить по")
  ) {
    if (context.kind === "pdp") {
      return context.inStock
        ? `На связи! По ${context.title} (${context.sku}) отвечу по наличию из 1С и цене (${formatPrice(context.price)} / ${context.unit}). Что именно уточнить?`
        : `На связи! ${context.title} сейчас под заказ — подскажу срок партии с завода в Таганроге. Что уточнить?`;
    }
    return "На связи! Я Анна, менеджер зевспротект. Напишите модель, объём и город — отвечу здесь.";
  }

  if (chip === "stock" || text.includes("налич")) {
    if (context.kind === "pdp") {
      return context.inStock
        ? `По ${context.title} сейчас есть в наличии. Напишите размер и объём партии — сверю остаток из 1С.`
        : `${context.title} сейчас под заказ. Могу запросить срок партии на заводе.`;
    }
    return "Напишите артикул или откройте карточку модели — скажу по наличию.";
  }

  if (chip === "price" || text.includes("цен") || text.includes("прайс")) {
    if (context.kind === "pdp") {
      return `Цена ${context.title} — ${formatPrice(context.price)} / ${context.unit} с НДС. На крупную партию посчитаем отдельно.`;
    }
    return "Цены в каталоге с НДС, остатки — из 1С. Откройте модель — подскажу по объёму.";
  }

  if (chip === "delivery" || text.includes("достав")) {
    return "Доставку уточняем после заявки: самовывоз в Таганроге или ТК по России, Беларуси и Казахстану.";
  }

  if (chip === "request" || text.includes("заявк")) {
    return "Оставьте телефон, город и объём — оформлю заявку. Или напишите здесь, я подхвачу.";
  }

  return "Приняла! Уточните объём, размер и город отгрузки — отвечу по срокам и наличию.";
}

type OpenProductHandler = (product: ManagerChatProductRef) => void;

let openProductHandler: OpenProductHandler | null = null;

export function registerManagerChatProductOpener(handler: OpenProductHandler) {
  openProductHandler = handler;
  return () => {
    if (openProductHandler === handler) openProductHandler = null;
  };
}

export function requestManagerChatAboutProduct(product: ManagerChatProductRef) {
  openProductHandler?.(product);
}

export function shouldHideManagerChat(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pay") ||
    pathname.startsWith("/invoice")
  );
}
