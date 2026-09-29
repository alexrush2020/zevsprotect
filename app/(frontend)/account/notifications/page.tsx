"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountScroll } from "@/components/account/account-scroll";
import {
  NOTICE_KIND_LABEL,
  defaultNoticeSettings,
  readNoticeSettings,
  readNotices,
  writeNoticeSettings,
  writeNotices,
  type AccountNotice,
  type NoticeSettings,
} from "@/lib/account-notices";
import { formatDate } from "@/lib/format";

export default function AccountNotificationsPage() {
  const [notices, setNotices] = useState<AccountNotice[]>([]);
  const [settings, setSettings] = useState<NoticeSettings>(defaultNoticeSettings);

  useEffect(() => {
    setNotices(readNotices());
    setSettings(readNoticeSettings());
  }, []);

  function markRead(id: string) {
    const next = notices.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotices(next);
    writeNotices(next);
  }

  function markAll() {
    const next = notices.map((n) => ({ ...n, read: true }));
    setNotices(next);
    writeNotices(next);
  }

  function patchSettings(patch: Partial<NoticeSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeNoticeSettings(next);
    toast.success("Настройки уведомлений сохранены");
  }

  const unread = notices.filter((n) => !n.read).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl">Уведомления</h2>
            <p className="mt-1 text-sm text-steel">
              {unread ? `${unread} непрочитанных` : "Все прочитаны"}
            </p>
          </div>
          {unread ? (
            <Button variant="outline" size="sm" onClick={markAll}>
              Прочитать все
            </Button>
          ) : null}
        </div>
        <AccountScroll className="mt-4">
          {notices.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id)}
              className="block w-full rounded-2xl border bg-card p-4 text-left"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-steel">
                {NOTICE_KIND_LABEL[n.kind]} · {formatDate(n.date)}
                {n.read ? "" : " · новое"}
              </p>
              <p className="mt-1 font-medium text-ink">{n.title}</p>
              <p className="mt-1 text-sm text-steel">{n.text}</p>
            </button>
          ))}
        </AccountScroll>
      </section>

      <section className="space-y-3">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-heading text-xl">Настройки</h2>
          <p className="mt-1 text-sm text-steel">
            В прототипе письма не уходят — флажки хранятся локально.
          </p>
          <div className="mt-4 grid gap-3">
            <Toggle
              checked={settings.orderStatus}
              onChange={(v) => patchSettings({ orderStatus: v })}
              title="Статусы заказов"
              hint="Сборка, отгрузка, вручение"
            />
            <Toggle
              checked={settings.invoices}
              onChange={(v) => patchSettings({ invoices: v })}
              title="Счета и оплата"
              hint="Выставлен счёт, оплата прошла"
            />
            <Toggle
              checked={settings.stock}
              onChange={(v) => patchSettings({ stock: v })}
              title="Наличие на складе"
              hint="Когда модели из заказов снова в наличии"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="font-heading text-xl">Рассылка</h2>
          <p className="mt-1 text-sm text-steel">
            Новинки, прайс и партии для закупки — на почту кабинета.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-3 py-3">
            <Checkbox
              className="mt-0.5"
              checked={settings.newsletter}
              onCheckedChange={(v) => patchSettings({ newsletter: Boolean(v) })}
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Подписка на рассылку
              </span>
              <span className="mt-0.5 block text-xs text-steel">
                Можно отключить в любой момент
              </span>
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-3 py-3">
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-steel">{hint}</span>
      </span>
    </label>
  );
}
