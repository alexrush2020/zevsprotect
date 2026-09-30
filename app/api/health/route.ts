import { getPayload } from "payload";
import config from "@payload-config";

// Проверка живости для Docker healthcheck и мониторинга: процесс + доступность БД. Без данных и ПДн.
// Первый вызов инициализирует Payload — вместе с ним стартует autoRun очереди jobs (b24-sync).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getPayload({ config });
    await payload.count({ collection: "categories" });
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "db_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
