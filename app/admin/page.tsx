"use client";

import { useStore } from "@/lib/store";
import { products, articles } from "@/lib/data/catalog";
import { formatDate, formatPrice, STATUS_LABEL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brand } from "@/lib/brand";

export default function AdminPage() {
  const { orders, leads } = useStore();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-navy">
        CMS · {brand.mark}
      </p>
      <h1 className="mt-2 font-heading text-4xl">Административная панель</h1>
      <p className="mt-3 max-w-2xl text-steel">
        Не полноценная CMS, а макет того, что должно быть в админке: заказы,
        лиды в Битрикс24, правка товаров «на случай ошибки 1С», статьи. Данные
        заказов и заявок живут в браузере.
      </p>
      <Tabs defaultValue="orders" className="mt-8">
        <TabsList>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="leads">Лиды</TabsTrigger>
          <TabsTrigger value="catalog">Каталог</TabsTrigger>
          <TabsTrigger value="blog">Статьи</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4 rounded-2xl border bg-card p-4">
          {orders.length === 0 ? (
            <p className="text-steel">Заказов в этом браузере нет.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-steel">
                <tr>
                  <th className="py-2">Номер</th>
                  <th>Клиент</th>
                  <th>Статус</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="py-2">{o.id}</td>
                    <td>
                      {o.profile.company || o.profile.name}
                      {o.guest ? " · гость" : ""}
                    </td>
                    <td>{STATUS_LABEL[o.status]}</td>
                    <td>{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>
        <TabsContent value="leads" className="mt-4 space-y-3">
          {leads.length === 0 ? (
            <p className="text-steel">Лидов нет. Отправьте форму на сайте.</p>
          ) : (
            leads.map((l) => (
              <div key={l.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex gap-2">
                  <Badge>{l.type}</Badge>
                  <span className="text-steel">{formatDate(l.createdAt)}</span>
                </div>
                <p className="mt-2">
                  {l.payload.name} · {l.payload.company} · {l.payload.phone}
                </p>
                <p className="text-steel">{l.payload.message}</p>
              </div>
            ))
          )}
        </TabsContent>
        <TabsContent value="catalog" className="mt-4 rounded-2xl border bg-card p-4">
          <p className="mb-3 text-sm text-steel">
            Источник цен и остатков — 1С. Здесь ручная правка на случай ошибок обмена.
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 border-b py-2">
                <span>
                  {p.name}
                  <span className="block text-xs text-steel">{p.sku}</span>
                </span>
                <span>
                  {formatPrice(p.price)} · {p.stock} шт.
                </span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="blog" className="mt-4 space-y-2">
          {articles.map((a) => (
            <div key={a.slug} className="rounded-xl border bg-card p-4">
              <p className="font-heading">{a.title}</p>
              <p className="text-sm text-steel">
                {a.category} · {formatDate(a.date)} · опубликовано
              </p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
