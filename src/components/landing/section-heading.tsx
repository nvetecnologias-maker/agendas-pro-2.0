import { Reveal } from "@/components/animations/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-sky">{eyebrow}</p>
      <h2 id={id} className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-halo sm:text-5xl">
        {title}
      </h2>
      {subtitle && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subtitle}</p>}
    </Reveal>
  );
}
