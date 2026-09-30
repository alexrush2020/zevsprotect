"use server";

import { cookies, headers } from "next/headers";
import { getPayload, type Where } from "payload";
import config from "@payload-config";
import type { ProductReview } from "@/lib/data/product-reviews";
import { mapProductReview } from "@/lib/server/map";
import {
  REVIEW_ACCESS_COOKIE,
  createReviewReceiver,
  rememberReview,
  rememberedReviewIds,
  type ReviewInput,
  type ReviewResult,
} from "@/lib/server/reviews";

const receive = createReviewReceiver();
const secret = () => process.env.PAYLOAD_SECRET || "";

/**
 * Отзыв с карточки товара → коллекция reviews (approved=false, на модерацию).
 * Оставить может и гость (как в модалке прототипа); клиент берётся из сессии customers, не из формы.
 */
export async function submitReview(productSlug: string, input: ReviewInput): Promise<ReviewResult> {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown"; // клиент задаёт начало XFF, прокси дописывает в конец
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: h });
  const customerId = user?.collection === "customers" ? Number(user.id) : undefined;

  const result = await receive(
    {
      findProduct: async (slug) => {
        // overrideAccess:false без user — access витрины: черновик/снятый товар не находится
        const { docs } = await payload.find({ collection: "products", where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: false });
        return docs[0] ? { id: docs[0].id } : null;
      },
      // overrideAccess: create у reviews закрыт для витрины; пишем только после проверок receive, approved=false
      create: (data) => payload.create({ collection: "reviews", data, overrideAccess: true }),
      log: (msg, err) => console.error(msg, err),
    },
    { productSlug, input, ip, customerId },
  );

  if (result.ok && result.id) {
    const jar = await cookies();
    jar.set(REVIEW_ACCESS_COOKIE, rememberReview(jar.get(REVIEW_ACCESS_COOKIE)?.value, result.id, secret()), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 90 * 24 * 60 * 60,
    });
  }
  return result;
}

/**
 * Свои отзывы на модерации: клиента из сессии и отправленные из этого браузера (подписанная cookie).
 * Чужие неодобренные отзывы сюда не попадают — id берутся только из сессии/подписи сервера.
 */
export async function myPendingReviews(): Promise<ProductReview[]> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  const ids = rememberedReviewIds((await cookies()).get(REVIEW_ACCESS_COOKIE)?.value, secret());
  const mine: Where[] = [];
  if (user?.collection === "customers") mine.push({ customer: { equals: user.id } });
  if (ids.length) mine.push({ id: { in: ids } });
  if (!mine.length) return [];
  // overrideAccess: неодобренные анониму/клиенту не читаются access'ом; фильтр «свои» — выше
  const { docs } = await payload.find({
    collection: "reviews",
    where: { and: [{ approved: { not_equals: true } }, { or: mine }] },
    sort: "-createdAt",
    limit: 30,
    depth: 1,
    overrideAccess: true,
  });
  return docs.map((doc) => ({ ...mapProductReview(doc), pendingModeration: true }));
}
