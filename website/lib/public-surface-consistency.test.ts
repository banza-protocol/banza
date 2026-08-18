import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decisions, getDecision } from "./decisions";
import { getReferenceChapters } from "./reference";

// Public-surface consistency. Source-level contract over the website: every decision record resolves
// and has a mirrored body; the primary human-operator interface is the leading definition (agente
// stays secondary); the 4-clause phrase is complete; the operador-zero copy matches the live
// subdomain; and no public copy makes a
// POSITIVE forbidden claim (legitimate negations are fine).

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("every published decision record resolves and has a body", () => {
  // A property, not a list. Pinning specific ADR ids made this test assert a numbering rather than a
  // behaviour, and it broke the moment the tree was renumbered — which is precisely when a website
  // contract most needs to still be checking something true.
  for (const d of decisions) {
    it(`${d.id} is registered and its mirrored body exists`, () => {
      expect(getDecision(d.slug), `${d.id} must resolve by slug`).toBeTruthy();
      expect(() => read(join("content", d.path))).not.toThrow();
    });
  }

  it("the decisions registry is internally consistent (unique slugs)", () => {
    const slugs = decisions.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("M2.14J — primary human-operator interface is the leading definition", () => {
  it("the /banzai page metadata leads with the primary interface", () => {
    const page = read("app/(pt)/banzai/page.tsx");
    expect(page).toMatch(/interface humana primária/i);
    // M2.19G.4 (ADR-036): the single sr-only H1 moved to the shared app/(pt)/banzai/layout.tsx so it heads
    // every navigable context (global/operator/implementation) — the primary-interface phrasing lives there.
    const layout = read("app/(pt)/banzai/layout.tsx");
    expect(layout).toMatch(/interface primária humano-operador/i); // sr-only H1 (shared layout)
  });
  it("the /estado page carries the complete 4-clause phrase + primary interface", () => {
    const estado = read("app/(pt)/estado/page.tsx");
    expect(estado).toContain("BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.");
    expect(estado).toMatch(/interface humana primária e transversal/i);
    // the pre-M2.14J 3-clause phrase must be gone.
    expect(estado).not.toContain("a evidência prova.</strong>");
  });
  it("the /referencia chapter-12 card leads with the primary interface (not only 'agente')", () => {
    // Read the RESOLVED chapter rather than a line of lib/reference.ts: chapter slugs moved to
    // lib/referenceSlugs.ts so the site chrome could resolve them too, and a source-text assertion
    // would have gone quiet at exactly that point without the property changing at all.
    const line = getReferenceChapters("pt").find((c) => c.slug === "banzai")?.summary;
    expect(line, "chapter-12 card must exist").toBeTruthy();
    // M2.19G.5F closure: the canonical formulation is "interface humana primária e
    // transversal" (avoids the mandatory-dependency reading of "única"); the protocol
    // still works without the BanzAI.
    expect(line!).toMatch(/interface humana primária/i);
    expect(line!).toMatch(/transversal/i);
  });
  it("the BanzAI UI boundary constant names the primary interface + keeps the deny-list", () => {
    const agent = read("components/banzai/banzai-agent.ts");
    expect(agent).toMatch(/interface primária de trabalho/i);
    for (const s of ["não certifica", "não decide participação", "não inventa regras"]) {
      expect(agent).toContain(s);
    }
  });
});

describe("M2.14J — operador-zero copy matches the live (active) subdomain", () => {
  it("the reference no longer says the zero subdomain is 'não activo'", () => {
    const ref = read("../docs/reference/pt/BANZA_REFERENCIA.md");
    expect(ref).not.toContain("preparado, mas não activo");
  });
});

describe("M2.14J — no POSITIVE forbidden BanzAI-authority claim in key public copy", () => {
  const files = [
    "app/(pt)/banzai/page.tsx",
    "app/(pt)/estado/page.tsx",
    "components/banzai/banzai-agent.ts",
    // M2.15A: the home architecture section was removed from the homepage; the reference/ADRs/SVGs
    // carry the canonical architecture. The remaining files still guard the positive-claim rule.
  ];
  // A POSITIVE claim = the forbidden verb WITHOUT a negation cue on the same line.
  const forbidden = /banzai\s+(certifica|aprova|licencia|publica operadores|movimenta fundos)/i;
  const negation = /(não|nao|nunca|nem|does not|not a)/i;
  for (const f of files) {
    it(`${f} makes no positive forbidden claim`, () => {
      const lines = read(f).split("\n");
      const offenders = lines.filter((l) => forbidden.test(l) && !negation.test(l));
      expect(offenders, offenders.join("\n")).toHaveLength(0);
    });
  }
});

describe("SVG-P-057 overview is the three-layer architecture with BanzAI transversal", () => {
  it("names BanzAI as the single transversal human interface, never a fourth layer or 'agente nativo'", () => {
    // M2.19G rewrote SVG-P-057 into the canonical three-layer institutional overview (Camada 1 Protocolo aberto ·
    // Camada 2 Certificação de Conformidade e Interoperabilidade · Camada 3 Esquemas operacionais independentes) with BanzAI shown as the single
    // human interface, transversal to the three layers — not a fourth/fifth layer and not merely a
    // "native agent". The M2.14J-era "interface primária" wording was superseded by "interface humana
    // única e transversal".
    const svg = read("public/diagrams/protocol/banza-protocol-architecture-overview-v1.svg");
    expect(svg).toMatch(/interface humana única/i);
    expect(svg).toMatch(/transversal/i);
    expect(svg).not.toContain("BanzAI · agente nativo");
  });
});
