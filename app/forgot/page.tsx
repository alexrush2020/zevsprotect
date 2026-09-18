"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export default function ForgotPage() {
  const { addLead } = useStore();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = String(data.get("email") || "");
    addLead("password_reset", { email: value });
    setEmail(value);
    setSent(true);
    toast.success("Письмо со ссылкой «отправлено» (мок)");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-4xl">Сброс пароля</h1>
      {sent ? (
        <p className="mt-4 rounded-2xl border bg-navy/10 p-4 text-sm">
          Если кабинет с адресом {email} существует, на него уйдёт ссылка.
          В прототипе письмо не отправляется — лид password_reset записан
          локально. Откройте{" "}
          <Link href="/forgot/reset?token=demo" className="underline">
            мок-ссылку из письма
          </Link>
          {" "}или войдите с любым паролем.
        </p>
      ) : (
        <form className="mt-8 grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email кабинета</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit" className="h-11">
            Отправить ссылку
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm text-steel">
        <Link href="/login" className="underline">
          Вернуться ко входу
        </Link>
      </p>
    </div>
  );
}
