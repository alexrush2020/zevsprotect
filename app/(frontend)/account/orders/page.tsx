"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountOrderCard, useAccountOrders } from "@/components/account/account-order-card";
import { AccountScroll } from "@/components/account/account-scroll";
import { StarRating } from "@/components/product-reviews/star-rating";
import { useStore } from "@/lib/store";
import { reviewsForAccount } from "@/lib/account-reviews";
import { REVIEWS_UPDATED_EVENT, type ProductReview } from "@/lib/data/product-reviews";
import { formatDate, formatPrice } from "@/lib/format";
import type { Lead } from "@/lib/types";

function inquiriesForUser(leads: Lead[], email: string, phone: string) {
  return leads.filter((l) => {
    if (l.type !== "cart") return false;
    if (l.payload.email && l.payload.email === email) return true;
    if (l.payload.phone && l.payload.phone === phone) return true;
    return false;
  });
}

export default function AccountOrdersPage() {
  const { user, leads } = useStore();
  const { orders: loaded, notice } = useAccountOrders();
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = () => setReviews(reviewsForAccount(user));
    load();
    window.addEventListener(REVIEWS_UPDATED_EVENT, load);
    return () => window.removeEventListener(REVIEWS_UPDATED_EVENT, load);
  }, [user]);

  if (!user) return null;

  const mine = loaded ?? [];
  const inquiries = inquiriesForUser(leads, user.email, user.phone);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <h2 className="font-heading text-xl">Заказы</h2>
        <p className="mt-1 text-sm text-steel">
          Статусы в прототипе заданы вручную. По ТЗ источник статуса — Битрикс24.
        </p>
        <AccountScroll className="mt-4">
          {notice ?? (loaded === null ? null : mine.length === 0 ? (
            <p className="rounded-2xl border bg-card p-5 text-steel">Заказов пока нет.</p>
          ) : (
            mine.map((order) => <AccountOrderCard key={order.id} order={order} />)
          ))}
        </AccountScroll>

        <h2 className="mt-8 font-heading text-xl">Заявки менеджеру</h2>
        <p className="mt-1 text-sm text-steel">
          Заявки из корзины. В бою уходят лидом в Битрикс24, здесь хранятся в браузере.
        </p>
        <AccountScroll className="mt-4">
          {inquiries.length === 0 ? (
            <p className="rounded-2xl border bg-card p-5 text-sm text-steel">
              Заявок пока нет. Из корзины можно отправить состав менеджеру, не оформляя заказ.
            </p>
          ) : (
            inquiries.map((lead) => (
              <article key={lead.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading">{lead.id}</p>
                  <span className="text-sm text-steel">{formatDate(lead.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm">
                  {lead.payload.delivery}
                  {lead.payload.total
                    ? ` · оценка ${formatPrice(Number(lead.payload.total) || 0)}`
                    : ""}
                </p>
                <p className="text-xs text-steel">
                  {[lead.payload.addressLabel, lead.payload.address]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {lead.payload.items ? (
                  <p className="mt-2 whitespace-pre-line text-sm text-steel">
                    {lead.payload.items}
                  </p>
                ) : null}
                {lead.payload.comment ? (
                  <p className="mt-2 text-sm text-ink">{lead.payload.comment}</p>
                ) : null}
              </article>
            ))
          )}
        </AccountScroll>
      </section>

      <section>
        <h2 className="font-heading text-xl">Отзывы</h2>
        <p className="mt-1 text-sm text-steel">
          Отзывы с карточек товаров, оставленные от имени этого кабинета.
        </p>
        <AccountScroll className="mt-4">
          {reviews.length === 0 ? (
            <p className="rounded-2xl border bg-card p-5 text-sm text-steel">
              Отзывов пока нет. После поставки их можно оставить в карточке модели.
            </p>
          ) : (
            reviews.map((r) => (
              <article key={r.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/product/${r.productSlug}`} className="font-medium hover:text-orange">
                    {r.productTitle}
                  </Link>
                  <StarRating value={r.rating} />
                </div>
                <p className="mt-2 text-sm text-ink">{r.text}</p>
                <p className="mt-2 text-xs text-steel">
                  {r.date}
                  {r.pendingModeration ? " · на модерации" : ""}
                </p>
              </article>
            ))
          )}
        </AccountScroll>
      </section>
    </div>
  );
}
