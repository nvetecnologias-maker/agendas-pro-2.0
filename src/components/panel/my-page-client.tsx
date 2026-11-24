"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Download, ExternalLink, Globe, MessageCircle, Pencil, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/panel/page-header";
import { setPublishedAction, updateSlugAction } from "@/app/painel/(app)/minha-agenda/actions";

export function MyPageClient({
  url, slug, shopName, published, qrSvg, qrPng, hasServices, canOperate,
}: {
  url: string; slug: string; shopName: string; published: boolean; qrSvg: string; qrPng: string; hasServices: boolean; canOperate: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [editSlug, setEditSlug] = React.useState(false);
  const [newSlug, setNewSlug] = React.useState(slug);
  const [pending, start] = React.useTransition();
  const display = url.replace(/^https?:\/\//, "");
  const shareText = `Agende seu horário na ${shopName} pelo link: ${url}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: shopName, text: shareText, url }); } catch { /* cancelado */ }
    } else copy();
  };

  return (
    <div className="grid gap-5">
      <PageHeader title="Minha agenda" description="Compartilhe sua agenda e receba agendamentos online." />

      {!published && (
        <Alert tone="warning" title="Sua agenda ainda não está publicada">
          {hasServices ? "Ative a publicação abaixo para que os clientes consigam agendar." : "Cadastre ao menos um serviço com profissional e depois publique."}
        </Alert>
      )}
      {!canOperate && <Alert tone="danger" title="Agendamento online pausado">Sua assinatura não está ativa. Regularize em Minha assinatura para voltar a receber agendamentos.</Alert>}

      <section className="relative overflow-hidden rounded-[28px] border border-sky/20 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(36,103,242,0.45),rgba(2,0,111,0.55)_45%,rgba(3,11,32,0.9))] p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={published ? "success" : "warning"} dot>{published ? "Publicada" : "Não publicada"}</Badge>
        </div>
        <p className="mt-4 text-[13px] text-halo/70">Seu link exclusivo</p>
        {editSlug ? (
          <div className="mt-2 grid gap-2">
            <div className="flex items-center overflow-hidden rounded-xl border border-white/15 bg-ink/40">
              <span className="shrink-0 pl-3 text-sm text-muted-foreground">{display.replace(slug, "")}</span>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="h-12 border-0 bg-transparent pl-0.5 font-mono focus:ring-0" aria-label="Endereço do link" />
            </div>
            <p className="text-[12px] text-warning">Atenção: o link antigo deixará de funcionar. Atualize QR Codes impressos.</p>
            <div className="flex gap-2">
              <Button variant="subtle" onClick={() => { setEditSlug(false); setNewSlug(slug); }}>Cancelar</Button>
              <Button loading={pending} onClick={() => start(async () => {
                const r = await updateSlugAction(newSlug);
                if (r.ok) { toast.success(r.message!); setEditSlug(false); router.refresh(); } else toast.error(r.error);
              })}>Salvar link</Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <p className="min-w-0 break-all font-mono text-lg font-semibold text-white md:text-2xl">{display}</p>
            <button type="button" onClick={() => setEditSlug(true)} className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-halo" aria-label="Editar link"><Pencil className="size-4" /></button>
          </div>
        )}

        <Button size="lg" onClick={copy} className="mt-5 h-14 w-full text-base font-semibold tracking-wide md:w-auto md:px-10">
          {copied ? <Check /> : <Copy />} {copied ? "LINK COPIADO" : "COPIAR LINK DA MINHA AGENDA"}
        </Button>
        <div className="mt-3 grid grid-cols-3 gap-2 md:flex">
          <Button variant="glass" asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>
          </Button>
          <Button variant="glass" onClick={share}><Share2 /> Enviar</Button>
          <Button variant="glass" asChild><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Abrir</a></Button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="grid content-start gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-5">
          <h2 className="text-base font-semibold text-halo">QR Code</h2>
          <p className="text-sm text-muted-foreground">Imprima e deixe no balcão ou no espelho: o cliente aponta a câmera e agenda.</p>
          <div className="mx-auto w-full max-w-[240px] rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label={`QR Code do link ${display}`} role="img" />
          <Button variant="subtle" asChild>
            <a href={qrPng} download={`qrcode-${slug}.png`}><Download /> Baixar QR Code (PNG)</a>
          </Button>
        </section>

        <section className="grid content-start gap-3 rounded-2xl border border-white/[0.07] bg-surface-1 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-halo">Pré-visualização</h2>
            <Globe className="size-4 text-sky" />
          </div>
          <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[32px] border-[6px] border-[#0c1a3d] bg-navy shadow-2xl">
            <iframe src={`/${slug}?preview=1`} title="Pré-visualização da página de agendamento" className="h-[560px] w-full" loading="lazy" />
          </div>
          <Switch
            label="Agenda publicada"
            description="Quando desligada, o link mostra que a agenda está indisponível"
            checked={published}
            disabled={pending}
            onCheckedChange={(v) => start(async () => {
              const r = await setPublishedAction(v);
              if (r.ok) { toast.success(r.message!); router.refresh(); } else toast.error(r.error);
            })}
          />
        </section>
      </div>
    </div>
  );
}
