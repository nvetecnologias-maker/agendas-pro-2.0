"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Card com holofote que segue o cursor e borda iluminada */
export function SpotlightCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--sx", `${e.clientX - r.left}px`);
        el.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group/spot relative overflow-hidden rounded-3xl border border-border bg-surface-1/80 transition-colors duration-300 hover:border-sky/30",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{ background: "radial-gradient(500px circle at var(--sx,50%) var(--sy,50%), rgba(36,103,242,0.16), transparent 40%)" }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
