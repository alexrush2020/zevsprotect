import { LeadForm } from "@/components/lead-form";
import { PriceTable } from "@/components/price-table";
import { PurchaseGuideTeaser } from "@/components/purchase-guide-teaser";
import { brand } from "@/lib/brand";

export const metadata = { title: "Прайс-лист" };

export default function PricePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-orange">Опт</p>
      <h1 className="mt-2 font-heading text-4xl">Прайс-лист</h1>
      <p className="mt-3 max-w-2xl text-steel">
        Актуальные цены прототипа — как на витрине, источник в бою 1С. Скачайте
        CSV или запросите PDF на почту. НДС 20% включён.
      </p>
      <PurchaseGuideTeaser className="mt-6 max-w-xl" />
      <PriceTable />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <LeadForm
          type="pricelist"
          title="Прайс на почту"
          hint={`Отправим файл на email. В прототипе заявка пишется локально, письмо с ${brand.email} не уходит.`}
        />
        <div className="rounded-2xl bg-ink p-6 text-paper">
          <p className="text-xs uppercase tracking-[0.2em] text-white/55">Для сетей</p>
          <h2 className="mt-2 font-heading text-2xl">Индивидуальные условия</h2>
          <p className="mt-3 text-sm text-paper/70">
            Регулярный объём, маркировка под бренд и евро-подвесы считаются
            отдельно. Базовый CSV — рознично-оптовая витрина прототипа, не
            персональный договор.
          </p>
        </div>
      </div>
    </div>
  );
}
