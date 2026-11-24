"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];

/**
 * Envio de imagem para o Storage (bucket barbershop-media/{barbearia}/...).
 * A política do bucket só aceita a pasta da própria barbearia.
 */
export function ImageUpload({
  shopId,
  folder,
  value,
  onChange,
  label,
  aspect = "square",
  className,
}: {
  shopId: string;
  folder: string;
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  aspect?: "square" | "wide";
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!TYPES.includes(file.type)) return toast.error("Use PNG, JPG, WEBP ou AVIF.");
    if (file.size > 5 * 1024 * 1024) return toast.error("A imagem pode ter no máximo 5 MB.");
    setBusy(true);
    try {
      const sb = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${shopId}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("barbershop-media").upload(path, file, { cacheControl: "31536000", upsert: false });
      if (error) throw error;
      onChange(sb.storage.from("barbershop-media").getPublicUrl(path).data.publicUrl);
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-sm font-medium text-halo">{label}</span>
      <div className={cn("relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.03]", aspect === "wide" ? "aspect-[3/1]" : "size-28")}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="grid size-full place-items-center text-muted-foreground">
            <span className="grid justify-items-center gap-1 text-[12px]">
              {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
              {busy ? "Enviando…" : "Adicionar"}
            </span>
          </button>
        )}
        {value && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button type="button" onClick={() => input.current?.click()} className="grid size-9 place-items-center rounded-xl bg-ink/70 text-halo backdrop-blur" aria-label="Trocar imagem">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            </button>
            <button type="button" onClick={() => onChange(null)} className="grid size-9 place-items-center rounded-xl bg-ink/70 text-danger backdrop-blur" aria-label="Remover imagem">
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
    </div>
  );
}
