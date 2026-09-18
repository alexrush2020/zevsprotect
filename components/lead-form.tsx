"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";

export function LeadForm({
  type,
  title,
  hint,
  extra,
}: {
  type: string;
  title: string;
  hint: string;
  extra?: { name: string; label: string; required?: boolean; placeholder?: string }[];
}) {
  const { addLead, user } = useStore();
  const [sent, setSent] = useState(false);
  const [leadId, setLeadId] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload: Record<string, string> = {
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      message: String(data.get("message") || ""),
    };
    extra?.forEach((f) => {
      payload[f.name] = String(data.get(f.name) || "");
    });
    const lead = addLead(type, payload);
    setLeadId(lead.id);
    setSent(true);
    toast.success(`Лид ${lead.id} · мок Битрикс24`);
  }

  if (sent) {
    return (
      <p className="rounded-2xl border bg-navy/10 p-5 text-sm">
        Заявка {leadId} принята. В моке Битрикс24 создан лид, менеджер свяжется в
        рабочее время. Письмо на почту в прототипе не уходит.
      </p>
    );
  }

  return (
    <form className="grid gap-3 rounded-2xl border bg-card p-5" onSubmit={onSubmit}>
      <div>
        <h2 className="font-heading text-xl">{title}</h2>
        <p className="mt-1 text-sm text-steel">{hint}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="name">Имя</Label>
        <Input id="name" name="name" required defaultValue={user?.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">Телефон</Label>
        <Input id="phone" name="phone" required defaultValue={user?.phone} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required defaultValue={user?.email} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="company">Организация</Label>
        <Input id="company" name="company" defaultValue={user?.company} />
      </div>
      {extra?.map((f) => (
        <div key={f.name} className="grid gap-1.5">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input
            id={f.name}
            name={f.name}
            required={f.required}
            placeholder={f.placeholder}
          />
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label htmlFor="message">Сообщение</Label>
        <Textarea id="message" name="message" rows={4} required />
      </div>
      <label className="flex items-start gap-2 text-xs text-steel">
        <Checkbox required defaultChecked />
        Согласен с политикой обработки персональных данных
      </label>
      <Button type="submit" className="h-11">
        Отправить
      </Button>
    </form>
  );
}
