import Link from "next/link";
import Image from "next/image";
import { footerColumnsFor, CHROME_TEXT } from "@/lib/site";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import type { Locale } from "@/lib/i18n";

// M2.16 — Global footer, ported to the dossier design (SiteFooter.dc.html): brand (large mark + wordmark
// + description) · vertical divider · four columns (BanzAI · Protocolo · Implementação · Contacto)
// driven by footerColumns, each link with its own pictogram · bottom bar with the boundary note,
// banza.network, GitHub and the version line. Fonts map to the site's next/font CSS variables.

const F_SANS = "var(--font-sans), sans-serif";
const F_SERIF = "var(--font-serif), serif";
const F_MONO = "var(--font-mono), monospace";

const ST = { fill: "none", stroke: "#8B1428", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function FooterIcon({ k }: { k: string }) {
  switch (k) {
    case "f-banzai-open":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M14 4h6v6M20 4l-9 9M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></svg>;
    case "f-banzai-ask":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" /></svg>;
    case "f-banzai-analyse":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
    case "f-referencia":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v16H5.5A2.5 2.5 0 0 0 3 21.5z" /><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v16h6.5A2.5 2.5 0 0 1 21 21.5z" /></svg>;
    case "f-operadores":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>;
    case "f-estado":
    case "f-security":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M12 3l7 2.6v5.2c0 4.2-3 7.2-7 8.9-4-1.7-7-4.7-7-8.9V5.6z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "f-programadores":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M8 8l-4 4 4 4M16 8l4 4-4 4" /></svg>;
    case "f-decisoes":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5M3 17l9 5 9-5" /></svg>;
    case "f-operador-zero":
      // Beaker/flask — a simulator / test-lab affordance (never a certificate or approval shield).
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><path d="M9 3h6M10 3v6l-5.2 8.6A1.5 1.5 0 0 0 6.1 20h11.8a1.5 1.5 0 0 0 1.3-2.4L14 9V3" /><path d="M7.6 14h8.8" /></svg>;
    case "f-contact":
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5l8.5 6 8.5-6" /></svg>;
    case "f-github":
      return <svg viewBox="0 0 24 24" width="19" height="19" fill="#8B1428"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5a10.3 10.3 0 0 0 6.8-9.7C22 6.6 17.5 2 12 2z" /></svg>;
    default: // f-licenca
      return <svg viewBox="0 0 24 24" width="19" height="19" {...ST}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.3a3 3 0 1 0 0 5.4" /></svg>;
  }
}

const linkStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, textDecoration: "none", fontWeight: 500, color: "#2A2521" };
const srOnly: React.CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };

// Small "opens in a new tab" indicator for external (non-email) footer links (M2.17A). The visible mark
// is an icon, so the whole announcement is the screen-reader text — which therefore has to be in the
// reader's language like any other sentence the footer speaks.
function ExternalTabHint({ locale }: { locale: Locale }) {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8A8275" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginLeft: 1 }}>
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
      <span style={srOnly}>{CHROME_TEXT[locale].newTabHint}</span>
    </>
  );
}

// The footer is part of the reader-visible shell and carries the same locale guarantee as the page it
// sits under. Destinations are resolved per edition from the route registry (lib/site.ts), so publishing
// an English page moves the footer with it; the column titles, the item labels, the brand sentence and
// the screen-reader-only strings are localised alongside them.
//
// It used to be shared verbatim on the grounds that "both editions point at the same public artifacts".
// That was true when only Portuguese pages existed and stopped being true the moment /en/architecture and
// /en/trust were published — at which point the English pages were still sending readers to Portuguese
// ones, the English architecture and trust pages included.
export function SiteFooter({ locale = "pt" }: { locale?: Locale }) {
  const footerColumns = footerColumnsFor(locale);
  const text = CHROME_TEXT[locale];
  return (
    <footer style={{ background: "#FBF6EE", fontFamily: F_SANS, color: "#6B6358" }}>
      <div style={{ background: "#FBF6EE", borderTop: "1px solid #EADFCD", overflow: "hidden" }}>

        {/* top */}
        <div className="footer-top" style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) 1px minmax(0,2.7fr)", gap: "clamp(20px,2.4vw,44px)", alignItems: "start", maxWidth: 1240, margin: "0 auto", padding: "clamp(30px,4vw,54px) clamp(18px,4vw,52px) clamp(26px,3.4vw,46px)" }}>

          {/* brand */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <Image src="/banza-mark-bordo-hd.png" alt="BANZA" width={56} height={56} style={{ height: 56, width: "auto", display: "block", flex: "none" }} />
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span style={{ fontFamily: F_SERIF, fontWeight: 600, fontSize: 36, letterSpacing: "0.06em", color: "#1A1512" }}>BANZA</span>
                <span style={{ fontFamily: F_MONO, fontSize: 12, letterSpacing: "0.34em", color: "#8A8275", marginTop: 8 }}>{text.protocolLine.replace(" · ", "\u00a0·\u00a0")}</span>
              </span>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: "#6B6358", maxWidth: "36ch", margin: 0 }}>{text.brand}</p>
          </div>

          <div className="footer-divider" style={{ background: "#EADFCD", alignSelf: "stretch", width: 1 }} />

          <div className="footer-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "clamp(14px,1.6vw,40px)", minWidth: 0 }}>
            {footerColumns.map((col) => (
              <div key={col.title} style={{ minWidth: 0 }}>
                <div style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: "0.14em", color: "#8B1428", fontWeight: 600, textTransform: "uppercase" }}>{col.title}</div>
                <div style={{ width: 26, height: 2, background: "#C79A3E", margin: "12px 0 22px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13.5 }}>
                  {col.items.map((item, i) =>
                    item.external ? (
                      <a
                        key={`${col.title}-${i}`}
                        href={item.href}
                        target={item.email ? undefined : "_blank"}
                        rel={item.email ? undefined : "noopener noreferrer"}
                        style={linkStyle}
                      >
                        <FooterIcon k={item.key} /><span>{item.label}</span>
                        {!item.email && <ExternalTabHint locale={locale} />}
                      </a>
                    ) : (
                      <Link key={`${col.title}-${i}`} href={item.href} style={linkStyle}>
                        <FooterIcon k={item.key} />{item.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* bottom bar */}
        <div style={{ borderTop: "1px solid #EADFCD" }}>
          <div className="footer-bottom" style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(18px,2vw,26px) clamp(18px,4vw,52px)", display: "flex", flexWrap: "nowrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, flex: "1 1 300px" }}>
              <span style={{ display: "inline-flex", width: 32, height: 32, borderRadius: "50%", background: "#FBEFF0", border: "1px solid rgba(142,19,38,0.16)", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#8B1428" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.8" r="0.5" fill="#8B1428" stroke="none" /></svg>
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, lineHeight: 1.45, color: "#6B6358" }}>{locale === "en" ? "BANZA is not a bank, a PSP, a wallet or a financial operator." : "O BANZA não é banco, PSP, carteira ou operador financeiro."}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "#8A8275" }}>{locale === "en" ? "BanzAI does not certify, does not approve operators and does not move funds." : "O BanzAI não certifica, não aprova operadores e não movimenta fundos."}</span>
              </span>
            </div>
            <div className="footer-bottom-right" style={{ display: "flex", alignItems: "center", gap: "clamp(14px,1.6vw,26px)", flexWrap: "nowrap" }}>
              <LocaleSwitch compact />
              <a href="https://banza.network" target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", fontFamily: F_MONO, fontSize: 13, color: "#3A2E20" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B1428" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>banza.network
              </a>
              <a href="https://github.com/banza-protocol/banza" target="_blank" rel="noopener" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", fontFamily: F_MONO, fontSize: 13, color: "#3A2E20" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#8B1428"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5a10.3 10.3 0 0 0 6.8-9.7C22 6.6 17.5 2 12 2z" /></svg>github.com/banza-protocol/banza
              </a>
              <span style={{ width: 1, height: 18, background: "#DDD4C4" }} />
              <span style={{ fontFamily: F_MONO, fontSize: 13, color: "#9A968C" }}>Banza&nbsp;·&nbsp;v1.0&nbsp;·&nbsp;2026</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
