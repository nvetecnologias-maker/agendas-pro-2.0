import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-surface-2/70 px-3.5 text-base md:text-[15px] text-halo placeholder:text-subtle-foreground",
        "transition-[border-color,box-shadow,background-color] duration-200",
        "hover:border-sky/30 focus-visible:outline-none focus-visible:border-sky/60 focus-visible:bg-surface-2 focus-visible:shadow-[0_0_0_4px_rgba(117,181,255,0.12)]",
        "aria-[invalid=true]:border-danger/80 aria-[invalid=true]:bg-danger/5 aria-[invalid=true]:focus-visible:shadow-[0_0_0_4px_rgba(248,113,113,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
