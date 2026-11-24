"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Gerenciador ÚNICO de rolagem suave.
 * Existe uma só instância de Lenis na aplicação, sincronizada com o
 * GSAP ScrollTrigger pelo ticker do GSAP. Componentes de parallax usam
 * useSmoothScroll() em vez de criar o próprio Lenis.
 */
const SmoothScrollContext = createContext<Lenis | null>(null);

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const tickerRef = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (reducedMotion) {
      ScrollTrigger.refresh();
      return; // rolagem nativa
    }

    const instance = new Lenis({ duration: 0.9, smoothWheel: true, touchMultiplier: 1.2 });
    instance.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => instance.raf(time * 1000);
    tickerRef.current = tick;
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    return () => {
      if (tickerRef.current) gsap.ticker.remove(tickerRef.current);
      instance.off("scroll", ScrollTrigger.update);
      instance.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  return <SmoothScrollContext.Provider value={lenis}>{children}</SmoothScrollContext.Provider>;
}
