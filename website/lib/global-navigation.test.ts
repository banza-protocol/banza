import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { navPrimary } from "./site";

// M2.15B — Final global navigation. Source-level assertions over the nav config (navPrimary) and the
// header component (SiteNav.tsx): exactly three distinct public destinations, no dropdowns, the exact
// order, a single active state, and the mandatory ABSENCES (former Protocolo / Confiança / Programadores
// dropdowns and their duplicated chapter links). Component reads are COMMENT-STRIPPED + whitespace-
// collapsed so the assertions check what the header RENDERS, not code comments.

const root = join(__dirname, "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const flat = (p: string) => strip(readFileSync(join(root, p), "utf8")).replace(/\s+/g, " ");

const nav = flat("components/SiteNav.tsx");
const ops = flat("app/(pt)/operadores/page.tsx");
const site = readFileSync(join(root, "lib/site.ts"), "utf8");

describe("M2.15B — three destinations, exact order (PART 3/4; M2.19G.2 §7)", () => {
  it("navPrimary has exactly three destinations in the canonical order", () => {
    // M2.19G.2 §7 — the three header destinations are the Technical Registry, BanzAI and the reference
    // entry point. "Ler a referência" points DIRECTLY at /referencia (never the removed /o-que-e route).
    expect(navPrimary.map((i) => i.href)).toEqual(["/registo-tecnico", "/banzai", "/referencia"]);
    expect(navPrimary.map((i) => i.label)).toEqual(["Registo técnico", "BanzAI", "Ler a referência"]);
  });
  it("Registo técnico is a plain link, BanzAI the feature pill, Referência the primary CTA (PART 8)", () => {
    const registo = navPrimary.find((i) => i.href === "/registo-tecnico")!;
    const banzai = navPrimary.find((i) => i.href === "/banzai")!;
    const ref = navPrimary.find((i) => i.href === "/referencia")!;
    expect(registo.feature).toBeFalsy();
    expect(registo.cta).toBeFalsy();
    expect(banzai.feature).toBe(true);
    expect(banzai.label).toBe("BanzAI");
    expect(ref.cta).toBe(true);
  });
  it("has exactly one BanzAI link and exactly one Reference link (guard #16/#17)", () => {
    expect(navPrimary.filter((i) => i.href === "/banzai").length).toBe(1);
    expect(navPrimary.filter((i) => i.href === "/referencia").length).toBe(1);
    // The removed /o-que-e route never resurfaces in the header (M2.19G.2 §27/§28).
    expect(navPrimary.filter((i) => i.href === "/o-que-e").length).toBe(0);
  });
  it("uses no certified / approved / licensed / official operator language (PART 7)", () => {
    const labels = navPrimary.map((i) => i.label).join(" ").toLowerCase();
    for (const bad of ["certificad", "aprovad", "licenciad", "oficial"]) {
      expect(labels, `nav label contains "${bad}"`).not.toContain(bad);
    }
  });
});

describe("M2.15B — SiteNav header has no dropdowns (PART 5/12)", () => {
  it("consumes navPrimary and no longer imports navGroups / navDirect", () => {
    expect(nav).toContain("navPrimary");
    expect(nav).not.toContain("navGroups");
    expect(nav).not.toContain("navDirect");
  });
  it("has no dropdown machinery (state, popup, arrows, menu role)", () => {
    expect(nav).not.toContain("openKey");
    expect(nav).not.toContain("aria-haspopup");
    expect(nav).not.toContain('role="menu"');
    expect(nav).not.toContain("▾");
    expect(nav).not.toContain("DropdownItem");
    expect(nav).not.toContain("groupActive");
  });
  it("keeps the mobile toggle a real button with aria-expanded / aria-controls", () => {
    expect(nav).toContain("aria-expanded={mobileOpen}");
    expect(nav).toContain('aria-controls="mobile-menu"');
    expect(nav).toContain("setMobileOpen");
  });
  it("uses a single active-state helper and a named nav landmark", () => {
    expect(nav).toContain("sectionActive");
    // The landmark is named in both editions, so the assertion is that a name is chosen per locale
    // rather than that one literal string is present — the accessibility property is "named
    // landmark", and hard-coding the Portuguese string would forbid naming the English one.
    expect(nav).toContain('aria-label={locale === "en" ? "Main navigation" : "Navegação principal"}');
    expect(nav).toContain('aria-current={active ? "page"');
  });
});

describe("M2.15B — mandatory absences in the header config (PART 5)", () => {
  it("site.ts no longer defines the dropdown groups or the NavGroup type", () => {
    expect(site).not.toContain("navGroups");
    expect(site).not.toContain("navDirect");
    expect(site).not.toContain("NavGroup");
  });
  it("navPrimary carries none of the removed dropdown labels or chapter links", () => {
    const blob = JSON.stringify(navPrimary);
    for (const gone of [
      "Protocolo", "Confiança", "Programadores",
      "Referência completa", "O que é", "Por que existe", "Arquitectura",
      "PostgreSQL", "Roteiro de Maturidade", "Evolução do Protocolo", "Estado verificável",
      "Trust Engine", "Conformidade e evidência", "Federação", "Operador Zero", "Governança",
      "Abrir o BanzAI", "Recursos para programadores", "Referência por capítulos",
      "ADRs e RFCs", "GitHub", "FAQ",
    ]) {
      expect(blob, `navPrimary must not contain "${gone}"`).not.toContain(gone);
    }
  });
});

describe("M2.15B — Operadores is a real registry page (PART 4)", () => {
  it("is no longer a redirect and is canonical at /operadores", () => {
    expect(ops).not.toContain("redirect(");
    expect(ops).toContain('canonical: "/operadores"');
  });
  it("presents the public registry + verifiable evidence honestly, with no false certification", () => {
    expect(ops).toContain("OPERADORES · PAPÉIS E EVIDÊNCIA");
    expect(ops).toContain("Nenhum operador publicado");
    expect(ops).toContain("/operators");
    expect(ops).toContain("production_certificates");
    expect(ops).toContain("Evidência verificável");
    expect(ops).toContain("não é concedida por uma autoridade central");
  });
});
