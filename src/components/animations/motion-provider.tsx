"use client";

import { MotionConfig } from "motion/react";

/** Faz todas as animações Motion respeitarem prefers-reduced-motion */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
