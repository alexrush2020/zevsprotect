import { AccountAuthForm } from "@/components/account-auth-form";
import { yandexConfig } from "@/lib/server/yandex";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  return (
    <AccountAuthForm
      yandexEnabled={yandexConfig() !== null}
      authError={typeof error === "string" ? error : undefined}
    />
  );
}
