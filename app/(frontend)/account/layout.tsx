"use client";

import type { ReactNode } from "react";
import { AccountAuthForm } from "@/components/account-auth-form";
import { AccountShell } from "@/components/account/account-shell";
import { useStore } from "@/lib/store";

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useStore();

  if (!ready) {
    return <div className="min-h-[40vh] bg-paper" />;
  }

  if (!user) {
    return <AccountAuthForm />;
  }

  return (
    <AccountShell user={user} logout={logout}>
      {children}
    </AccountShell>
  );
}
