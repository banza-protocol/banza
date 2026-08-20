// The English counterpart of /whitepaper. It is a DESCRIPTION-AND-NAVIGATION surface, not the document:
// the Portuguese edition remains canonical and the English one remains its official translation, and both
// are offered here exactly as they are on the Portuguese page. Only the page's own chrome is translated —
// the title, abstract, canonicity notice and citation come from the whitepaper data itself, so this page
// cannot drift from the document it points at.

import type { Metadata } from "next";
import Link from "next/link";
import { getWhitepaper, getWhitepaperManifest } from "@/lib/whitepaper";

const F_DISPLAY = "var(--font-display)";
const F_SERIF = "var(--font-serif)";
const F_SANS = "var(--font-sans)";
const F_MONO = "var(--font-mono)";
const INK = "#1A1512";
const BORDO = "#8B1428";
const MUTE = "#5D5348";
const SITE = "https://banza.network";

export const metadata: Metadata = {
  title: "Whitepaper v1.0",
  description:
    "BANZA Whitepaper v1.0 — an open, verifiable protocol for financial interoperability. Technical paper; canonical edition in Portuguese with an official English translation. Non-normative foundational document, CC BY 4.0.",
  alternates: {
    canonical: `${SITE}/en/whitepaper`,
    languages: { en: `${SITE}/whitepaper/en`, pt: `${SITE}/whitepaper/pt`, "x-default": `${SITE}/whitepaper` },
  },
  openGraph: { title: "BANZA Whitepaper v1.0", url: `${SITE}/whitepaper`, type: "website" },
};

export default function WhitepaperEntryEn() {
  const en = getWhitepaper("en");
  const pt = getWhitepaper("pt");
  const manifest = getWhitepaperManifest();
  // Cache-bust the PDF links with the current content hash so a rebuilt PDF (same filename)
  // is always fetched fresh instead of a stale browser/edge copy.
  const pv = (lang: string) => {
    const s = manifest?.pdfs.find((p) => p.lang === lang)?.sha256.slice(0, 8);
    return s ? `?v=${s}` : "";
  };
  const editions = [
    { wp: pt, tag: "Canonical edition (Portuguese)", read: "/whitepaper/pt", pdf: `/whitepaper/banza-whitepaper-v1.0-pt.pdf${pv("pt")}` },
    { wp: en, tag: "Official English Translation", read: "/whitepaper/en", pdf: `/whitepaper/banza-whitepaper-v1.0-en.pdf${pv("en")}` },
  ];
  return (
    <main style={{ background: "linear-gradient(180deg,#FCF9F3,#F5F0E6)", minHeight: "70vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(32px,5vw,72px) clamp(18px,4vw,32px)", fontFamily: F_SERIF, color: INK }}>
        <div style={{ fontFamily: F_MONO, fontSize: 11.5, letterSpacing: "0.14em", color: BORDO, marginBottom: 12 }}>FOUNDATIONAL DOCUMENT · v{pt.version}</div>
        <h1 style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: "clamp(28px,3.6vw,46px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
          {en.title}
        </h1>
        <p style={{ fontFamily: F_SANS, fontSize: 15.5, color: MUTE, margin: "0 0 6px" }}>
          {pt.authors.map((a) => a.display).join(" · ")} — {pt.author_note}
        </p>
        <p style={{ fontFamily: F_SANS, fontSize: 13.5, color: MUTE, margin: "0 0 24px" }}>
          {pt.affiliation_legal} · Whitepaper v{pt.version} · {pt.date_display} · {pt.license}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 16, marginBottom: 28 }}>
          {editions.map((e) => (
            <div key={e.read} style={{ background: "#FFFCF7", border: "1px solid rgba(218,204,180,0.9)", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: "0.08em", color: BORDO, marginBottom: 8 }}>{e.tag}</div>
              <div style={{ fontFamily: F_DISPLAY, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{e.wp.title}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Link href={e.read} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(180deg,#9C1B2F,#7A1023)", color: "#fff", textDecoration: "none", fontFamily: F_SANS, fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 10 }}>Read online →</Link>
                <a href={e.pdf} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: BORDO, textDecoration: "none", fontFamily: F_SANS, fontSize: 14, fontWeight: 600, padding: "10px 18px", borderRadius: 10, border: `1px solid ${BORDO}` }}>PDF (A4)</a>
              </div>
            </div>
          ))}
        </div>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: F_DISPLAY, fontSize: 19, fontWeight: 600, margin: "0 0 8px" }}>Abstract</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: "#33302b" }}>{en.abstract}</p>
        </section>

        <div style={{ fontFamily: F_SANS, fontSize: 12.5, color: MUTE, border: "1px solid rgba(184,152,96,0.4)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
          {en.canonicity_notice}
        </div>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: F_DISPLAY, fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Recommended citation</h2>
          <p style={{ fontFamily: F_MONO, fontSize: 12.5, lineHeight: 1.6, color: MUTE, background: "#FBF7EF", border: "1px solid #EAE1D1", borderRadius: 8, padding: "10px 12px" }}>{en.citation}</p>
        </section>

        <p style={{ fontFamily: F_SANS, fontSize: 12.5, color: MUTE }}>
          Non-normative foundational document. {pt.copyright} · {pt.license}
          {" · "}<Link href="/en/whitepaper/versions" style={{ color: BORDO }}>version history and SHA-256 hashes</Link>
          {manifest?.released_at ? ` · published ${manifest.released_at}` : " · pre-publication"}
        </p>
      </div>
    </main>
  );
}
