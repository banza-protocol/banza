import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { footerColumns } from "./site";

// Home contract (M2.19G.2 §6-26). Source-level assertions over the rebuilt public home (page.tsx + the
// OperatorRegistry / HeroStatusBar client islands — the ManifestTester island was deleted) and the footer
// chrome, plus the mandatory ABSENCES (no manifest form, no decorative node/certificate counters, retired
// protocol model: BANZA CA, "operadores certificados", "Verificação Tripla"). Reads are comment-stripped +
// whitespace-flattened so assertions check what the components RENDER.

const root = join(__dirname, "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const flat = (p: string) => strip(readFileSync(join(root, p), "utf8")).replace(/\s+/g, " ");

const page = flat("app/(pt)/page.tsx");
const registry = flat("components/home/OperatorRegistry.tsx");
const statusbar = flat("components/home/HeroStatusBar.tsx");
const footer = flat("components/SiteFooter.tsx");

describe("home — hero (page.tsx)", () => {
  it("renders the two client islands (operator registry + hero status bar) and NOT the retired ManifestTester", () => {
    expect(page).toContain("<OperatorRegistry");
    expect(page).toContain("<HeroStatusBar");
    expect(page).not.toContain("<ManifestTester");
    expect(page).not.toContain("ManifestTester");
  });
  it("has exactly one <h1> with the canonical hero copy", () => {
    expect((page.match(/<h1[ >]/g) || []).length).toBe(1);
    expect(page).toContain("Protocolo aberto e");
    expect(page).toContain("verificável de");
    expect(page).toContain("interoperabilidade financeira");
    expect(page).toContain("PROTOCOLO FINANCEIRO ABERTO · v1.0");
  });
  it("shows the illustrative interoperability diagram (not an active network)", () => {
    expect(page).toContain("INTEROPERABILIDADE");
    // Marked ILUSTRATIVO — regras públicas at the centre, operators around it (approved illustration).
    expect(page).toContain("ILUSTRATIVO");
    expect(page).toContain("Perfil BANZA v1.0");
    expect(page).toContain("Operador A");
    expect(page).toContain("Operador B");
  });
  it("has exactly one hero CTA → /banzai?mode=validation", () => {
    expect((page.match(/href="\/banzai\?mode=validation"/g) || []).length).toBe(1);
    expect(page).toContain("Validar operador no BanzAI");
  });
});

describe("home — operator registry (public list + honest empty state)", () => {
  it("reads the public registry, shows Operador Zero, and restores the operator marquee", () => {
    expect(registry).toContain('"use client"');
    expect(registry).toContain("/operators");
    expect(registry).toContain("Operador Zero");
    expect(registry).toContain("REGISTO DE OPERADORES · PÚBLICO");
    // M2.19G.2B — the animated operator marquee is restored (approved pre-G2 registry).
    expect(registry).toContain("data-marquee");
  });
});

describe("home — hero status bar (honest, sourced)", () => {
  it("is a client component that renders the real public-verification elapsed time", () => {
    expect(statusbar).toContain('"use client"');
    expect(statusbar).toContain("última verificação pública há");
    // Version + phase come from the sourced protocolStatus constants, not hardcoded strings.
    expect(statusbar).toContain("PROTOCOLO v{PROTOCOL_VERSION}");
    expect(statusbar).toContain("{PROTOCOL_PHASE}");
  });
});

describe("home — footer three groups (M2.19G.2 §26)", () => {
  it("has Protocolo · Implementar e validar · Governança", () => {
    expect(footerColumns.map((c) => c.title)).toEqual(["Protocolo", "Implementar e validar", "Governança"]);
  });
  it("carries the institutional boundary line", () => {
    expect(footer).toContain("O BANZA não é banco, PSP, carteira ou operador financeiro.");
  });
});

describe("home — mandatory absences on the home", () => {
  const ALL = [page, registry, statusbar];
  const FORBIDDEN = [
    // retired protocol model
    "BANZA CA", "Verificação Tripla", "operadores certificados", "liga os pagamentos",
    // retired manifest-tester island
    "NO BANZAI", "<textarea", "<input",
    // retired decorative / network-language counters (§13)
    "6 nós", "PROTOCOLO ACTIVO", "certificados emitidos",
  ];
  for (const bad of FORBIDDEN) {
    it(`no home source contains: ${bad}`, () => {
      for (const src of ALL) expect(src.includes(bad), `"${bad}" leaked`).toBe(false);
    });
  }
});
