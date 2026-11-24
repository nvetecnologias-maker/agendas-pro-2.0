import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock, Scissors, Users, Wallet } from "lucide-react";
import { RibbonField, AGENDAS_PRO_RIBBON_SUBTLE } from "@/components/animations/ribbon-field";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Design system · Agendas Pro", robots: { index: false, follow: false } };

const PALETTE = [
  { name: "Azul-marinho profundo", token: "navy", hex: "#030B20", use: "Fundo base" },
  { name: "Azul escuro", token: "midnight", hex: "#02006F", use: "Profundidade, gradientes" },
  { name: "Azul Lapis", token: "lapis", hex: "#083DA9", use: "Gradientes, estados ativos" },
  { name: "Azul elétrico", token: "electric", hex: "#2467F2", use: "Ação principal" },
  { name: "Azul claro", token: "sky", hex: "#75B5FF", use: "Destaques, foco, links" },
  { name: "Branco", token: "halo", hex: "#F5F8FF", use: "Texto principal" },
  { name: "Preto", token: "ink", hex: "#000000", use: "Sombras, gradiente final" },
];

/** Página interna de referência visual: não existe em produção */
export default function DesignSystemPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <div className="pb-24">
      {/* HERO com o Ribbon Field nos parâmetros oficiais */}
      <RibbonField className="min-h-[560px] border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-6 sm:px-6">
          <nav className="glass flex items-center justify-between rounded-2xl px-4 py-3" aria-label="Prévia da navegação">
            <Logo />
            <div className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
              {["Início", "Funcionalidades", "Como funciona", "Planos", "FAQ"].map((i) => (
                <span key={i} className="rounded-lg px-3 py-1.5 hover:bg-white/5 hover:text-halo">{i}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="glass" size="sm" asChild><Link href="/entrar">Entrar</Link></Button>
              <Button size="sm" asChild><Link href="/cadastro">Começar agora</Link></Button>
            </div>
          </nav>
          <div className="max-w-2xl py-12">
            <Badge tone="brand" className="mb-5">Referência interna de componentes</Badge>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              <span className="text-gradient">Agenda online e gestão</span>
              <br /> para barbearias.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Ribbon Field animado com os parâmetros do briefing (stripes, ângulo 136, 12 faixas, grão 8, vinheta 3),
              rodando em WebGL com requestAnimationFrame e fallback em CSS.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg">Começar agora <ArrowRight /></Button>
              <Button size="lg" variant="glass">Conhecer funcionalidades</Button>
            </div>
          </div>
        </div>
      </RibbonField>

      <div className="mx-auto grid max-w-6xl gap-20 px-4 pt-16 sm:px-6">
        {/* PALETA */}
        <section aria-labelledby="paleta" className="grid gap-6">
          <SectionTitle id="paleta" title="Paleta" subtitle="Cores da marca expostas como tokens Tailwind (bg-electric, text-sky...)." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {PALETTE.map((c) => (
              <div key={c.hex} className="overflow-hidden rounded-2xl border border-border bg-surface-1">
                <div className="h-24" style={{ background: c.hex }} />
                <div className="grid gap-0.5 p-3">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="font-mono text-xs text-sky">{c.hex}</p>
                  <p className="text-xs text-subtle-foreground">{c.use}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TIPOGRAFIA */}
        <section aria-labelledby="tipografia" className="grid gap-6">
          <SectionTitle id="tipografia" title="Tipografia" subtitle="Geist (texto e títulos) e Geist Mono (números e códigos)." />
          <Card padding="lg" className="grid gap-4">
            <p className="text-5xl font-semibold tracking-tight">Título de destaque</p>
            <p className="text-3xl font-semibold tracking-tight">Título de seção</p>
            <p className="text-lg text-muted-foreground">Texto de apoio, com contraste confortável para leitura longa.</p>
            <p className="font-mono text-2xl text-sky">R$ 12.480,00 · 148 agendamentos</p>
          </Card>
        </section>

        {/* BOTÕES */}
        <section aria-labelledby="botoes" className="grid gap-6">
          <SectionTitle id="botoes" title="Botões" subtitle="Variações por intenção. Todos com foco visível, estado de carregamento e feedback ao toque." />
          <Card padding="lg" className="flex flex-wrap items-center gap-3">
            <Button>Principal</Button>
            <Button variant="glass">Vidro</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="subtle">Sutil</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="destructive">Cancelar agendamento</Button>
            <Button loading>Salvando</Button>
            <Button variant="link">Link</Button>
          </Card>
        </section>

        {/* SUPERFÍCIES */}
        <section aria-labelledby="superficies" className="grid gap-6">
          <SectionTitle
            id="superficies"
            title="Superfícies: vidro x sólido"
            subtitle="Liquid Glass para destaque e navegação. Superfície sólida para leitura densa (agenda, tabelas)."
          />
          <RibbonField params={AGENDAS_PRO_RIBBON_SUBTLE} quality={0.5} className="rounded-3xl border border-border p-6 sm:p-10">
            <div className="grid gap-4 md:grid-cols-3">
              <GlassPanel className="p-6">
                <CalendarClock className="size-6 text-sky" />
                <p className="mt-4 text-sm text-muted-foreground">Agendamentos hoje</p>
                <p className="mt-1 font-mono text-4xl font-semibold">18</p>
                <Badge tone="success" className="mt-3">+12% vs. semana passada</Badge>
              </GlassPanel>
              <GlassPanel strong className="p-6">
                <Wallet className="size-6 text-sky" />
                <p className="mt-4 text-sm text-muted-foreground">Receita do mês (recebida)</p>
                <p className="mt-1 font-mono text-4xl font-semibold">R$ 9.320</p>
                <Badge tone="info" className="mt-3">Vidro forte</Badge>
              </GlassPanel>
              <Card className="p-6">
                <Users className="size-6 text-sky" />
                <p className="mt-4 text-sm text-muted-foreground">Clientes ativos</p>
                <p className="mt-1 font-mono text-4xl font-semibold">412</p>
                <Badge className="mt-3">Superfície sólida</Badge>
              </Card>
            </div>
          </RibbonField>
          <p className="text-sm text-subtle-foreground">
            Passe o mouse sobre os cards de vidro: o brilho segue o ponteiro (refração simulada). O fundo usa a versão
            discreta do Ribbon Field, renderizada em meia resolução para economizar GPU.
          </p>
        </section>

        {/* FORMULÁRIOS + STATUS */}
        <section aria-labelledby="formularios" className="grid gap-6">
          <SectionTitle id="formularios" title="Formulários e estados" subtitle="Validação acessível (aria-invalid, mensagens ligadas ao campo)." />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding="lg" className="grid gap-4">
              <Field id="ds-name" label="Nome do serviço" hint="Ex.: Corte masculino, Barba, Pigmentação">
                <Input placeholder="Corte + barba" />
              </Field>
              <Field id="ds-price" label="Preço" error="Informe um valor maior que zero.">
                <Input placeholder="R$ 0,00" defaultValue="0" />
              </Field>
              <div className="flex gap-2">
                <Button>Salvar serviço</Button>
                <Button variant="ghost">Cancelar</Button>
              </div>
            </Card>
            <Card padding="lg" className="grid gap-4">
              <CardHeader className="mb-0">
                <CardTitle>Status de agendamento</CardTitle>
                <CardDescription>Cores semânticas, sempre com texto (não dependem só da cor).</CardDescription>
              </CardHeader>
              <div className="flex flex-wrap gap-2">
                <Badge tone="warning" dot>Pendente</Badge>
                <Badge tone="info" dot>Confirmado</Badge>
                <Badge tone="brand" dot>Em atendimento</Badge>
                <Badge tone="success" dot>Concluído</Badge>
                <Badge tone="neutral" dot>Cancelado</Badge>
                <Badge tone="danger" dot>Não compareceu</Badge>
              </div>
              <Alert tone="success" title="Agendamento confirmado">O cliente será avisado assim que as notificações forem configuradas.</Alert>
              <Alert tone="warning" title="Pagamento pendente">Sua assinatura venceu há 2 dias. Tolerância até sexta-feira.</Alert>
              <div className="grid gap-2" aria-label="Carregando">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </Card>
          </div>
        </section>

        {/* BENTO PREVIEW */}
        <section aria-labelledby="bento" className="grid gap-6">
          <SectionTitle id="bento" title="Prévia de Bento Grid" subtitle="Base para a seção de funcionalidades da landing (Fase 2)." />
          <div className="grid auto-rows-[160px] gap-4 md:grid-cols-4">
            <GlassPanel className="border-beam p-6 md:col-span-2 md:row-span-2">
              <CalendarClock className="size-7 text-sky" />
              <p className="mt-4 text-2xl font-semibold tracking-tight">Agendamento online</p>
              <p className="mt-2 max-w-sm text-muted-foreground">Seus clientes marcam pelo link exclusivo, só em horários realmente livres.</p>
            </GlassPanel>
            <Card className="p-6 md:col-span-2"><Scissors className="size-6 text-sky" /><p className="mt-3 font-semibold">Gestão de serviços</p></Card>
            <Card className="p-6"><Users className="size-6 text-sky" /><p className="mt-3 font-semibold">Profissionais</p></Card>
            <Card className="p-6"><Wallet className="size-6 text-sky" /><p className="mt-3 font-semibold">Financeiro</p></Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <header className="grid gap-1">
      <h2 id={id} className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </header>
  );
}
