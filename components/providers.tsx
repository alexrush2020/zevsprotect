"use client";

import { ThemeProvider } from "next-themes";
import { StoreProvider } from "@/lib/store";
import type { CatalogCategory } from "@/lib/server/map";
import type { Product } from "@/lib/types";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/cookie-banner";
import { BackToTopGlove } from "@/components/home/back-to-top-glove";
import { ManagerChatProvider } from "@/components/manager-chat/ManagerChatProvider";
import { ManagerChatLauncher } from "@/components/manager-chat/ManagerChatLauncher";
import { ManagerChatWindow } from "@/components/manager-chat/ManagerChatWindow";

export function Providers({
  children,
  catalog,
  categories,
}: {
  children: React.ReactNode;
  catalog: Product[];
  categories: CatalogCategory[];
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <StoreProvider catalog={catalog} categories={categories}>
        <ManagerChatProvider>
          {children}
          <CookieBanner />
          <Toaster position="top-right" />
          <div className="site-fab-dock" data-print-hide>
            <BackToTopGlove />
            <ManagerChatLauncher />
            <ManagerChatWindow />
          </div>
        </ManagerChatProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
