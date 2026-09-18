"use client";

import { InquiryDialog } from "@/components/inquiry-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";
import { brand } from "@/lib/brand";

export default function ContactsPage() {
  const { addLead } = useStore();
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    addLead("contact", {
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      message: String(data.get("message") || ""),
    });
    setSent(true);
    toast.success("Заявка сохранена и отправлена лидом в Битрикс24");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2">
      <div>
        <h1 className="font-heading text-4xl">Контакты</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.18em] text-orange">
          {brand.tagline}
        </p>
        <div className="mt-6 space-y-4 text-steel">
          <p>
            <strong className="text-ink">Производство и офис</strong>
            <br />
            {brand.address}
            <br />
            Пн–Пт 8:00–17:00
          </p>
          <p>
            Отдел продаж:{" "}
            <a className="text-ink underline" href={brand.phoneHref}>
              {brand.phone}
            </a>
            ,{" "}
            <a className="text-ink underline" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>
          </p>
          <p>
            WhatsApp:{" "}
            <a className="text-ink underline" href={brand.whatsappHref}>
              {brand.whatsapp}
            </a>
            {" · "}
            Telegram:{" "}
            <a className="text-ink underline" href={brand.telegramHref}>
              @zevsprotect
            </a>
          </p>
          <p>
            Розница и мелкий опт: +7 988 577-73-04, zevs-magazine@yandex.ru
          </p>
          <p>
            Закупки и логистика: +7 988 577-73-94, zevs-zakup@yandex.ru
          </p>
          <p>
            Бухгалтерия: zevs-glavbuh@yandex.ru
          </p>
          <p className="text-sm">
            {brand.legal} · ИНН {brand.inn} · ОГРН {brand.ogrn}
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border">
          <iframe
            title="Карта"
            className="h-72 w-full"
            src="https://yandex.ru/map-widget/v1/?ll=38.935%2C47.236&z=16&text=%D0%A2%D0%B0%D0%B3%D0%B0%D0%BD%D1%80%D0%BE%D0%B3%20%D0%9F%D0%BE%D0%BB%D1%8F%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%BE%D0%B5%20%D1%88%D0%BE%D1%81%D1%81%D0%B5%2017"
          />
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <h2 className="font-heading text-2xl">Написать нам</h2>
        {sent ? (
          <p className="mt-4 rounded-xl bg-navy/10 p-4 text-sm">
            Сообщение отправлено. Менеджер ответит в рабочее время.
          </p>
        ) : (
          <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Имя</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company">Организация</Label>
              <Input id="company" name="company" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="message">Сообщение</Label>
              <Textarea id="message" name="message" required rows={4} />
            </div>
            <label className="flex items-start gap-2 text-xs text-steel">
              <Checkbox required defaultChecked />
              Согласен с политикой обработки персональных данных
            </label>
            <Button type="submit" className="h-11">
              Отправить
            </Button>
          </form>
        )}
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
  );
}
