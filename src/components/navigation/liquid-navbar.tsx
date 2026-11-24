"use client";

/**
 * LIQUID NAVBAR · Agendas Pro
 * Inspirado no conceito "Waterline" (Nimbus UI), reescrito para a identidade azul:
 * - indicador líquido que se estica até o item escolhido (cabeça rápida, cauda elástica)
 * - em saltos longos o líquido se divide em gotas que voltam a se unir
 * - ondulação ao clicar, menisco que acompanha o cursor
 * - água desenhada em WebGL só dentro da pílula (pausa fora da tela); fallback em CSS
 * - setas/Home/End no teclado, aria-current, prefers-reduced-motion
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type LiquidIconFx = "hop" | "spin" | "pulse" | "tilt" | "none";

export type LiquidNavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  fx?: LiquidIconFx;
};

type Props = {
  items: LiquidNavItem[];
  /** índice ativo controlado (ex.: scroll-spy) */
  active?: number;
  defaultActive?: number;
  onSelect?: (index: number, item: LiquidNavItem) => void;
  /** só ícones (rótulos ficam para leitores de tela) */
  compact?: boolean;
  className?: string;
  "aria-label"?: string;
};

const PAD = 12; // margem do canvas em volta da pílula (sombras e ondas)
const MAX_RIPPLES = 4;
const MAX_DROPS = 3;
/** Gotas em saltos longos: desligado para manter o movimento discreto */
const ENABLE_DROPS = false;

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uHead;uniform vec4 uTail;uniform float uSquash;
uniform vec3 uDrop[${MAX_DROPS}];uniform vec4 uRip[${MAX_RIPPLES}];uniform vec3 uMouse;uniform float uAmb;

float sdPill(vec2 p,vec2 c,vec2 h){float r=min(16.,h.y);vec2 q=abs(p-c)-h+vec2(r);return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B){vec2 d=p-B.xy;d.y/=uSquash;float r=min(11.,B.w);vec2 q=abs(d)-vec2(B.z+B.w-r,B.w-r);return (length(max(q,0.))+min(max(q.x,q.y),0.)-r)*min(1.,uSquash);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float liquid(vec2 p){
  float d=smin(sdCap(p,uHead),sdCap(p,uTail),14.);
  for(int i=0;i<${MAX_DROPS};i++){ if(uDrop[i].z>.5){ d=smin(d,length(p-uDrop[i].xy)-uDrop[i].z,12.);} }
  return d;
}
float pill(vec2 p){return sdPill(p,uPill.xy+uPill.zw*.5,uPill.zw*.5);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){
  float w=0.;
  for(int i=0;i<${MAX_RIPPLES};i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*220.;w+=R.w*exp(-R.z*1.8)*sin(x*.32)*exp(-x*x/650.);}}
  vec2 m=p-uMouse.xy;w+=uMouse.z*3.*exp(-dot(m,m)/900.);
  w+=uAmb*(sin(p.x*.05+uTime*1.1)*.4+sin(p.x*.12-uTime*.8+p.y*.2)*.22);
  return w;
}
float H(vec2 p){float dp=pill(p);return lens(dp,uPill.w*.4)*2.2+lens(liquid(p),10.)*7.+waves(p)*smoothstep(0.,6.,-dp);}

void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
  float dp=pill(p);float dl=liquid(p);
  float h0=H(p);
  vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
  vec3 V=vec3(0.,0.,1.);
  float spec=pow(max(dot(reflect(-normalize(vec3(-.4,-.85,.8)),n),V),0.),60.);
  float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.7,.7)),n),V),0.),20.)*.35;
  float fres=clamp((1.-n.z)*4.,0.,1.);

  float pm=smoothstep(1.,-1.,dp);
  float lm=smoothstep(1.,-1.,dl)*smoothstep(1.,-2.,dp);

  // superfície da pílula: só reflexos (o vidro vem do CSS)
  vec3 sky=vec3(.459,.71,1.);vec3 electric=vec3(.141,.404,.949);
  float pa=clamp(pm*(fres*.35+spec*.7+spec2*.6),0.,1.);
  vec3 c=mix(vec3(1.),sky,.35)*pa;float a=pa;

  // corpo do líquido: azul elétrico translúcido com brilho interno
  float body=.5+.5*clamp(-n.y*3.,-1.,1.);
  float rim=lm*(1.-smoothstep(0.,7.,-dl));
  vec3 dc=mix(electric,sky,body*.7);
  float da=lm*(.42+.18*body);
  dc=mix(dc,vec3(.08,.2,.65),rim*.5);
  float hi=clamp(lm*(spec*1.3+spec2*.6),0.,1.);
  dc=mix(dc,vec3(1.),hi);da=max(da,hi);
  float edge=lm*smoothstep(-2.,0.,dl)*.45;
  dc=mix(dc,sky,edge);da=max(da,edge);

  c=dc*da+c*(1.-da);a=da+a*(1.-da);
  gl_FragColor=vec4(c*a,a);
}`;

type Body = { x: number; v: number };
type Drop = { x: number; y: number; vx: number; vy: number; r: number };
type Ripple = { x: number; y: number; age: number; amp: number };

function createGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const names = ["uRes", "uDpr", "uTime", "uPill", "uHead", "uTail", "uSquash", "uDrop", "uRip", "uMouse", "uAmb"];
  const u = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)])) as Record<string, WebGLUniformLocation | null>;
  return { gl, u, dispose: () => { gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(buf); } };
}

export function LiquidNavbar({ items, active, defaultActive = 0, onSelect, compact, className, ...rest }: Props) {
  const [inner, setInner] = React.useState(defaultActive);
  const current = active ?? inner;

  const navRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dropRef = React.useRef<HTMLSpanElement>(null);
  const itemRefs = React.useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  const [webgl, setWebgl] = React.useState(true);
  const [fx, setFx] = React.useState({ i: -1, n: 0 });

  // estado da simulação fora do React (60 fps sem re-render)
  const sim = React.useRef({
    head: { x: 0, v: 0 } as Body,
    tail: { x: 0, v: 0 } as Body,
    half: 0, halfTarget: 0, r: 18, cy: 0, target: 0,
    squash: 1, squashV: 0,
    drops: [] as Drop[], ripples: [] as Ripple[],
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false, split: false, ready: false,
    w: 0, h: 0, time: 0, raf: 0, last: 0,
    visible: true, reduce: false,
    gl: null as ReturnType<typeof createGL>,
  });

  const render = React.useCallback(() => {
    const s = sim.current;
    const g = s.gl;
    if (g) {
      const { gl, u } = g;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2);
      gl.uniform1f(u.uDpr, dpr);
      gl.uniform1f(u.uTime, s.time);
      gl.uniform4f(u.uPill, PAD, PAD, s.w, s.h);
      const sep = Math.abs(s.head.x - s.tail.x);
      const thin = Math.min(sep / (2 * (s.half + s.r) || 1), 1);
      gl.uniform4f(u.uHead, s.head.x, s.cy, s.half * (1 - 0.25 * thin), s.r * (1 - 0.12 * thin));
      gl.uniform4f(u.uTail, s.tail.x, s.cy, s.half * (1 - 0.8 * thin), s.r * (1 - 0.5 * thin));
      gl.uniform1f(u.uSquash, s.squash);
      const drops = new Float32Array(MAX_DROPS * 3);
      s.drops.slice(0, MAX_DROPS).forEach((d, i) => drops.set([d.x, d.y, d.r], i * 3));
      gl.uniform3fv(u.uDrop, drops);
      const rips = new Float32Array(MAX_RIPPLES * 4);
      s.ripples.slice(-MAX_RIPPLES).forEach((r, i) => rips.set([r.x, r.y, r.age, r.amp], i * 4));
      gl.uniform4fv(u.uRip, rips);
      gl.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
      gl.uniform1f(u.uAmb, 0); // sem ondulação contínua
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (dropRef.current) {
      const left = Math.min(s.head.x, s.tail.x) - s.half - s.r - PAD;
      const width = Math.abs(s.head.x - s.tail.x) + 2 * (s.half + s.r);
      dropRef.current.style.width = `${width}px`;
      dropRef.current.style.transform = `translateX(${left}px) scaleY(${s.squash})`;
    }
  }, []);

  const step = React.useCallback((dt: number) => {
    const s = sim.current;
    s.time += dt;
    s.half += (s.halfTarget - s.half) * Math.min(1, dt * 12);

    if (s.reduce) {
      s.head.x = s.tail.x = s.target;
      s.head.v = s.tail.v = 0;
      s.squash = 1;
      s.drops = [];
      s.moving = false;
    } else {
      // cabeça rápida, cauda elástica
      s.head.v += (230 * (s.target - s.head.x) - 26 * s.head.v) * dt;
      s.head.x += s.head.v * dt;
      s.tail.v += (75 * (s.target - s.tail.x) - 13 * s.tail.v) * dt;
      s.tail.x += s.tail.v * dt;

      // achata com a velocidade, volta com mola
      const sq = 1 - 0.18 * Math.min(Math.abs(s.head.v) / 1400, 1);
      s.squashV += (260 * (sq - s.squash) - 9 * s.squashV) * dt;
      s.squash += s.squashV * dt;

      // salto longo: o "pescoço" se rompe em gotas
      const sep = Math.abs(s.head.x - s.tail.x);
      if (ENABLE_DROPS && !s.split && s.moving && sep > 2 * (s.half + s.r) + 10) {
        s.split = true;
        [0.32, 0.52, 0.72].forEach((t, j) => {
          s.drops.push({
            x: s.tail.x + (s.head.x - s.tail.x) * t,
            y: s.cy + (Math.random() - 0.5) * 8,
            vx: (s.head.v + s.tail.v) * 0.4,
            vy: (Math.random() - 0.5) * 50,
            r: 5.5 + Math.random() * 2.5 - j * 0.6,
          });
        });
      }
      s.drops = s.drops.filter((d) => {
        d.vx += (95 * (s.target - d.x) - 9 * d.vx) * dt;
        d.vy += (90 * (s.cy - d.y) - 7 * d.vy) * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (Math.abs(s.target - d.x) < s.half + s.r * 0.5) d.r -= dt * 24;
        return d.r > 0.6;
      });

      const settled =
        Math.abs(s.target - s.head.x) < 0.3 && Math.abs(s.target - s.tail.x) < 0.5 &&
        Math.abs(s.head.v) < 3 && Math.abs(s.tail.v) < 3 && !s.drops.length && Math.abs(s.squash - 1) < 0.003;
      if (s.moving && settled) {
        s.moving = false;
        s.ripples.push({ x: s.target, y: s.cy, age: 0, amp: 0.3 });
      }
    }
    s.ripples.forEach((r) => (r.age += dt));
    s.ripples = s.ripples.filter((r) => r.age < 2.2);
    s.mouse.s += ((s.mouse.on ? 1 : 0) - s.mouse.s) * Math.min(1, dt * 7);
  }, []);

  const loop = React.useCallback(() => {
    const s = sim.current;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      step(dt);
      render();
      const busy = s.moving || s.ripples.length > 0 || s.drops.length > 0 || s.mouse.s > 0.01;
      // só anima enquanto há mudança (nada roda em segundo plano)
      s.raf = s.visible && busy ? requestAnimationFrame(tick) : 0;
    };
    s.raf = requestAnimationFrame(tick);
  }, [render, step]);

  const measure = React.useCallback(() => {
    const nav = navRef.current;
    const el = itemRefs.current[current];
    if (!nav || !el) return;
    const s = sim.current;
    s.w = nav.offsetWidth;
    s.h = nav.offsetHeight;
    s.r = el.offsetHeight / 2;
    s.halfTarget = Math.max(0, el.offsetWidth / 2 - s.r);
    s.cy = PAD + el.offsetTop + el.offsetHeight / 2;
    const x = PAD + el.offsetLeft + el.offsetWidth / 2;
    if (!s.ready) {
      s.head.x = s.tail.x = x;
      s.half = s.halfTarget;
      s.ready = true;
    } else if (Math.abs(x - s.target) > 0.5) {
      s.moving = true;
      s.split = false;
    }
    s.target = x;

    const cv = canvasRef.current;
    if (cv) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = s.w + PAD * 2;
      const H = s.h + PAD * 2;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        cv.style.width = `${W}px`;
        cv.style.height = `${H}px`;
      }
    }
    loop();
  }, [current, loop]);

  // montagem: WebGL, visibilidade, preferências
  React.useEffect(() => {
    const s = sim.current;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    s.reduce = mq.matches;
    const onMq = () => { s.reduce = mq.matches; loop(); };
    mq.addEventListener("change", onMq);

    const cv = canvasRef.current;
    s.gl = cv ? createGL(cv) : null;
    if (!s.gl) setWebgl(false);
    const onLost = (e: Event) => { e.preventDefault(); s.gl = null; setWebgl(false); };
    cv?.addEventListener("webglcontextlost", onLost);

    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; if (s.visible) loop(); });
    if (navRef.current) io.observe(navRef.current);
    const onVis = () => { s.visible = document.visibilityState === "visible"; if (s.visible) loop(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mq.removeEventListener("change", onMq);
      cv?.removeEventListener("webglcontextlost", onLost);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.gl?.dispose();
      s.gl = null;
    };
  }, [loop]);

  React.useLayoutEffect(() => { measure(); }, [measure, items.length, compact]);

  const measureRef = React.useRef(measure);
  measureRef.current = measure;
  React.useEffect(() => {
    const ro = new ResizeObserver(() => { sim.current.ready = false; measureRef.current(); });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, []);

  const toLocal = (clientX: number, clientY: number) => {
    const r = navRef.current!.getBoundingClientRect();
    return { x: clientX - r.left + PAD, y: clientY - r.top + PAD };
  };

  const select = (i: number) => {
    const item = items[i];
    if (!item) return;
    setFx((f) => ({ i, n: f.n + 1 }));
    if (i !== current) {
      if (active === undefined) setInner(i);
      onSelect?.(i, item);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, (i: number) => number> = {
      ArrowRight: (i) => (i + 1) % items.length,
      ArrowLeft: (i) => (i - 1 + items.length) % items.length,
      Home: () => 0,
      End: () => items.length - 1,
    };
    const fn = keys[e.key];
    if (!fn) return;
    e.preventDefault();
    const focused = itemRefs.current.findIndex((el) => el === document.activeElement);
    const next = fn(focused >= 0 ? focused : current);
    itemRefs.current[next]?.focus();
  };

  return (
    <nav
      ref={navRef}
      aria-label={rest["aria-label"] ?? "Navegação principal"}
      data-gl={webgl ? "on" : "off"}
      onKeyDown={onKeyDown}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const p = toLocal(e.clientX, e.clientY);
        Object.assign(sim.current.mouse, { x: p.x, y: p.y, on: true });
        loop();
      }}
      onPointerLeave={() => { sim.current.mouse.on = false; loop(); }}
      onPointerDown={(e) => {
        const s = sim.current;
        if (s.reduce) return;
        const p = toLocal(e.clientX, e.clientY);
        s.ripples.push({ x: p.x, y: p.y, age: 0, amp: 0.3 });
        loop();
      }}
      className={cn(
        "liquid-nav relative isolate inline-flex items-center gap-0.5 rounded-2xl p-1.5 select-none",
        className,
      )}
    >
      {/* vidro da barra */}
      <span
        aria-hidden
        className="absolute inset-0 -z-20 rounded-2xl border border-white/12 bg-[rgba(10,24,70,0.35)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_0_20px_rgba(117,181,255,0.08),0_12px_32px_-14px_rgba(0,0,0,0.7)] backdrop-blur-xl backdrop-saturate-150"
      />
      {/* água (WebGL) */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn("pointer-events-none absolute -z-10", !webgl && "hidden")}
        style={{ left: -PAD, top: -PAD }}
      />
      {/* fallback em CSS */}
      <span
        ref={dropRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1.5 bottom-1.5 left-0 -z-10 rounded-xl will-change-transform",
          "bg-[radial-gradient(120%_140%_at_30%_0%,rgba(255,255,255,0.45),transparent_55%),linear-gradient(180deg,#3b7bff,#2467f2)]",
          "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_6px_18px_-6px_rgba(36,103,242,0.8)]",
          webgl ? "hidden" : "block",
        )}
      />

      {items.map((item, i) => {
        const isActive = i === current;
        const kind = item.fx ?? "none";
        const playing = fx.i === i && kind !== "none";
        const content = (
          <>
            {item.icon && (
              <span
                key={playing ? fx.n : 0}
                data-fx={playing ? kind : undefined}
                className="liquid-nav-icon inline-flex shrink-0 [&_svg]:size-[17px]"
                aria-hidden
              >
                {item.icon}
              </span>
            )}
            <span className={cn(compact && "sr-only")}>{item.label}</span>
          </>
        );
        const common = {
          ref: (el: HTMLAnchorElement | HTMLButtonElement | null) => { itemRefs.current[i] = el; },
          "aria-current": isActive ? ("true" as const) : undefined,
          onClick: () => select(i),
          className: cn(
            "relative z-10 inline-flex h-10 items-center gap-2 rounded-xl text-[14px] font-medium tracking-[-0.01em] transition-colors duration-300 outline-none",
            "focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-0",
            compact ? "px-3" : "px-4",
            isActive ? "text-white" : "text-halo/65 hover:text-halo",
          ),
        };
        return item.href ? (
          <a key={item.id} href={item.href} {...common} ref={common.ref as React.Ref<HTMLAnchorElement>}>
            {content}
          </a>
        ) : (
          <button key={item.id} type="button" {...common} ref={common.ref as React.Ref<HTMLButtonElement>}>
            {content}
          </button>
        );
      })}
    </nav>
  );
}
