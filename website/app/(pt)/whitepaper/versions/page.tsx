// The Portuguese version-history page.
//
// It rendered English chrome — "Version history & hashes", "File / Lang / SHA-256", the whole page —
// because it was authored in English and never had a locale mechanism at all. The eight-surface render
// matrix in Block E1 is what found it; the build, the registry and the locale switch were all correct.
//
// Only the PRESENTATION is Portuguese here. Version identifiers, SHA-256 hashes, file names and the
// language codes each artifact is published under are facts, not copy, and are rendered as they are.

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
  title: "Whitepaper — histórico de versões e hashes",
  description: "Whitepaper BANZA v1.0 — histórico de versões imutável, hashes SHA-256 dos PDF e manifesto de publicação.",
  alternates: { canonical: `${SITE}/whitepaper/versions` },
};

export default function WhitepaperVersions() {
  const en = getWhitepaper("en");
  const m = getWhitepaperManifest();
  return (
    <main style={{ background: "linear-gradient(180deg,#FCF9F3,#F5F0E6)", minHeight: "60vh" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(28px,5vw,64px) clamp(18px,4vw,32px)", fontFamily: F_SERIF, color: INK }}>
        <nav style={{ fontFamily: F_MONO, fontSize: 12, marginBottom: 22 }}><Link href="/whitepaper" style={{ color: BORDO, textDecoration: "none" }}>← Whitepaper</Link></nav>
        <h1 style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: "clamp(24px,3vw,36px)", margin: "0 0 8px" }}>Histórico de versões e hashes</h1>
        <p style={{ fontFamily: F_SANS, fontSize: 14, color: MUTE, margin: "0 0 26px" }}>
          O Whitepaper BANZA é versionado; uma vez publicada, a v1.0 é imutável. A edição portuguesa é canónica; a inglesa é a tradução oficial.
        </p>

        <h2 style={{ fontFamily: F_DISPLAY, fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>Integridade dos PDF (SHA-256)</h2>
        {m?.pdfs?.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F_MONO, fontSize: 12 }}>
            <thead><tr style={{ textAlign: "left", color: MUTE }}><th style={{ padding: "6px 8px" }}>Ficheiro</th><th style={{ padding: "6px 8px" }}>Idioma</th><th style={{ padding: "6px 8px" }}>SHA-256</th></tr></thead>
            <tbody>
              {m.pdfs.map((p) => (
                <tr key={p.file} style={{ borderTop: "1px solid #EAE1D1" }}>
                  <td style={{ padding: "6px 8px" }}><a href={`/whitepaper/${p.file}`} style={{ color: BORDO }}>{p.file}</a></td>
                  <td style={{ padding: "6px 8px" }}>{p.lang}</td>
                  <td style={{ padding: "6px 8px", wordBreak: "break-all" }}>{p.sha256}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontFamily: F_SANS, fontSize: 13.5, color: MUTE }}>Os hashes são publicados com o manifesto de release no momento da publicação.</p>
        )}

        <h2 style={{ fontFamily: F_DISPLAY, fontSize: 18, fontWeight: 600, margin: "26px 0 12px" }}>Histórico</h2>
        <ul style={{ fontFamily: F_SANS, fontSize: 14, lineHeight: 1.6, color: "#33302b", paddingLeft: 18 }}>
          {(m?.history?.length ? m.history : [{ version: en.version, date: en.date_display, note: "Publicação inicial — edição canónica em português + tradução oficial em inglês." }]).map((h, i) => (
            <li key={i} style={{ marginBottom: 6 }}><strong>v{h.version}</strong> — {h.date}: {h.note}</li>
          ))}
        </ul>

        <p style={{ fontFamily: F_SANS, fontSize: 12, color: MUTE, marginTop: 24 }}>
          {en.copyright} · {en.license}{m?.source_commit ? ` · commit de origem ${m.source_commit}` : ""}
        </p>
      </div>
    </main>
  );
}
