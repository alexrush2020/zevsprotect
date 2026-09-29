import Link from "next/link";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-navy">404</p>
      <h1 className="mt-2 font-heading text-4xl">Страница не найдена</h1>
      <p className="mt-3 text-steel">
        Такой страницы нет. Вернитесь в каталог {brand.markRu} или на главную.
      </p>
      <Button nativeButton={false} render={<Link href="/" />} className="mt-6">
        На главную
      </Button>
    </div>
  );
}
