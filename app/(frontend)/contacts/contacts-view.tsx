"use client";

import type { ReactNode } from "react";
import { Building2, Calculator, Clock, MapPin, Phone, Store } from "lucide-react";
import { InquiryDialog } from "@/components/inquiry-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Reveal, Stagger, StaggerItem } from "@/components/home/motion";
import { submitLead } from "@/lib/server/lead-action";
import { toast } from "sonner";
import { useState } from "react";
import { brand } from "@/lib/brand";
import type { SiteContacts } from "@/lib/server/content";

const deskIcons = [Store, Calculator, Building2];

export function ContactsView({ contacts }: { contacts: SiteContacts }) {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    setPending(true);
    const res = await submitLead("feedback", {
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      message: String(data.get("message") || ""),
      consent: String(data.get("consent") || ""),
      website: String(data.get("website") || ""),
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      toast.error(res?.error ?? "Не удалось отправить сообщение. Попробуйте ещё раз или позвоните нам.");
      return;
    }
    setSent(true);
    toast.success("Заявка сохранена и отправлена лидом в Битрикс24");
  }

  return (
    <div className="relative isolate overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-paper" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-orange/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-navy/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-12">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-steel">Таганрог · Поляковское шоссе</p>
          <h1 className="mt-2 font-heading text-4xl text-ink sm:text-5xl">Контакты</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-orange">
            {brand.tagline}
          </p>
        </Reveal>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
          <Stagger className="space-y-3" delay={0.08}>
            <StaggerItem>
              <ContactCard
                icon={<MapPin className="size-4" />}
                label="Производство и офис"
              >
                <p className="font-heading text-ink">{contacts.address}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-navy/5 px-2.5 py-1 text-xs text-navy">
                  <Clock className="size-3.5" />
                  {contacts.hours}
                </p>
              </ContactCard>
            </StaggerItem>

            <StaggerItem>
              <ContactCard icon={<Phone className="size-4" />} label="Отдел продаж">
                <a className="block font-heading text-ink transition hover:text-orange" href={contacts.phoneHref}>
                  {contacts.phone}
                </a>
                <a
                  className="mt-1 block text-sm text-steel underline-offset-4 hover:text-ink hover:underline"
                  href={`mailto:${contacts.email}`}
                >
                  {contacts.email}
                </a>
              </ContactCard>
            </StaggerItem>

            <StaggerItem>
              <div className="divide-y rounded-2xl border bg-card">
                {contacts.desks.map((desk, i) => {
                  const Icon = deskIcons[i % deskIcons.length];
                  return (
                  <div key={desk.title} className="flex items-start gap-3 p-4 transition hover:bg-paper/80">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy text-orange">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-steel">{desk.title}</p>
                      {desk.phone ? (
                        <a className="mt-1 block text-ink hover:text-orange" href={desk.phoneHref}>
                          {desk.phone}
                        </a>
                      ) : null}
                      <a
                        className="block text-sm text-steel underline-offset-4 hover:text-ink hover:underline"
                        href={`mailto:${desk.email}`}
                      >
                        {desk.email}
                      </a>
                    </div>
                  </div>
                  );
                })}
              </div>
            </StaggerItem>
          </Stagger>

          <p className="mt-5 text-xs text-steel">
            {brand.legal} · ИНН {brand.inn} · ОГРН {brand.ogrn}
          </p>

          <Reveal delay={0.16} className="mt-6">
            <div className="relative overflow-hidden rounded-2xl border bg-card">
              <iframe
                title="Карта"
                className="h-72 w-full"
                src="https://yandex.ru/map-widget/v1/?ll=38.935%2C47.236&z=16&text=%D0%A2%D0%B0%D0%B3%D0%B0%D0%BD%D1%80%D0%BE%D0%B3%20%D0%9F%D0%BE%D0%BB%D1%8F%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%BE%D0%B5%20%D1%88%D0%BE%D1%81%D1%81%D0%B5%2017"
              />
              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-navy/90 px-3 py-1 text-xs text-paper">
                {contacts.address}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_18px_50px_rgb(4_0_64_/_0.08)]">
            <div className="relative bg-navy px-6 py-5 text-paper">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse at 88% 20%, rgb(249 115 22 / 0.35), transparent 46%)",
                }}
              />
              <p className="relative text-xs uppercase tracking-[0.18em] text-white/45">
                Обратная связь
              </p>
              <h2 className="relative mt-1 font-heading text-2xl">Написать нам</h2>
              <p className="relative mt-1 text-sm text-paper/60">
                Менеджер ответит в рабочее время
              </p>
            </div>

            <div className="p-6">
              {sent ? (
                <p className="rounded-xl border border-navy/10 bg-navy/5 p-4 text-sm text-ink">
                  Сообщение отправлено. Менеджер ответит в рабочее время.
                </p>
              ) : (
                <form className="grid gap-3" onSubmit={onSubmit}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="name" label="Имя" required />
                    <Field id="phone" label="Телефон" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="email" label="Email" type="email" required />
                    <Field id="company" label="Организация" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="message">Сообщение</Label>
                    <Textarea id="message" name="message" required rows={4} className="min-h-24" />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-steel">
                    <Checkbox name="consent" required defaultChecked />
                    Согласен с политикой обработки персональных данных
                  </label>
                  <MessengerRow href={contacts.maxHref} />
                  <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
                  <Button type="submit" className="btn-press-in h-11" disabled={pending}>
                    Отправить
                  </Button>
                </form>
              )}
              {sent ? <div className="mt-3"><MessengerRow href={contacts.maxHref} /></div> : null}
              <InquiryDialog
                type="price"
                trigger={
                  <Button variant="outline" className="mt-3 w-full">
                    Или запросить прайс-лист
                  </Button>
                }
              />
            </div>
          </div>
        </Reveal>
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="group rounded-2xl border bg-card p-4 transition duration-300 hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-[0_10px_28px_rgb(4_0_64_/_0.06)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy text-orange">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-steel">{label}</p>
          <div className="mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function MessengerRow({ href }: { href: string }) {
  const messengers = [
    { href, label: "MAX", className: "bg-[#471AFF] text-white hover:bg-[#3a14d6]" },
  ] as const;
  return (
    <div className="grid gap-2">
      {messengers.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex h-11 items-center justify-center rounded-lg text-sm font-medium transition hover:scale-[1.02] ${item.className}`}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} className="h-10" />
    </div>
  );
}
