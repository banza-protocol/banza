import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { footerColumns, navPrimary, CHROME_TEXT } from "./site";

// M2.17A / M2.19G.2 §26 — footer navigation. The footer was rebuilt into three groups
// (Protocolo · Implementar e validar · Governança); the standalone "BanzAI" and "Implementação" columns
// were retired. Source-level assertions over the footer config, the /banzai page's server-side view
// resolution, and the footer's safe external links.

const root = join(__dirname, "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const read = (p: string) => strip(readFileSync(join(root, p), "utf8"));

const implCol = footerColumns.find((c) => c.title === "Implementar e validar")!;

describe("M2.19G.2 §26 — footer is three groups; the old BanzAI column is retired", () => {
  it("has exactly the three groups in canonical order", () => {
    expect(footerColumns.map((c) => c.title)).toEqual(["Protocolo", "Implementar e validar", "Governança"]);
  });
  it("no longer carries a standalone BanzAI column", () => {
    expect(footerColumns.some((c) => c.title === "BanzAI")).toBe(false);
  });
  it("BanzAI is a single plain link inside 'Implementar e validar' (→ /banzai)", () => {
    const banzai = implCol.items.find((i) => i.label === "BanzAI")!;
    expect(banzai.href).toBe("/banzai");
    // The retired two-entry BanzAI column ("Abrir o BanzAI" / "Analisar um artefacto") is gone, and no
    // footer link points at the retired ?view=guia deep link.
    const labels = footerColumns.flatMap((c) => c.items.map((i) => i.label));
    expect(labels).not.toContain("Abrir o BanzAI");
    expect(labels).not.toContain("Analisar um artefacto");
    expect(labels).not.toContain("Perguntar ao BanzAI");
    const hrefs = footerColumns.flatMap((c) => c.items.map((i) => i.href));
    expect(hrefs).not.toContain("/banzai?view=guia");
  });
});

describe("M2.19G.2 §26 — Operador Zero lives in 'Implementar e validar'", () => {
  it("appears as 'Operador Zero' → the external zero.* read-only surface", () => {
    const oz = implCol.items.find((i) => i.label.startsWith("Operador Zero"))!;
    expect(oz.label).toBe("Operador Zero");
    expect(oz.href).toBe("https://zero.banza.network/");
    expect(oz.external).toBe(true);
  });
  it("sits in 'Implementar e validar' order: programadores · technical registry · banzai · operador zero", () => {
    expect(implCol.items.map((i) => i.href)).toEqual([
      "/referencia/programadores", "/registo-tecnico", "/banzai", "https://zero.banza.network/",
    ]);
    // GitHub must NOT be duplicated in this column — it is the Governança column + bottom-bar link only.
    expect(implCol.items.some((i) => i.key === "f-github")).toBe(false);
  });
  it("is NOT in the header (navPrimary)", () => {
    expect(navPrimary.some((i) => /operador zero/i.test(i.label))).toBe(false);
  });
});

describe("M2.17A — deep-link mechanism (server-side view + hydration-stable + back/forward)", () => {
  // M2.19G.4 (ADR-036) — the /banzai page still resolves ALL URL-state through the closed-allowlist parser
  // parseBanzaiState (server-side, hydration-stable) but now hands the resolved state to a <BanzaiRouteBinder>
  // that publishes it to the always-mounted workspace shell; the ?view=guia resolution stays in
  // banzaiState.ts (covered by banzaiState.test.ts). Back/forward moves between navigable-context route
  // segments (operador/[operatorId]/[implementationId]). Behaviour is preserved — these source-level
  // assertions track the relocated deep-link mechanism.
  it("the /banzai page reads searchParams server-side and resolves state via parseBanzaiState", () => {
    const page = read("app/(pt)/banzai/page.tsx");
    expect(page).toContain("searchParams");
    expect(page).toContain("parseBanzaiState");
    expect(page).toContain("BanzaiRouteBinder");
    // The ?view=guia deep-link resolution is server-side in the closed-allowlist parser.
    const state = read("lib/banzaiState.ts");
    expect(state).toContain('=== "guia"');
  });
  it("BanzaiAgent seeds from the route state and syncs mode on route change (back/forward)", () => {
    const agent = read("components/banzai/BanzaiAgent.tsx");
    expect(agent).toContain("routeState");
    expect(agent).toContain('"assistente"');
    // Route-driven sync (replaces the manual popstate handler): the shell reflects routeState.mode and
    // navigates via the App Router, so browser back/forward re-renders the segment → the binder re-syncs.
    expect(agent).toContain("routeState.mode");
    expect(agent).toContain("useRouter");
  });
});

describe("M2.17A — footer external links open in a new tab safely", () => {
  it("SiteFooter uses target=_blank + rel=noopener noreferrer for external links", () => {
    const footer = read("components/SiteFooter.tsx");
    expect(footer).toContain('"_blank"');
    expect(footer).toContain("noopener noreferrer");
    // The accessible new-tab hint is announced in the reader's language: it is screen-reader-only
    // text, so a Portuguese hint on an English page is a leak nobody can see.
    expect(CHROME_TEXT.pt.newTabHint).toBe("(abre numa nova aba)");
    expect(CHROME_TEXT.en.newTabHint).toBe("(opens in a new tab)");
  });
});
