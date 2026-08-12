"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// M2.16 — Hero "living diagram", ported 1:1 from the dossier design (Home.dc.html · componentDidMount).
// Six operator nodes on a ring, a connection ring, a scanning federation arc, a soft central halo,
// centre↔operator radials with bidirectional packets, peer-to-peer chords with a ping-pong exchange
// packet, and operator nodes with a pulsing handshake ring. Message: interoperability — there is NO
// central system/operator. The draw loop (frame) is byte-faithful to the design; only the loop
// lifecycle is StrictMode-safe (external ticker owns the rAF id; cleanup cancels it), and
// prefers-reduced-motion renders a single static frame. The central medallion carries the BANZA crest.

export function HomeHeroDiagram() {
  const diagRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dcv = diagRef.current;
    const cont = boxRef.current;
    if (!dcv || !cont) return;
    const ctx = dcv.getContext("2d");
    if (!ctx) return;

    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let stopped = false;
    const N = 6; // operators
    let dpr = 1, cw = 0, ch = 0, center = { x: 0, y: 0, r: 60 }, R = 200;
    // operator angular offsets (slight irregularity for an organic, professional feel)
    const jitter = [-0.06, 0.05, -0.03, 0.07, -0.05, 0.04];
    const measure = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cr = dcv.getBoundingClientRect(); cw = cr.width; ch = cr.height;
      dcv.width = Math.round(cw * dpr); dcv.height = Math.round(ch * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ce = cont.querySelector("[data-center]");
      if (ce) { const cb = (ce as HTMLElement).getBoundingClientRect(); center = { x: cb.left + cb.width / 2 - cr.left, y: cb.top + cb.height / 2 - cr.top, r: cb.width / 2 }; }
      else { center = { x: cw / 2, y: ch / 2, r: cw * 0.14 }; }
      R = Math.min(cw, ch) * 0.40;
    };
    measure();
    const onR = () => measure(); window.addEventListener("resize", onR);
    const t1 = setTimeout(measure, 350); const t2 = setTimeout(measure, 900);

    const ops = () => Array.from({ length: N }, (_, i) => {
      const ang = -Math.PI / 2 + i * (Math.PI * 2 / N) + (jitter[i] || 0);
      return { i, ang, x: center.x + Math.cos(ang) * R, y: center.y + Math.sin(ang) * R };
    });
    // interoperability sessions: pairs of operators exchanging (peer-to-peer)
    const pairs = [[0, 2], [1, 4], [3, 5], [2, 5], [0, 3]];
    const t0 = performance.now();

    const frame = (now: number) => {
      if (stopped) return;
      const tt = (now - t0) / 1000;
      ctx.clearRect(0, 0, cw, ch);
      const O = ops();
      const puls = 0.5 + 0.5 * Math.sin(tt * 1.4);

      // faint outer orbit rings
      ctx.save();
      ctx.strokeStyle = "rgba(142,19,38,0.10)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(center.x, center.y, R * 1.28, 0, 7); ctx.stroke();
      ctx.strokeStyle = "rgba(142,19,38,0.07)";
      ctx.beginPath(); ctx.arc(center.x, center.y, R * 1.12, 0, 7); ctx.stroke();
      ctx.restore();

      // drifting particles on outer orbits
      for (let k = 0; k < 9; k++) {
        const orb = k % 2 ? R * 1.28 : R * 1.12;
        const spd = k % 2 ? 0.10 : -0.14;
        const ang = (tt * spd) + k * (Math.PI * 2 / 9);
        const px = center.x + Math.cos(ang) * orb, py = center.y + Math.sin(ang) * orb;
        ctx.globalAlpha = 0.35 + 0.3 * Math.sin(tt * 2 + k);
        ctx.fillStyle = "rgba(142,19,38,0.6)";
        ctx.beginPath(); ctx.arc(px, py, k % 3 === 0 ? 2.6 : 1.7, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // central connection ring through the operators
      ctx.strokeStyle = "rgba(142,19,38," + (0.16 + puls * 0.10) + ")"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(center.x, center.y, R, 0, 7); ctx.stroke();

      // scanning arc — active federation sweep
      const sa = (tt * 0.55) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(142,19,38,0.55)"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(center.x, center.y, R, sa, sa + 0.55); ctx.stroke(); ctx.lineCap = "butt";

      // central halo
      const hr = center.r + 10 + puls * 14;
      const g = ctx.createRadialGradient(center.x, center.y, center.r * 0.5, center.x, center.y, hr + 30);
      g.addColorStop(0, "rgba(142,19,38," + (0.16 + puls * 0.12) + ")"); g.addColorStop(1, "rgba(142,19,38,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(center.x, center.y, hr + 30, 0, 7); ctx.fill();

      // spokes: center <-> each operator, with bidirectional packets (protocol traffic)
      O.forEach((nd, i) => {
        const dx = nd.x - center.x, dy = nd.y - center.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const x1 = center.x + ux * (center.r + 3), y1 = center.y + uy * (center.r + 3);
        ctx.strokeStyle = "rgba(142,19,38,0.16)"; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(nd.x, nd.y); ctx.stroke();
        // midpoint relay dot
        const mx = center.x + ux * R * 0.5, my = center.y + uy * R * 0.5;
        ctx.fillStyle = "rgba(142,19,38,0.5)"; ctx.beginPath(); ctx.arc(mx, my, 2, 0, 7); ctx.fill();
        // packets
        for (let k = 0; k < 2; k++) {
          const dir = k === 0 ? 1 : -1;
          let p = ((tt * 0.34) + i * 0.17 + k * 0.5) % 1;
          if (dir < 0) p = 1 - p;
          const px = x1 + (nd.x - x1) * p, py = y1 + (nd.y - y1) * p;
          const a = Math.sin((dir < 0 ? 1 - p : p) * Math.PI);
          ctx.globalAlpha = 0.25 + a * 0.7; ctx.fillStyle = k === 0 ? "#C2566A" : "#8E1326";
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        }
      });

      // peer-to-peer interoperability chords (curved, with a travelling exchange packet)
      pairs.forEach((pr, idx) => {
        const a = O[pr[0]], b = O[pr[1]];
        if (!a || !b) return;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const cx = center.x + (mx - center.x) * 0.42, cy = center.y + (my - center.y) * 0.42;
        const active = 0.5 + 0.5 * Math.sin(tt * 0.8 + idx * 1.3);
        ctx.strokeStyle = "rgba(142,19,38," + (0.06 + active * 0.16) + ")"; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx, cy, b.x, b.y); ctx.stroke();
        // exchange packet ping-ponging along the chord
        const p = ((tt * 0.28) + idx * 0.31) % 1;
        const tp = p < 0.5 ? p * 2 : (1 - p) * 2; // ping-pong 0..1
        const q = 1 - tp, bx = q * q * a.x + 2 * q * tp * cx + tp * tp * b.x, by = q * q * a.y + 2 * q * tp * cy + tp * tp * b.y;
        const gg = ctx.createRadialGradient(bx, by, 0, bx, by, 7);
        gg.addColorStop(0, "rgba(194,86,106,0.9)"); gg.addColorStop(1, "rgba(194,86,106,0)");
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(bx, by, 7, 0, 7); ctx.fill();
        ctx.fillStyle = "#8E1326"; ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, 7); ctx.fill();
      });

      // operator nodes
      O.forEach((nd, i) => {
        const beat = 0.5 + 0.5 * Math.sin(tt * 1.6 + i * 1.05);
        const ng = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, 16 + beat * 6);
        ng.addColorStop(0, "rgba(142,19,38," + (0.28 + beat * 0.22) + ")"); ng.addColorStop(1, "rgba(142,19,38,0)");
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(nd.x, nd.y, 16 + beat * 6, 0, 7); ctx.fill();
        // expanding ping ring (handshake)
        const pr2 = ((tt * 0.5) + i * 0.3) % 1;
        ctx.globalAlpha = (1 - pr2) * 0.5; ctx.strokeStyle = "#8E1326"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, 7 + pr2 * 16, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        // node body
        ctx.fillStyle = "#8E1326"; ctx.beginPath(); ctx.arc(nd.x, nd.y, 6.5, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(251,239,240,0.9)"; ctx.beginPath(); ctx.arc(nd.x, nd.y, 2.2, 0, 7); ctx.fill();
      });
    };

    // StrictMode-safe loop: an external ticker owns the rAF id; cleanup cancels it (byte-identical draw).
    // The loop is SUSPENDED when the diagram is scrolled out of the viewport (IntersectionObserver) or
    // the tab is hidden (visibilitychange) — no CPU is spent animating pixels no one is looking at. The
    // draw is time-based (t0 anchor), so on resume it continues from real elapsed time with no jump.
    let rafId = 0, running = false;
    const tick = (now: number) => { if (stopped || !running) return; frame(now); rafId = requestAnimationFrame(tick); };
    const start = () => { if (running || stopped || reduce) return; running = true; rafId = requestAnimationFrame(tick); };
    const stop = () => { running = false; cancelAnimationFrame(rafId); };
    const t1b = setTimeout(() => { if (reduce && !stopped) frame(performance.now()); }, 360);
    const t2b = setTimeout(() => { if (reduce && !stopped) frame(performance.now()); }, 920);

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((e) => e.isIntersecting);
          if (visible) { if (reduce) frame(performance.now()); else start(); }
          else stop();
        },
        { threshold: 0 }
      );
      io.observe(cont);
    } else if (!reduce) {
      start(); // no IO support → animate while mounted
    }
    const onVis = () => { if (document.hidden) stop(); else if (!reduce) start(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopped = true;
      stop();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onR);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t1b); clearTimeout(t2b);
    };
  }, []);

  return (
    <div style={{ position: "relative", minWidth: 0, minHeight: "clamp(320px,34vw,460px)", overflow: "visible" }}>
      <div
        ref={boxRef}
        aria-hidden="true"
        style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-40%)", width: "min(540px,100%)", aspectRatio: "1", pointerEvents: "none", zIndex: 0 }}
      >
        <canvas ref={diagRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <div
          data-center
          style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "clamp(118px,23%,150px)", aspectRatio: "1", borderRadius: "50%",
            background: "radial-gradient(circle at 38% 30%,#6E0F1D 0%,#4A0912 55%,#2A0509 100%)",
            boxShadow: "0 18px 44px rgba(94,12,24,0.34)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
          }}
        >
          <Image src="/banza-crest-hd.png" alt="BANZA" width={108} height={108} style={{ width: "64%", height: "auto" }} priority />
        </div>
      </div>
    </div>
  );
}
