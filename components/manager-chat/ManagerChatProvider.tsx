"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { resolveManagerChatContext } from "@/lib/manager-chat-context";
import {
  buildClarifyMessage,
  buildWelcomeMessage,
  contextFromProduct,
  MANAGER_CHAT_REPLY_DELAY_MS,
  managerChatChips,
  registerManagerChatProductOpener,
  resolveManagerReply,
  type ManagerChatChipId,
  type ManagerChatContext,
  type ManagerChatProductRef,
} from "@/lib/manager-chat";
import {
  closeThread as closeThreadState,
  createExtraGeneralThread,
  createProductThread,
  displayedContext,
  ensurePinned,
  findProductThread,
  PINNED_THREAD_ID,
  type ManagerChatThread,
  type ManagerChatThreadMessage,
} from "@/lib/manager-chat-threads";

export type ManagerChatMessage = ManagerChatThreadMessage;

type ManagerChatContextValue = {
  isOpen: boolean;
  open: () => void;
  openAboutProduct: (product: ManagerChatProductRef) => void;
  close: () => void;
  messages: ManagerChatMessage[];
  sendText: (text: string) => void;
  sendChip: (chipId: string) => void;
  context: ManagerChatContext;
  isManagerTyping: boolean;
  launcherButtonRef: RefObject<HTMLButtonElement | null>;
  threads: ManagerChatThread[];
  activeThreadId: string;
  activeThread: ManagerChatThread | null;
  selectThread: (id: string) => void;
  addGeneralThread: () => void;
  closeThread: (id: string) => void;
  setDraft: (text: string) => void;
};

const ManagerChatReactContext = createContext<ManagerChatContextValue | null>(null);

export { ManagerChatReactContext as ManagerChatContext };

export function useManagerChat() {
  const value = useContext(ManagerChatReactContext);
  if (!value) throw new Error("useManagerChat must be used within ManagerChatProvider");
  return value;
}

export function ManagerChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<ManagerChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState(PINNED_THREAD_ID);
  const messageSequence = useRef(0);
  const replyTimeouts = useRef(new Set<ReturnType<typeof setTimeout>>());
  const pendingByThread = useRef(new Map<string, number>());
  const threadsRef = useRef(threads);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const routeContext = useMemo(() => resolveManagerChatContext(pathname), [pathname]);

  const makeMessage = useCallback(
    (
      role: ManagerChatMessage["role"],
      text: string,
      productCard?: ManagerChatProductRef,
    ): ManagerChatMessage => ({
      id: `manager-chat-${++messageSequence.current}`,
      role,
      text,
      productCard,
      createdAt: Date.now(),
    }),
    [],
  );

  const withPinnedWelcome = useCallback(
    (current: ManagerChatThread[]) => {
      const withPinned = ensurePinned(current);
      return withPinned.map((thread) => {
        if (!thread.pinned || thread.messages.length > 0) return thread;
        const context = displayedContext(thread, resolveManagerChatContext(pathname));
        return {
          ...thread,
          messages: [makeMessage("manager", buildWelcomeMessage(context))],
        };
      });
    },
    [pathname, makeMessage],
  );

  const scheduleReply = useCallback(
    (
      threadId: string,
      text: string,
      chipId: ManagerChatChipId | undefined,
      replyContext: ManagerChatContext,
    ) => {
      pendingByThread.current.set(threadId, (pendingByThread.current.get(threadId) ?? 0) + 1);
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId ? { ...thread, isManagerTyping: true } : thread,
        ),
      );
      const timeout = setTimeout(() => {
        const remaining = (pendingByThread.current.get(threadId) ?? 1) - 1;
        pendingByThread.current.set(threadId, remaining);
        setThreads((current) =>
          current.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: [
                    ...thread.messages,
                    makeMessage("manager", resolveManagerReply({ text, chipId }, replyContext)),
                  ],
                  isManagerTyping: remaining > 0,
                }
              : thread,
          ),
        );
        replyTimeouts.current.delete(timeout);
      }, MANAGER_CHAT_REPLY_DELAY_MS);
      replyTimeouts.current.add(timeout);
    },
    [makeMessage],
  );

  const open = useCallback(() => {
    const next = withPinnedWelcome(threadsRef.current);
    setThreads(next);
    if (!next.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(PINNED_THREAD_ID);
    }
    setIsOpen(true);
  }, [withPinnedWelcome, activeThreadId]);

  const openAboutProduct = useCallback(
    (product: ManagerChatProductRef) => {
      const next = withPinnedWelcome(threadsRef.current);
      const existing = findProductThread(next, product.slug);
      if (existing) {
        setThreads(next);
        setActiveThreadId(existing.id);
        setIsOpen(true);
        return;
      }

      const created = createProductThread(product);
      const productContext = contextFromProduct(product);
      const clarify = buildClarifyMessage(product);
      const seeded: ManagerChatThread = {
        ...created,
        messages: [
          makeMessage("manager", buildWelcomeMessage(productContext)),
          makeMessage("guest", clarify, product),
        ],
      };
      setThreads([...next, seeded]);
      setActiveThreadId(seeded.id);
      setIsOpen(true);
      scheduleReply(seeded.id, clarify, undefined, productContext);
    },
    [withPinnedWelcome, makeMessage, scheduleReply],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => launcherButtonRef.current?.focus());
  }, []);

  const selectThread = useCallback((id: string) => {
    setActiveThreadId(id);
  }, []);

  const addGeneralThread = useCallback(() => {
    const next = withPinnedWelcome(threadsRef.current);
    const extra = createExtraGeneralThread(next);
    const seeded: ManagerChatThread = {
      ...extra,
      messages: [makeMessage("manager", buildWelcomeMessage({ kind: "none" }))],
    };
    setThreads([...next, seeded]);
    setActiveThreadId(seeded.id);
    setIsOpen(true);
  }, [withPinnedWelcome, makeMessage]);

  const closeThread = useCallback(
    (id: string) => {
      const result = closeThreadState(threadsRef.current, id, activeThreadId);
      setThreads(result.threads);
      setActiveThreadId(result.activeId);
    },
    [activeThreadId],
  );

  const setDraft = useCallback(
    (text: string) => {
      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeThreadId ? { ...thread, draft: text } : thread,
        ),
      );
    },
    [activeThreadId],
  );

  const send = useCallback(
    (text: string, chipId?: ManagerChatChipId) => {
      const normalized = text.trim();
      if (!normalized) return;
      const threadId = activeThreadId;
      const thread = threadsRef.current.find((item) => item.id === threadId);
      if (!thread) return;

      const replyContext = displayedContext(thread, routeContext);

      setThreads((current) =>
        current.map((item) =>
          item.id === threadId
            ? {
                ...item,
                messages: [...item.messages, makeMessage("guest", normalized)],
                draft: "",
              }
            : item,
        ),
      );
      scheduleReply(threadId, normalized, chipId, replyContext);
    },
    [activeThreadId, makeMessage, scheduleReply, routeContext],
  );

  const sendText = useCallback((text: string) => send(text), [send]);
  const sendChip = useCallback(
    (chipId: string) => {
      const chip = managerChatChips.find((item) => item.id === chipId);
      if (chip) send(chip.label, chip.id);
    },
    [send],
  );

  useEffect(
    () => () => {
      replyTimeouts.current.forEach(clearTimeout);
      replyTimeouts.current.clear();
    },
    [],
  );

  useEffect(() => registerManagerChatProductOpener(openAboutProduct), [openAboutProduct]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0] ?? null;
  const context = activeThread ? displayedContext(activeThread, routeContext) : routeContext;
  const isManagerTyping = activeThread?.isManagerTyping ?? false;

  const value = useMemo<ManagerChatContextValue>(
    () => ({
      isOpen,
      open,
      openAboutProduct,
      close,
      messages: activeThread?.messages ?? [],
      sendText,
      sendChip,
      context,
      isManagerTyping,
      launcherButtonRef,
      threads,
      activeThreadId: activeThread?.id ?? activeThreadId,
      activeThread,
      selectThread,
      addGeneralThread,
      closeThread,
      setDraft,
    }),
    [
      isOpen,
      open,
      openAboutProduct,
      close,
      sendText,
      sendChip,
      context,
      isManagerTyping,
      threads,
      activeThread,
      activeThreadId,
      selectThread,
      addGeneralThread,
      closeThread,
      setDraft,
    ],
  );

  return (
    <ManagerChatReactContext.Provider value={value}>{children}</ManagerChatReactContext.Provider>
  );
}
