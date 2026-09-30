import { connection } from "next/server";
import { AccountAuthForm } from "@/components/account-auth-form";
import { yandexEnabled } from "@/lib/server/yandex";

export default async function RegisterPage() {
  await connection(); // флаг Яндекса — из env рантайма, не сборки
  return <AccountAuthForm yandexEnabled={yandexEnabled()} />;
}
