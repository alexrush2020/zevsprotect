"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") || "demo";
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const a = String(data.get("password") || "");
    const b = String(data.get("repeat") || "");
    if (a.length < 4 || a !== b) {
      toast.error("Пароли должны совпадать и быть не короче 4 символов");
      return;
    }
    setDone(true);
    toast.success("Пароль обновлён (мок). Войдите с любым паролем.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-4xl">Новый пароль</h1>
      <p className="mt-2 text-sm text-steel">
        Ссылка из письма. Токен <code>{token}</code> в прототипе не проверяется
        на сервере.
      </p>
      {done ? (
        <p className="mt-6 rounded-2xl border bg-navy/10 p-4 text-sm">
          Пароль записан локально как обновлённый. В бою это POST в кабинет.
        </p>
      ) : (
        <form className="mt-8 grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Новый пароль</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="repeat">Повтор</Label>
            <Input id="repeat" name="repeat" type="password" required />
          </div>
          <Button type="submit" className="h-11">
            Сохранить
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm text-steel">
        <Link href="/login" className="underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

export default function ForgotResetPage() {
  return (
    <Suspense fallback={<p className="p-16 text-center text-steel">Загрузка…</p>}>
      <ResetForm />
    </Suspense>
  );
}
