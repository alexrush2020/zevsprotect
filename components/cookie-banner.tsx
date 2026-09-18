"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "zp-cookies";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // localStorage is client-only; avoid SSR/hydration flash
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(!localStorage.getItem(KEY));
  }, []);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl border bg-ink p-4 text-paper shadow-xl" data-print-hide>
      <p className="text-sm text-paper/80">
        Сайт использует cookie, чтобы запоминать корзину и кабинет. Продолжая
        работу, вы соглашаетесь с{" "}
        <a className="underline" href="/privacy">
          политикой ПДн
        </a>
        .
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          className="h-9 bg-orange text-white hover:bg-orange-dk"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setOpen(false);
          }}
        >
          Понятно
        </Button>
        <Button
          variant="ghost"
          className="h-9 text-paper"
          onClick={() => setOpen(false)}
        >
          Закрыть
        </Button>
      </div>
    </div>
  );
}
