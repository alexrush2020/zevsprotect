import { cookies, headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { ORDER_ACCESS_COOKIE, ORDER_NUMBER_RE, hasOrderAccess, toViewOrder, type ViewOrder } from "@/lib/server/orders";

/**
 * Заказ Payload для /order/[id] и /invoice/[id]. Сессия (клиент/сотрудник) — через access коллекции
 * (Orders.read: клиент видит только свои); иначе — только заказ из подписанной cookie этого браузера.
 * null — не заказ Payload (демо-заказы ЛК из localStorage) или нет доступа.
 */
export async function loadOrder(number: string): Promise<ViewOrder | null> {
  if (!ORDER_NUMBER_RE.test(number)) return null;
  const payload = await getPayload({ config });
  const h = await headers();
  const where = { number: { equals: number } };
  const { user } = await payload.auth({ headers: h });
  if (user) {
    const { docs } = await payload.find({ collection: "orders", where, limit: 1, depth: 1, overrideAccess: false, user, disableErrors: true }); // нет доступа (роль content) — не 403, а запасной путь по cookie
    if (docs[0]) return toViewOrder(docs[0]);
  }
  const cookie = (await cookies()).get(ORDER_ACCESS_COOKIE)?.value;
  if (!hasOrderAccess(cookie, number, process.env.PAYLOAD_SECRET || "")) return null;
  const { docs } = await payload.find({ collection: "orders", where, limit: 1, depth: 1, overrideAccess: true });
  return docs[0] ? toViewOrder(docs[0]) : null;
}
