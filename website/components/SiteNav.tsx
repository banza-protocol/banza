"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navPrimary } from "@/lib/site";
import { BanzaiMark } from "@/components/BanzaiMark";

// M2.19G.2 — 74px sticky bar, blurred creme background, logo (banza-mark-bordo-hd + wordmark) left; three
// distinct destinations right — "Registo técnico" (the public Technical Registry) and "BanzAI" as equal
// outline chips (icon + label), "Ler a referência" (→ /referencia, direct) as the bordô CTA. No
// dropdowns/submenus, a single prefix-based active state, and a mobile menu mirroring the desktop order.

const F_SANS = "var(--font-sans), sans-serif";
const F_SERIF = "var(--font-serif), serif";
const F_MONO = "var(--font-mono), monospace";

function NavIcon({ k, color }: { k: string; color: string }) {
  if (k === "registo")
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
    );
  if (k === "banzai")
    // The official BanzAI mark — the same sparkle the /banzai surface renders (BanzaiMark), not a look-alike star.
    return <BanzaiMark size={17} color={color} sw={1.5} />;
  // referencia (CTA)
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v16H5.5A2.5 2.5 0 0 0 3 21.5z" /><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v16h6.5A2.5 2.5 0 0 1 21 21.5z" /></svg>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  // Single, unambiguous active state: destination prefixes are mutually exclusive; the homepage matches none.
  const sectionActive = (href: string) => path === href || path.startsWith(href + "/");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // The Operador Zero standalone surface (zero.banza.network → internal /oz) is chromeless: no global nav.
  const onZeroSurface =
    pathname === "/oz" || pathname.startsWith("/oz/") ||
    (typeof window !== "undefined" && window.location.hostname === "zero.banza.network");
  if (onZeroSurface) return null;

  // The `.site-nav-item` class carries the shared :focus-visible ring + hover (globals.css).
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 600,
    textDecoration: "none", borderRadius: 11, whiteSpace: "nowrap",
    border: "1px solid transparent", fontFamily: F_SANS, lineHeight: 1,
  };
  const DesktopItem = ({ item }: { item: (typeof navPrimary)[number] }) => {
    const active = sectionActive(item.href);
    if (item.cta) {
      return (
        <Link href={item.href} aria-current={active ? "page" : undefined} className="site-nav-item site-nav-cta"
          style={{ ...base, padding: "11px 18px", color: "#fff", background: "#8B1428", borderColor: "#8B1428" }}>
          <NavIcon k={item.key} color="#fff" />{item.label}
        </Link>
      );
    }
    // Operadores + BanzAI: equal outline chips; active raises them to the tinted look.
    const col = active ? "#8B1428" : "#1A1512";
    const bg = active ? "#F7EEDD" : "#fff";
    const bd = active ? "#C8A96F" : "#DDD1BE";
    return (
      <Link href={item.href} aria-current={active ? "page" : undefined} className="site-nav-item"
        style={{ ...base, padding: "10px 16px", color: col, background: bg, borderColor: bd }}>
        <NavIcon k={item.key} color={col} />{item.label}
      </Link>
    );
  };

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(246,241,231,0.82)", backdropFilter: "blur(14px) saturate(1.1)", WebkitBackdropFilter: "blur(14px) saturate(1.1)", borderBottom: "1px solid rgba(94,12,24,0.08)", boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset,0 8px 24px -18px rgba(94,12,24,0.4)", fontFamily: F_SANS }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(18px,4vw,52px)", height: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", flex: "none" }}>
          <Image src="/banza-mark-bordo-hd.png" alt="BANZA" width={32} height={32} style={{ height: 32, width: "auto", display: "block", flex: "none" }} priority />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontFamily: F_SERIF, fontWeight: 600, fontSize: 19, letterSpacing: "0.06em", color: "#1A1512" }}>BANZA</span>
            <span style={{ fontFamily: F_MONO, fontSize: 8.5, letterSpacing: "0.28em", color: "#6E6357", marginTop: 3 }}>PROTOCOLO · v1.0</span>
          </span>
        </Link>

        {/* Desktop nav — three distinct destinations, no dropdowns */}
        <nav aria-label="Navegação principal" style={{ alignItems: "center", gap: 10, justifyContent: "flex-end" }} className="site-nav-desktop">
          {navPrimary.map((item) => (
            <DesktopItem key={item.key} item={item} />
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          className="site-nav-toggle"
          style={{ display: "none", height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 11, border: "1px solid rgba(94,12,24,0.10)", background: "transparent", cursor: "pointer" }}
        >
          <span className="sr-only">Menu</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1512" strokeWidth="1.6">
            {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu — the same three destinations, same order */}
      {mobileOpen && (
        <div id="mobile-menu" className="site-nav-mobile" style={{ borderTop: "1px solid rgba(94,12,24,0.08)", background: "#F6F1E7", padding: "12px clamp(18px,4vw,52px) 16px" }}>
          <nav aria-label="Navegação principal" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {navPrimary.map((item) => {
              const active = sectionActive(item.href);
              const cta = !!item.cta;
              const col = cta ? "#fff" : active ? "#8B1428" : "#1A1512";
              return (
                <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={cta ? "site-nav-item site-nav-cta" : "site-nav-item"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600, textDecoration: "none", padding: "12px 16px", borderRadius: 11, color: col, background: cta ? "#8B1428" : active ? "#F7EEDD" : "#fff", border: `1px solid ${cta ? "#8B1428" : active ? "#C8A96F" : "#DDD1BE"}`, fontFamily: F_SANS }}>
                  <NavIcon k={item.key} color={col} />{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
