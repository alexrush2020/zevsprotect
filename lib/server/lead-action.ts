"use server";

import { headers } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { leadManagerMail } from "@/lib/mail/templates";
import { createLeadReceiver, type LeadResult } from "@/lib/server/leads";

const receive = createLeadReceiver();

/** Заявка с формы витрины → коллекция leads (+ письмо менеджеру). Валидация и спам-защита — в receive. */
export async function submitLead(kind: string, fields: Record<string, string>): Promise<LeadResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  let sourceUrl: string | undefined;
  try {
    const ref = h.get("referer");
    if (ref) sourceUrl = new URL(ref).pathname;
  } catch {}

  // Payload поднимаем лениво: невалидная заявка и спам до БД не доходят
  const db = () => getPayload({ config });
  return receive(
    {
      // overrideAccess: публичный create у leads закрыт, пишем только после проверок receive
      create: async (data) => (await db()).create({ collection: "leads", data, overrideAccess: true }),
      sendEmail: async (m) => (await db()).sendEmail(m),
      mail: leadManagerMail,
      managerEmail: async () =>
        process.env.LEADS_EMAIL ||
        (await (await db()).findGlobal({ slug: "settings", depth: 0 })).contacts?.email ||
        undefined,
      log: (msg, err) => console.error(msg, err),
    },
    { kind, fields, ip, sourceUrl },
  );
}
