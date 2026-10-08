/**
 * Тестовые учётки для съёмки документации. Запуск ТОЛЬКО на копии БД zevs_docs:
 *   DATABASE_URL=…/zevs_docs npx payload run scripts/docs/setup-accounts.ts
 */
process.env.SEED_RUN = "1";
import { getPayload } from "payload";
import config from "@payload-config";

if (new URL(process.env.DATABASE_URL ?? "postgres://x/x").pathname !== "/zevs_docs") throw new Error("Только zevs_docs");
export const DOCS_PASSWORD = "Docs-Demo-2026!";
const payload = await getPayload({ config });

async function upsert(collection: "users" | "customers", email: string, data: Record<string, unknown>) {
  const found = await payload.find({ collection, where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true });
  if (found.docs[0]) await payload.update({ collection, id: found.docs[0].id, data: { ...data, password: DOCS_PASSWORD } as never, overrideAccess: true });
  else await payload.create({ collection, data: { email, ...data, password: DOCS_PASSWORD } as never, overrideAccess: true });
  console.log("ok", collection, email);
}

await upsert("users", "docs-admin@example.test", { name: "Администратор", role: "admin" });
await upsert("users", "docs-manager@example.test", { name: "Мария Орлова", role: "manager" });
await upsert("users", "docs-content@example.test", { name: "Иван Соколов", role: "content" });
await upsert("customers", "docs-buyer@example.test", {
  kind: "legal", name: "Петров Сергей Иванович", phone: "+7 (900) 123-45-67", company: "ООО «Ремстрой»",
  inn: "7707083893", kpp: "770701001", consentPdAt: new Date().toISOString(),
  addresses: [{ label: "Склад", city: "Ростов-на-Дону", line: "ул. Большая Садовая, 45", isDefault: true }],
});
process.exit(0);
