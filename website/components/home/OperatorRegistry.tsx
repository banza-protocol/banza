"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { REGISTRY_SUMMARY } from "@/lib/protocolStatus";

// Home v2 (dossier-home-v2 · Home.dc.html registry) — "REGISTO DE OPERADORES": counters + a horizontal
// marquee of operator cards. Data comes from the public registry (GET /operators, no auth); while the
// real list is empty (pre-production) the prototype fallback is shown: Operador Zero (read-only reference
// implementation, demo · não certificado) + empty "registo vazio" cards. The "operadores registados"
// counter reflects ONLY real registry entries — Operador Zero is the canonical reference implementation
// and is never counted as a registered/certified operator. The marquee pauses on hover and honours
// prefers-reduced-motion (globals.css [data-marquee]).

const F_DISPLAY = "var(--font-display), serif";
const F_SERIF = "var(--font-serif), serif";
const F_MONO = "var(--font-mono), monospace";

type Operator = { name: string; id: string; status: string; level: string; href?: string; demo?: boolean; empty?: boolean };

const FALLBACK: Operator[] = [
  { name: "Operador Zero", id: "operator-zero", status: "implementação de referência (demo, só leitura) · não certificado", level: "KZ_DEMO", href: "https://zero.banza.network/", demo: true },
];

function decorate(o: Operator) {
  const initials = o.empty ? "—" : (o.name || "").slice(0, 2).toUpperCase();
  return {
    ...o,
    href: o.href || "/operadores",
    initials,
    bg: o.empty ? "transparent" : "linear-gradient(180deg,#FFFFFF 0%,#FCF9F3 100%)",
    bd: o.empty ? "rgba(184,152,96,0.45)" : "rgba(218,204,180,0.9)",
    bdStyle: o.empty ? "dashed" : "solid",
    avBg: o.empty ? "transparent" : "#FBF0EE",
    avBd: o.empty ? "rgba(184,152,96,0.45)" : "rgba(142,19,38,0.16)",
    avCol: o.empty ? "#B3A794" : "#8B1428",
    nameCol: o.empty ? "#978B7C" : "#1A1512",
    stCol: o.empty ? "#978B7C" : o.demo ? "#8E6A28" : "#2C6349",
    stDot: o.empty ? "#C9BEAB" : o.demo ? "#BE9440" : "#2C6349",
  };
}

export function OperatorRegistry() {
  const [operators, setOperators] = useState<Operator[]>(FALLBACK);
  // Count of REAL registry entries only (the fallback Operador Zero reference implementation is never
  // counted as a registered operator). Defaults to the canonical pre-production count (0) from the
  // single-source status module; the live /operators fetch overrides it with real registry data.
  const [registryCount, setRegistryCount] = useState(REGISTRY_SUMMARY.productionOperators);
  const mqRef = useRef<HTMLDivElement>(null);

  // Wire the marquee to the public registry (GET /operators). Keep the fallback while the list is empty
  // or unavailable — a registry entry is verifiable, not authorised, and no operator is certified today.
  useEffect(() => {
    let alive = true;
    fetch("/operators", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (alive && Array.isArray(list) && list.length > 0) {
          setOperators(list as Operator[]);
          setRegistryCount(list.length);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const opCount = String(registryCount).padStart(2, "0");
  const cards = useMemo(() => {
    const empty: Operator = { name: "Sem operador", id: "registo vazio", status: "nenhum registo publicado", level: "—", empty: true };
    const base = [...operators, empty, empty, empty, empty, empty];
    return [...base, ...base].map(decorate); // doubled for the seamless marquee loop
  }, [operators]);

  const pause = () => { if (mqRef.current) mqRef.current.style.animationPlayState = "paused"; };
  const play = () => { if (mqRef.current) mqRef.current.style.animationPlayState = "running"; };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "clamp(18px,3vw,44px)", paddingBottom: "clamp(20px,2.2vw,28px)", borderBottom: "1px solid rgba(184,152,96,0.30)" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2C6349", flex: "none", animation: "banzaGlow 2.4s ease-in-out infinite" }} />
            <span style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: "0.18em", color: "#7A7263" }}>REGISTO DE OPERADORES · PÚBLICO</span>
          </div>
          <h2 style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: "clamp(26px,3vw,42px)", lineHeight: 1.06, letterSpacing: "-0.02em", color: "#1A1512", margin: 0 }}>Quem faz parte <span style={{ color: "#8B1428", fontStyle: "italic" }}>do protocolo</span></h2>
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: "clamp(18px,2.4vw,36px)" }}>
          <div><div style={{ fontFamily: F_MONO, fontSize: "clamp(26px,2.6vw,34px)", color: "#1A1512", lineHeight: 1 }}>0</div><div style={{ fontSize: 12, color: "#8A7F70", marginTop: 8, letterSpacing: "0.02em" }}>Certificados</div></div>
          <span style={{ width: 1, background: "linear-gradient(180deg,rgba(184,152,96,0),rgba(184,152,96,0.5),rgba(184,152,96,0))" }} />
          <div><div style={{ fontFamily: F_MONO, fontSize: "clamp(26px,2.6vw,34px)", color: "#1A1512", lineHeight: 1 }}>0</div><div style={{ fontSize: 12, color: "#8A7F70", marginTop: 8, letterSpacing: "0.02em" }}>Em conformidade</div></div>
          <span style={{ width: 1, background: "linear-gradient(180deg,rgba(184,152,96,0),rgba(184,152,96,0.5),rgba(184,152,96,0))" }} />
          <div><div style={{ fontFamily: F_MONO, fontSize: "clamp(26px,2.6vw,34px)", color: "#8B1428", lineHeight: 1 }}>{opCount}</div><div style={{ fontSize: 12, color: "#8A7F70", marginTop: 8, letterSpacing: "0.02em" }}>Operadores registados</div></div>
        </div>
      </div>

      <div onMouseEnter={pause} onMouseLeave={play} style={{ position: "relative", marginTop: "clamp(26px,3vw,40px)", overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent 0%,#000 7%,#000 93%,transparent 100%)", maskImage: "linear-gradient(90deg,transparent 0%,#000 7%,#000 93%,transparent 100%)" }}>
        <div data-marquee ref={mqRef} style={{ display: "flex", gap: "clamp(12px,1.4vw,18px)", width: "max-content", animation: "banzaMarquee 42s linear infinite" }}>
          {cards.map((o, i) => (
            <a key={i} href={o.href} className="home-op-card" style={{ flex: "none", width: "clamp(220px,20vw,268px)", border: `1px ${o.bdStyle} ${o.bd}`, background: o.bg, borderRadius: 16, padding: "18px 20px", textDecoration: "none", display: "block", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: o.avBg, border: `1px solid ${o.avBd}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: F_MONO, fontSize: 12, color: o.avCol }}>{o.initials}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: F_SERIF, fontSize: 16, fontWeight: 600, color: o.nameCol, lineHeight: 1.2 }}>{o.name}</div>
                  <div style={{ fontFamily: F_MONO, fontSize: 10.5, letterSpacing: "0.08em", color: "#978B7C", marginTop: 3 }}>{o.id}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: F_MONO, fontSize: 10.5, letterSpacing: "0.06em", color: o.stCol }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: o.stDot, flex: "none" }} />{o.status}</span>
                <span style={{ fontFamily: F_MONO, fontSize: 10.5, color: "#978B7C" }}>{o.level}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: "clamp(30px,3.4vw,44px)", paddingTop: "clamp(18px,2vw,24px)", borderTop: "1px solid rgba(184,152,96,0.30)" }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#5D5348", margin: 0, maxWidth: "62ch" }}>Nenhum operador está certificado hoje. O registo é público e consultável sem autenticação — a entrada é verificável, não autorizada.</p>
      </div>
    </>
  );
}
