"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Revela um título palavra por palavra. Partes com `accent` recebem o gradiente da marca. */
export function WordReveal({
  parts,
  className,
  delay = 0,
  as: Tag = "h1",
}: {
  parts: { text: string; accent?: boolean }[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "p";
}) {
  let index = 0;
  return (
    <Tag className={className}>
      {/* texto completo para leitores de tela; animação é decorativa */}
      <span className="sr-only">{parts.map((p) => p.text).join(" ")}</span>
      <span aria-hidden>
        {parts.map((part, pi) =>
          part.text.split(" ").map((word, wi) => {
            const i = index++;
            return (
              <span key={`${pi}-${wi}`} className="inline-block overflow-hidden pb-[0.12em] align-top">
                <motion.span
                  className={cn("inline-block", part.accent && "text-gradient")}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ duration: 0.45, delay: delay + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                </motion.span>
                &nbsp;
              </span>
            );
          }),
        )}
      </span>
    </Tag>
  );
}
