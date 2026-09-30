"use client";

import type { ReactNode } from "react";
import { AccountAuthForm } from "@/components/account-auth-form";
import { AccountShell } from "@/components/account/account-shell";
import { useStore } from "@/lib/store";

export function AccountGate({ children, yandexEnabled }: { children: ReactNode; yandexEnabled: boolean }) {
  const { user, ready, logout } = useStore();

  if (!ready) {
    return <div className="min-h-[40vh] bg-paper" />;
  }

  if (!user) {
    return <AccountAuthForm yandexEnabled={yandexEnabled} />;
  }

  return (
    <AccountShell user={user} logout={logout}>
      {children}
    </AccountShell>
  );
}
