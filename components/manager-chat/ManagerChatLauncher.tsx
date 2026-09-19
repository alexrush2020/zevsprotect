"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useManagerChat } from "@/components/manager-chat/ManagerChatProvider";
import { managerProfile, shouldHideManagerChat } from "@/lib/manager-chat";

export function ManagerChatLauncher() {
  const pathname = usePathname();
  const { isOpen, open, launcherButtonRef } = useManagerChat();

  if (shouldHideManagerChat(pathname)) return null;

  return (
    <button
      ref={launcherButtonRef}
      type="button"
      className="manager-chat-launcher"
      onClick={open}
      aria-label="Написать менеджеру"
      hidden={isOpen}
      data-print-hide
    >
      <span className="manager-chat-avatar" aria-hidden="true">
        <MessageCircle className="manager-chat-avatar-icon" strokeWidth={2.2} />
        <span className="manager-chat-online-dot" />
      </span>
      <span className="manager-chat-launcher-copy">
        <strong>
          {managerProfile.name} · {managerProfile.role}
        </strong>
        <span>Обычно отвечаем за 1–2 мин</span>
        <span className="manager-chat-launcher-cta">Написать →</span>
      </span>
    </button>
  );
}
