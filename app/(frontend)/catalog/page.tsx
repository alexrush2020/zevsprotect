import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { PurchaseGuideTeaser } from "@/components/purchase-guide-teaser";
import { brand } from "@/lib/brand";
import { withMockIds } from "@/lib/data/catalog";
import { getCategories, getProducts } from "@/lib/server/catalog";

export const metadata = {
  title: "Каталог рабочих перчаток",
};

async function CatalogData() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <CatalogBrowser products={withMockIds(products)} categories={categories} />;
}

export default function CatalogPage() {
  return (
    <div>
      <div className="hidden border-b bg-card xl:block">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-orange">
              Каталог
            </p>
            <h1 className="mt-2 font-heading text-4xl">Рабочие перчатки под задачу</h1>
            <p className="mt-3 max-w-2xl text-steel">
              Семь видов защиты {brand.markRu}: основа, покрытие, цвет и размер.
              В карточке — фасовка, остаток из 1С и заявка, если нужна консультация.
            </p>
          </div>
          <PurchaseGuideTeaser compact />
        </div>
      </div>
      <Suspense fallback={<div className="p-10 text-center text-steel">Загрузка каталога…</div>}>
        <CatalogData />
      </Suspense>
    </div>
  );
}
