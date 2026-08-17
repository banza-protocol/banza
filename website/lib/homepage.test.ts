import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { navPrimary, footerColumns } from "./site";

// M2.17 — Homepage final audit & premium polish. Source-level assertions over the audit outcomes:
// canonical copy, the three-tier header, real CTA routes, the hardened BanzAI field, the calm
// off-viewport animation, and the coherent footer. Reads are comment-stripped + whitespace-flattened
// so assertions check what the components RENDER.

const root = join(__dirname, "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const flat = (p: string) => strip(readFileSync(join(root, p), "utf8")).replace(/\s+/g, " ");

const page = flat("app/(pt)/page.tsx");
const nav = flat("components/SiteNav.tsx");
const footer = flat("components/SiteFooter.tsx");
const layout = flat("app/(pt)/layout.tsx");

describe("M2.17 — header (three tiers, one family; labels per M2.19G.2 §7)", () => {
  it("has exactly three destinations in order", () => {
    expect(navPrimary.map((n) => n.label)).toEqual(["Registo técnico", "BanzAI", "Ler a referência"]);
  });
  it("keeps a single prefix-based active state and no dropdowns", () => {
    expect(nav).toContain("sectionActive");
    for (const bad of ["aria-haspopup", 'role="menu"', "openKey", "DropdownItem"]) {
      expect(nav, `nav must not reintroduce ${bad}`).not.toContain(bad);
    }
  });
  it("tiers the three items as one component family (shared base + focus class)", () => {
    expect(nav).toContain("site-nav-item");
    expect(nav).toContain("site-nav-cta");
    expect(nav).toContain("const base:"); // shared base style for all three
  });
});

describe("M2.17 — hero copy (canonical copy per M2.19G.2 §8-10)", () => {
  it("has one h1 with the canonical fragments and eyebrow", () => {
    expect((page.match(/<h1[ >]/g) || []).length).toBe(1);
    for (const s of ["Protocolo aberto e", "verificável de", "interoperabilidade financeira", "PROTOCOLO FINANCEIRO ABERTO · v1.0"]) {
      expect(page).toContain(s);
    }
  });
  it("uses the canonical hero paragraph (M2.19G.2 §8)", () => {
    expect(page).toContain("O BANZA cria uma linguagem comum para que operadores financeiros independentes interoperem através de regras públicas, conformidade demonstrável e evidência verificável — uma camada aberta que se acrescenta à interoperabilidade operacional já existente, tornando as regras, os testes e a evidência públicos e reproduzíveis por terceiros.");
  });
  it("drops the retired value-proposition line and the retired positioning", () => {
    // §8 — the "Implementar uma vez. Demonstrar conformidade. …" value-prop line was removed with no
    // replacement, together with the earlier "financeira em Angola" positioning copy. The illustration
    // legend was also shortened to "Diagrama ilustrativo: operadores interoperam por regras e perfis
    // comuns." (the long "…sem reconstruir integrações técnicas bilaterais…" wording is gone).
    for (const bad of ["a base", "interface primária humano-operador", "financeira em Angola", "Implementar uma vez.", "sem reconstruir integrações técnicas bilaterais"]) {
      expect(page, `home must not contain "${bad}"`).not.toContain(bad);
    }
  });
});

describe("M2.17 — CTAs (single hero CTA per M2.19G.2 §10)", () => {
  it("has exactly one hero CTA → /banzai?mode=validation and the registry section CTA → /registo-tecnico", () => {
    expect((page.match(/href="\/banzai\?mode=validation"/g) || []).length).toBe(1);
    expect(page).toContain("Validar operador no BanzAI");
    expect(page).toMatch(/href="\/registo-tecnico"/);
    expect(page).toContain("Consultar o Registo Técnico");
    // The retired routes / labels never resurface on the home.
    expect(page).not.toMatch(/href="\/o-que-e"/);
    expect(page).not.toMatch(/href="\/operadores"/);
    expect(page).not.toContain("Começar a implementar");
    expect(page).not.toMatch(/href=""|href="#"|href="javascript:/);
  });
});

describe("M2.17 — footer", () => {
  it("brand text drops 'A base para' and uses evidência verificável", () => {
    expect(footer).not.toContain("A base para");
    expect(footer).toContain("evidência verificável");
  });
  it("carries both boundary statements", () => {
    expect(footer).toContain("O BANZA não é banco, PSP, carteira ou operador financeiro.");
    expect(footer).toContain("não certifica, não aprova operadores e não movimenta fundos");
  });
  it("is rebuilt into three groups (M2.19G.2 §26); the old BanzAI column is gone", () => {
    expect(footerColumns.map((c) => c.title)).toEqual(["Protocolo", "Implementar e validar", "Governança"]);
    expect(footerColumns.some((c) => c.title === "BanzAI")).toBe(false);
  });
});

describe("M2.17 — SEO", () => {
  it("metadata description is the canonical M2.17 sentence", () => {
    expect(layout).toContain(
      "O BANZA define regras públicas, perfis versionados, testes de conformidade, verificação de interoperabilidade e certificação técnica para implementações independentes"
    );
  });
});
