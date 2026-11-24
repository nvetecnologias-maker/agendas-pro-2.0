import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: { icon: Info, cls: "border-sky/25 bg-sky/10 text-sky" },
  success: { icon: CheckCircle2, cls: "border-success/25 bg-success/10 text-success" },
  warning: { icon: TriangleAlert, cls: "border-warning/25 bg-warning/10 text-warning" },
  danger: { icon: AlertCircle, cls: "border-danger/25 bg-danger/10 text-danger" },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="grid gap-0.5">
        {title && <p className="font-medium text-halo">{title}</p>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
