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
} from "react";
import {
  migrateLegacyCart,
  migrateLegacyFavorites,
  normalizeCart,
  orderableItems,
  priceCart,
} from "@/lib/cart-pricing";
import { legacySlug } from "@/lib/legacy-product-ids";
import { cartLineKey } from "@/lib/lots";
import { snapOrderQty } from "@/lib/order-qty";
import type { CatalogCategory } from "@/lib/server/map";
import { toast } from "sonner";
import { logoutRequest, meRequest, updateRequest } from "@/lib/auth-client";
import { createOrder } from "@/lib/server/order-action";
import { track } from "@/lib/analytics";
import type { OrderInput, OrderResult } from "@/lib/server/orders";
import type {
  CartItem,
  Lead,
  Product,
  UserProfile,
} from "@/lib/types";

// v2: productId — slug товара Payload; ключи без версии — формат прототипа ("p-atlant"), мигрируются при чтении.
const CART_KEY = "zp-cart:v2";
const LEGACY_CART_KEY = "zp-cart";
const USER_KEY = "zp-user";
const LAST_USER_KEY = "zp-last-user";
const LEADS_KEY = "zp-leads";
const FAVORITES_KEY = "zp-favorites:v2";
const LEGACY_FAVORITES_KEY = "zp-favorites";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Значение v2-ключа или миграция старого ключа прототипа (старый ключ удаляется). */
function readVersioned(key: string, legacyKey: string, migrate: (raw: unknown) => unknown): unknown {
  try {
    if (localStorage.getItem(key) !== null) return readJson<unknown>(key, null);
    const migrated = migrate(readJson<unknown>(legacyKey, null));
    // сразу пишем v2: повторный запуск эффекта (StrictMode, вторая вкладка) не должен прочитать пустоту
    localStorage.setItem(key, JSON.stringify(migrated));
    localStorage.removeItem(legacyKey);
    return migrated;
  } catch {
    return null; // хранилище недоступно (приватный режим, квота) — начинаем с пустого
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

type Store = {
  cart: CartItem[];
  user: UserProfile | null;
  lastUser: UserProfile | null;
  ready: boolean;
  leads: Lead[];
  favoriteIds: string[];
  /** Товары каталога Payload (лёгкая проекция из layout); productId позиций — slug. */
  catalog: Product[];
  /** Категории каталога Payload (шапка, футер, меню). */
  categories: CatalogCategory[];
  getProduct: (slug: string) => Product | undefined;
  /** false — товара нет в каталоге, ничего не добавлено. */
  /** Доступные позиции корзины к оформлению (qty после приведения к упаковке). */
  orderable: CartItem[];
  addToCart: (productId: string, size: string, qty: number, coating?: string) => boolean;
  setQty: (productId: string, size: string, qty: number, coating?: string) => void;
  removeFromCart: (productId: string, size: string, coating?: string) => void;
  removeProductFromCart: (productId: string) => void;
  clearCart: () => void;
  register: (profile: UserProfile, password?: string) => boolean;
  logout: () => void | Promise<void>;
  updateProfile: (profile: UserProfile) => void;
  /** Заказ в Payload (server action): позиции — доступные строки корзины, цены считает сервер. Успех очищает корзину. */
  placeOrder: (input: Omit<OrderInput, "items">) => Promise<OrderResult>;
  addLead: (type: string, payload: Record<string, string>) => Lead;
  toggleFavorite: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;
  cartCount: number;
  /** Сумма доступных позиций по ценам каталога, НДС внутри. */
  cartTotal: number;
};

const StoreContext = createContext<Store | null>(null);

/** Запись в localStorage без падения (приватный режим, квота); null — удалить ключ. */
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // корзина останется в памяти до перезагрузки
  }
}

export function StoreProvider({
  children,
  catalog,
  categories,
}: {
  children: ReactNode;
  catalog: Product[];
  categories: CatalogCategory[];
}) {
  const bySlug = useMemo(() => new Map(catalog.map((p) => [p.slug, p])), [catalog]);
  const getProduct = useCallback((slug: string) => bySlug.get(slug), [bySlug]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lastUser, setLastUser] = useState<UserProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextCart = normalizeCart(readVersioned(CART_KEY, LEGACY_CART_KEY, migrateLegacyCart), catalog);
    const nextUser = readJson<UserProfile | null>(USER_KEY, null);
    const nextLastUser =
      readJson<UserProfile | null>(LAST_USER_KEY, null);
    const nextLeads = readJson<Lead[]>(LEADS_KEY, []);
    const nextFavorites = readVersioned(FAVORITES_KEY, LEGACY_FAVORITES_KEY, migrateLegacyFavorites);
    /* eslint-disable react-hooks/set-state-in-effect -- гидратация из localStorage только на клиенте (SSR-безопасно) */
    setCart(nextCart);
    setUser(nextUser);
    setLastUser(nextLastUser);
    setLeads(nextLeads);
    setFavoriteIds(
      Array.isArray(nextFavorites) ? nextFavorites.filter((id): id is string => typeof id === "string") : [],
    );
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // серверная сессия Payload — источник истины для реальных аккаунтов
    void meRequest().then((me) => {
      if (me) {
        confirmedRef.current = me;
        setUser(me);
      }
      else setUser((cur) => (cur?.authProvider === "password" ? null : cur));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- гидратация один раз; каталог из layout стабилен
  }, []);

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user && user.authProvider !== "password") setLastUser(user);
  }

  useEffect(() => {
    if (!ready) return;
    writeStorage(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    if (!ready) return;
    if (user) {
      writeStorage(USER_KEY, JSON.stringify(user));
      if (user.authProvider !== "password") {
        writeStorage(LAST_USER_KEY, JSON.stringify(user));
      }
    } else {
      writeStorage(USER_KEY, null);
    }
  }, [user, ready]);

  useEffect(() => {
    if (!ready) return;
    if (lastUser) writeStorage(LAST_USER_KEY, JSON.stringify(lastUser));
  }, [lastUser, ready]);

  useEffect(() => {
    if (!ready) return;
    writeStorage(LEADS_KEY, JSON.stringify(leads));
  }, [leads, ready]);

  useEffect(() => {
    if (!ready) return;
    writeStorage(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds, ready]);

  const addToCart = useCallback((productId: string, size: string, qty: number, coating?: string) => {
    const product = bySlug.get(productId);
    if (!product) return false;
    const snapped = snapOrderQty(qty, product);
    setCart((prev) => {
      const i = prev.findIndex((x) => cartLineKey(x) === cartLineKey({ productId, size, coating }));
      if (i === -1) return [...prev, { productId, size, coating, qty: snapped }];
      const copy = [...prev];
      copy[i] = {
        ...copy[i],
        qty: snapOrderQty(copy[i].qty + snapped, product),
      };
      return copy;
    });
    track("add_to_cart", { slug: productId, qty: snapped });
    return true;
  }, [bySlug]);

  const setQty = useCallback((productId: string, size: string, qty: number, coating?: string) => {
    const product = bySlug.get(productId);
    if (!product) return;
    const snapped = snapOrderQty(qty, product, { allowZero: true });
    setCart((prev) => {
      const i = prev.findIndex((x) => cartLineKey(x) === cartLineKey({ productId, size, coating }));
      if (!snapped) {
        return i === -1 ? prev : prev.filter((_, idx) => idx !== i);
      }
      const next: CartItem = { productId, size, coating, qty: snapped };
      if (i === -1) return [...prev, next];
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
  }, [bySlug]);

  const removeFromCart = useCallback((productId: string, size: string, coating?: string) => {
    setCart((prev) =>
      prev.filter((x) => cartLineKey(x) !== cartLineKey({ productId, size, coating })),
    );
  }, []);

  const removeProductFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const enterAccount = useCallback((profile: UserProfile) => {
    setUser(profile);
    setLastUser(profile);
  }, []);

  const register = useCallback(
    (profile: UserProfile, password?: string) => {
      if (password !== undefined && !password.trim()) return false;
      if (!profile.email && !profile.phone) return false;
      enterAccount(profile);
      return true;
    },
    [enterAccount],
  );

  const logout = useCallback(async () => {
    if (user?.authProvider === "password") {
      try {
        await logoutRequest();
      } catch {
        toast.error("Не удалось выйти. Попробуйте ещё раз.");
        return;
      }
    }
    setUser((current) => {
      if (current && current.authProvider !== "password") setLastUser(current);
      return null;
    });
  }, [user?.authProvider]);

  const confirmedRef = useRef<UserProfile | null>(null);
  const saveSeqRef = useRef(0);
  const updateProfile = useCallback(
    (profile: UserProfile) => {
      const next = user ? { ...user, ...profile } : profile;
      setUser(next);
      if (next.authProvider === "password") {
        // источник истины — ответ Payload (email не меняется PATCH-ем профиля); отказ — откат к последнему
        // подтверждённому профилю. Две быстрые правки: состояние применяет только ответ последней.
        confirmedRef.current ??= user;
        const seq = ++saveSeqRef.current;
        updateRequest(next)
          .then((saved) => {
            if (saved) confirmedRef.current = saved;
            if (saved && seq === saveSeqRef.current) setUser(saved);
          })
          .catch((e: unknown) => {
            if (seq === saveSeqRef.current) setUser(confirmedRef.current);
            toast.error(`Не удалось сохранить профиль: ${e instanceof Error ? e.message : "ошибка сервера"}`);
          });
      }
    },
    [user],
  );

  const priced = useMemo(() => priceCart(cart, catalog), [cart, catalog]);
  const orderable = useMemo(() => orderableItems(priced.lines), [priced]);

  const placeOrder = useCallback(
    async (input: Omit<OrderInput, "items">): Promise<OrderResult> => {
      const res = await createOrder({ ...input, items: orderable }).catch(
        (): OrderResult => ({ ok: false, error: "Не удалось оформить заказ. Проверьте связь и попробуйте ещё раз." }),
      );
      if (res.ok) {
        setCart([]);
        // order_price/currency — доход цели в Метрике; сумма клиентская (сервер пересчитывает цену сам)
        track("order_success", { order_price: priced.goods, currency: "RUB", lines: orderable.length, payment: input.payment });
      }
      return res;
    },
    [orderable, priced.goods]
  );

  const addLead = useCallback((type: string, payload: Record<string, string>) => {
    const lead: Lead = {
      id: uid("LEAD"),
      createdAt: new Date().toISOString(),
      type,
      payload,
    };
    setLeads((prev) => [lead, ...prev]);
    return lead;
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    const added = !favoriteIds.includes(productId);
    setFavoriteIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
    return added;
  }, [favoriteIds]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds]
  );

  const cartCount = orderable.length;
  const cartTotal = priced.goods;

  const value = useMemo(
    () => ({
      catalog,
      categories,
      getProduct,
      orderable,
      cart,
      user,
      lastUser,
      ready,
      leads,
      favoriteIds,
      addToCart,
      setQty,
      removeFromCart,
      removeProductFromCart,
      clearCart,
      register,
      logout,
      updateProfile,
      placeOrder,
      addLead,
      toggleFavorite,
      isFavorite,
      cartCount,
      cartTotal,
    }),
    [
      catalog,
      categories,
      getProduct,
      orderable,
      cart,
      user,
      lastUser,
      ready,
      leads,
      favoriteIds,
      addToCart,
      setQty,
      removeFromCart,
      removeProductFromCart,
      clearCart,
      register,
      logout,
      updateProfile,
      placeOrder,
      addLead,
      toggleFavorite,
      isFavorite,
      cartCount,
      cartTotal,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
