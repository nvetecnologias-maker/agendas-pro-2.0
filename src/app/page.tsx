import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RibbonField } from "@/components/animations/ribbon-field";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/** Página provisória. A landing page completa é a Fase 2. */
export default function HomePage() {
  return (
    <RibbonField className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6">
        <header className="glass flex items-center justify-between rounded-2xl px-4 py-3">
          <Logo />
          <div className="flex gap-2">
            <Button variant="glass" size="sm" asChild><Link href="/entrar">Entrar</Link></Button>
            <Button size="sm" asChild><Link href="/cadastro">Começar agora</Link></Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col justify-center py-16">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Sua barbearia merece uma <span className="text-gradient">gestão à altura.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Organize seus horários, gerencie seus profissionais e acompanhe seus resultados em uma única plataforma.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href="/cadastro">Começar agora <ArrowRight /></Link></Button>
            <Button size="lg" variant="glass" asChild><Link href="/design-system">Ver design system</Link></Button>
          </div>
        </main>
      </div>
    </RibbonField>
  );
}
