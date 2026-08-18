import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { navPrimary, footerColumns } from "./site";
import { REGISTRY_SUMMARY, PROTOCOL_VERSION, PROTOCOL_PHASE } from "./protocolStatus";
import { getReferenceChapters } from "./reference";

// M2.19G.2 §37 — canonical public-home contract. Source-level assertions over the rebuilt home
// (five bands: Hero · institutional phrase + public status · "Quem faz parte do protocolo" · "Três
// camadas. Uma interface." · Footer), the navigation/footer config, the honest sourced status bar, the
// registry metrics, and the removal of the standalone /o-que-e route. Reads are comment-stripped +
// whitespace-flattened so assertions check what the components RENDER, not code comments.

const root = join(__dirname, "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const raw = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (p: string) => strip(raw(p)).replace(/\s+/g, " ");

const page = flat("app/(pt)/page.tsx");
const registry = flat("components/home/OperatorRegistry.tsx");
const statusbar = flat("components/home/HeroStatusBar.tsx");
const layout = flat("app/(pt)/layout.tsx");
// Both root layouts compose <body> through one shared shell, so document order is asserted where it
// is actually written instead of twice in two layouts that could drift.
const shell = flat("components/SiteShell.tsx");
const siteSrc = strip(raw("lib/site.ts"));
const sitemapSrc = strip(raw("app/sitemap.ts"));

describe("M2.19G.2 §10 — hero CTAs: primary validation + additive whitepaper (WP1-FINAL)", () => {
  it("has exactly one primary CTA to /banzai?mode=validation with the canonical label", () => {
    expect((page.match(/href="\/banzai\?mode=validation"/g) || []).length).toBe(1);
    expect(page).toContain("Validar operador no BanzAI");
    // no OZ pre-set / target / query / manifest carried on the hero CTA
    expect(page).not.toContain("/banzai?q=");
    expect(page).not.toMatch(/href="\/banzai\?[^"]*mode=validation[^"]*(operator|target|q=)/);
  });
  it("has exactly one additive /whitepaper CTA, after the primary (WP1-FINAL)", () => {
    expect((page.match(/href="\/whitepaper"/g) || []).length).toBe(1);
    expect(page).toContain("Ler o Whitepaper");
    // order: the primary validation CTA precedes the additive whitepaper CTA
    expect(page.indexOf('href="/banzai?mode=validation"')).toBeLessThan(
      page.indexOf('href="/whitepaper"'),
    );
  });
});

describe("M2.19G.2 §15 — the manifest-testing form is gone", () => {
  it("page.tsx has no form / textarea / manual URL input / upload control", () => {
    for (const bad of ["<form", "<textarea", "<input", 'type="url"', "upload", "encodeURIComponent", "NO BANZAI", "Testar manifesto"]) {
      expect(page, `page.tsx must not contain "${bad}"`).not.toContain(bad);
    }
  });
});

describe("M2.19G.2 §9 — the three hero indicators", () => {
  it("renders exactly the three canonical indicator labels", () => {
    for (const s of ["Endpoints públicos", "Motores Rust determinísticos", "Resultados rastreáveis por evidência"]) {
      expect(page, `hero indicator "${s}" missing`).toContain(s);
    }
  });
});

describe("M2.19G.2 §12 — institutional phrase", () => {
  it("uses 'Aberto. Auditável. Verificável.' and not the retired phrase", () => {
    expect(page).toContain("Aberto. Auditável. Verificável.");
    expect(page).not.toContain("Transparente. Auditável. Aberto a todos.");
  });
});

describe("M2.19G.2 §13 — honest, sourced public status bar", () => {
  it("carries the honest sourced status lines", () => {
    // Version + phase are SOURCED from protocolStatus (rendered as {PROTOCOL_VERSION}/{PROTOCOL_PHASE}),
    // never hardcoded decorative strings.
    expect(statusbar).toContain("PROTOCOLO v{PROTOCOL_VERSION}");
    expect(statusbar).toContain("{PROTOCOL_PHASE}");
    expect(PROTOCOL_VERSION).toBe("1.0");
    expect(PROTOCOL_PHASE).toBe("PRÉ-PRODUÇÃO");
    expect(statusbar).toContain("última verificação pública há");
    expect(statusbar).toContain("certificações técnicas activas");
    // M2.19G.2B — the reference-implementation counter was removed from the status bar.
    expect(statusbar).not.toContain("implementação de referência publicada");
  });
  it("carries none of the retired decorative / network counters", () => {
    for (const src of [page, statusbar]) {
      for (const bad of ["6 nós", "nós em pré-produção", "PROTOCOLO ACTIVO", "certificados emitidos", "rede activa", "participantes conectados"]) {
        expect(src, `"${bad}" leaked into the status surface`).not.toContain(bad);
      }
    }
  });
});

describe("M2.19G.2 §6 — home band order (registo before três-camadas, journey absent, footer last)", () => {
  it("orders hero → institutional/status → registo técnico → três camadas", () => {
    const iHero = page.indexOf('id="hero-title"');
    const iPhrase = page.indexOf("Aberto. Auditável. Verificável.");
    const iRegisto = page.indexOf('aria-label="Registo técnico"');
    const iLayers = page.indexOf('id="layers-title"');
    for (const [name, i] of [["hero", iHero], ["phrase", iPhrase], ["registo", iRegisto], ["layers", iLayers]] as const) {
      expect(i, `${name} band not found`).toBeGreaterThan(-1);
    }
    expect(iHero).toBeLessThan(iPhrase);
    expect(iPhrase).toBeLessThan(iRegisto);
    expect(iRegisto).toBeLessThan(iLayers);
  });
  it("has no validation-journey section", () => {
    for (const bad of ["PERCURSO DE VALIDAÇÃO", "Da descoberta", "Prontidão para Certificação", "Certification Readiness"]) {
      expect(page, `journey remnant "${bad}"`).not.toContain(bad);
    }
  });
  it("três camadas is the last home band; the footer renders after the page content", () => {
    // "Três camadas. Uma interface." is the last band inside page.tsx (no section after it).
    expect(page.lastIndexOf('id="layers-title"')).toBeGreaterThan(page.lastIndexOf('aria-label="Registo técnico"'));
    // The global footer is rendered by the layout AFTER <main>{children}</main> (match the JSX tag, not
    // the import statement at the top of the file).
    expect(shell.indexOf("<main")).toBeLessThan(shell.indexOf("<SiteFooterGate"));
    // …and the Portuguese root actually uses that shell, or the order above proves nothing about what
    // the reader receives.
    expect(layout).toContain("<SiteShell");
  });
});

describe("M2.19G.2 §14-19 — registry metrics distinguish production / reference / certifications", () => {
  it("REGISTRY_SUMMARY counts 0 production operators, 1 reference implementation, 0 active certifications", () => {
    expect(REGISTRY_SUMMARY.productionOperators).toBe(0);
    expect(REGISTRY_SUMMARY.referenceImplementations).toBe(1);
    expect(REGISTRY_SUMMARY.activeCertifications).toBe(0);
    // Operador Zero is counted as a reference implementation, never as a production operator.
    expect(REGISTRY_SUMMARY.referenceImplementations).not.toBe(REGISTRY_SUMMARY.productionOperators);
  });
  it("the registry restores the animated operator marquee with its counters (M2.19G.2B)", () => {
    // The approved pre-G2 registry marquee is restored: eyebrow + counters + animated card carousel.
    expect(registry).toContain("data-marquee");
    for (const s of ["Certificados", "Em conformidade", "Operadores registados"]) {
      expect(registry, `counter "${s}" missing`).toContain(s);
    }
  });
  it("shows Operador Zero (reference implementation) and the honest registry note", () => {
    expect(registry).toContain("Operador Zero");
    expect(registry).toContain("implementação de referência");
    expect(registry).toContain("Nenhum operador está certificado hoje");
  });
});

describe("M2.19G.2 §20-24 — three layers, one interface", () => {
  it("names the three canonical layer titles", () => {
    expect(page).toContain("BANZA · Protocolo");
    expect(page).toContain("Certificação de Conformidade e Interoperabilidade");
    // Canonical scheme name — PT form on the PT home (BANZA_REFERENCIA.md §4, /glossario).
    expect(page).toContain("Esquema Operacional Banza" + "mi");
  });
  it("presents BanzAI as the transversal interface, not a fourth layer or an authority", () => {
    expect(page).toContain("interface transversal");
    expect(page).toContain("não constitui uma quarta camada");
    expect(page).toContain("O BanzAI não é uma camada nem uma autoridade.");
  });
});

describe("M2.19G.2 §7 — header navigation", () => {
  it("navPrimary is exactly [/registo-tecnico, /banzai, /referencia]", () => {
    expect(navPrimary.map((i) => i.href)).toEqual(["/registo-tecnico", "/banzai", "/referencia"]);
  });
  it("'Ler a referência' points directly at /referencia (never /o-que-e)", () => {
    const ref = navPrimary.find((i) => i.label === "Ler a referência")!;
    expect(ref).toBeTruthy();
    expect(ref.href).toBe("/referencia");
  });
});

describe("M2.19G.2 §26 — footer three groups + canonical introductory-definition link", () => {
  it("has exactly the three groups in order", () => {
    expect(footerColumns.map((c) => c.title)).toEqual(["Protocolo", "Implementar e validar", "Governança"]);
  });
  it("'O que é o BANZA' points at the single canonical reference chapter /referencia/o-que-e", () => {
    const protocolo = footerColumns.find((c) => c.title === "Protocolo")!;
    const oqueE = protocolo.items.find((i) => i.label === "O que é o BANZA")!;
    expect(oqueE).toBeTruthy();
    expect(oqueE.href).toBe("/referencia/o-que-e");
  });
});

describe("M2.19G.2 §27/§28/§32 — the standalone /o-que-e route is removed", () => {
  it("zero /o-que-e route file exists", () => {
    let exists = false;
    try {
      readFileSync(join(root, "app/o-que-e/page.tsx"));
      exists = true;
    } catch {
      exists = false;
    }
    expect(exists, "app/o-que-e/page.tsx must not exist").toBe(false);
  });
  it("neither the home nor the site config links the standalone /o-que-e route", () => {
    expect(page).not.toMatch(/href="\/o-que-e"/);
    expect(page).not.toContain('"/o-que-e"');
    // Asserted against the RESOLVED chrome, which is what a reader actually receives: the footer
    // names its destinations by semantic id now, so the removed standalone route cannot be searched
    // for as a literal in the source and the reference chapter must be checked as a resolved href.
    const chromeHrefs = [...navPrimary, ...footerColumns.flatMap((c) => c.items)].map((i) => i.href);
    expect(chromeHrefs).not.toContain("/o-que-e");
    expect(chromeHrefs).toContain("/referencia/o-que-e");
  });
  it("the sitemap does not list the standalone /o-que-e route", () => {
    expect(sitemapSrc).not.toContain('"/o-que-e"');
  });
  it("/referencia/o-que-e exists as a single canonical reference chapter", () => {
    const chapters = getReferenceChapters();
    expect(chapters.filter((c) => c.slug === "o-que-e").length).toBe(1);
  });
});
