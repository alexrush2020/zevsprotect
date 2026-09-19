import {
  contextFromProduct,
  type ManagerChatContext,
  type ManagerChatProductRef,
} from "@/lib/manager-chat";

export const PINNED_CHAT_TITLE = "Чат";
export const PINNED_THREAD_ID = "thread-pinned";

export type ManagerChatThreadMessage = {
  id: string;
  role: "manager" | "guest";
  text: string;
  createdAt: number;
  productCard?: ManagerChatProductRef;
};

export type ManagerChatThread = {
  id: string;
  kind: "general" | "product";
  title: string;
  pinned: boolean;
  product?: ManagerChatProductRef;
  frozenContext: ManagerChatContext;
  followRoute: boolean;
  messages: ManagerChatThreadMessage[];
  draft: string;
  isManagerTyping: boolean;
};

function emptyThreadFields(): Pick<
  ManagerChatThread,
  "messages" | "draft" | "isManagerTyping"
> {
  return { messages: [], draft: "", isManagerTyping: false };
}

export function createPinnedGeneralThread(): ManagerChatThread {
  return {
    id: PINNED_THREAD_ID,
    kind: "general",
    title: PINNED_CHAT_TITLE,
    pinned: true,
    frozenContext: { kind: "none" },
    followRoute: true,
    ...emptyThreadFields(),
  };
}

function generalIndex(title: string): number | null {
  if (title === PINNED_CHAT_TITLE) return 1;
  const match = /^Чат (\d+)$/.exec(title);
  if (!match?.[1]) return null;
  return Number(match[1]);
}

export function nextGeneralTitle(threads: ManagerChatThread[]): string {
  const used = new Set(
    threads
      .filter((thread) => thread.kind === "general")
      .map((thread) => generalIndex(thread.title))
      .filter((index): index is number => index != null),
  );
  let index = 2;
  while (used.has(index)) index += 1;
  return `Чат ${index}`;
}

export function createExtraGeneralThread(threads: ManagerChatThread[]): ManagerChatThread {
  const title = nextGeneralTitle(threads);
  const index = generalIndex(title) ?? 2;
  return {
    id: `thread-general-${index}`,
    kind: "general",
    title,
    pinned: false,
    frozenContext: { kind: "none" },
    followRoute: false,
    ...emptyThreadFields(),
  };
}

export function createProductThread(product: ManagerChatProductRef): ManagerChatThread {
  return {
    id: `thread-product-${product.slug}`,
    kind: "product",
    title: product.title,
    pinned: false,
    product,
    frozenContext: contextFromProduct(product),
    followRoute: false,
    ...emptyThreadFields(),
  };
}

export function findProductThread(
  threads: ManagerChatThread[],
  slug: string,
): ManagerChatThread | undefined {
  return threads.find((thread) => thread.kind === "product" && thread.product?.slug === slug);
}

export function displayedContext(
  thread: ManagerChatThread,
  routeContext: ManagerChatContext,
): ManagerChatContext {
  return thread.followRoute ? routeContext : thread.frozenContext;
}

export function ensurePinned(threads: ManagerChatThread[]): ManagerChatThread[] {
  if (threads.some((thread) => thread.pinned)) return threads;
  return [createPinnedGeneralThread(), ...threads];
}

export function closeThread(
  threads: ManagerChatThread[],
  id: string,
  activeId: string,
): { threads: ManagerChatThread[]; activeId: string } {
  const target = threads.find((thread) => thread.id === id);
  if (!target || target.pinned || threads.length <= 1) {
    return { threads, activeId };
  }

  const index = threads.findIndex((thread) => thread.id === id);
  const nextThreads = threads.filter((thread) => thread.id !== id);
  if (activeId !== id) {
    return { threads: nextThreads, activeId };
  }

  const neighbor = nextThreads[Math.max(0, index - 1)] ?? nextThreads[0];
  return { threads: nextThreads, activeId: neighbor?.id ?? activeId };
}
