"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DeliveryAddressPicker } from "@/components/delivery-address-picker";
import { useStore } from "@/lib/store";
import { submitLead } from "@/lib/server/lead-action";
import { formEvent, track } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { formatRuPhone } from "@/lib/format";
import {
  addressesOf,
  defaultAddress,
  formatAddressLine,
  PICKUP_ADDRESS,
} from "@/lib/addresses";
import {
  readInquiryContacts,
  writeInquiryContacts,
} from "@/lib/inquiry-contacts";
import { cartLineCaption, cartLineTotal, cartProductQty } from "@/lib/lots";
import type { RequestDelivery } from "@/lib/types";

const DELIVERY: { id: RequestDelivery; name: string; note?: string }[] = [
  { id: "cdek", name: "Доставка СДЭК" },
  { id: "terminal", name: "Доставка до ТК" },
  { id: "pickup", name: "Самовывоз", note: formatAddressLine(PICKUP_ADDRESS) },
];

export function CartInquiryForm() {
  const { cart, cartTotal, user, lastUser, ready, addLead, getProduct } = useStore();
  const addresses = addressesOf(user);
  const fallback = defaultAddress(user);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [delivery, setDelivery] = useState<RequestDelivery>("cdek");
  const [selectedId, setSelectedId] = useState(fallback?.id ?? "");
  const [manual, setManual] = useState(addresses.length === 0);
  const [manualValue, setManualValue] = useState(user?.address ?? "");
  const [comment, setComment] = useState("");
  const [remember, setRemember] = useState(true);
  const [sentId, setSentId] = useState("");
  const [consent, setConsent] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const remembered = readInquiryContacts();
    const source = user ?? lastUser;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- подстановка контактов из localStorage/сессии после гидратации
    setName((v) => v || source?.name || remembered?.name || "");
    setPhone((v) => v || source?.phone || remembered?.phone || "");
    setCompany((v) => v || source?.company || remembered?.company || "");
    if (user) {
      const next = addressesOf(user);
      const def = defaultAddress(user);
      setSelectedId(def?.id ?? "");
      setManual(next.length === 0);
      setManualValue(user.address || "");
    }
  }, [ready, user, lastUser]);

  const pickup = delivery === "pickup";
  const selected = addresses.find((a) => a.id === selectedId);

  function resolvedAddress() {
    if (pickup) return formatAddressLine(PICKUP_ADDRESS);
    if (manual || !selected) return manualValue.trim();
    return formatAddressLine(selected);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const website = String(new FormData(e.currentTarget).get("website") || "");
    const address = resolvedAddress();
    if (!pickup && !address) {
      toast.error("Укажите адрес доставки");
      return;
    }
    const items = cart
      .map((item) => {
        const p = getProduct(item.productId);
        if (!p) return "";
        return `${p.name} · ${cartLineCaption(p, item)} · ${formatPrice(cartLineTotal(p, item, cartProductQty(cart, item.productId)))}`;
      })
      .filter(Boolean)
      .join("\n");
    const fields = {
      name,
      phone,
      company,
      email: user?.email || "",
      delivery: DELIVERY.find((d) => d.id === delivery)?.name ?? delivery,
      address,
      addressLabel: pickup
        ? PICKUP_ADDRESS.label
        : manual
          ? "Вручную"
          : selected?.label || "",
      city: pickup ? PICKUP_ADDRESS.city : selected?.city || "",
      comment,
      message: comment,
      items,
      total: String(cartTotal),
    };
    setPending(true);
    const res = await submitLead("cart", {
      ...fields,
      consent: consent ? "on" : "",
      website,
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      toast.error(res?.error ?? "Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.");
      return;
    }
    track(formEvent("cart"), { order_price: cartTotal, currency: "RUB" });
    // ponytail: история заявок в ЛК пока из локального стора — пишем копию, пока кабинет не на Payload
    const lead = addLead("cart", fields);
    if (remember) writeInquiryContacts({ name, phone, company });
    setSentId(res.id || lead.id);
    toast.success(`Заявка ${res.id || lead.id} принята`);
  }

  if (sentId) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          Заявка {sentId} принята. Менеджер подтвердит объём и срок отгрузки.
          Состав корзины сохранён — можно оформить заказ отдельно.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/account/orders" />}
          variant="outline"
          className="h-10 w-full"
        >
          История в кабинете
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div>
        <h2 className="font-heading text-lg">Оформление заявки</h2>
        <p className="mt-1 text-xs text-steel">
          Заявка сохраняется локально. История — в{" "}
          <Link href="/account/orders" className="underline underline-offset-2">
            кабинете
          </Link>
          .
        </p>
      </div>
      <div>
        <p className="font-medium">Оценка: {formatPrice(cartTotal)}</p>
        <p className="text-xs text-steel">
          Итог ориентировочный · точные партии подтвердит менеджер
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="inquiry-name">Имя / контактное лицо *</Label>
        <Input
          id="inquiry-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="inquiry-phone">Телефон *</Label>
        <Input
          id="inquiry-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatRuPhone(e.target.value))}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="inquiry-company">Организация</Label>
        <Input
          id="inquiry-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="ООО «…»"
        />
      </div>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Способ доставки</p>
        <RadioGroup
          value={delivery}
          onValueChange={(v) => v && setDelivery(v as RequestDelivery)}
        >
          {DELIVERY.map((d) => (
            <label
              key={d.id}
              className="flex items-start gap-3 rounded-xl border bg-background p-3"
            >
              <RadioGroupItem value={d.id} />
              <span>
                <span className="block font-medium">{d.name}</span>
                {d.note ? (
                  <span className="block text-sm text-steel">{d.note}</span>
                ) : null}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Адрес доставки</p>
        <DeliveryAddressPicker
          addresses={addresses}
          pickup={pickup}
          selectedId={selectedId}
          onSelect={setSelectedId}
          manual={manual}
          onManualChange={setManual}
          manualValue={manualValue}
          onManualValueChange={setManualValue}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="inquiry-comment">Комментарий</Label>
        <Textarea
          id="inquiry-comment"
          rows={3}
          placeholder="Сроки, документы, подбор аналогов…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-steel">
        <Checkbox
          checked={remember}
          onCheckedChange={(v) => setRemember(v !== false)}
        />
        Запомнить контакты на этом устройстве
      </label>
      <label className="flex items-start gap-2 text-xs text-steel">
        <Checkbox
          required
          checked={consent}
          onCheckedChange={(v) => setConsent(v !== false)}
        />
        <span>
          Согласен с{" "}
          <a className="underline" href="/privacy">
            политикой обработки персональных данных
          </a>
        </span>
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        Отправить заявку
      </Button>
    </form>
  );
}
