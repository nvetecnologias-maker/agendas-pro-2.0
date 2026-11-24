"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell as BellIcon, CalendarDays, Contact, CreditCard, LayoutDashboard, Link2, LogOut, Menu, Plus,
  Scissors, Settings, Users, Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavKey } from "./nav-items";

const ICONS: Record<NavKey, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  appointments: CalendarDays,
  services: Scissors,
  professionals: Users,
  customers: Contact,
  finance: Wallet,
  "my-page": Link2,
  settings: Settings,
  subscription: CreditCard,
};

export type ShellNavItem = { key: NavKey; href: string; label: string };

type Props = {
  items: ShellNavItem[];
  shopName: string;
  shopLogo: string | null;
  planName: string | null;
  /** avisos não lidos; null esconde o sino (quem não gerencia a barbearia) */
  unread?: number | null;
  userName: string;
  roleLabel: string;
  canCreateAppointment: boolean;
  children: React.ReactNode;
};

function isActive(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname === href || pathname.startsWith(href + "/");
}

function SignOut({ className }: { className?: string }) {
  return (
    <form action="/auth/sair" method="post">
      <button type="submit" className={cn("flex w-full items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-white/5 hover:text-halo", className)}>
        <LogOut className="size-[18px]" aria-hidden /> Sair
      </button>
    </form>
  );
}

export function PanelShell({ items, shopName, shopLogo, planName, userName, roleLabel, canCreateAppointment, unread = null, children }: Props) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => setMoreOpen(false), [pathname]);

  const byKey = Object.fromEntries(items.map((i) => [i.key, i])) as Partial<Record<NavKey, ShellNavItem>>;
  const tabs = (["overview", "appointments", "customers"] as NavKey[]).map((k) => byKey[k]).filter(Boolean) as ShellNavItem[];
  const moreActive = !tabs.some((t) => isActive(pathname, t.href));

  return (
    <div className="min-h-svh bg-[radial-gradient(120%_60%_at_100%_0%,rgba(36,103,242,0.12),transparent_60%),radial-gradient(80%_50%_at_0%_100%,rgba(2,0,111,0.35),transparent_60%)] bg-navy">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/[0.06] bg-[#04102b]/80 backdrop-blur-xl lg:flex">
        <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-6">
          <Logo />
          {unread !== null && <Bell count={unread} active={isActive(pathname, "/painel/avisos")} />}
        </div>
        <nav aria-label="Menu do painel" className="flex-1 overflow-y-auto px-3">
          <ul className="grid gap-1">
            {items.map((item) => {
              const Icon = ICONS[item.key];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                      active
                        ? "bg-[linear-gradient(90deg,rgba(36,103,242,0.28),rgba(36,103,242,0.08))] text-halo shadow-[inset_0_0_0_1px_rgba(117,181,255,0.18)]"
                        : "text-muted-foreground hover:bg-white/5 hover:text-halo",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sky" aria-hidden />}
                    <Icon className={cn("size-[18px]", active ? "text-sky" : "")} aria-hidden />
                    {item.label}
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
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
            <Avatar name={shopName} src={shopLogo} className="size-7 rounded-lg text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-halo">{shopName}</p>
              <p className="truncate text-[11px] text-sky">{planName ? `Plano ${planName}` : "Sem plano"}</p>
            </div>
          </div>
          <SignOut className="h-10" />
        </div>
      </aside>

      {/* ---------- Topo (celular) ---------- */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/[0.06] bg-navy/80 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={shopName} src={shopLogo} className="size-8 rounded-lg text-[11px]" />
          <p className="truncate text-[15px] font-semibold text-halo">{shopName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {unread !== null && <Bell count={unread} active={isActive(pathname, "/painel/avisos")} />}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="grid size-10 place-items-center rounded-full bg-white/5 text-halo"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 md:px-6 lg:pb-12 lg:pl-[calc(264px+2rem)] lg:pr-8 lg:pt-8 lg:max-w-none xl:pr-12">
        {children}
      </main>

      {/* ---------- Barra inferior (celular) ---------- */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#04102b]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {tabs.slice(0, 2).map((t) => <TabLink key={t.key} item={t} active={isActive(pathname, t.href)} />)}
          <li className="grid place-items-center">
            {canCreateAppointment ? (
              <Link
                href="/painel/agendamentos?novo=1"
                aria-label="Novo agendamento"
                className="-mt-7 grid size-14 place-items-center rounded-2xl bg-[linear-gradient(180deg,#3b7bff,#2467f2_55%,#1a52d0)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_30px_-8px_rgba(36,103,242,0.9)] ring-4 ring-navy active:scale-95"
              >
                <Plus className="size-7" />
              </Link>
            ) : <span />}
          </li>
          {tabs.slice(2).map((t) => <TabLink key={t.key} item={t} active={isActive(pathname, t.href)} />)}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn("flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px]", moreActive ? "text-sky" : "text-muted-foreground")}
            >
              <Menu className="size-[22px]" aria-hidden />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent title={shopName} description={planName ? `Plano ${planName}` : undefined}>
          <ul className="grid grid-cols-3 gap-2">
            {items.map((item) => {
              const Icon = ICONS[item.key];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-[12px] leading-tight",
                      active ? "border-sky/30 bg-electric/20 text-halo" : "border-white/[0.07] bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    <Icon className={cn("size-6", active ? "text-sky" : "text-halo/80")} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
            <Avatar name={userName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-halo">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <SignOut className="mt-2 h-12" />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TabLink({ item, active }: { item: ShellNavItem; active: boolean }) {
  const Icon = ICONS[item.key];
  const label = item.key === "overview" ? "Início" : item.key === "appointments" ? "Agenda" : item.label;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-sky" : "text-muted-foreground")}
      >
        <Icon className="size-[22px]" aria-hidden />
        {label}
      </Link>
    </li>
  );
}

function Bell({ count, active }: { count: number; active: boolean }) {
  return (
    <Link href="/painel/avisos" aria-label={count ? `Avisos: ${count} não lido(s)` : "Avisos"}
      className={cn("relative grid size-10 place-items-center rounded-full text-halo", active ? "bg-electric/25" : "bg-white/5 hover:bg-white/10")}>
      <BellIcon className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-electric px-1 font-mono text-[10px] font-semibold text-white ring-2 ring-navy">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
