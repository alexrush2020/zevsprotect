"use client";

import { useManagerChat } from "@/components/manager-chat/ManagerChatProvider";
import type { ManagerChatThread } from "@/lib/manager-chat-threads";

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="manager-chat-rail-bubble" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 4.5h12A3.5 3.5 0 0 1 21.5 8v7A3.5 3.5 0 0 1 18 18.5h-4.15L12 21.2 10.15 18.5H6A3.5 3.5 0 0 1 2.5 15V8A3.5 3.5 0 0 1 6 4.5Z"
      />
    </svg>
  );
}

function extraChatBadge(thread: ManagerChatThread): string | null {
  if (thread.kind !== "general" || thread.pinned) return null;
  const match = /^Чат (\d+)$/.exec(thread.title);
  return match?.[1] ?? null;
}

export function ManagerChatThreadRail() {
  const { threads, activeThreadId, selectThread, addGeneralThread, closeThread } = useManagerChat();

  return (
    <aside className="manager-chat-rail">
      <div className="manager-chat-rail-scroll">
        <div className="manager-chat-rail-tabs" role="tablist" aria-label="Чаты с менеджером">
          {threads.map((thread) => {
            const active = thread.id === activeThreadId;
            const badge = extraChatBadge(thread);
            const closable = !thread.pinned && threads.length > 1;
            return (
              <div
                className={`manager-chat-rail-slot${active ? " manager-chat-rail-slot--active" : ""}`}
                key={thread.id}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={thread.title}
                  title={thread.title}
                  className={`manager-chat-rail-item${
                    active ? " manager-chat-rail-item--active" : ""
                  }${thread.kind === "product" ? " manager-chat-rail-item--product" : ""}`}
                  onClick={() => selectThread(thread.id)}
                >
                  {thread.kind === "product" && thread.product ? (
                    <span
                      className="manager-chat-rail-thumb"
                      style={{ backgroundImage: `url("${thread.product.image}")` }}
                    />
                  ) : (
                    <ChatBubbleIcon />
                  )}
                  {badge ? <span className="manager-chat-rail-badge">{badge}</span> : null}
                </button>
                {closable ? (
                  <button
                    type="button"
                    className="manager-chat-rail-close"
                    aria-label={`Закрыть ${thread.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      closeThread(thread.id);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        className="manager-chat-rail-add"
        onClick={addGeneralThread}
        aria-label="Новый чат"
        title="Новый чат"
      >
        +
      </button>
    </aside>
  );
}
