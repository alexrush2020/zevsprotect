import { LeadForm } from "@/components/lead-form";
import { PurchaseGuideTeaser } from "@/components/purchase-guide-teaser";
import { brand } from "@/lib/brand";

import { pageMeta } from "@/lib/seo-jsonld";

export const metadata = pageMeta("Расчёт поставки", "Считаем стоимость, фасовку и срок отгрузки по складу и графику цеха. Укажите объём, город и желаемый срок.", "/calculation");

export default function CalculationPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-orange">Опт</p>
        <h1 className="mt-2 font-heading text-4xl">Расчёт партии</h1>
        <p className="mt-4 text-steel">
          Считаем стоимость, фасовку и срок отгрузки по складу 1С и графику
          цеха. Если позиции нет — скажем, когда будет, без «уточним и пропадём».
        </p>
        <ul className="mt-6 space-y-3 text-steel">
          <li>Объём в парах или коробах, город, желаемый срок.</li>
          <li>Можно приложить текущий прайс конкурента — сравним покрытие и класс вязки, не только цену.</li>
          <li>Ответ в рабочее время, обычно в течение нескольких минут.</li>
        </ul>
        <p className="mt-6 text-sm text-steel">
          {brand.email} · {brand.phone}
        </p>
        <PurchaseGuideTeaser className="mt-8" />
      </div>
      <LeadForm
        type="calculation"
        title="Заявка на расчёт"
        hint="Лид в Битрикс24, расчёт придёт на почту."
        extra={[
          { name: "city", label: "Город доставки", required: true },
          { name: "volume", label: "Объём", required: true, placeholder: "например 5 000 пар / месяц" },
        ]}
      />
    </div>
  );
}
