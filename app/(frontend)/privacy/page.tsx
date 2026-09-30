import { pageMeta } from "@/lib/seo-jsonld";
import { getPrivacyText } from "@/lib/server/catalog";

export const metadata = pageMeta("Политика обработки персональных данных", "Политика обработки персональных данных ООО «ЗЕВС».", "/privacy");

/** Текст — опубликованная страница pages со slug «privacy», иначе текст по умолчанию (lib/server/content.ts). */
export default async function PrivacyPage() {
  const paragraphs = await getPrivacyText();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-7 text-steel">
      <h1 className="font-heading text-4xl text-ink">
        Политика обработки персональных данных
      </h1>
      {paragraphs.map((p, i) => (
        <p key={i} className={i ? "mt-4" : "mt-6"}>
          {p}
        </p>
      ))}
    </div>
  );
}
