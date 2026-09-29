"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/home/motion";
import { formatRuPhone } from "@/lib/demo-account";
import { forgotRequest, loginRequest, registerRequest } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import type { AccountKind, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const fieldClass = "h-11 rounded-xl bg-white";
type AuthMode = "login" | "register" | "forgot";

function modeFromPath(pathname: string): AuthMode {
  if (pathname === "/register") return "register";
  if (pathname === "/forgot") return "forgot";
  return "login";
}

function hrefForMode(mode: AuthMode) {
  if (mode === "register") return "/register";
  if (mode === "forgot") return "/forgot";
  return "/login";
}

export function AccountAuthForm() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, register, loginYandex } = useStore();
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<AuthMode>(() => modeFromPath(pathname));
  const [resetSent, setResetSent] = useState(false);
  const [kind, setKind] = useState<AccountKind>("legal");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [fillRequisites, setFillRequisites] = useState(false);
  const [inn, setInn] = useState("");
  const [kpp, setKpp] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bik, setBik] = useState("");

  const isLegal = kind === "legal";
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";

  useEffect(() => {
    if (user && pathname !== "/account") router.replace("/account");
  }, [user, pathname, router]);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/register" || pathname === "/forgot") {
      setMode(modeFromPath(pathname));
      if (pathname !== "/forgot") setResetSent(false);
    }
  }, [pathname]);

  function goToCabinet() {
    if (pathname !== "/account") router.push("/account");
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    if (next !== "forgot") setResetSent(false);
    if (pathname === "/login" || pathname === "/register" || pathname === "/forgot") {
      router.replace(hrefForMode(next), { scroll: false });
    }
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      toast.error("Укажите email кабинета");
      return;
    }
    setBusy(true);
    try {
      await forgotRequest(value);
      setResetSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось отправить письмо");
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      register(await loginRequest(email.trim(), password));
      toast.success("Вход выполнен");
      goToCabinet();
    } catch {
      toast.error("Неверный email или пароль");
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Пароль не короче 8 символов");
      return;
    }
    const profile: UserProfile = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      company: isLegal ? company.trim() : "",
      inn: isLegal && fillRequisites ? inn.trim() : "",
      kpp: isLegal && fillRequisites ? kpp.trim() : "",
      bankAccount: isLegal && fillRequisites ? bankAccount.trim() : "",
      bankName: isLegal && fillRequisites ? bankName.trim() : "",
      bik: isLegal && fillRequisites ? bik.trim() : "",
      address: "",
      kind,
    };
    setBusy(true);
    try {
      register(await registerRequest(profile, password));
      toast.success(isLegal ? "Кабинет юрлица создан" : "Кабинет создан");
      goToCabinet();
    } catch {
      toast.error("Не удалось создать кабинет. Если он уже есть — войдите или восстановите пароль");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-paper" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-orange/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-navy/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-md px-4 py-12">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.22em] text-steel">Личный кабинет</p>
          <h1 className="mt-2 font-heading text-3xl text-ink sm:text-4xl">Кабинет клиента</h1>
          <p className="mt-2 max-w-2xl text-sm text-steel">
            Каталог смотрите без регистрации. Чтобы оформлять заказы и видеть документы,
            войдите через Яндекс или по email. Сессия держится 2–3 дня, профиль не нужно
            заполнять заново.
          </p>
        </Reveal>

        <section className="mt-8 rounded-2xl border bg-card p-5 shadow-[0_18px_50px_rgb(4_0_64_/_0.06)] sm:p-6">
          {!isForgot ? (
            <div className="grid grid-cols-2 gap-2">
              <TypeButton active={isLogin} onClick={() => switchMode("login")}>
                Вход
              </TypeButton>
              <TypeButton active={!isLogin} onClick={() => switchMode("register")}>
                Регистрация
              </TypeButton>
            </div>
          ) : null}

          {isForgot ? (
            <>
              <h2 className="font-heading text-2xl text-ink">Восстановление пароля</h2>
              <p className="mt-1 text-sm text-steel">
                Укажите email кабинета — отправим ссылку для нового пароля.
              </p>
              {resetSent ? (
                <div className="mt-5 rounded-xl border bg-paper/80 p-4 text-sm text-ink">
                  Если кабинет с адресом {email} существует, на него уйдёт ссылка для нового пароля.
                </div>
              ) : (
                <form onSubmit={onForgot} className="mt-5 grid gap-3">
                  <Field
                    id="forgot-email"
                    label="E-mail кабинета *"
                    type="email"
                    placeholder="partner@email.ru"
                    value={email}
                    onChange={setEmail}
                    required
                  />
                  <Button type="submit" disabled={busy} className="btn-press-in mt-1 h-12 w-full text-base">
                    Отправить ссылку
                  </Button>
                </form>
              )}
              <button
                type="button"
                className="mt-4 text-sm text-steel underline underline-offset-2 hover:text-ink"
                onClick={() => switchMode("login")}
              >
                Вернуться ко входу
              </button>
            </>
          ) : isLogin ? (
            <>
              <h2 className="mt-5 font-heading text-2xl text-ink">Вход</h2>
              <p className="mt-1 text-sm text-steel">
                Яндекс или email и пароль. Сессия живёт 2–3 дня.
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-5 h-11 w-full gap-2 rounded-xl border-border bg-white text-ink hover:bg-paper"
                onClick={() => {
                  loginYandex();
                  toast.success("Вход через Яндекс ID (заглушка прототипа)");
                  goToCabinet();
                }}
              >
                <YandexMark />
                Войти через Яндекс
              </Button>

              <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-steel">
                или по email
              </p>

              <form onSubmit={onLogin} className="mt-3 grid gap-3">
                <Field
                  id="auth-email"
                  label="E-mail *"
                  type="email"
                  placeholder="partner@email.ru"
                  value={email}
                  onChange={setEmail}
                  required
                />
                <Field
                  id="auth-password"
                  label="Пароль *"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  required
                />
                <p className="-mt-1 text-right text-xs text-steel">
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-ink"
                    onClick={() => switchMode("forgot")}
                  >
                    Забыли пароль?
                  </button>
                </p>
                <Button type="submit" disabled={busy} className="btn-press-in mt-1 h-12 w-full text-base">
                  Войти
                </Button>
              </form>

            </>
          ) : (
            <form onSubmit={onRegister}>
              <h2 className="mt-5 font-heading text-2xl text-ink">Регистрация</h2>
              <p className="mt-1 text-sm text-steel">
                Частное лицо или юрлицо; реквизиты можно
                добавить позже.
              </p>

              <p className="mt-5 text-xs font-medium text-steel">Тип</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <TypeButton
                  active={kind === "person"}
                  onClick={() => {
                    setKind("person");
                    setFillRequisites(false);
                  }}
                >
                  Частное лицо
                </TypeButton>
                <TypeButton active={kind === "legal"} onClick={() => setKind("legal")}>
                  Юрлицо
                </TypeButton>
              </div>

              <div className="mt-4 grid gap-3">
                <Field
                  id="auth-name"
                  label={isLegal ? "Имя / контактное лицо *" : "Имя *"}
                  placeholder={isLegal ? "Артём" : "Иван"}
                  value={name}
                  onChange={setName}
                  required
                />
                <Field
                  id="auth-phone"
                  label="Телефон"
                  placeholder="+7 (___) ___-__-__"
                  value={phone}
                  onChange={(v) => setPhone(formatRuPhone(v))}
                />
                <Field
                  id="auth-reg-email"
                  label="E-mail *"
                  type="email"
                  placeholder="partner@email.ru"
                  value={email}
                  onChange={setEmail}
                  required
                />
                <Field
                  id="auth-reg-password"
                  label="Пароль * (от 8 символов)"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  required
                />
                {isLegal ? (
                  <Field
                    id="auth-company"
                    label="Название организации *"
                    placeholder="ООО «…»"
                    value={company}
                    onChange={setCompany}
                    required
                  />
                ) : null}

                {isLegal ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-3 py-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={fillRequisites}
                      onCheckedChange={(v) => setFillRequisites(Boolean(v))}
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        Заполнить реквизиты сейчас
                      </span>
                      <span className="mt-0.5 block text-xs text-steel">
                        Необязательно — можно добавить позже в профиле
                      </span>
                    </span>
                  </label>
                ) : null}

                {isLegal && fillRequisites ? (
                  <RequisitesFields
                    idPrefix="auth-req"
                    inn={inn}
                    kpp={kpp}
                    bankAccount={bankAccount}
                    bankName={bankName}
                    bik={bik}
                    onInn={setInn}
                    onKpp={setKpp}
                    onBankAccount={setBankAccount}
                    onBankName={setBankName}
                    onBik={setBik}
                  />
                ) : null}

                <Button type="submit" disabled={busy} className="btn-press-in mt-1 h-12 w-full text-base">
                  Создать кабинет
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-11 rounded-xl border text-sm font-medium transition",
        active
          ? "border-navy bg-navy text-paper shadow-sm"
          : "border-border bg-white text-steel hover:border-navy/20 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-steel">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
    </div>
  );
}

function RequisitesFields({
  idPrefix,
  inn,
  kpp,
  bankAccount,
  bankName,
  bik,
  onInn,
  onKpp,
  onBankAccount,
  onBankName,
  onBik,
}: {
  idPrefix: string;
  inn: string;
  kpp: string;
  bankAccount: string;
  bankName: string;
  bik: string;
  onInn: (v: string) => void;
  onKpp: (v: string) => void;
  onBankAccount: (v: string) => void;
  onBankName: (v: string) => void;
  onBik: (v: string) => void;
}) {
  return (
    <>
      <Field id={`${idPrefix}-inn`} label="ИНН" placeholder="7701234567" value={inn} onChange={onInn} />
      <Field id={`${idPrefix}-kpp`} label="КПП" placeholder="770101001" value={kpp} onChange={onKpp} />
      <Field
        id={`${idPrefix}-rs`}
        label="Расчётный счёт"
        placeholder="40702810…"
        value={bankAccount}
        onChange={onBankAccount}
      />
      <Field
        id={`${idPrefix}-bank`}
        label="Банк"
        placeholder="ПАО Сбербанк"
        value={bankName}
        onChange={onBankName}
      />
      <Field id={`${idPrefix}-bik`} label="БИК" placeholder="044525225" value={bik} onChange={onBik} />
    </>
  );
}

function YandexMark() {
  return (
    <span
      aria-hidden
      className="flex size-5 items-center justify-center rounded-[5px] bg-[#FC3F1D] text-[11px] font-bold leading-none text-white"
    >
      Я
    </span>
  );
}
