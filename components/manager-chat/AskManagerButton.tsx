"use client";

import { useContext } from "react";
import { ManagerChatContext } from "@/components/manager-chat/ManagerChatProvider";
import {
  requestManagerChatAboutProduct,
  type ManagerChatProductRef,
} from "@/lib/manager-chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AskManagerButtonProps = {
  product: ManagerChatProductRef;
  className?: string;
  variant?: "card" | "card-dark" | "detail" | "cta";
  label?: string;
};

export function AskManagerButton({
  product,
  className,
  variant = "card",
  label,
}: AskManagerButtonProps) {
  const chat = useContext(ManagerChatContext);

  function handleClick() {
    if (chat) {
      chat.openAboutProduct(product);
      return;
    }
    requestManagerChatAboutProduct(product);
  }

  if (variant === "cta") {
    return (
      <Button className={cn("h-9 w-full bg-orange text-white hover:bg-orange-dk", className)} onClick={handleClick}>
        {label ?? "Уточнить"}
      </Button>
    );
  }

  if (variant === "detail") {
    return (
      <Button variant="ghost" className={cn("w-full", className)} onClick={handleClick}>
        {label ?? "Уточнить у менеджера"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex text-[11px] font-semibold tracking-wide text-orange transition-colors hover:text-orange-dk hover:underline",
        variant === "card-dark" && "text-orange hover:text-white",
        className,
      )}
    >
      {label ?? "Уточнить у менеджера →"}
    </button>
  );
}
