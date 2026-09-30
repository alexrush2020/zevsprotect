"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Сбой чтения статей из Payload (БД недоступна и т.п.) — пояснение вместо падения страницы. */
export default function BlogError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-heading text-3xl">Статьи временно недоступны</h1>
      <p className="mt-3 text-steel">Не удалось загрузить материалы. Попробуйте обновить страницу чуть позже.</p>
      <Button type="button" onClick={() => retry()} className="mt-6">
        Повторить
      </Button>
    </div>
  );
}
