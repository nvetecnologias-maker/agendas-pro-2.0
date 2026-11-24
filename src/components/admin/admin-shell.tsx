"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2, CreditCard, FileClock, LayoutDashboard, LogOut, Menu, Plug, Receipt, Settings, ShieldCheck, Ticket,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/super-admin", label: "Visão geral", short: "Início", icon: LayoutDashboard },
  { href: "/super-admin/barbearias", label: "Barbearias", short: "Barbearias", icon: Building2 },
  { href: "/super-admin/planos", label: "Planos", short: "Planos", icon: CreditCard },
  { href: "/super-admin/cupons", label: "Cupons", short: "Cupons", icon: Ticket },
  { href: "/super-admin/pagamentos", label: "Pagamentos", short: "Pagamentos", icon: Receipt },
  { href: "/super-admin/gateways", label: "Gateways", short: "Gateways", icon: Plug },
  { href: "/super-admin/configuracoes", label: "Configurações", short: "Config.", icon: Settings },
  { href: "/super-admin/auditoria", label: "Auditoria", short: "Auditoria", icon: FileClock },
] as const;
const TABS = ITEMS.slice(0, 3);

const isActive = (path: string, href: string) => (href === "/super-admin" ? path === href : path === href || path.startsWith(href + "/"));

function SignOut({ className }: { className?: string }) {
  return (
    <form action="/auth/sair" method="post">
      <button type="submit" className={cn("flex w-full items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-white/5 hover:text-halo", className)}>
        <LogOut className="size-[18px]" aria-hidden /> Sair
      </button>
    </form>
  );
}

export function AdminShell({ userName, hasShop, children }: { userName: string; hasShop: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);
  const moreActive = !TABS.some((t) => isActive(pathname, t.href));

  return (
    <div className="min-h-svh bg-[radial-gradient(120%_60%_at_100%_0%,rgba(185,130,38,0.10),transparent_55%),radial-gradient(80%_50%_at_0%_100%,rgba(2,0,111,0.35),transparent_60%)] bg-navy">
      <Toaster theme="dark" position="top-center" richColors />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.06] bg-[#04102b]/80 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2 px-5 pb-4 pt-6">
          <Logo />
        </div>
        <p className="mx-5 mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#B98226]/15 px-2.5 py-1 text-[11px] font-medium text-[#E7B661]">
          <ShieldCheck className="size-3.5" /> Super Admin
        </p>
        <nav aria-label="Menu do Super Admin" className="flex-1 overflow-y-auto px-3">
          <ul className="grid gap-1">
            {ITEMS.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} aria-current={active ? "page" : undefined}
                    className={cn("relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                      active ? "bg-white/[0.07] text-halo shadow-[inset_0_0_0_1px_rgba(231,182,97,0.18)]" : "text-muted-foreground hover:bg-white/5 hover:text-halo")}>
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#E7B661]" aria-hidden />}
                    <it.icon className={cn("size-[18px]", active && "text-[#E7B661]")} aria-hidden />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="m-3 grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <Avatar name={userName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-halo">{userName}</p>
              <p className="text-xs text-muted-foreground">Administrador da plataforma</p>
            </div>
          </div>
          {hasShop && <Link href="/painel" className="flex h-10 items-center rounded-xl px-3 text-sm text-sky hover:bg-white/5">Ir para minha barbearia</Link>}
          <SignOut className="h-10" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/[0.06] bg-navy/80 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="rounded-full bg-[#B98226]/15 px-2 py-0.5 text-[11px] font-medium text-[#E7B661]">Admin</span>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full bg-white/5 text-halo" aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-6 lg:max-w-none lg:pb-12 lg:pl-[calc(248px+2rem)] lg:pr-8 lg:pt-8 xl:pr-12">
        {children}
      </main>

      <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#04102b]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-[#E7B661]" : "text-muted-foreground")}>
                  <t.icon className="size-[22px]" aria-hidden />{t.short}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setOpen(true)} className={cn("flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px]", moreActive ? "text-[#E7B661]" : "text-muted-foreground")}>
              <Menu className="size-[22px]" aria-hidden /> Mais
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Super Admin" description="Administração da plataforma">
          <ul className="grid grid-cols-3 gap-2">
            {ITEMS.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <li key={it.href}>
                  <Link href={it.href} className={cn("flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-[12px] leading-tight",
                    active ? "border-[#E7B661]/30 bg-[#B98226]/15 text-halo" : "border-white/[0.07] bg-white/[0.03] text-muted-foreground")}>
                    <it.icon className={cn("size-6", active ? "text-[#E7B661]" : "text-halo/80")} aria-hidden />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {hasShop && <Link href="/painel" className="mt-4 flex h-12 items-center justify-center rounded-xl bg-white/[0.05] text-sm text-sky">Ir para minha barbearia</Link>}
          <SignOut className="mt-2 h-12" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
