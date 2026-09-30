import { AccountAuthForm } from "@/components/account-auth-form";
import { yandexEnabled } from "@/lib/server/yandex";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  return (
    <AccountAuthForm
      yandexEnabled={yandexEnabled()}
      authError={typeof error === "string" ? error : undefined}
    />
  );
}
