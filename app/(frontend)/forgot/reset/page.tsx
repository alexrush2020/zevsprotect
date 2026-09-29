"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/home/motion";
import { resetRequest } from "@/lib/auth-client";

const fieldClass = "h-11 rounded-xl bg-white";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8 || password !== repeat) {
      toast.error("Пароли должны совпадать и быть не короче 8 символов");
      return;
    }
    try {
      await resetRequest(token, password);
      setDone(true);
      toast.success("Пароль обновлён. Можно войти с новым паролем.");
    } catch {
      toast.error("Ссылка недействительна или устарела. Запросите новую.");
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-paper" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-orange/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-navy/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-md px-4 py-12">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-steel">Личный кабинет</p>
          <h1 className="mt-2 font-heading text-3xl text-ink sm:text-4xl">Кабинет клиента</h1>
          <p className="mt-2 max-w-2xl text-sm text-steel">
            Ссылка из письма. Задайте новый пароль и вернитесь ко входу.
          </p>
        </Reveal>

        <section className="mt-8 rounded-2xl border bg-card p-5 shadow-[0_18px_50px_rgb(4_0_64_/_0.06)] sm:p-6">
          <h2 className="font-heading text-2xl text-ink">Новый пароль</h2>
          
          {done ? (
            <div className="mt-5 rounded-xl border bg-paper/80 p-4 text-sm text-ink">
              Пароль обновлён. Войдите с новым паролем.
            </div>
          ) : (
            <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-xs text-steel">
                  Новый пароль *
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="repeat" className="text-xs text-steel">
                  Повтор *
                </Label>
                <Input
                  id="repeat"
                  name="repeat"
                  type="password"
                  required
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <Button type="submit" className="btn-press-in mt-1 h-12 w-full text-base">
                Сохранить
              </Button>
            </form>
          )}
          <Link
            href="/login"
            className="mt-4 inline-block text-sm text-steel underline underline-offset-2 hover:text-ink"
          >
            Вернуться ко входу
          </Link>
        </section>
      </div>
    </div>
  );
}

export default function ForgotResetPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] bg-paper" />}>
      <ResetForm />
    </Suspense>
  );
}
