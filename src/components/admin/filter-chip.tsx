import Link from "next/link";
import { cn } from "@/lib/utils";

export function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px]",
        active ? "border-[#E7B661]/40 bg-[#B98226]/20 text-halo" : "border-white/[0.08] text-muted-foreground hover:text-halo")}>
      {children}
    </Link>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">{children}</div>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const cls = "inline-flex h-11 items-center gap-1 rounded-full bg-white/[0.05] px-4 text-sm";
  return (
    <nav className="flex items-center justify-between" aria-label="Paginação">
      <Link aria-disabled={page <= 1} href={href(page - 1)} className={cn(cls, page <= 1 && "pointer-events-none opacity-40")}>‹ Anterior</Link>
      <span className="text-sm text-muted-foreground">Página {page} de {pages}</span>
      <Link aria-disabled={page >= pages} href={href(page + 1)} className={cn(cls, page >= pages && "pointer-events-none opacity-40")}>Próxima ›</Link>
    </nav>
  );
}
