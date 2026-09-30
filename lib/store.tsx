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
import { demoAccount, yandexStubAccount } from "@/lib/demo-account";
import { toast } from "sonner";
import { logoutRequest, meRequest, updateRequest } from "@/lib/auth-client";
import { createOrder } from "@/lib/server/order-action";
import type { OrderInput, OrderResult } from "@/lib/server/orders";
import type {
  CartItem,
  Lead,
  Order,
  Product,
  UserProfile,
} from "@/lib/types";

// v2: productId — slug товара Payload; ключи без версии — формат прототипа ("p-atlant"), мигрируются при чтении.
const CART_KEY = "zp-cart:v2";
const LEGACY_CART_KEY = "zp-cart";
const USER_KEY = "zp-user";
const LAST_USER_KEY = "zp-last-user";
const ORDERS_KEY = "zp-orders";
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
  orders: Order[];
  leads: Lead[];
  favoriteIds: string[];
  /** Товары каталога Payload (лёгкая проекция из layout); productId позиций — slug. */
  catalog: Product[];
  getProduct: (slug: string) => Product | undefined;
  /** false — товара нет в каталоге, ничего не добавлено. */
  /** Доступные позиции корзины к оформлению (qty после приведения к упаковке). */
  orderable: CartItem[];
  addToCart: (productId: string, size: string, qty: number, coating?: string) => boolean;
  setQty: (productId: string, size: string, qty: number, coating?: string) => void;
  removeFromCart: (productId: string, size: string, coating?: string) => void;
  removeProductFromCart: (productId: string) => void;
  clearCart: () => void;
  login: (email: string, password: string) => boolean;
  register: (profile: UserProfile, password?: string) => boolean;
  loginYandex: () => boolean;
  loginDemo: () => boolean;
  resumeSession: () => boolean;
  logout: () => void | Promise<void>;
  updateProfile: (profile: UserProfile) => void;
  /** Заказ в Payload (server action): позиции — доступные строки корзины, цены считает сервер. Успех очищает корзину. */
  placeOrder: (input: Omit<OrderInput, "items">) => Promise<OrderResult>;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  addLead: (type: string, payload: Record<string, string>) => Lead;
  toggleFavorite: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;
  cartCount: number;
  /** Сумма доступных позиций по ценам каталога, НДС внутри. */
  cartTotal: number;
};

const StoreContext = createContext<Store | null>(null);

function seedGuestOrders(): Order[] {
  return [
    {
      id: "ZP-10990",
      createdAt: "2026-09-12T11:20:00.000Z",
      items: [{ productId: "atlant", size: "L", qty: 50 }],
      profile: {
        email: "gost@example.ru",
        name: "Алексей Гость",
        phone: "+7 (863) 111-22-33",
        company: "",
        inn: "",
        kpp: "",
        address: "г. Краснодар, ул. Красная, 10",
      },
      comment: "Гостевой заказ для проверки трека.",
      payment: "invoice_auto",
      paymentStatus: "invoiced",
      status: "shipped",
      total: 28.9 * 50 + 640,
      guest: true,
      city: "Краснодар",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 640,
    },
  ];
}

function sortOrders(orders: Order[]) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeSeedOrders(existing: Order[]) {
  const ids = new Set(existing.map((o) => o.id));
  const extra = seedOrders().filter((o) => !ids.has(o.id));
  if (!existing.length) return seedOrders();
  return extra.length ? sortOrders([...existing, ...extra]) : sortOrders(existing);
}

function seedOrders(): Order[] {
  return sortOrders([
    {
      id: "ZP-10588",
      createdAt: "2026-09-17T09:10:00.000Z",
      items: [
        { productId: "antiporez-pu-1-2", size: "XL", qty: 80 },
        { productId: "hvat-hb-rl-1-2", size: "L", qty: 200 },
      ],
      profile: demoAccount,
      comment: "На склад Ростов, XL для резки арматуры.",
      payment: "invoice_manager",
      paymentStatus: "invoiced",
      status: "accepted",
      total: 96 * 80 + 39 * 200 + 1280,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 1280,
    },
    {
      id: "ZP-10562",
      createdAt: "2026-09-15T14:05:00.000Z",
      items: [{ productId: "feniks", size: "XL", qty: 40 }],
      profile: demoAccount,
      comment: "Жар на объекте Таганрог, самовывоз.",
      payment: "invoice_auto",
      paymentStatus: "invoiced",
      status: "accepted",
      total: 710 * 40,
      guest: false,
      city: "Таганрог",
      carrier: "pickup",
      carrierName: "Самовывоз, Таганрог",
      deliveryCost: 0,
    },
    {
      id: "ZP-10540",
      createdAt: "2026-09-11T07:50:00.000Z",
      items: [{ productId: "zevs-trk-lyuks", size: "L", qty: 60 }],
      profile: demoAccount,
      comment: "Сварка, Волгоград. Декларацию вложить в короб.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "shipped",
      total: 310 * 60 + 2180,
      guest: false,
      city: "Волгоград",
      carrier: "dl",
      carrierName: "Деловые линии",
      deliveryCost: 2180,
    },
    {
      id: "ZP-10501",
      createdAt: "2026-09-08T08:40:00.000Z",
      items: [{ productId: "zevs-shchit-sk", size: "L", qty: 100 }],
      profile: demoAccount,
      comment: "",
      payment: "invoice_manager",
      paymentStatus: "invoiced",
      status: "picking",
      total: 64 * 100,
      guest: false,
      city: "Таганрог",
      carrier: "pickup",
      carrierName: "Самовывоз, Таганрог",
      deliveryCost: 0,
    },
    {
      id: "ZP-10520",
      createdAt: "2026-09-05T11:25:00.000Z",
      items: [
        { productId: "frostlyuks-vl-3-4", size: "L", qty: 80 },
        { productId: "frost-flis", size: "XL", qty: 40 },
      ],
      profile: demoAccount,
      comment: "Холод, ночная смена. Нужны XL отдельно подписать.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivery",
      total: 104 * 80 + 115 * 40 + 1460,
      guest: false,
      city: "Краснодар",
      carrier: "energy",
      carrierName: "Энергия",
      deliveryCost: 1460,
    },
    {
      id: "ZP-10480",
      createdAt: "2026-08-28T13:00:00.000Z",
      items: [{ productId: "oilresist-maks", size: "L", qty: 150 }],
      profile: demoAccount,
      comment: "МБС на площадку Воронеж.",
      payment: "invoice_manager",
      paymentStatus: "paid",
      status: "delivered",
      total: 78 * 150 + 980,
      guest: false,
      city: "Воронеж",
      carrier: "pek",
      carrierName: "ПЭК",
      deliveryCost: 980,
    },
    {
      id: "ZP-10428",
      createdAt: "2026-08-21T10:15:00.000Z",
      items: [
        { productId: "atlant", size: "L", qty: 200 },
        { productId: "frost-strong-vl-3-4", size: "L", qty: 40 },
      ],
      profile: demoAccount,
      comment: "Отгрузка на склад Ростов, нужны сертификаты в комплекте.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 28.9 * 200 + 89 * 40 + 890,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 890,
    },
    {
      id: "ZP-10450",
      createdAt: "2026-08-14T09:40:00.000Z",
      items: [
        { productId: "malahit", size: "L", qty: 250 },
        { productId: "profi-vl-3-4", size: "L", qty: 100 },
      ],
      profile: demoAccount,
      comment: "",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 42 * 250 + 48 * 100 + 1100,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 1100,
    },
    {
      id: "ZP-10402",
      createdAt: "2026-08-04T16:20:00.000Z",
      items: [{ productId: "universal", size: "L", qty: 500 }],
      profile: demoAccount,
      comment: "Отменили: позиция ушла в другую заявку.",
      payment: "online",
      paymentStatus: "failed",
      status: "cancelled",
      total: 19.2 * 500,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 0,
    },
    {
      id: "ZP-10390",
      createdAt: "2026-07-22T08:15:00.000Z",
      items: [
        { productId: "optima", size: "L", qty: 1000 },
        { productId: "standart", size: "L", qty: 400 },
      ],
      profile: demoAccount,
      comment: "Расходники на сезон, склад Ростов.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 18.4 * 1000 + 21.5 * 400 + 1680,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 1680,
    },
    {
      id: "ZP-10355",
      createdAt: "2026-06-18T10:00:00.000Z",
      items: [
        { productId: "zevs-sb", size: "L", qty: 40 },
        { productId: "zevs-drv", size: "L", qty: 30 },
      ],
      profile: demoAccount,
      comment: "Сварочный участок, самовывоз.",
      payment: "invoice_manager",
      paymentStatus: "paid",
      status: "delivered",
      total: 420 * 40 + 265 * 30,
      guest: false,
      city: "Таганрог",
      carrier: "pickup",
      carrierName: "Самовывоз, Таганрог",
      deliveryCost: 0,
    },
    {
      id: "ZP-10012",
      createdAt: "2025-12-11T12:30:00.000Z",
      items: [
        { productId: "atlant", size: "L", qty: 300 },
        { productId: "ruk-dv-br", size: "L", qty: 80 },
      ],
      profile: demoAccount,
      comment: "Первая партия на склад Ростов.",
      payment: "invoice_auto",
      paymentStatus: "paid",
      status: "delivered",
      total: 28.9 * 300 + 72 * 80 + 820,
      guest: false,
      city: "Ростов-на-Дону",
      carrier: "cdek",
      carrierName: "СДЭК",
      deliveryCost: 820,
    },
  ]);
}

/** Запись в localStorage без падения (приватный режим, квота); null — удалить ключ. */
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // корзина останется в памяти до перезагрузки
  }
}

export function StoreProvider({ children, catalog }: { children: ReactNode; catalog: Product[] }) {
  const bySlug = useMemo(() => new Map(catalog.map((p) => [p.slug, p])), [catalog]);
  const getProduct = useCallback((slug: string) => bySlug.get(slug), [bySlug]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lastUser, setLastUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextCart = normalizeCart(readVersioned(CART_KEY, LEGACY_CART_KEY, migrateLegacyCart), catalog);
    const nextUser = readJson<UserProfile | null>(USER_KEY, null);
    const nextLastUser =
      readJson<UserProfile | null>(LAST_USER_KEY, null) ?? demoAccount;
    // история заказов: старые id → slug (идемпотентно), неизвестные оставляем как есть
    const storedOrders = readJson<unknown>(ORDERS_KEY, []);
    const nextOrders = (Array.isArray(storedOrders) ? (storedOrders as Order[]) : [])
      .filter((o) => o && typeof o === "object" && Array.isArray(o.items)) // битый заказ пропускаем
      .map((o) => ({
        ...o,
        items: o.items.map((i) => ({ ...i, productId: legacySlug(i?.productId) ?? i?.productId })),
      }));
    const nextLeads = readJson<Lead[]>(LEADS_KEY, []);
    const nextFavorites = readVersioned(FAVORITES_KEY, LEGACY_FAVORITES_KEY, migrateLegacyFavorites);
    /* eslint-disable react-hooks/set-state-in-effect -- гидратация из localStorage только на клиенте (SSR-безопасно) */
    setCart(nextCart);
    setUser(nextUser);
    setLastUser(nextLastUser);
    setOrders(
      nextOrders.length
        ? nextUser?.email === demoAccount.email
          ? mergeSeedOrders(nextOrders)
          : nextOrders
        : nextUser
          ? seedOrders()
          : seedGuestOrders(),
    );
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
    writeStorage(ORDERS_KEY, JSON.stringify(orders));
  }, [orders, ready]);

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

  const attachDemoOrders = useCallback(() => {
    setOrders((prev) => mergeSeedOrders(prev));
  }, []);

  const enterAccount = useCallback(
    (profile: UserProfile, withDemoOrders = false) => {
      setUser(profile);
      setLastUser(profile);
      if (withDemoOrders || profile.email === demoAccount.email) {
        attachDemoOrders();
        setFavoriteIds((prev) =>
          prev.length ? prev : ["atlant", "feniks", "zevs-shchit-sk"],
        );
      }
    },
    [attachDemoOrders],
  );

  const login = useCallback(
    (email: string, password: string) => {
      if (!password.trim()) return false;
      const existing = readJson<UserProfile | null>(USER_KEY, null);
      const remembered = readJson<UserProfile | null>(LAST_USER_KEY, null);
      const profile =
        existing && existing.email === email
          ? existing
          : remembered && remembered.email === email
            ? remembered
            : email === demoAccount.email
              ? demoAccount
              : { ...demoAccount, email };
      enterAccount(profile, profile.email === demoAccount.email);
      return true;
    },
    [enterAccount],
  );

  const register = useCallback(
    (profile: UserProfile, password?: string) => {
      if (password !== undefined && !password.trim()) return false;
      if (!profile.email && !profile.phone) return false;
      enterAccount(profile, false);
      return true;
    },
    [enterAccount],
  );

  const loginYandex = useCallback(() => {
    const remembered = lastUser?.authProvider === "yandex" ? lastUser : null;
    enterAccount(remembered ?? yandexStubAccount, false);
    return true;
  }, [enterAccount, lastUser]);

  const loginDemo = useCallback(() => {
    enterAccount(demoAccount, true);
    return true;
  }, [enterAccount]);

  const resumeSession = useCallback(() => {
    const remembered = lastUser ?? demoAccount;
    enterAccount(remembered, remembered.email === demoAccount.email);
    return true;
  }, [enterAccount, lastUser]);

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
      if (res.ok) setCart([]);
      return res;
    },
    [orderable]
  );

  const updateOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

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
      getProduct,
      orderable,
      cart,
      user,
      lastUser,
      ready,
      orders,
      leads,
      favoriteIds,
      addToCart,
      setQty,
      removeFromCart,
      removeProductFromCart,
      clearCart,
      login,
      register,
      loginYandex,
      loginDemo,
      resumeSession,
      logout,
      updateProfile,
      placeOrder,
      updateOrder,
      addLead,
      toggleFavorite,
      isFavorite,
      cartCount,
      cartTotal,
    }),
    [
      catalog,
      getProduct,
      orderable,
      cart,
      user,
      lastUser,
      ready,
      orders,
      leads,
      favoriteIds,
      addToCart,
      setQty,
      removeFromCart,
      removeProductFromCart,
      clearCart,
      login,
      register,
      loginYandex,
      loginDemo,
      resumeSession,
      logout,
      updateProfile,
      placeOrder,
      updateOrder,
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
