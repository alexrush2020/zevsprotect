"use client";

import { ThemeProvider } from "next-themes";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/cookie-banner";
import { FloatingMessengers } from "@/components/messengers";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <StoreProvider>
        {children}
        <CookieBanner />
        <FloatingMessengers />
        <Toaster position="top-right" />
      </StoreProvider>
    </ThemeProvider>
  );
}
