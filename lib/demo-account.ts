import type { UserProfile } from "@/lib/types";

export const demoAccount: UserProfile = {
  email: "zakup@roststroy.ru",
  name: "Ирина Ковалёва",
  phone: "+7 (863) 200-00-15",
  company: "ООО «РостСтрой»",
  inn: "6165123456",
  kpp: "616501001",
  address: "г. Ростов-на-Дону, ул. Серафимовича, 53",
  addresses: [
    {
      id: "addr-rostov",
      label: "Склад Ростов",
      city: "Ростов-на-Дону",
      line: "ул. Серафимовича, 53",
      phone: "+7 (863) 200-00-15",
      isDefault: true,
    },
    {
      id: "addr-taganrog",
      label: "Объект Таганрог",
      city: "Таганрог",
      line: "Поляковское шоссе, 12к3",
      phone: "+7 (863) 310-44-21",
    },
  ],
  kind: "legal",
  bankName: "ПАО Сбербанк",
  bankAccount: "40702810100000012345",
  bik: "046015602",
  authProvider: "demo",
};

export const yandexStubAccount: UserProfile = {
  email: "artem.sokolov@yandex.ru",
  name: "Артём Соколов",
  phone: "+7 (903) 441-18-20",
  company: "",
  inn: "",
  address: "",
  kind: "person",
  authProvider: "yandex",
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
