"use client";

import { motion, type HTMLMotionProps } from "motion/react";

/** Entrada suave ao aparecer na tela (respeita reduced motion via MotionConfig) */
export function Reveal({
  delay = 0,
  y = 12,
  children,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: Math.min(delay, 0.15), ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
