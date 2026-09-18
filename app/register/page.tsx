"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { brand } from "@/lib/brand";

export default function RegisterPage() {
  const { register } = useStore();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ok = register(
      {
        email: String(data.get("email") || ""),
        name: String(data.get("name") || ""),
        phone: String(data.get("phone") || ""),
        company: String(data.get("company") || ""),
        inn: String(data.get("inn") || ""),
        kpp: String(data.get("kpp") || ""),
        address: String(data.get("address") || ""),
      },
      String(data.get("password") || "")
    );
    if (!ok) return;
    toast.success("Компания создана в Битрикс24 (прототип)");
    router.push("/account");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-4xl">Регистрация</h1>
      <p className="mt-2 text-sm text-steel">
        Регистрация клиента {brand.markRu}. В Битрикс24 создаётся компания.
      </p>
      <form className="mt-8 grid gap-3" onSubmit={onSubmit}>
        {[
          ["name", "Контактное лицо"],
          ["company", "Организация"],
          ["inn", "ИНН"],
          ["kpp", "КПП"],
          ["phone", "Телефон"],
          ["email", "Email"],
          ["address", "Адрес доставки"],
        ].map(([id, label]) => (
          <div key={id} className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} name={id} required={id !== "inn" && id !== "kpp"} type={id === "email" ? "email" : "text"} />
          </div>
        ))}
        <div className="grid gap-1.5">
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <label className="flex items-start gap-2 text-xs text-steel">
          <Checkbox required defaultChecked />
          Согласен с политикой обработки персональных данных
        </label>
        <Button type="submit" className="h-11">
          Создать кабинет
        </Button>
      </form>
      <p className="mt-4 text-sm text-steel">
        Уже есть доступ? <Link href="/login" className="underline">Войти</Link>
      </p>
    </div>
  );
}
