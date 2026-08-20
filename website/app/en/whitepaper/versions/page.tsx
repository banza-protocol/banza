// The English counterpart of /whitepaper/versions. Version identities, hashes, publication dates and the
// language each artifact actually exists in are facts and are not translated — only the surrounding
// explanation is. A control here must never offer an English document that does not exist.

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
  title: "Whitepaper — version history & hashes",
  description: "BANZA Whitepaper v1.0 — immutable version history, PDF SHA-256 hashes, and publication manifest.",
  alternates: { canonical: `${SITE}/whitepaper/versions` },
};

export default function WhitepaperVersionsEn() {
  const en = getWhitepaper("en");
  const m = getWhitepaperManifest();
  return (
    <main style={{ background: "linear-gradient(180deg,#FCF9F3,#F5F0E6)", minHeight: "60vh" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(28px,5vw,64px) clamp(18px,4vw,32px)", fontFamily: F_SERIF, color: INK }}>
        <nav style={{ fontFamily: F_MONO, fontSize: 12, marginBottom: 22 }}><Link href="/en/whitepaper" style={{ color: BORDO, textDecoration: "none" }}>← Whitepaper</Link></nav>
        <h1 style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: "clamp(24px,3vw,36px)", margin: "0 0 8px" }}>Version history &amp; hashes</h1>
        <p style={{ fontFamily: F_SANS, fontSize: 14, color: MUTE, margin: "0 0 26px" }}>
          The BANZA Whitepaper is versioned; once published, v1.0 is immutable. Portuguese is canonical; English is the official translation.
        </p>

        <h2 style={{ fontFamily: F_DISPLAY, fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>PDF integrity (SHA-256)</h2>
        {m?.pdfs?.length ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F_MONO, fontSize: 12 }}>
            <thead><tr style={{ textAlign: "left", color: MUTE }}><th style={{ padding: "6px 8px" }}>File</th><th style={{ padding: "6px 8px" }}>Lang</th><th style={{ padding: "6px 8px" }}>SHA-256</th></tr></thead>
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
          <p style={{ fontFamily: F_SANS, fontSize: 13.5, color: MUTE }}>Hashes are published with the release manifest at publication time.</p>
        )}

        <h2 style={{ fontFamily: F_DISPLAY, fontSize: 18, fontWeight: 600, margin: "26px 0 12px" }}>History</h2>
        <ul style={{ fontFamily: F_SANS, fontSize: 14, lineHeight: 1.6, color: "#33302b", paddingLeft: 18 }}>
          {(m?.history?.length ? m.history : [{ version: en.version, date: en.date_display, note: "Initial publication — canonical Portuguese edition + official English translation." }]).map((h, i) => (
            <li key={i} style={{ marginBottom: 6 }}><strong>v{h.version}</strong> — {h.date}: {h.note}</li>
          ))}
        </ul>

        <p style={{ fontFamily: F_SANS, fontSize: 12, color: MUTE, marginTop: 24 }}>
          {en.copyright} · {en.license}{m?.source_commit ? ` · source commit ${m.source_commit}` : ""}
        </p>
      </div>
    </main>
  );
}
