import {
  CalendarDays,
  ChartNoAxesColumn,
  LayoutDashboard,
  Scissors,
  Settings,
  Users,
  Wallet,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mockup ilustrativo do painel do barbeiro (somente apresentação).
 * Os números são exemplos e estão identificados como tal na própria tela.
 */

const BARS = [38, 52, 44, 66, 58, 80, 72, 90, 64, 86, 78, 96];
const AGENDA = [
  { time: "09:00", name: "Rafael M.", service: "Corte + barba", pro: "Lucas", tone: "bg-success" },
  { time: "09:45", name: "Diego S.", service: "Degradê", pro: "André", tone: "bg-sky" },
  { time: "10:30", name: "Thiago R.", service: "Barba", pro: "Lucas", tone: "bg-warning" },
  { time: "11:15", name: "Bruno A.", service: "Pigmentação", pro: "André", tone: "bg-sky" },
];

export function DashboardMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-white/10 bg-[#050f2a]/95 shadow-[0_50px_120px_-30px_rgba(2,0,111,0.9),0_0_0_1px_rgba(117,181,255,0.08)]",
        className,
      )}
      aria-label="Ilustração do painel do Agendas Pro com dados de exemplo"
      role="img"
    >
      {/* barra da janela */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[10px] text-subtle-foreground">app.agendaspro.com.br/painel</span>
        <span className="ml-auto rounded-full border border-sky/20 bg-sky/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-sky">
          Dados de exemplo
        </span>
      </div>

      <div className="grid grid-cols-[148px_1fr] max-md:grid-cols-1">
        {/* sidebar */}
        <aside className="flex flex-col gap-1 border-r border-white/5 p-3 max-md:hidden">
          {[
            [LayoutDashboard, "Visão geral", true],
            [CalendarDays, "Agendamentos"],
            [Scissors, "Serviços"],
            [Users, "Clientes"],
            [Wallet, "Financeiro"],
            [Link2, "Minha agenda"],
            [Settings, "Configurações"],
          ].map(([Icon, label, on]) => {
            const I = Icon as typeof LayoutDashboard;
            return (
              <div
                key={label as string}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px]",
                  on ? "bg-electric/20 text-halo shadow-[inset_0_0_0_1px_rgba(117,181,255,0.2)]" : "text-subtle-foreground",
                )}
              >
                <I className="size-3.5" />
                {label as string}
              </div>
            );
          })}
        </aside>

        {/* conteúdo */}
        <div className="grid gap-3 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-subtle-foreground">Terça, 24 de novembro</p>
              <p className="text-[15px] font-semibold text-halo">Bom dia, João</p>
            </div>
            <div className="rounded-lg bg-electric px-2.5 py-1.5 text-[10px] font-medium text-white">+ Novo agendamento</div>
          </div>

          <div className="grid grid-cols-4 gap-2 max-sm:grid-cols-2">
            {[
              ["Hoje", "18", "agendamentos"],
              ["Receita do mês", "R$ 9.320", "recebida"],
              ["Clientes", "412", "ativos"],
              ["Ocupação", "86%", "da agenda"],
            ].map(([k, v, s]) => (
              <div key={k} className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <p className="text-[9px] text-subtle-foreground">{k}</p>
                <p className="mt-1 font-mono text-[15px] font-semibold text-halo">{v}</p>
                <p className="text-[9px] text-subtle-foreground">{s}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.4fr_1fr] gap-2 max-sm:grid-cols-1">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-medium text-halo">Receita por mês</p>
                <ChartNoAxesColumn className="size-3 text-subtle-foreground" />
              </div>
              <div className="flex h-24 items-end gap-1.5">
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[4px] bg-gradient-to-t from-lapis to-sky"
                    style={{ height: `${h}%`, opacity: 0.45 + (i / BARS.length) * 0.55 }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] font-medium text-halo">Próximos atendimentos</p>
              <ul className="grid gap-1.5">
                {AGENDA.map((a) => (
                  <li key={a.time} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
                    <span className={cn("h-6 w-0.5 rounded-full", a.tone)} />
                    <span className="font-mono text-[10px] text-sky">{a.time}</span>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-halo">
                      {a.name} <span className="text-subtle-foreground">· {a.service}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
