import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[transform,background-color,box-shadow,color,opacity] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Ação principal: azul elétrico com brilho interno
        primary:
          "bg-[linear-gradient(180deg,#3b7bff_0%,#2467f2_55%,#1a52d0_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_-8px_rgba(36,103,242,0.8)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_32px_-8px_rgba(36,103,242,0.95)] hover:brightness-110",
        // Botão de vidro: navegação, ações secundárias sobre gradientes
        glass:
          "glass text-halo hover:bg-white/10",
        outline:
          "border border-input bg-transparent text-halo hover:bg-surface-2 hover:border-sky/40",
        ghost: "text-muted-foreground hover:bg-surface-2 hover:text-halo",
        subtle: "bg-surface-2 text-halo hover:bg-surface-3",
        destructive:
          "bg-danger/90 text-white hover:bg-danger shadow-[0_8px_24px_-10px_rgba(248,113,113,0.7)]",
        link: "text-sky underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base rounded-2xl",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
