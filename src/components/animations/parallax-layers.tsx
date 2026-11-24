"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Parallax em camadas (inspirado no Parallax Scrolling da Osmo).
 * Cada filho com data-parallax-speed="N" se move N% da própria altura
 * enquanto a seção atravessa a tela. Usa o ScrollTrigger sincronizado
 * com o Lenis central (SmoothScrollProvider): nenhuma instância extra de Lenis.
 */
export function ParallaxLayers({
  children,
  className,
  start = "top bottom",
  end = "bottom top",
}: {
  children: React.ReactNode;
  className?: string;
  start?: string;
  end?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();

  React.useEffect(() => {
    const root = ref.current;
    if (!root || reduce) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>("[data-parallax-speed]").forEach((el) => {
        const speed = Number(el.dataset.parallaxSpeed ?? 0);
        gsap.fromTo(
          el,
          { yPercent: -speed / 2 },
          {
            yPercent: speed / 2,
            ease: "none",
            scrollTrigger: { trigger: root, start, end, scrub: true },
          },
        );
      });
    }, root);

    return () => ctx.revert(); // remove tweens e ScrollTriggers desta seção
  }, [reduce, start, end]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
