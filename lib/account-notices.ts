export type AccountNotice = {
  id: string;
  date: string;
  title: string;
  text: string;
  kind: "order" | "docs" | "promo";
  read: boolean;
};

export type NoticeSettings = {
  orderStatus: boolean;
  invoices: boolean;
  stock: boolean;
  newsletter: boolean;
};

const NOTICES_KEY = "zp-notices";
const SETTINGS_KEY = "zp-notice-settings";

export const defaultNoticeSettings: NoticeSettings = {
  orderStatus: true,
  invoices: true,
  stock: true,
  newsletter: true,
};

const seedNotices: AccountNotice[] = [
  {
    id: "n-10501",
    date: "2026-09-18T08:40:00.000Z",
    title: "Заказ ZP-10501 в сборке",
    text: "Партия МБС «Зевс-Щит СК» собирается на складе Таганрога. Счёт выставлен.",
    kind: "order",
    read: false,
  },
  {
    id: "n-stock",
    date: "2026-09-16T11:00:00.000Z",
    title: "«Феникс» снова на складе",
    text: "Жаропрочные перчатки доступны к отгрузке. Можно повторить прошлую партию.",
    kind: "promo",
    read: false,
  },
  {
    id: "n-10428",
    date: "2026-08-22T09:10:00.000Z",
    title: "ZP-10428 доставлен",
    text: "СДЭК подтвердил вручение в Ростове-на-Дону. Счёт и декларация в документах заказа.",
    kind: "order",
    read: true,
  },
  {
    id: "n-invoice",
    date: "2026-08-21T12:00:00.000Z",
    title: "Счёт ZP-10428 оплачен",
    text: "Оплата по счёту с сайта прошла. Отгрузка пошла в сборку.",
    kind: "docs",
    read: true,
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readNotices(): AccountNotice[] {
  const stored = readJson<AccountNotice[] | null>(NOTICES_KEY, null);
  if (stored?.length) return stored;
  if (typeof window !== "undefined") {
    localStorage.setItem(NOTICES_KEY, JSON.stringify(seedNotices));
  }
  return seedNotices;
}

export function writeNotices(next: AccountNotice[]) {
  localStorage.setItem(NOTICES_KEY, JSON.stringify(next));
}

export function readNoticeSettings(): NoticeSettings {
  return { ...defaultNoticeSettings, ...readJson<Partial<NoticeSettings>>(SETTINGS_KEY, {}) };
}

export function writeNoticeSettings(next: NoticeSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export const NOTICE_KIND_LABEL: Record<AccountNotice["kind"], string> = {
  order: "Заказ",
  docs: "Документы",
  promo: "Склад",
};
