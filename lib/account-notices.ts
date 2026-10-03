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

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Реальных уведомлений на сервере пока нет (генерация по статусам заказов не сделана) — без выдуманных примеров. */
export function readNotices(): AccountNotice[] {
  return readJson<AccountNotice[]>(NOTICES_KEY, []);
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
