import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-halo md:text-[28px]">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-2xl bg-electric/15 text-sky">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-medium text-halo">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "brand";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4",
        tone === "brand"
          ? "border-sky/20 bg-[linear-gradient(145deg,rgba(36,103,242,0.35),rgba(2,0,111,0.35))]"
          : "border-white/[0.07] bg-surface-1",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-sky" aria-hidden />}
      </div>
      <p className="mt-2 font-mono text-[22px] font-semibold tracking-tight text-halo tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-subtle-foreground">{hint}</p>}
    </div>
  );
}
