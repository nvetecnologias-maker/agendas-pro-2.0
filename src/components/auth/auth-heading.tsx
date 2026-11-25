export function AuthHeading({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <header className="mb-8 grid gap-2">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-halo sm:text-[28px]">{title}</h1>
      {subtitle && <p className="text-[15px] text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
