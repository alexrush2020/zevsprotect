"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";

const types = {
  consult: {
    title: "Заявка на консультацию",
    description: "Подберём модели под задачу и посчитаем партию.",
    lead: "consultation",
  },
  calc: {
    title: "Расчёт поставки",
    description: "Укажите объём и город — вернём стоимость и срок.",
    lead: "calculation",
  },
  samples: {
    title: "Заказать образцы",
    description: "Пришлём образцы, чтобы сравнить хват, плотность и размер.",
    lead: "samples",
  },
  price: {
    title: "Прайс-лист",
    description: "Отправим актуальный прайс на почту.",
    lead: "pricelist",
  },
  product: {
    title: "Запрос по товару",
    description: "Уточним наличие, фасовку и срок отгрузки.",
    lead: "product",
  },
} as const;

type InquiryType = keyof typeof types;

export function InquiryDialog({
  type = "consult",
  trigger,
  productName,
}: {
  type?: InquiryType;
  trigger: React.ReactNode;
  productName?: string;
}) {
  const { addLead, user } = useStore();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const copy = types[type];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      message: String(data.get("message") || ""),
      product: productName || "",
    };
    const lead = addLead(copy.lead, payload);
    setSent(true);
    toast.success(`Лид ${lead.id} отправлен в Битрикс24`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSent(false);
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="rounded-xl border border-orange/20 bg-orange/5 p-4 text-sm">
            Заявка принята. Менеджер ответит в рабочее время, обычно в течение
            нескольких минут. В прототипе лид сохранён локально и «ушёл» в
            Битрикс24.
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={onSubmit}>
            {productName ? (
              <p className="text-sm text-steel">Товар: {productName}</p>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={user?.name}
                placeholder="Как к вам обращаться"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                required
                defaultValue={user?.phone}
                placeholder="+7"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={user?.email}
                placeholder="work@company.ru"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company">Организация</Label>
              <Input
                id="company"
                name="company"
                defaultValue={user?.company}
                placeholder="ООО «Компания»"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="message">Сообщение</Label>
              <Textarea
                id="message"
                name="message"
                rows={3}
                placeholder="Объём, город доставки, условия работы"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-steel">
              <Checkbox name="consent" required defaultChecked />
              <span>
                Согласен с{" "}
                <a className="underline" href="/privacy">
                  политикой обработки персональных данных
                </a>
              </span>
            </label>
            <Button type="submit" className="h-10">
              Отправить заявку
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
