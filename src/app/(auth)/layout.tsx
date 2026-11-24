import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { RibbonField } from "@/components/animations/ribbon-field";
import { CalendarCheck2, ShieldCheck, TrendingUp } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Coluna do formulário */}
      <div className="relative z-10 flex flex-col px-4 py-6 sm:px-10 lg:px-16">
        <Link href="/" className="w-fit rounded-lg" aria-label="Agendas Pro: página inicial">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">{children}</main>
        <p className="text-center text-xs text-subtle-foreground lg:text-left">
          © {new Date().getFullYear()} Agendas Pro · Seus dados protegidos e isolados por barbearia.
        </p>
      </div>

      {/* Coluna visual: Ribbon Field + vidro */}
      <aside className="relative hidden overflow-hidden lg:block" aria-hidden>
        <RibbonField className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/10 to-transparent" />
        <div className="relative flex h-full flex-col justify-end gap-4 p-14">
          <div className="glass max-w-md rounded-3xl p-7">
            <p className="text-2xl font-semibold leading-tight tracking-tight text-halo">
              Sua barbearia merece uma gestão à altura.
            </p>
            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3"><CalendarCheck2 className="size-4 text-sky" /> Agenda online sem conflitos de horário</li>
              <li className="flex items-center gap-3"><TrendingUp className="size-4 text-sky" /> Financeiro e desempenho em tempo real</li>
              <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-sky" /> Dados isolados e protegidos por barbearia</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
