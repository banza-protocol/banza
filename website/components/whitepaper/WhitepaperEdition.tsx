import Link from "next/link";
import React from "react";
import type { Whitepaper, WPRefMaps } from "@/lib/whitepaper";
import { whitepaperRefMaps } from "@/lib/whitepaper";

// Renders one full language edition of the BANZA Whitepaper v1.0 from the shared content source.
// Server component; dossier palette; theme-neutral; accessible. The SAME JSON drives the LaTeX/PDF.
// Prose uses inline cross-reference tokens ({{fig:…}}/{{eq:…}}/{{sec:…}}) and \(math\); both are
// resolved here to match the LaTeX \ref/\eqref/\cref output ("Figura N", "(1a)", "secção N").

const F_DISPLAY = "var(--font-display)";
const F_SERIF = "var(--font-serif)";
const F_SANS = "var(--font-sans)";
const F_MONO = "var(--font-mono)";
const INK = "#1A1512";
const BORDO = "#8B1428";
const MUTE = "#5D5348";

const T = {
  en: { references: "References", cite: "Recommended citation", fig: "Figure", download: "Download PDF (A4)",
        other: "Português", otherHref: "/whitepaper/pt", edition: "Official English Translation", back: "Whitepaper",
        versionLabel: "Version", history: "version history & hashes", secWord: "§" },
  pt: { references: "Referências", cite: "Citação recomendada", fig: "Figura", download: "Descarregar PDF (A4)",
        other: "English", otherHref: "/whitepaper/en", edition: "Edição canónica (Português)", back: "Whitepaper",
        versionLabel: "Versão", history: "histórico de versões e hashes", secWord: "§" },
} as const;

// Render a simple inline-math source (e.g. "A_t(\mathcal{I})", "S_{v,p}", "o") to italic + sub/sup nodes.
function mathNodes(src: string, kb: string): React.ReactNode[] {
  const s = src
    .replace(/\\mathcal\{I\}/g, "\u{1D4D8}")
    .replace(/\\dots/g, "…")
    .replace(/\\,/g, " ")
    .replace(/\\!|\\left|\\right/g, "");
  const out: React.ReactNode[] = [];
  let buf = "";
  let k = 0;
  const flush = () => { if (buf) { out.push(<i key={`${kb}i${k++}`}>{buf}</i>); buf = ""; } };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "_" || c === "^") {
      flush();
      i++;
      let sub = "";
      if (s[i] === "{") { i++; while (i < s.length && s[i] !== "}") sub += s[i++]; }
      else sub = s[i] ?? "";
      out.push(c === "_"
        ? <sub key={`${kb}s${k++}`}><i>{sub}</i></sub>
        : <sup key={`${kb}s${k++}`}><i>{sub}</i></sup>);
    } else buf += c;
  }
  flush();
  return out;
}

function renderInline(text: string, maps: WPRefMaps, lang: "en" | "pt", kb: string): React.ReactNode[] {
  const parts = text.split(/(\\\(.*?\\\)|\{\{[a-z]+:[a-z0-9-]+\}\})/g);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith("\\(") && part.endsWith("\\)")) {
      return <span key={`${kb}-${idx}`}>{mathNodes(part.slice(2, -2), `${kb}-${idx}`)}</span>;
    }
    const m = part.match(/^\{\{(fig|eq|sec):([a-z0-9-]+)\}\}$/);
    if (m) {
      const [, kind, name] = m;
      const lab = `${kind}:${name}`;
      if (kind === "fig") return <React.Fragment key={`${kb}-${idx}`}>{maps.fig[lab] ?? "?"}</React.Fragment>;
      if (kind === "eq") return <React.Fragment key={`${kb}-${idx}`}>({maps.eq[lab] ?? "?"})</React.Fragment>;
      return <React.Fragment key={`${kb}-${idx}`}>{T[lang].secWord}{maps.sec[lab] ?? "?"}</React.Fragment>;
    }
    return <React.Fragment key={`${kb}-${idx}`}>{part}</React.Fragment>;
  });
}

export function WhitepaperEdition({ wp, pdfHref }: { wp: Whitepaper; pdfHref: string }) {
  const t = T[wp.lang];
  const maps = whitepaperRefMaps(wp);
  const figById = Object.fromEntries(wp.figures.map((f) => [f.id, f]));
  return (
    <article style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(24px,4vw,56px) clamp(18px,4vw,32px)", fontFamily: F_SERIF, color: INK }}>
      <nav aria-label="edições" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 28, fontFamily: F_MONO, fontSize: 12 }}>
        <Link href="/whitepaper" style={{ color: BORDO, textDecoration: "none" }}>← {t.back}</Link>
        <span>
          <strong>{wp.lang === "en" ? "English" : "Português"}</strong>{"  ·  "}
          <Link href={t.otherHref} style={{ color: BORDO, textDecoration: "none" }}>{t.other}</Link>
        </span>
      </nav>

      <header>
        <div style={{ fontFamily: F_MONO, fontSize: 11, letterSpacing: "0.12em", color: BORDO, marginBottom: 12 }}>
          BANZA · WHITEPAPER v{wp.version} · {t.edition}
        </div>
        <h1 style={{ fontFamily: F_DISPLAY, fontWeight: 600, fontSize: "clamp(26px,3.4vw,40px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 10px" }}>{wp.title}</h1>
        <p style={{ fontFamily: F_SANS, fontSize: 15, color: MUTE, margin: "0 0 6px" }}>
          {wp.authors.map((a) => a.display).join(" · ")} — {wp.author_note}
        </p>
        <p style={{ fontFamily: F_SANS, fontSize: 13.5, color: MUTE, margin: "0 0 4px" }}>
          {wp.affiliation_legal}
        </p>
        <p style={{ fontFamily: F_SANS, fontSize: 13.5, color: MUTE, margin: "0 0 18px" }}>
          {wp.web_block.website_label}: <a href={wp.web_block.website} style={{ color: BORDO }}>{wp.web_block.website}</a>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
          <a href={pdfHref} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(180deg,#9C1B2F,#7A1023)", color: "#fff", textDecoration: "none", fontFamily: F_SANS, fontSize: 14.5, fontWeight: 600, padding: "11px 20px", borderRadius: 11 }}>
            {t.download}
          </a>
        </div>
        <div style={{ fontFamily: F_SANS, fontSize: 12.5, lineHeight: 1.55, color: MUTE, border: "1px solid rgba(184,152,96,0.4)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
          {wp.canonicity_notice}
        </div>
        <div style={{ fontFamily: F_SANS, fontSize: 12.5, lineHeight: 1.55, color: MUTE, marginBottom: 26 }}>{wp.scope_notice}</div>
      </header>

      <section aria-labelledby="wp-abstract">
        <h2 id="wp-abstract" style={{ fontFamily: F_DISPLAY, fontSize: 20, fontWeight: 600, margin: "0 0 10px" }}>{wp.lang === "pt" ? "Resumo" : "Abstract"}</h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, margin: "0 0 12px" }}>{renderInline(wp.abstract, maps, wp.lang, "abs")}</p>
      </section>

      {wp.sections.map((s) => (
        <section key={s.id} aria-labelledby={`sec-${s.id}`} style={{ marginTop: 30 }}>
          <h2 id={`sec-${s.id}`} style={{ fontFamily: F_DISPLAY, fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>
            {s.number}. {s.title}
          </h2>
          {s.blocks.map((b, i) => {
            if (b.t === "p") return <p key={i} style={{ fontSize: 16, lineHeight: 1.7, margin: "0 0 12px" }}>{renderInline(b.text, maps, wp.lang, `${s.id}-${i}`)}</p>;
            if (b.t === "eq") return (
              <div key={i} style={{ margin: "12px 0" }}>
                {b.items.map((eq, j) => (
                  <p key={j} style={{ textAlign: "center", fontFamily: F_MONO, fontSize: 15, margin: "6px 0" }}>
                    <span dangerouslySetInnerHTML={{ __html: eq.html }} /> <span style={{ color: MUTE }}>&nbsp;&nbsp;({eq.n})</span>
                  </p>
                ))}
              </div>
            );
            if (b.t === "list") return (
              <ul key={i} style={{ fontSize: 16, lineHeight: 1.7, margin: "0 0 12px", paddingLeft: 26 }}>
                {b.items.map((it, j) => (
                  <li key={j} style={{ marginBottom: 6 }}>{renderInline(it, maps, wp.lang, `${s.id}-${i}-${j}`)}</li>
                ))}
              </ul>
            );
            const f = figById[b.id];
            if (!f) return null;
            const file = wp.lang === "pt" ? f.file_pt : f.file_en;
            return (
              <figure key={i} style={{ margin: "18px 0", textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/whitepaper/figures/${file}`} alt={f.alt} width={660} style={{ maxWidth: "100%", height: "auto", border: "1px solid #E7DFD0", borderRadius: 8, background: "#fff", padding: 8 }} />
                <figcaption style={{ fontFamily: F_SANS, fontSize: 12.5, color: MUTE, marginTop: 8 }}>
                  <strong>{t.fig} {f.n}.</strong> {renderInline(f.caption, maps, wp.lang, `cap-${f.id}`)}
                </figcaption>
              </figure>
            );
          })}
        </section>
      ))}

      <section aria-labelledby="wp-refs" style={{ marginTop: 34 }}>
        <h2 id="wp-refs" style={{ fontFamily: F_DISPLAY, fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>{t.references}</h2>
        <ol style={{ fontFamily: F_SANS, fontSize: 13, lineHeight: 1.6, color: "#3a332b", paddingLeft: 20, margin: 0 }}>
          {wp.references.map((r, i) => (<li key={i} style={{ marginBottom: 5 }}>{r}</li>))}
        </ol>
      </section>

      <section aria-labelledby="wp-cite" style={{ marginTop: 26, borderTop: "1px solid #E7DFD0", paddingTop: 18 }}>
        <h2 id="wp-cite" style={{ fontFamily: F_DISPLAY, fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>{t.cite}</h2>
        <p style={{ fontFamily: F_MONO, fontSize: 12.5, lineHeight: 1.6, color: MUTE, background: "#FBF7EF", border: "1px solid #EAE1D1", borderRadius: 8, padding: "10px 12px" }}>{wp.citation}</p>
        <p style={{ fontFamily: F_SANS, fontSize: 11.5, color: MUTE, marginTop: 10 }}>
          {t.versionLabel} {wp.version} · {wp.canonical_url} · {wp.license} · <Link href="/whitepaper/versions" style={{ color: BORDO }}>{t.history}</Link>
        </p>
      </section>
    </article>
  );
}
