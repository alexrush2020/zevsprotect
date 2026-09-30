import type { UserProfile } from "@/lib/types";

type Doc = Record<string, unknown> & { email: string; name: string };

const str = (v: unknown) => (typeof v === "string" ? v : "");

type Row = { id?: string; label?: string; city?: string; line?: string; phone?: string; isDefault?: boolean };

export function toProfile(d: Doc): UserProfile {
  return {
    customerId: String(d.id ?? ""),
    addresses: Array.isArray(d.addresses)
      ? (d.addresses as Row[]).map((a) => ({
          id: String(a.id ?? ""),
          label: str(a.label),
          city: str(a.city),
          line: str(a.line),
          phone: str(a.phone),
          isDefault: !!a.isDefault,
        }))
      : undefined,
    email: d.email,
    name: d.name,
    phone: str(d.phone),
    company: str(d.company),
    inn: str(d.inn),
    kpp: str(d.kpp),
    address: str(d.address),
    kind: d.kind === "person" ? "person" : "legal",
    bankName: str(d.bankName),
    bankAccount: str(d.bankAccount),
    bik: str(d.bik),
    // "password" на клиенте = аккаунт с сессией Payload (в т.ч. вошедший через Яндекс ID): store берёт его
    // из /api/customers/me, выходит и сохраняет профиль через сервер. Способ входа из БД здесь не нужен.
    authProvider: "password",
  };
}

async function call(path: string, body?: unknown) {
  const res = await fetch(`/api/customers${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = json?.errors?.[0];
    throw new Error(first?.data?.errors?.[0]?.message ?? first?.message ?? "Не удалось выполнить запрос");
  }
  return json;
}

export async function loginRequest(email: string, password: string): Promise<UserProfile> {
  const { user } = await call("/login", { email, password });
  return toProfile(user);
}

export async function registerRequest(profile: UserProfile, password: string): Promise<UserProfile> {
  const { email, name, phone, company, inn, kpp, address, kind, bankName, bankAccount, bik } = profile;
  await call("", { email, password, name, phone, company, inn, kpp, address, kind, bankName, bankAccount, bik });
  return loginRequest(email, password);
}

export const forgotRequest = (email: string) => call("/forgot-password", { email });
export const resetRequest = (token: string, password: string) =>
  call("/reset-password", { token, password });

/** PATCH профиля; возвращает сохранённый сервером профиль (или null — нет customerId). */
export async function updateRequest(p: UserProfile): Promise<UserProfile | null> {
  if (!p.customerId) return null;
  const { name, phone, company, inn, kpp, address, kind, bankName, bankAccount, bik, addresses } = p;
  const res = await fetch(`/api/customers/${p.customerId}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name, phone, company, inn, kpp, address, kind, bankName, bankAccount, bik,
      addresses: addresses?.map(({ id, ...a }) => ({ ...a, ...(id ? { id } : {}) })),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = json?.errors?.[0];
    throw new Error(first?.data?.errors?.[0]?.message ?? first?.message ?? "Не удалось сохранить профиль");
  }
  return json?.doc?.email ? toProfile(json.doc) : null;
}

export const logoutRequest = async () => {
  const res = await fetch("/api/customers/logout", { method: "POST", credentials: "same-origin" });
  if (!res.ok) throw new Error("Не удалось выйти");
};

/** Профиль по cookie-сессии или null. */
export async function meRequest(): Promise<UserProfile | null> {
  try {
    const res = await fetch("/api/customers/me", { credentials: "same-origin" });
    if (!res.ok) return null;
    const { user } = await res.json();
    return user?.email ? toProfile(user) : null;
  } catch {
    return null;
  }
}
