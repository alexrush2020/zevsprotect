"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Сбой рендера страницы витрины (БД, внешний сервис) — пояснение вместо белого экрана. */
export default function FrontendError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-heading text-3xl">Что-то пошло не так</h1>
      <p className="mt-3 text-steel">Страница не загрузилась. Попробуйте ещё раз или вернитесь на главную.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button type="button" onClick={() => retry()}>
          Повторить
        </Button>
        <Button nativeButton={false} render={<Link href="/" />} variant="outline">
          На главную
        </Button>
      </div>
    </div>
  );
}
