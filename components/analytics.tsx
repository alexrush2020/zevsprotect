"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { counterReady, hit, initCounter, isAnalyticsBlockedPath } from "@/lib/analytics";

/** Яндекс.Метрика: рендерится только при ID из Settings → «Счётчики»; без ID — ничего не грузится. */
export function Analytics({ metrikaId }: { metrikaId: number | null }) {
  if (!metrikaId) return null;
  return (
    <Suspense fallback={null}>
      <Counter id={metrikaId} />
    </Suspense>
  );
}

function Counter({ id }: { id: number }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const blocked = isAnalyticsBlockedPath(pathname);
  // до эффектов потомков (просмотр товара, начало оформления): их события встают в очередь ym.
  // Заход на /forgot/* (ссылка с токеном) — счётчик не инициализируется, пока пользователь не уйдёт оттуда.
  if (!blocked) initCounter(id);

  useEffect(() => {
    hit(window.location.href);
  }, [pathname, search]);

  if (blocked && !counterReady()) return null;
  return <Script id="ym-tag" src="https://mc.yandex.ru/metrika/tag.js" strategy="afterInteractive" />;
}
