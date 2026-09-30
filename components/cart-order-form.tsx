"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DeliveryAddressPicker } from "@/components/delivery-address-picker";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { formatRuPhone } from "@/lib/demo-account";
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
import { cartWeightKg, quoteCarriers, type CarrierId } from "@/lib/delivery";
import type { PaymentMethod, RequestDelivery } from "@/lib/types";

const DELIVERY: {
  id: RequestDelivery;
  name: string;
  carrier: CarrierId;
  note?: string;
}[] = [
  { id: "cdek", name: "Доставка СДЭК", carrier: "cdek" },
  { id: "terminal", name: "Доставка до ТК", carrier: "pek" },
  {
    id: "pickup",
    name: "Самовывоз",
    carrier: "pickup",
    note: formatAddressLine(PICKUP_ADDRESS),
  },
];

export function CartOrderForm({ formId }: { formId: string }) {
  const { orderable, user, lastUser, ready, placeOrder, catalog } = useStore();
  const router = useRouter();
  const addresses = addressesOf(user);
  const fallback = defaultAddress(user);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [delivery, setDelivery] = useState<RequestDelivery>("cdek");
  const [selectedId, setSelectedId] = useState(fallback?.id ?? "");
  const [manual, setManual] = useState(addresses.length === 0);
  const [manualValue, setManualValue] = useState(user?.address ?? "");
  const [comment, setComment] = useState("");
  const [remember, setRemember] = useState(true);
  const [payment, setPayment] = useState<PaymentMethod>("invoice_auto");
  const [pending, setPending] = useState(false);
  const [token] = useState(() => crypto.randomUUID()); // повтор отправки этой формы не создаёт второй заказ

  useEffect(() => {
    if (!ready) return;
    const remembered = readInquiryContacts();
    const source = user ?? lastUser;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- подстановка контактов из localStorage/сессии после гидратации
    setName((v) => v || source?.name || remembered?.name || "");
    setPhone((v) => v || source?.phone || remembered?.phone || "");
    setEmail((v) => v || source?.email || "");
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
  const city = pickup
    ? PICKUP_ADDRESS.city
    : selected && !manual
      ? selected.city
      : fallback?.city || "Ростов-на-Дону";
  const weight = useMemo(() => cartWeightKg(orderable, catalog), [orderable, catalog]);
  const quotes = useMemo(() => quoteCarriers(city, weight), [city, weight]);

  function resolvedAddress() {
    if (pickup) return formatAddressLine(PICKUP_ADDRESS);
    if (manual || !selected) return manualValue.trim();
    return formatAddressLine(selected);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const address = resolvedAddress();
    if (!pickup && !address) {
      toast.error("Укажите адрес доставки");
      return;
    }
    if (remember) writeInquiryContacts({ name, phone, company });
    setPending(true);
    const res = await placeOrder({
      token,
      payment,
      comment,
      consent: Boolean(new FormData(e.currentTarget).get("consent")),
      delivery: { carrier: delivery, city: pickup ? PICKUP_ADDRESS.city : city, address },
      contact: {
        name,
        phone,
        email: email || user?.email || "",
        company,
        inn: user?.inn || "",
        kpp: user?.kpp,
      },
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Заказ ${res.number} принят`);
    router.push(payment === "invoice_auto" ? `/invoice/${res.number}` : `/order/${res.number}`);
  }

  return (
    <form
      id={formId}
      className="space-y-3 rounded-2xl border bg-card p-5"
      onSubmit={onSubmit}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="order-name">Имя / контактное лицо *</Label>
        <Input
          id="order-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="order-phone">Телефон *</Label>
        <Input
          id="order-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatRuPhone(e.target.value))}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="order-email">Email *</Label>
        <Input
          id="order-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="order-company">Организация</Label>
        <Input
          id="order-company"
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
          {DELIVERY.map((d) => {
            const q = quotes.find((item) => item.id === d.carrier);
            return (
              <label
                key={d.id}
                className="flex items-start gap-3 rounded-xl border bg-background p-3"
              >
                <RadioGroupItem value={d.id} />
                <span className="flex-1">
                  <span className="block font-medium">{d.name}</span>
                  {d.note ? (
                    <span className="block text-sm text-steel">{d.note}</span>
                  ) : q ? (
                    <span className="block text-sm text-steel">{q.eta}</span>
                  ) : null}
                </span>
                {q ? (
                  <span className="text-sm font-medium">
                    {q.price ? `≈ ${formatPrice(q.price)}` : "бесплатно"}
                  </span>
                ) : null}
              </label>
            );
          })}
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
        <p className="text-sm font-medium">Способ оплаты</p>
        <RadioGroup
          value={payment}
          onValueChange={(v) => v && setPayment(v as PaymentMethod)}
        >
          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <RadioGroupItem value="invoice_auto" />
            <span>
              <span className="block font-medium">Счёт с сайта</span>
              <span className="text-sm text-steel">
                PDF-счёт сразу после заказа — печать или сохранение.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <RadioGroupItem value="invoice_manager" />
            <span>
              <span className="block font-medium">Счёт от менеджера</span>
              <span className="text-sm text-steel">
                Сайт письмо не шлёт, менеджер выставит счёт вручную.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border bg-background p-3">
            <RadioGroupItem value="online" />
            <span>
              <span className="block font-medium">Онлайн-оплата</span>
              <span className="text-sm text-steel">
                Платёжный сервис подключается — заказ сохранится и будет ожидать оплаты.
              </span>
            </span>
          </label>
        </RadioGroup>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="order-comment">Комментарий</Label>
        <Textarea
          id="order-comment"
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
      <label className="flex items-start gap-2 text-sm text-steel">
        <Checkbox name="consent" required defaultChecked />
        Согласен с политикой обработки персональных данных
      </label>
    </form>
  );
}
