import { LeadForm } from "@/components/lead-form";
import { PurchaseGuideCarousel } from "@/components/purchase-guide-carousel";
import { brand } from "@/lib/brand";

export const metadata = { title: "Образцы" };

export default function SamplesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-orange">Перед партией</p>
          <h1 className="mt-2 font-heading text-4xl">Образцы на вашу смену</h1>
          <p className="mt-4 text-steel">
            Пришлём пары, чтобы сравнить хват, размер и износ до закупки коробов.
            Для опта это быстрее, чем возвращать неподошедшую модель.
          </p>
          <ul className="mt-6 space-y-3 text-steel">
            <li>Укажите виды защиты и размеры — подберём 2–4 модели.</li>
            <li>Доставка образцов ТК или с ближайшей отгрузкой.</li>
            <li>Заявка уходит лидом в Битрикс24 (мок).</li>
          </ul>
          <p className="mt-6 text-sm text-steel">
            {brand.phone}
          </p>
        </div>
        <LeadForm
          type="samples"
          title="Заявка на образцы"
          hint="Менеджер подтвердит состав и адрес доставки."
          extra={[
            { name: "models", label: "Какие модели нужны", placeholder: "Атлант, Фрост, краги" },
            { name: "city", label: "Город", required: true, placeholder: "Ростов-на-Дону" },
          ]}
        />
      </div>

      <section className="mt-16 border-t pt-12">
        <p className="text-xs uppercase tracking-[0.2em] text-orange">Гид закупщика</p>
        <h2 className="mt-2 font-heading text-3xl">7 параметров до оплаты партии</h2>
        <p className="mt-3 max-w-2xl text-steel">
          Листайте слайды: цена за пару — только один пункт. Перед тестовым
          комплектом стоит понять, что проверять на смене.
        </p>
        <PurchaseGuideCarousel className="mt-8" />
      </section>
    </div>
  );
}
