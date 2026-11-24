"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * RIBBON FIELD — gradiente animado em faixas (WebGL)
 * Recriação do efeito "Animated Mesh Gradient · Ribbon Field" com os
 * parâmetros definidos para o Agendas Pro. Todos os valores animados são
 * contínuos (float), sem arredondamento, e o tempo começa já "em movimento"
 * para não haver salto na inicialização.
 */

export type RibbonStop = { color: string; position: number }; // position 0..100

export type RibbonFieldParams = {
  stops: RibbonStop[];
  angle: number;
  centerX: number;
  centerY: number;
  scale: number;
  softness: number;
  wave: number;
  distortion: number;
  grain: number;
  vignette: number;
  count: number;
  fade: number;
  spread: number;
  soften: number;
  animated: boolean;
  speed: number;
  motionAmount: number;
  motionReverse: boolean;
};

/** Parâmetros oficiais do briefing */
export const AGENDAS_PRO_RIBBON: RibbonFieldParams = {
  stops: [
    { color: "#F7F3FF", position: 5 },   // Halo
    { color: "#083DA9", position: 33 },  // Lapis
    { color: "#02006F", position: 57 },  // Midnight
    { color: "#000000", position: 100 }, // Ink
  ],
  angle: 136,
  centerX: 50,
  centerY: 50,
  scale: 68,
  softness: 26,
  wave: 12,
  distortion: 28,
  grain: 8,
  vignette: 3,
  count: 12,
  fade: 66,
  spread: 5,
  soften: 80,
  animated: true,
  speed: 100,
  motionAmount: 100,
  motionReverse: false,
};

/** Versão discreta (painel, seções secundárias): menos movimento e contraste */
export const AGENDAS_PRO_RIBBON_SUBTLE: RibbonFieldParams = {
  ...AGENDAS_PRO_RIBBON,
  stops: [
    { color: "#75B5FF", position: 2 },
    { color: "#083DA9", position: 28 },
    { color: "#02006F", position: 55 },
    { color: "#030B20", position: 100 },
  ],
  wave: 8,
  distortion: 18,
  speed: 45,
  motionAmount: 60,
  fade: 75,
};

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec3  u_colors[4];
uniform float u_pos[4];
uniform float u_angle, u_scale, u_softness, u_wave, u_distortion, u_grain;
uniform float u_vignette, u_count, u_fade, u_spread, u_soften, u_motion;
uniform vec2  u_center;

// ruído suave (value noise) para a distorção orgânica
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

vec3 ramp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = u_colors[0];
  for (int i = 0; i < 3; i++) {
    float a = u_pos[i], b = u_pos[i + 1];
    float k = smoothstep(a, b, t);
    c = mix(c, u_colors[i + 1], k);
  }
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv - u_center;
  p.x *= u_res.x / u_res.y;

  // rotação pelo ângulo
  float a = radians(u_angle);
  mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
  p = rot * p;
  p /= max(u_scale, 0.05);

  float t = u_time;

  // distorção orgânica (domain warping)
  vec2 warp = vec2(fbm(p * 1.6 + vec2(t * 0.11, -t * 0.07)), fbm(p * 1.6 + vec2(-t * 0.09, t * 0.13))) - 0.5;
  p += warp * u_distortion * 1.4 * u_motion;

  // ondulação ao longo das faixas
  p.y += sin(p.x * 3.2 + t * 0.6) * u_wave * 0.35 * u_motion;

  // eixo principal do gradiente (0 = halo, 1 = ink)
  float g = p.x * 0.5 + 0.5;

  // faixas: cada ribbon é uma banda suave; spread desloca a fase de cada uma
  float stripeCoord = p.y * u_count * 0.5 + g * u_spread * 6.0;
  float band = fract(stripeCoord);
  float edge = max(u_softness, 0.02) * 0.5;
  float ribbon = smoothstep(0.0, edge, band) * (1.0 - smoothstep(1.0 - edge, 1.0, band));
  float ribbonIdx = floor(stripeCoord);
  float jitter = hash(vec2(ribbonIdx, 3.7)) - 0.5;

  // fade: as faixas somem ao se afastar do centro do campo
  float fadeMask = 1.0 - smoothstep(0.0, max(u_fade, 0.05) * 1.6, abs(p.y));

  float stripeG = g + (ribbon - 0.5) * 0.22 * fadeMask + jitter * 0.06 * fadeMask;
  // soften: mistura entre faixas marcadas e gradiente contínuo
  float finalG = mix(stripeG, g, u_soften * 0.6);
  finalG += (ribbon - 0.5) * 0.08 * fadeMask * (1.0 - u_soften * 0.5);

  vec3 col = ramp(finalG);

  // iluminação volumétrica sutil sobre as cristas das faixas
  col += vec3(0.46, 0.71, 1.0) * pow(ribbon, 6.0) * 0.06 * fadeMask;

  // vinheta
  vec2 vq = uv - 0.5;
  col *= 1.0 - dot(vq, vq) * u_vignette * 6.0;

  // grão de filme (estático por pixel, varia levemente no tempo)
  float gr = hash(gl_FragCoord.xy + fract(t * 7.0) * 100.0) - 0.5;
  col += gr * u_grain * 0.35;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Fallback em CSS com as mesmas cores (sem WebGL ou antes do 1º frame) */
function cssFallback(params: RibbonFieldParams) {
  const stops = params.stops.map((s) => `${s.color} ${s.position}%`).join(", ");
  return `linear-gradient(${params.angle - 90}deg, ${stops})`;
}

export function RibbonField({
  params = AGENDAS_PRO_RIBBON,
  className,
  quality = 1,
  children,
}: {
  params?: RibbonFieldParams;
  className?: string;
  /** 0.35–1: fração da resolução renderizada. Use menos em áreas secundárias. */
  quality?: number;
  children?: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) return; // fica o fallback em CSS

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("[RibbonField]", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const p = params;
    const sorted = [...p.stops].sort((x, y) => x.position - y.position).slice(0, 4);
    gl.uniform3fv(u("u_colors"), new Float32Array(sorted.flatMap((s) => hexToRgb(s.color))));
    gl.uniform1fv(u("u_pos"), new Float32Array(sorted.map((s) => s.position / 100)));
    gl.uniform1f(u("u_angle"), p.angle);
    gl.uniform2f(u("u_center"), p.centerX / 100, p.centerY / 100);
    gl.uniform1f(u("u_scale"), p.scale / 100);
    gl.uniform1f(u("u_softness"), p.softness / 100);
    gl.uniform1f(u("u_wave"), p.wave / 100);
    gl.uniform1f(u("u_distortion"), p.distortion / 100);
    gl.uniform1f(u("u_grain"), p.grain / 100);
    gl.uniform1f(u("u_vignette"), p.vignette / 100);
    gl.uniform1f(u("u_count"), p.count);
    gl.uniform1f(u("u_fade"), p.fade / 100);
    gl.uniform1f(u("u_spread"), p.spread / 100);
    gl.uniform1f(u("u_soften"), p.soften / 100);
    gl.uniform1f(u("u_motion"), p.motionAmount / 100);
    const uRes = u("u_res");
    const uTime = u("u_time");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.max(0.25, Math.min(quality, 1));
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // tempo contínuo; começa num ponto avançado para não "nascer" parado
    const direction = p.motionReverse ? -1 : 1;
    const rate = (p.speed / 100) * direction;
    const T0 = 12.0;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let t = T0;

    const draw = () => {
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); // evita salto após aba inativa
      last = now;
      t += dt * rate;
      draw();
      raf = requestAnimationFrame(loop);
    };

    draw();
    setReady(true);

    const animate = p.animated && !reducedMotion;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && animate) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [params, quality, reducedMotion]);

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: cssFallback(params) }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-[1200ms] ease-out",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
      {children && <div className="relative">{children}</div>}
    </div>
  );
}
