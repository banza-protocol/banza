import { describe, it, expect } from "vitest";
import { routeHref } from "@/lib/routeRegistry";
import { homeCopy, homeCopyIds } from "@/components/home/homePresentation";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { navPrimary, footerColumns, CHROME_TEXT } from "./site";

// M2.17 — Homepage final audit & premium polish. Source-level assertions over the audit outcomes:
// canonical copy, the three-tier header, real CTA routes, the hardened BanzAI field, the calm
// off-viewport animation, and the coherent footer. Reads are comment-stripped + whitespace-flattened
// so assertions check what the components RENDER.

const root = join(__dirname, "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const flat = (p: string) => strip(readFileSync(join(root, p), "utf8")).replace(/\s+/g, " ");

// Block F — the home page structure moved into components/home/HomeView.tsx, which BOTH editions render.
// Reading it here is the same property at its new owner, and it is now stronger: what this file asserts
// about the canonical structure is asserted for the English edition too, because there is only one
// structure left to assert. The route files own metadata and the locale they ask for, nothing else.

// Block F — the home's reader text moved into the bilingual catalogue, so the view names ids rather than
// carrying sentences. `page` is therefore the view's source PLUS the Portuguese realization of every id
// the view actually references. A string is "on the page" exactly when the view presents an id whose
// Portuguese realization contains it — the same property as before, checked through the mechanism that
// now produces it. An id the view does not reference contributes nothing, so this cannot pass on copy
// that no longer renders.
function withRealizedCopy(source: string): string {
  // The two client islands the home mounts are part of the home a reader sees, so their source and their
  // realized copy count as being "on the page" — the view delegates those bands to them.
  const islands = ["components/home/HeroStatusBar.tsx", "components/home/OperatorRegistry.tsx"].map(flat);
  const all = [source, ...islands].join("  ");
  const referenced = homeCopyIds().filter((id) => all.includes(`"${id}"`));
  // Pathnames are derived per edition from the route registry now, so the literals a reader is sent to
  // are added from the registry rather than read out of the source.
  const routes = ["BANZAI", "WHITEPAPER", "TECHNICAL_REGISTRY"].map((id) => routeHref(id, "pt"));
  return [all, ...referenced.map((id) => homeCopy(id, "pt")), ...routes].join("  ");
}

const page = withRealizedCopy(flat("components/home/HomeView.tsx"));
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
    expect((page.match(/routeHref\("BANZAI", locale\)\}\?mode=validation/g) || []).length).toBe(1);
    expect(page).toContain("Validar operador no BanzAI");
    // Derived per edition from the registry; the id is what the source carries.
    expect(page).toContain('routeHref("TECHNICAL_REGISTRY", locale)');
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
    // The brand sentence moved into CHROME_TEXT so the English shell could stop rendering it in
    // Portuguese. Assert the value the footer renders, not the file it used to be written in.
    expect(CHROME_TEXT.pt.brand).not.toContain("A base para");
    expect(CHROME_TEXT.pt.brand).toContain("evidência verificável");
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
