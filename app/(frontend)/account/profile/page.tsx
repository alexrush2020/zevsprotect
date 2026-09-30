"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountScroll } from "@/components/account/account-scroll";
import { formatRuPhone } from "@/lib/format";
import { addressesOf, formatAddressLine } from "@/lib/addresses";
import { useStore } from "@/lib/store";
import type { DeliveryAddress } from "@/lib/types";

export default function AccountProfilePage() {
  const { user, updateProfile } = useStore();
  const [draft, setDraft] = useState({ label: "", city: "", line: "", phone: "" });

  const addresses = useMemo(() => (user ? addressesOf(user) : []), [user]);
  const isLegal = user?.kind !== "person";

  if (!user) return null;
  const profile = user;

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const nextAddresses = addressesOf(profile);
    const def = nextAddresses.find((a) => a.isDefault) ?? nextAddresses[0];
    updateProfile({
      ...profile,
      email: String(data.get("email") || ""),
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      company: String(data.get("company") || ""),
      inn: String(data.get("inn") || ""),
      kpp: String(data.get("kpp") || ""),
      bankName: String(data.get("bankName") || profile.bankName || ""),
      bankAccount: String(data.get("bankAccount") || profile.bankAccount || ""),
      bik: String(data.get("bik") || profile.bik || ""),
      address: def ? formatAddressLine(def) : String(data.get("address") || profile.address),
      addresses: nextAddresses,
    });
    toast.success("Профиль обновлён");
  }

  function writeAddresses(next: DeliveryAddress[]) {
    const def = next.find((a) => a.isDefault) ?? next[0];
    updateProfile({
      ...profile,
      addresses: next,
      address: def ? formatAddressLine(def) : "",
    });
  }

  function addAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.line.trim()) {
      toast.error("Укажите адрес");
      return;
    }
    const next: DeliveryAddress = {
      id: `addr-${Date.now().toString(36)}`,
      label: draft.label.trim() || "Адрес",
      city: draft.city.trim(),
      line: draft.line.trim(),
      phone: formatRuPhone(draft.phone) || profile.phone,
      isDefault: addresses.length === 0,
    };
    writeAddresses([...addresses, next]);
    setDraft({ label: "", city: "", line: "", phone: "" });
    toast.success("Адрес добавлен");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form className="grid gap-3 rounded-2xl border bg-card p-5" onSubmit={save}>
        <h2 className="font-heading text-xl">Данные</h2>
        {(
          [
            ["name", "Контакт", user.name],
            ["company", "Организация", user.company],
            ["phone", "Телефон", user.phone],
            ["email", "Email", user.email],
            ["inn", "ИНН", user.inn],
            ["kpp", "КПП", user.kpp ?? ""],
          ] as const
        ).map(([id, label, value]) => (
          <div key={id} className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} name={id} defaultValue={value} />
          </div>
        ))}
        {isLegal ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="bankAccount">Расчётный счёт</Label>
              <Input id="bankAccount" name="bankAccount" defaultValue={user.bankAccount ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bankName">Банк</Label>
              <Input id="bankName" name="bankName" defaultValue={user.bankName ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bik">БИК</Label>
              <Input id="bik" name="bik" defaultValue={user.bik ?? ""} />
            </div>
          </>
        ) : null}
        <Button type="submit">Сохранить</Button>
      </form>

      <div className="space-y-3">
        <h2 className="font-heading text-xl">Адреса доставки</h2>
        {addresses.length === 0 ? (
          <p className="rounded-2xl border bg-card p-5 text-sm text-steel">
            Адресов пока нет. Добавьте склад или объект.
          </p>
        ) : (
          <AccountScroll>
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {addr.label}
                      {addr.isDefault ? (
                        <span className="ml-2 text-xs uppercase tracking-[0.14em] text-orange">
                          основной
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-steel">
                      {formatAddressLine(addr)}
                    </p>
                    {addr.phone ? (
                      <p className="mt-1 text-sm text-steel">{addr.phone}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!addr.isDefault ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          writeAddresses(
                            addresses.map((a) => ({ ...a, isDefault: a.id === addr.id })),
                          )
                        }
                      >
                        Сделать основным
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = addresses.filter((a) => a.id !== addr.id);
                        if (addr.isDefault && next[0]) next[0] = { ...next[0], isDefault: true };
                        writeAddresses(next);
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </AccountScroll>
        )}

        <form className="grid gap-3 rounded-2xl border bg-card p-5" onSubmit={addAddress}>
          <h3 className="font-heading text-lg">Новый адрес</h3>
          <div className="grid gap-1.5">
            <Label htmlFor="addr-label">Название</Label>
            <Input
              id="addr-label"
              placeholder="Склад, объект, офис"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="addr-city">Город</Label>
            <Input
              id="addr-city"
              placeholder="Ростов-на-Дону"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="addr-line">Адрес</Label>
            <Input
              id="addr-line"
              placeholder="улица, дом"
              value={draft.line}
              onChange={(e) => setDraft((d) => ({ ...d, line: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="addr-phone">Контактный телефон</Label>
            <Input
              id="addr-phone"
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={draft.phone}
              onChange={(e) =>
                setDraft((d) => ({ ...d, phone: formatRuPhone(e.target.value) }))
              }
            />
          </div>
          <Button type="submit" variant="outline">
            Добавить адрес
          </Button>
        </form>
      </div>
    </div>
  );
}
