"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Painel deslizante pensado para o celular:
 *  - no celular sobe de baixo (bottom sheet), com alça e área segura
 *  - no desktop abre como painel lateral à direita
 */
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  title,
  description,
  children,
  className,
  footer,
  size = "md",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <Dialog.Content
        className={cn(
          "fixed z-50 flex flex-col border-white/10 bg-[#071535] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] outline-none",
          // celular: bottom sheet
          "inset-x-0 bottom-0 max-h-[92svh] rounded-t-[28px] border-t data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
          // desktop: lateral
          "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:rounded-none md:rounded-l-[28px] md:border-l md:border-t-0 md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right",
          size === "lg" ? "md:w-[560px]" : "md:w-[460px]",
          className,
        )}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/15 md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 md:px-6 md:pt-6">
          <div className="grid gap-1">
            <Dialog.Title className="text-lg font-semibold tracking-tight text-halo">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="text-sm text-muted-foreground">{description}</Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
            )}
          </div>
          <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-full bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-halo" aria-label="Fechar">
            <X className="size-5" />
          </Dialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-6">{children}</div>
        {footer && (
          <div className="border-t border-white/5 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-6">{footer}</div>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
