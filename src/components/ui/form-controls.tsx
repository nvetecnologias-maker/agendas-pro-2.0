"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-input bg-surface-2 px-3.5 text-[15px] text-halo placeholder:text-subtle-foreground outline-none transition-colors focus:border-sky/60 focus:ring-2 focus:ring-ring/40 disabled:opacity-50 aria-[invalid=true]:border-danger/70 aria-[invalid=true]:bg-danger/5";

/** Select nativo (no celular abre o seletor do sistema, que é o mais rápido) */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  ),
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(control, "min-h-24 py-3 leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

/** Interruptor acessível (role="switch") com área de toque grande */
export function Switch({
  checked,
  onCheckedChange,
  name,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  name?: string;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}) {
  const autoId = React.useId();
  const htmlId = id ?? autoId;
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <label htmlFor={htmlId} className="grid gap-0.5">
        <span className="text-[15px] text-halo">{label}</span>
        {description && <span className="text-[13px] text-muted-foreground">{description}</span>}
      </label>
      <button
        id={htmlId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          checked ? "bg-electric" : "bg-white/15",
        )}
      >
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-[left]", checked ? "left-6" : "left-1")} />
      </button>
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
    </div>
  );
}

/** Controle segmentado (Dia/Semana/Mês/Lista, períodos etc.) */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex rounded-xl bg-white/5 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 flex-1 rounded-lg px-3 text-[13px] font-medium transition-colors",
            value === o.value ? "bg-electric text-white shadow-[0_6px_16px_-8px_rgba(36,103,242,0.9)]" : "text-muted-foreground hover:text-halo",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
