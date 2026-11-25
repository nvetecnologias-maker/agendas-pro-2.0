import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { getPublicPlatformInfo } from "@/services/public-site";
import { SiteFooter } from "./site-footer";

export type LegalSection = { id: string; title: string; content: React.ReactNode };

/**
 * Página institucional (Termos, Privacidade, Suporte): cabeçalho simples,
 * sumário navegável, texto com boa leitura no celular e rodapé institucional.
 */
export async function LegalPage({
  title,
  intro,
  updatedAt,
  version,
  sections,
  pendingNotice = true,
}: {
  title: string;
  intro?: React.ReactNode;
  updatedAt?: string;
  version?: string;
  sections: LegalSection[];
  pendingNotice?: boolean;
}) {
  const info = await getPublicPlatformInfo();
  return (
    <>
      <header className="border-b border-border bg-navy/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Agendas Pro: página inicial" className="rounded-lg"><Logo /></Link>
          <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-white/5 hover:text-halo">
            <ArrowLeft className="size-4" aria-hidden /> Início
          </Link>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <h1 className="text-[26px] font-semibold tracking-tight text-halo sm:text-4xl">{title}</h1>
          {(updatedAt || version) && (
            <p className="mt-2 text-sm text-subtle-foreground">
              {updatedAt && <>Última atualização: {updatedAt}</>}
              {updatedAt && version && " · "}
              {version && <>Versão {version}</>}
            </p>
          )}
          {intro && <div className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{intro}</div>}
          {pendingNotice && (
            <div className="mt-6 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
              <FileWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p className="text-muted-foreground">
                <strong className="font-medium text-halo">Documento em revisão.</strong> Os trechos destacados como{" "}
                <Pending>este</Pending> dependem de dados oficiais da empresa ou de validação jurídica e serão preenchidos
                antes da publicação definitiva.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Sumário" className="lg:sticky lg:top-6 lg:self-start">
            <details className="group rounded-xl border border-border bg-surface-1/60 lg:border-0 lg:bg-transparent" open>
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-halo lg:hidden">Sumário</summary>
              <ol className="grid gap-1 px-4 pb-4 text-[13px] lg:px-0 lg:pb-0">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block rounded-md py-1 text-muted-foreground hover:text-halo">
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          </nav>

          <article className="legal-text grid max-w-3xl gap-10 text-[15px] leading-relaxed text-muted-foreground">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="scroll-mt-6">
                <h2 id={`${s.id}-t`} className="text-xl font-semibold tracking-tight text-halo">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 grid gap-3">{s.content}</div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <SiteFooter info={info} />
    </>
  );
}

/** Campo que depende de dado oficial da empresa ou de validação jurídica */
export function Pending({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-warning/15 px-1 py-0.5 font-medium text-warning [box-decoration-break:clone]">
      {children}
    </mark>
  );
}

/** Lista com marcadores para os documentos */
export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="grid gap-2 pl-5 [list-style:disc] marker:text-sky">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
