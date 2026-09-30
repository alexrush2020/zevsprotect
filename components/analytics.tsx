"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { hit, initCounter } from "@/lib/analytics";

/** Яндекс.Метрика: рендерится только при ID из Settings → «Счётчики»; без ID — ничего не грузится. */
export function Analytics({ metrikaId }: { metrikaId: number | null }) {
  if (!metrikaId) return null;
  // до эффектов потомков (просмотр товара, начало оформления): их события встают в очередь ym
  initCounter(metrikaId);
  return (
    <>
      <Script id="ym-tag" src="https://mc.yandex.ru/metrika/tag.js" strategy="afterInteractive" />
      <Suspense fallback={null}>
        <PageHits />
      </Suspense>
    </>
  );
}

function PageHits() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    hit(window.location.href);
  }, [pathname, search]);
  return null;
}
