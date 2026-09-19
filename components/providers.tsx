"use client";

import { ThemeProvider } from "next-themes";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/cookie-banner";
import { ManagerChatProvider } from "@/components/manager-chat/ManagerChatProvider";
import { ManagerChatLauncher } from "@/components/manager-chat/ManagerChatLauncher";
import { ManagerChatWindow } from "@/components/manager-chat/ManagerChatWindow";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <StoreProvider>
        <ManagerChatProvider>
          {children}
          <CookieBanner />
          <Toaster position="top-right" />
          <ManagerChatLauncher />
          <ManagerChatWindow />
        </ManagerChatProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
