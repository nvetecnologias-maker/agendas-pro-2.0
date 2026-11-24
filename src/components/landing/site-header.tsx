"use client";

import * as React from "react";
import Link from "next/link";
import { CircleHelp, CreditCard, House, LayoutGrid, Workflow } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LiquidNavbar, type LiquidNavItem } from "@/components/navigation/liquid-navbar";
import { useSmoothScroll } from "@/components/animations/smooth-scroll-provider";
import { cn } from "@/lib/utils";

const NAV: LiquidNavItem[] = [
  { id: "inicio", label: "Início", href: "#inicio", icon: <House /> },
  { id: "funcionalidades", label: "Funcionalidades", href: "#funcionalidades", icon: <LayoutGrid /> },
  { id: "como-funciona", label: "Como funciona", href: "#como-funciona", icon: <Workflow /> },
  { id: "planos", label: "Planos", href: "#planos", icon: <CreditCard /> },
  { id: "faq", label: "Perguntas", href: "#faq", icon: <CircleHelp /> },
];

/** Seção visível no momento (scroll-spy) */
function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(ids.indexOf(visible.target.id));
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return [active, setActive] as const;
}

export function SiteHeader() {
  const ids = React.useMemo(() => NAV.map((n) => n.id), []);
  const [active, setActive] = useActiveSection(ids);
  const lenis = useSmoothScroll();
  const [scrolled, setScrolled] = React.useState(false);
  // no celular a barra inferior só aparece depois do hero, para não cobrir os botões principais
  const [showDock, setShowDock] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      setShowDock(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // rolagem suave pelo Lenis central (com fallback nativo)
  const goTo = (index: number) => {
    setActive(index);
    const target = document.getElementById(NAV[index].id);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ behavior: "smooth" });
  };

  const onNavClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[href^='#']");
    if (a) e.preventDefault();
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-3 py-2 transition-all duration-500 sm:px-4",
            scrolled ? "glass-strong" : "border border-transparent",
          )}
        >
          <Link href="/" className="rounded-lg" aria-label="Agendas Pro: início">
            <Logo />
          </Link>

          <div className="hidden lg:block" onClickCapture={onNavClick}>
            <LiquidNavbar items={NAV} active={active} onSelect={(i) => goTo(i)} />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="glass" size="sm" asChild>
              <Link href="/entrar">Entrar</Link>
            </Button>
            <Button size="sm" asChild className="max-sm:hidden">
              <Link href="/cadastro">Começar agora</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Celular/tablet: navegação inferior compacta (só ícones) */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 transition-all duration-500 ease-out lg:hidden",
          showDock ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
        )}
        aria-hidden={!showDock}
        inert={!showDock}
        onClickCapture={onNavClick}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <LiquidNavbar items={NAV} active={active} onSelect={(i) => goTo(i)} compact aria-label="Seções da página" />
      </div>
    </>
  );
}
