"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";
import { ManagerChatProductCard } from "@/components/manager-chat/ManagerChatProductCard";
import { useManagerChat } from "@/components/manager-chat/ManagerChatProvider";
import { ManagerChatThreadRail } from "@/components/manager-chat/ManagerChatThreadRail";
import {
  managerChatChips,
  managerProfile,
  productMetaLine,
  shouldHideManagerChat,
} from "@/lib/manager-chat";

export function ManagerChatWindow() {
  const pathname = usePathname();
  const {
    isOpen,
    close,
    messages,
    sendText,
    sendChip,
    context,
    isManagerTyping,
    activeThread,
    setDraft,
  } = useManagerChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draft = activeThread?.draft ?? "";

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, activeThread?.id]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages, isManagerTyping]);

  if (!isOpen || shouldHideManagerChat(pathname)) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    sendText(draft);
  };

  return (
    <section
      className="manager-chat-window"
      role="dialog"
      aria-label="Чат с менеджером зевспротект"
      data-print-hide
    >
      <header className="manager-chat-header">
        <div className="manager-chat-header-main">
          <span className="manager-chat-avatar manager-chat-avatar--header" aria-hidden="true">
            {managerProfile.initials}
            <span className="manager-chat-online-dot" />
          </span>
          <span className="manager-chat-header-copy">
            <strong>{managerProfile.name}</strong>
            <span>
              <i className="manager-chat-status-dot" aria-hidden="true" /> онлайн ·{" "}
              {managerProfile.role}
            </span>
          </span>
          <button
            type="button"
            className="manager-chat-close"
            onClick={close}
            aria-label="Закрыть чат"
          >
            ×
          </button>
        </div>

        {context.kind === "pdp" ? (
          <Link className="manager-chat-context" href={`/product/${context.slug}`}>
            <span
              className="manager-chat-context-thumb"
              style={{ backgroundImage: `url("${context.image}")` }}
              aria-hidden="true"
            />
            <span className="manager-chat-context-copy">
              <strong>{context.title}</strong>
              <span>{productMetaLine(context)}</span>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </header>

      <div className="manager-chat-body">
        <ManagerChatThreadRail />
        <div className="manager-chat-main">
          <div className="manager-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                className={`manager-chat-message manager-chat-message--${message.role}${
                  message.productCard ? " manager-chat-message--product" : ""
                }`}
                key={message.id}
              >
                {message.productCard ? (
                  <ManagerChatProductCard product={message.productCard} />
                ) : (
                  message.text
                )}
              </div>
            ))}
            {isManagerTyping ? (
              <div className="manager-chat-typing">
                <span>Анна печатает</span>
                <i />
                <i />
                <i />
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="manager-chat-footer">
            <div className="manager-chat-chips" aria-label="Быстрые вопросы">
              {managerChatChips.map((chip) => (
                <button
                  type="button"
                  className="manager-chat-chip"
                  key={chip.id}
                  onClick={() => sendChip(chip.id)}
                  disabled={isManagerTyping}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <form className="manager-chat-composer" onSubmit={submit}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Напишите сообщение…"
                aria-label="Сообщение менеджеру"
              />
              <button type="submit" aria-label="Отправить сообщение" disabled={!draft.trim()}>
                →
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
