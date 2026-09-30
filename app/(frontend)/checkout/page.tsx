"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DeliveryAddressPicker } from "@/components/delivery-address-picker";
import { useStore } from "@/lib/store";
import { NoOrderable } from "@/components/cart-no-orderable";
import { formatPrice } from "@/lib/format";
import { cartLineKey, cartLineOfferLabel, cartLineTotal, cartProductQty } from "@/lib/lots";
import { cartWeightKg, quoteCarriers, type CarrierId } from "@/lib/delivery";
import {
  addressesOf,
  defaultAddress,
  formatAddressLine,
  PICKUP_ADDRESS,
} from "@/lib/addresses";
import { splitVat } from "@/lib/vat";
import type { PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const { cart, orderable, cartTotal, user, placeOrder, catalog, getProduct, clearCart } = useStore();
  const router = useRouter();
  const addresses = addressesOf(user);
  const [payment, setPayment] = useState<PaymentMethod>("invoice_auto");
  const [guest, setGuest] = useState(!user);
  const [city, setCity] = useState(
    defaultAddress(user)?.city || "Ростов-на-Дону",
  );
  const [carrierId, setCarrierId] = useState<CarrierId>("cdek");
  const [selectedAddressId, setSelectedAddressId] = useState(
    defaultAddress(user)?.id ?? "",
  );
  const [manualAddress, setManualAddress] = useState(addresses.length === 0);
  const [manualValue, setManualValue] = useState(user?.address ?? "");

  const [prevUser, setPrevUser] = useState<typeof user>(null);
  if (user !== prevUser) {
    setPrevUser(user);
    setGuest(!user);
    const def = defaultAddress(user);
    if (def) {
      setSelectedAddressId(def.id);
      setManualAddress(false);
      setManualValue(formatAddressLine(def));
      if (def.city) setCity(def.city);
    } else {
      setManualAddress(true);
      setManualValue(user?.address ?? "");
    }
  }

  const pickup = carrierId === "pickup";
  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
  const resolvedAddress = pickup
    ? formatAddressLine(PICKUP_ADDRESS)
    : manualAddress || !selectedAddr
      ? manualValue.trim()
      : formatAddressLine(selectedAddr);

  const weight = useMemo(() => cartWeightKg(orderable, catalog), [orderable, catalog]);
  const quotes = useMemo(() => quoteCarriers(city, weight), [city, weight]);
  const selected = quotes.find((q) => q.id === carrierId) ?? quotes[0];
  const deliveryCost = selected?.price ?? 0;
  const total = cartTotal + deliveryCost;
  const vatGoods = splitVat(cartTotal);
  const vatTotal = splitVat(total);

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-heading text-3xl">Нечего оформлять</h1>
        <Button nativeButton={false} render={<Link href="/catalog" />} className="mt-6">
          В каталог
        </Button>
      </div>
    );
  }

  if (!orderable.length) return <NoOrderable onClear={clearCart} />;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pickup && !resolvedAddress) {
      toast.error("Укажите адрес доставки");
      return;
    }
    const data = new FormData(e.currentTarget);
    const order = placeOrder({
      guest,
      payment,
      comment: String(data.get("comment") || ""),
      city: pickup ? PICKUP_ADDRESS.city : city,
      carrier: selected.id,
      carrierName: selected.name,
      deliveryCost,
      profile: {
        name: String(data.get("name") || ""),
        phone: String(data.get("phone") || ""),
        email: String(data.get("email") || ""),
        company: String(data.get("company") || ""),
        inn: String(data.get("inn") || ""),
        kpp: String(data.get("kpp") || ""),
        address: resolvedAddress,
      },
    });
    if (!order) {
      toast.error("В корзине нет доступных для заказа позиций");
      return;
    }
    toast.success(
      guest
        ? `Заказ ${order.id} принят. В Битрикс24 уходит лид, компания не создаётся.`
        : `Заказ ${order.id} · сделка создана в Битрикс24 (мок)`
    );
    if (payment === "online") router.push(`/pay/${order.id}`);
    else if (payment === "invoice_auto") router.push(`/invoice/${order.id}`);
    else router.push(`/order/${order.id}`);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <Link
            href="/cart"
            className="text-sm text-steel underline-offset-4 hover:text-ink hover:underline"
          >
            ← В корзину
          </Link>
          <h1 className="mt-2 font-heading text-4xl">Оформление заказа</h1>
          <p className="mt-2 text-sm text-steel">
            Регистрация не обязательна. Цены с НДС 20%. Доставка считается моком
            API ТК.
          </p>
        </div>

        {!user ? (
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 ${guest ? "bg-ink text-paper" : "bg-muted"}`}
              onClick={() => setGuest(true)}
            >
              Без регистрации
            </button>
            <Link href="/login" className="rounded-lg bg-muted px-3 py-1.5">
              Войти в кабинет
            </Link>
          </div>
        ) : (
          <p className="rounded-xl bg-navy/10 px-3 py-2 text-sm">
            Оформляете как {user.company || user.name}. Сделка уйдёт в Битрикс24.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="name" label="ФИО / контакт" defaultValue={user?.name} required />
          <Field id="company" label="Организация" defaultValue={user?.company} />
          <Field id="phone" label="Телефон" defaultValue={user?.phone} required />
          <Field id="email" label="Email" type="email" defaultValue={user?.email} required />
          <Field id="inn" label="ИНН" defaultValue={user?.inn} />
          <Field id="kpp" label="КПП" defaultValue={user?.kpp} />
          <div className="sm:col-span-2 grid gap-1.5">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea id="comment" name="comment" rows={3} />
          </div>
        </div>

        <div>
          <p className="mb-2 font-medium">Способ доставки</p>
          <RadioGroup
            value={carrierId}
            onValueChange={(v) => v && setCarrierId(v as CarrierId)}
          >
            {quotes.map((q, i) => (
              <label key={q.id} className="flex items-start gap-3 rounded-xl border p-3">
                <RadioGroupItem value={q.id} />
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {q.name}
                    {i === 0 ? (
                      <span className="rounded-full bg-orange/10 px-2 py-0.5 text-xs font-normal text-orange">
                        дешевле
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm text-steel">
                    {q.eta} · {q.note}
                  </span>
                </span>
                <span className="text-sm font-medium">
                  {q.price ? formatPrice(q.price) : "бесплатно"}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <p className="font-medium">Адрес доставки</p>
          <DeliveryAddressPicker
            addresses={addresses}
            pickup={pickup}
            selectedId={selectedAddressId}
            onSelect={(id) => {
              setSelectedAddressId(id);
              const addr = addresses.find((a) => a.id === id);
              if (addr?.city) setCity(addr.city);
            }}
            manual={manualAddress}
            onManualChange={setManualAddress}
            manualValue={manualValue}
            onManualValueChange={setManualValue}
          />
          {!pickup ? (
            <div className="grid gap-1.5">
              <Label htmlFor="city">Город для расчёта ТК</Label>
              <Input
                id="city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <p className="text-xs text-steel">
                Вес партии ≈ {weight.toFixed(1)} кг (мок из карточек).
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-2 font-medium">Способ оплаты</p>
          <RadioGroup value={payment} onValueChange={(v) => v && setPayment(v as PaymentMethod)}>
            <label className="flex items-start gap-3 rounded-xl border p-3">
              <RadioGroupItem value="invoice_auto" />
              <span>
                <span className="block font-medium">Счёт с сайта</span>
                <span className="text-sm text-steel">
                  PDF-счёт сразу после заказа — печать или сохранение.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border p-3">
              <RadioGroupItem value="invoice_manager" />
              <span>
                <span className="block font-medium">Счёт от менеджера</span>
                <span className="text-sm text-steel">
                  Сайт письмо не шлёт, менеджер выставит счёт вручную.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border p-3">
              <RadioGroupItem value="online" />
              <span>
                <span className="block font-medium">Онлайн-оплата</span>
                <span className="text-sm text-steel">
                  Мок виджета ЮKassa: успешная оплата или отказ.
                </span>
              </span>
            </label>
          </RadioGroup>
        </div>

        <label className="flex items-start gap-2 text-sm text-steel">
          <Checkbox required defaultChecked />
          Согласен с политикой обработки персональных данных
        </label>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="h-11">
            Подтвердить заказ · {formatPrice(total)}
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/cart" />}
            variant="outline"
            className="h-11"
          >
            В корзину
          </Button>
        </div>
      </form>

      <aside className="h-fit rounded-2xl border bg-card p-5">
        <p className="font-heading text-lg">Состав</p>
        <ul className="mt-3 space-y-2 text-sm">
          {cart.map((item) => {
            const p = getProduct(item.productId);
            if (!p) return null;
            return (
              <li key={cartLineKey(item)} className="flex justify-between gap-3">
                <span>
                  {p.name} · {item.size} · {cartLineOfferLabel(p, item)}
                </span>
                <span>{formatPrice(cartLineTotal(p, item, cartProductQty(cart, item.productId)))}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-1 border-t pt-3 text-sm">
          <p className="flex justify-between">
            <span>Товары</span>
            <span>{formatPrice(cartTotal)}</span>
          </p>
          <p className="flex justify-between text-steel">
            <span>в т.ч. НДС 20%</span>
            <span>{formatPrice(vatGoods.vat)}</span>
          </p>
          <p className="flex justify-between">
            <span>Доставка · {selected?.name}</span>
            <span>{deliveryCost ? formatPrice(deliveryCost) : "0 ₽"}</span>
          </p>
        </div>
        <p className="mt-3 flex justify-between font-medium">
          <span>Итого</span>
          <span>{formatPrice(total)}</span>
        </p>
        <p className="mt-1 text-xs text-steel">в т.ч. НДС 20% {formatPrice(vatTotal.vat)}</p>
      </aside>
    </div>
  );
}

function Field({
  id,
  label,
  defaultValue,
  required,
  type = "text",
}: {
  id: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} defaultValue={defaultValue} />
    </div>
  );
}
