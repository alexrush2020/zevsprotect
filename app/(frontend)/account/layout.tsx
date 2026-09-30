import type { ReactNode } from "react";
import { connection } from "next/server";
import { AccountGate } from "@/components/account/account-gate";
import { yandexEnabled } from "@/lib/server/yandex";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await connection(); // флаг Яндекса — из env рантайма, не сборки
  return <AccountGate yandexEnabled={yandexEnabled()}>{children}</AccountGate>;
}
