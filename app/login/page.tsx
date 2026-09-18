"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { brand } from "@/lib/brand";

export default function LoginPage() {
  const { login } = useStore();
  const router = useRouter();
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ok = login(String(data.get("email")), String(data.get("password")));
    if (!ok) {
      setError("Введите email и пароль");
      return;
    }
    toast.success("Вход выполнен. В прототипе пароль не проверяется по серверу.");
    router.push("/account");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-4xl">Вход в кабинет</h1>
      <p className="mt-2 text-sm text-steel">
        Кабинет {brand.markRu}. Демо: любой пароль. Email{" "}
        <code>zakup@roststroy.ru</code> — тестовый профиль с заказами.
      </p>
      <form className="mt-8 grid gap-3" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required defaultValue="zakup@roststroy.ru" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" name="password" type="password" required defaultValue="demo" />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11">
          Войти
        </Button>
      </form>
      <p className="mt-4 text-sm text-steel">
        Нет кабинета? <Link href="/register" className="underline">Зарегистрироваться</Link>
      </p>
      <p className="mt-2 text-sm text-steel">
        Забыли пароль? <Link href="/forgot" className="underline">Сбросить</Link>
      </p>
    </div>
  );
}
