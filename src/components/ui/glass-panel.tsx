"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Painel Liquid Glass interativo: além do vidro (blur, borda, reflexo),
 * um brilho especular acompanha o ponteiro, simulando refração de luz.
 */
export function GlassPanel({
  className,
  children,
  strong = false,
  interactive = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { strong?: boolean; interactive?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    ref.current.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn(
        strong ? "glass-strong" : "glass",
        "group/glass overflow-hidden rounded-2xl",
        className,
      )}
      {...props}
    >
      {interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover/glass:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgba(117,181,255,0.16), transparent 45%)",
          }}
        />
      )}
      {/* reflexo superior (lâmina de luz) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
      {children}
    </div>
  );
}
