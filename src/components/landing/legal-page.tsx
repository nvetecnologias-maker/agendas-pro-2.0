import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Agendas Pro: início"><Logo /></Link>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-halo"><ArrowLeft className="size-4" /> Voltar</Link>
      </header>
      <article className="mt-14 grid gap-6 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-halo">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-halo">{title}</h1>
          <p className="mt-2 text-sm text-subtle-foreground">Última atualização: {updatedAt}</p>
        </div>
        {children}
      </article>
    </div>
  );
}
