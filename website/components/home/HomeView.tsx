import Link from "next/link";
import { HeroStatusBar } from "@/components/home/HeroStatusBar";
import { OperatorRegistry } from "@/components/home/OperatorRegistry";
import { homeCopy, type HomeCopyId } from "@/components/home/homePresentation";
import { LAST_VERIFIED_AT } from "@/lib/protocolStatus";
import { routeHref } from "@/lib/routeRegistry";
import type { Locale } from "@/lib/i18n";

// The home page — ONE structure, realized per edition.
//
// This view exists because the English home had been written as a separate page: a different hero, a
// different composition, a different information architecture. Someone moving between `/` and `/en` met
// what looked like two different products. The Portuguese edition is canonical, so its structure is the
// one that survived; English is a realization of it, not a redesign of it.
//
// What may differ between editions: the words, the natural length of a headline, how a line wraps, and
// pathnames that have an official translated address. What may not: the bands and their order, the hero
// grid, the interoperability diagram, the capability strip, the two calls to action and which of them is
// primary, the layer cards and their order, and every semantic control on the page.
//
// Anything a reader can read is realized through `homeCopy`. Anything a reader can click resolves through
// the route registry, so each edition links inside its own edition without either page knowing about the
// other's slugs.

const F_DISPLAY = "var(--font-display), serif"; // Spectral
const F_SERIF = "var(--font-serif), serif"; // Source Serif 4
const F_SANS = "var(--font-sans), sans-serif"; // Public Sans
const F_MONO = "var(--font-mono), monospace"; // IBM Plex Mono

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.35'/></svg>\")";

const flowDots = (axis: "x" | "y") =>
  [0, 0.5, 1].map((d, i) => (
    <span key={i} aria-hidden="true" style={{ position: "absolute", [axis === "x" ? "top" : "left"]: -2, width: 5, height: 5, borderRadius: "50%", background: "#8B1428", animation: `${axis === "x" ? "flowX" : "flowY"} 3.4s linear infinite`, animationDelay: `${d}s` }} />
  ));

// M2.19G.2B — the approved dossier hero illustration (restored verbatim, not reinvented): an operator
// glyph + label + "OPERADOR" mono sub, placed in the ring diagram below.
function OperatorCard({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <>
      {children}
      <div style={{ fontFamily: F_SERIF, fontSize: 13.5, fontWeight: 600, color: "#1A1512", lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontFamily: F_MONO, fontSize: 8.5, letterSpacing: "0.06em", color: "#978B7C", marginTop: 3 }}>{sub}</div>
    </>
  );
}

const HERO_INDICATORS: { id: HomeCopyId; glyph: React.ReactNode }[] = [
  {
    id: "hero.indicator.endpoints",
    glyph: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B1428" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" /></svg>
    ),
  },
  {
    id: "hero.indicator.engines",
    glyph: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B1428" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
    ),
  },
  {
    id: "hero.indicator.results",
    glyph: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B1428" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M8.5 13l2.2 2.2 4.3-4.6" /></svg>
    ),
  },
];

export function HomeView({ locale }: { locale: Locale }) {
  const t = (id: HomeCopyId) => homeCopy(id, locale);
  return (
    <div style={{ fontFamily: F_SANS, background: "#F1EBE0", color: "#1A1512", overflowX: "hidden" }}>

      {/* ============ HERO ============ */}
      <section aria-labelledby="hero-title" style={{ position: "relative", background: "linear-gradient(180deg,#FCF9F3 0%,#F8F3EA 46%,#F3EDE2 100%)", overflow: "hidden", padding: "clamp(20px,2.6vw,44px) 0 clamp(18px,2vw,30px)", display: "flex", flexDirection: "column" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", opacity: 0.35, mixBlendMode: "multiply", backgroundImage: NOISE, backgroundSize: "160px 160px" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", background: "radial-gradient(110% 85% at 50% 45%, rgba(255,255,255,0) 52%, rgba(196,168,126,0.10) 88%, rgba(150,120,80,0.16) 100%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, zIndex: 5, pointerEvents: "none", background: "linear-gradient(90deg, rgba(200,169,111,0) 0%, rgba(200,169,111,0.55) 22%, rgba(200,169,111,0.75) 50%, rgba(200,169,111,0.55) 78%, rgba(200,169,111,0) 100%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "radial-gradient(56% 60% at 50% 44%, rgba(255,250,242,0.98), rgba(255,250,242,0) 72%), radial-gradient(92% 58% at 50% 0%, rgba(255,255,255,0.9), rgba(255,255,255,0) 62%), radial-gradient(70% 55% at 50% 100%, rgba(142,19,38,0.035), rgba(142,19,38,0) 72%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "clamp(180px,22vw,340px)", transform: "translateX(-50%)", zIndex: 1, pointerEvents: "none", background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,252,244,0.35) 38%, rgba(255,255,255,0) 78%)", filter: "blur(14px)", animation: "banzaGlow 7s ease-in-out infinite" }} />

        <div data-hero-grid style={{ position: "relative", zIndex: 3, width: "100%", maxWidth: 1240, margin: "0 auto", padding: "0 clamp(18px,4vw,52px)", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(340px,0.72fr)", gap: "clamp(28px,4vw,64px)", alignItems: "center", minHeight: "clamp(300px,44vh,460px)" }}>

          {/* LEFT · copy */}
          <div data-hero-copy style={{ minWidth: 0, maxWidth: 620, position: "relative" }}>
            <div data-rise="" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: "clamp(12px,1.5vw,18px)", animationDelay: ".05s" }}>
              <span aria-hidden="true" style={{ width: "clamp(28px,3vw,52px)", height: 1, background: "linear-gradient(90deg,rgba(200,169,111,0),rgba(184,152,96,0.9))", flex: "none" }} />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#FBF0EE", border: "1px solid rgba(142,19,38,0.18)", padding: "8px 16px", borderRadius: 999, maxWidth: "100%" }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#8B1428", flex: "none" }} />
                <span style={{ fontFamily: F_MONO, fontSize: "clamp(10px,2.6vw,11.5px)", fontWeight: 600, letterSpacing: "0.12em", color: "#8B1428", whiteSpace: "nowrap" }}>{t("hero.badge")}</span>
              </div>
            </div>
            <h1 id="hero-title" style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: "clamp(32px,3.6vw,54px)", lineHeight: 1.06, letterSpacing: "-0.025em", color: "#1A1512", margin: "0 0 clamp(14px,1.4vw,20px)" }}>
              <span style={{ display: "block", overflow: "hidden", paddingBottom: ".04em" }}><span data-line="" style={{ animationDelay: ".14s" }}>{t("hero.title.1")}</span></span>
              <span style={{ display: "block", overflow: "hidden", paddingBottom: ".04em" }}><span data-line="" style={{ animationDelay: ".24s" }}>{t("hero.title.2")}</span></span>
              <span style={{ display: "block", overflow: "hidden", paddingBottom: ".04em" }}><span data-line="" style={{ color: "#8B1428", fontStyle: "italic", animationDelay: ".34s" }}>{t("hero.title.3")}</span></span>
            </h1>
            <div data-rise="" aria-hidden="true" style={{ width: 76, height: 1, background: "#D8CBB4", marginBottom: "clamp(12px,1.2vw,16px)", animationDelay: ".42s" }} />
            <p data-rise="" style={{ fontSize: "clamp(15px,1.1vw,16.5px)", lineHeight: 1.6, color: "#5D5348", maxWidth: "54ch", margin: "0 0 clamp(18px,2vw,26px)", animationDelay: ".5s" }}>{t("hero.lede")}</p>

            <ul data-rise="" aria-label={t("hero.indicators.aria")} style={{ listStyle: "none", display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "clamp(10px,1.4vw,22px)", margin: "0 0 clamp(20px,2.2vw,28px)", padding: 0, animationDelay: ".58s" }}>
              {HERO_INDICATORS.map((ind, i) => (
                <li key={ind.id} style={{ display: "flex", alignItems: "center", gap: "clamp(8px,0.8vw,11px)", minWidth: 0, flex: "1 1 180px" }}>
                  <span aria-hidden="true" style={{ width: "clamp(32px,2.6vw,40px)", height: "clamp(32px,2.6vw,40px)", borderRadius: "50%", background: "linear-gradient(180deg,#FFFFFF 0%,#FDF6F3 100%)", border: "1px solid rgba(142,19,38,0.12)", boxShadow: "0 1px 2px rgba(20,25,30,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{ind.glyph}</span>
                  <span style={{ display: "block", fontSize: "clamp(12px,1vw,13.5px)", lineHeight: 1.35, color: "#514639", fontWeight: 500 }}>{t(ind.id)}</span>
                  {i < HERO_INDICATORS.length - 1 && <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", background: "linear-gradient(180deg,rgba(200,169,111,0),rgba(184,152,96,0.6),rgba(200,169,111,0))", flex: "none", marginLeft: "clamp(2px,0.6vw,10px)" }} />}
                </li>
              ))}
            </ul>

            <div data-rise="" style={{ animationDelay: ".64s", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
              <Link href={`${routeHref("BANZAI", locale)}?mode=validation`} style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "linear-gradient(180deg,#9C1B2F 0%,#7A1023 100%)", color: "#fff", textDecoration: "none", fontFamily: F_SANS, fontSize: 15.5, fontWeight: 600, letterSpacing: "0.01em", padding: "15px 28px", borderRadius: 13, boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset,0 14px 28px -12px rgba(142,19,38,0.55)" }}>
                <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 2.6v5.2c0 4.2-3 7.2-7 8.9-4-1.7-7-4.7-7-8.9V5.6z" /><path d="M9.5 12l1.8 1.8 3.4-3.6" /></svg>{t("hero.cta.validate")}<span aria-hidden="true" style={{ fontFamily: F_MONO }}>→</span>
              </Link>
              {/* WP1 — additive secondary CTA (outlined/neutral); primary above is unchanged and stays primary. */}
              <Link href={routeHref("WHITEPAPER", locale)} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "transparent", color: "#8B1428", textDecoration: "none", fontFamily: F_SANS, fontSize: 15.5, fontWeight: 600, letterSpacing: "0.01em", padding: "14px 26px", borderRadius: 13, border: "1px solid rgba(142,19,38,0.45)" }}>
                <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8B1428" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5M8.5 13h7M8.5 16.5h7" /></svg>{t("hero.cta.whitepaper")}
              </Link>
            </div>
          </div>

          {/* RIGHT · interoperabilidade (M2.19G.2B — approved dossier illustration, restored verbatim) */}
          <div data-rise="" style={{ animationDelay: ".62s", minWidth: 0, background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 24, boxShadow: "0 1px 2px rgba(26,21,18,0.03),0 24px 48px -34px rgba(26,21,18,0.16)", padding: "clamp(18px,1.6vw,26px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <span style={{ fontFamily: F_MONO, fontSize: 10.5, letterSpacing: "0.16em", color: "#8A7F70" }}>{t("diagram.label")}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: F_MONO, fontSize: 10.5, letterSpacing: "0.06em", color: "#8A7F70" }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "#B8985F", flex: "none" }} />{t("diagram.illustrative")}</span>
            </div>

            <div style={{ position: "relative", width: "100%", aspectRatio: "1/0.94" }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: "6% 10%", borderRadius: "50%", border: "1px dashed rgba(184,152,96,0.28)" }} />
              <div aria-hidden="true" style={{ position: "absolute", inset: "15% 21%", borderRadius: "50%", border: "1px dashed rgba(184,152,96,0.16)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", color: "rgba(184,152,96,0.95)", whiteSpace: "nowrap" }}><div style={{ fontFamily: F_DISPLAY, fontSize: "clamp(12px,1.15vw,15px)", letterSpacing: "0.03em", lineHeight: 1.2, fontWeight: 600 }}>{t("diagram.profile")}</div><div style={{ fontFamily: F_MONO, fontSize: "clamp(8px,0.75vw,9.5px)", letterSpacing: "0.06em", lineHeight: 1.5, marginTop: 6, color: "rgba(184,152,96,0.82)" }}>{t("diagram.profile.sub.1")}<br />{t("diagram.profile.sub.2")}</div></div>

              <div aria-hidden="true" style={{ position: "absolute", top: "17%", left: "33%", right: "33%", height: 1, background: "rgba(184,152,96,0.55)" }}>{flowDots("x")}</div>
              <div aria-hidden="true" style={{ position: "absolute", bottom: "17%", left: "33%", right: "33%", height: 1, background: "rgba(184,152,96,0.55)" }}>{flowDots("x")}</div>
              <div aria-hidden="true" style={{ position: "absolute", left: "16%", top: "34%", bottom: "34%", width: 1, background: "rgba(184,152,96,0.55)" }}>{flowDots("y")}</div>
              <div aria-hidden="true" style={{ position: "absolute", right: "16%", top: "34%", bottom: "34%", width: 1, background: "rgba(184,152,96,0.55)" }}>{flowDots("y")}</div>

              <div style={{ position: "absolute", top: 0, left: 0, width: "31%", background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 14, boxShadow: "0 1px 2px rgba(26,21,18,0.03),0 16px 30px -26px rgba(26,21,18,0.22)", padding: "12px 8px", textAlign: "center" }}>
                <OperatorCard label={t("diagram.operator.a")} sub="impl. A1"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B1428" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 7px" }}><path d="M3.5 9.5L12 5l8.5 4.5" /><path d="M5.5 10.5v7M9.5 10.5v7M14.5 10.5v7M18.5 10.5v7" /><path d="M3.5 19h17" /></svg></OperatorCard>
              </div>
              <div style={{ position: "absolute", top: 0, right: 0, width: "31%", background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 14, boxShadow: "0 1px 2px rgba(26,21,18,0.03),0 16px 30px -26px rgba(26,21,18,0.22)", padding: "12px 8px", textAlign: "center" }}>
                <OperatorCard label={t("diagram.operator.b")} sub="impl. B1"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B1428" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 7px" }}><path d="M3.5 9.5L12 5l8.5 4.5" /><path d="M5.5 10.5v7M9.5 10.5v7M14.5 10.5v7M18.5 10.5v7" /><path d="M3.5 19h17" /></svg></OperatorCard>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, width: "31%", background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 14, boxShadow: "0 1px 2px rgba(26,21,18,0.03),0 16px 30px -26px rgba(26,21,18,0.22)", padding: "12px 8px", textAlign: "center" }}>
                <OperatorCard label={t("diagram.operator.c")} sub="impl. C1"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B1428" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 7px" }}><rect x="7" y="2.6" width="10" height="18.8" rx="2.4" /><path d="M11 18.6h2" /></svg></OperatorCard>
              </div>
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "31%", background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 14, boxShadow: "0 1px 2px rgba(26,21,18,0.03),0 16px 30px -26px rgba(26,21,18,0.22)", padding: "12px 8px", textAlign: "center" }}>
                <OperatorCard label={t("diagram.operator.d")} sub="impl. D1"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B1428" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 7px" }}><path d="M4 9.5h16l-1 3.2a2.2 2.2 0 0 1-2.1 1.6H7.1A2.2 2.2 0 0 1 5 12.7z" /><path d="M5.5 9.5L7 5h10l1.5 4.5" /><path d="M6 14.3V20h12v-5.7" /></svg></OperatorCard>
              </div>

              <div style={{ position: "absolute", top: "12.5%", left: "50%", transform: "translate(-50%,-50%)", display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 8, padding: "5px 9px", whiteSpace: "nowrap", fontFamily: F_MONO, fontSize: 10, color: "#5D5348", boxShadow: "0 1px 2px rgba(26,21,18,0.03)" }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8B1428" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>operator.json</div>
              <div style={{ position: "absolute", bottom: "12.5%", left: "50%", transform: "translate(-50%,50%)", display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 8, padding: "5px 9px", whiteSpace: "nowrap", fontFamily: F_MONO, fontSize: 10, color: "#5D5348", boxShadow: "0 1px 2px rgba(26,21,18,0.03)" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B1428" }} />{t("diagram.message")}</div>
              <div style={{ position: "absolute", left: "1%", top: "37%", transform: "translateY(-50%)", display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 8, padding: "5px 9px", whiteSpace: "nowrap", fontFamily: F_MONO, fontSize: 10, color: "#5D5348", boxShadow: "0 1px 2px rgba(26,21,18,0.03)" }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#2C6349" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4 4L19 7" /></svg>signature valid</div>
              <div style={{ position: "absolute", right: "1%", top: "63%", transform: "translateY(-50%)", display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 8, padding: "5px 9px", whiteSpace: "nowrap", fontFamily: F_MONO, fontSize: 10, color: "#5D5348", boxShadow: "0 1px 2px rgba(26,21,18,0.03)" }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#2C6349" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4 4L19 7" /></svg>trust: verified</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 14, borderTop: "1px solid #EAE1D1", fontSize: 12, color: "#8A7F70" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8B1428" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M12 3l7 2.6v5.2c0 4.2-3 7.2-7 8.9-4-1.7-7-4.7-7-8.9V5.6z" /><path d="M9.5 12l1.8 1.8 3.4-3.6" /></svg>{t("diagram.caption")}</div>
          </div>
        </div>
      </section>

      {/* ============ INSTITUTIONAL PHRASE + PUBLIC STATUS ============ */}
      <section aria-label={t("status.aria")} style={{ position: "relative", background: "#F3EDE2", borderTop: "1px solid rgba(184,152,96,0.28)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(20px,2.4vw,32px) clamp(18px,4vw,52px)" }}>
          <div data-reveal style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: F_DISPLAY, fontSize: "clamp(18px,1.8vw,24px)", fontWeight: 600, letterSpacing: "-0.01em", color: "#1A1512" }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B1428" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M12 3l7 2.6v5.2c0 4.2-3 7.2-7 8.9-4-1.7-7-4.7-7-8.9V5.6z" /><path d="M9.5 12l1.8 1.8 3.4-3.6" /></svg>
            {t("status.phrase")}
          </div>
          <HeroStatusBar lastVerifiedAt={LAST_VERIFIED_AT} locale={locale} />
        </div>
      </section>

      {/* ============ QUEM FAZ PARTE DO PROTOCOLO (TECHNICAL REGISTRY) ============ */}
      <section aria-label={t("registry.aria")} style={{ position: "relative", background: "linear-gradient(180deg,#F3EDE2 0%,#F5F0E6 100%)", borderTop: "1px solid rgba(184,152,96,0.28)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(44px,5vw,80px) clamp(18px,4vw,52px) clamp(48px,5vw,72px)" }}>
          <OperatorRegistry locale={locale} />

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: "clamp(26px,3vw,40px)" }}>
            <Link href={routeHref("TECHNICAL_REGISTRY", locale)} style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "linear-gradient(180deg,#9C1B2F 0%,#7A1023 100%)", color: "#fff", textDecoration: "none", fontFamily: F_SANS, fontSize: 15.5, fontWeight: 600, letterSpacing: "0.01em", padding: "15px 26px", borderRadius: 13, boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset,0 14px 28px -12px rgba(142,19,38,0.55)" }}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>{t("registry.cta")}<span aria-hidden="true" style={{ fontFamily: F_MONO }}>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ ARQUITECTURA · TRÊS CAMADAS ============ */}
      <section aria-labelledby="layers-title" style={{ position: "relative", background: "linear-gradient(180deg,#F3EDE2 0%,#F1EBE0 100%)", borderTop: "1px solid rgba(184,152,96,0.28)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(44px,5vw,80px) clamp(18px,4vw,52px)" }}>
          <div data-reveal style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "#8B1428", flex: "none" }} />
            <span style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: "0.18em", color: "#7A7263" }}>{t("layers.eyebrow")}</span>
          </div>
          <h2 id="layers-title" data-reveal style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: "clamp(26px,3vw,42px)", lineHeight: 1.06, letterSpacing: "-0.02em", color: "#1A1512", margin: "0 0 clamp(8px,1vw,12px)" }}>{t("layers.title.1")} <span style={{ color: "#8B1428", fontStyle: "italic" }}>{t("layers.title.2")}</span></h2>
          <p data-reveal style={{ fontSize: "clamp(14px,1vw,15.5px)", lineHeight: 1.6, color: "#5D5348", maxWidth: "72ch", margin: "0 0 clamp(24px,3vw,36px)" }}>{t("layers.lede")}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: "clamp(14px,1.6vw,20px)" }}>
            {([
              { tag: "layers.1.tag", name: "layers.1.name", body: "layers.1.body" },
              { tag: "layers.2.tag", name: "layers.2.name", body: "layers.2.body" },
              { tag: "layers.3.tag", name: "layers.3.name", body: "layers.3.body" },
            ] as const).map((c) => (

              <div key={c.tag} data-reveal style={{ background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 18, padding: "clamp(18px,1.8vw,26px)", boxShadow: "0 1px 2px rgba(26,21,18,0.03),0 18px 36px -32px rgba(26,21,18,0.16)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 34, height: 26, padding: "0 8px", borderRadius: 8, background: "#FBF0EE", border: "1px solid rgba(142,19,38,0.18)", fontFamily: F_MONO, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: "#8B1428", marginBottom: 14 }}>{t(c.tag)}</span>
                <div style={{ fontFamily: F_SERIF, fontSize: "clamp(15px,1.1vw,17px)", fontWeight: 600, lineHeight: 1.28, color: "#1A1512", marginBottom: 8 }}>{t(c.name)}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5D5348", margin: 0 }}>{t(c.body)}</p>
              </div>
            ))}
          </div>

          <div data-reveal style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: "clamp(16px,1.8vw,22px)", padding: "clamp(14px,1.4vw,18px) clamp(16px,1.6vw,22px)", background: "rgba(255,252,247,0.7)", border: "1px dashed rgba(184,152,96,0.5)", borderRadius: 14 }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B1428" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#453C33", margin: 0 }}><strong style={{ color: "#1A1512" }}>{t("layers.note.lead")}</strong>{t("layers.note.body")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
