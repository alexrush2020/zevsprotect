"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getProducts } from "@/lib/server/catalog";
import {
  ORDER_ACCESS_COOKIE,
  createOrderReceiver,
  rememberOrder,
  type OrderInput,
  type OrderResult,
} from "@/lib/server/orders";

const receive = createOrderReceiver();

/**
 * Оформление заказа с витрины → коллекция orders (+ письма клиенту и менеджеру).
 * Цены, суммы и состав пересчитывает сервер (lib/server/orders.ts); клиент из сессии customers, иначе гость.
 */
export async function createOrder(input: OrderInput): Promise<OrderResult> {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown"; // клиент задаёт начало XFF, прокси дописывает в конец
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: h });
  const customerId = user?.collection === "customers" ? Number(user.id) : undefined;

  const result = await receive(
    {
      catalog: getProducts,
      // overrideAccess: публичный create у orders закрыт, пишем только после проверок receive
      create: (data) => payload.create({ collection: "orders", data: { ...data, number: "" }, overrideAccess: true }), // number ставит хук beforeValidate
      sendEmail: (m) => payload.sendEmail(m),
      managerEmail: async () =>
        process.env.LEADS_EMAIL ||
        (await payload.findGlobal({ slug: "settings", depth: 0 })).contacts?.email ||
        undefined,
      log: (msg, err) => console.error(msg, err),
      defer: (task) => after(task), // письма — после ответа клиенту
    },
    { input, ip, customerId },
  );

  if (result.ok) {
    // гость (и клиент после выхода) видит свой заказ по подписанной cookie, а не по угадываемому номеру
    const jar = await cookies();
    jar.set(ORDER_ACCESS_COOKIE, rememberOrder(jar.get(ORDER_ACCESS_COOKIE)?.value, result.number, process.env.PAYLOAD_SECRET || ""), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 90 * 24 * 60 * 60,
    });
  }
  return result;
}
