import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// M2.19G.5C — Technical Registry naming parity. The PT canonical surfaces name the Layer-2 registry
// "Registo Técnico"; the /glossario mapping is the source of truth (name "Registo Técnico",
// en: "BANZA Technical Registry"). PT rendered strings must NOT use the English "Technical Registry" /
// "Public Protocol Registry"; the layout meta description must NOT use "public protocol registry".
// Dev comments (`//`, `*`) and the deliberate glossary `en:` gloss fields are exempt. This is the vitest
// counterpart to tools/check-technical-registry-naming-parity.sh.

const root = join(__dirname, "..");
const raw = (p: string) => readFileSync(join(root, p), "utf8");

// Keep only "rendered" source lines: drop dev comments and the glossary `en:` gloss fields.
const renderedLines = (src: string) =>
  src
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .filter((l) => !/\ben:\s*"/.test(l))
    .join("\n");

const PAGES = [
  "app/(pt)/estado/page.tsx",
  "app/(pt)/registo-tecnico/page.tsx",
  // app/roteiro/page.tsx retired — the standalone roadmap surface now permanent-redirects to
  // §14 "Evolução do Protocolo" at /referencia/roteiro (no standalone page to scan).
  "app/(pt)/operadores/page.tsx",
  "app/(pt)/page.tsx",
  "app/(pt)/glossario/page.tsx",
];

const EN_RX = /Technical Registry|Public Protocol Registry/;

describe("M2.19G.5C — Technical Registry naming parity", () => {
  for (const p of PAGES) {
    it(`${p} uses no EN 'Technical Registry' / 'Public Protocol Registry' in rendered strings`, () => {
      const rendered = renderedLines(raw(p));
      expect(rendered).not.toMatch(EN_RX);
    });
  }

  it("layout meta description carries no 'public protocol registry'", () => {
    const rendered = renderedLines(raw("app/(pt)/layout.tsx"));
    expect(rendered.toLowerCase()).not.toContain("public protocol registry");
  });

  it("PT surfaces use the term 'Registo Técnico'", () => {
    for (const p of ["app/(pt)/registo-tecnico/page.tsx", "app/(pt)/glossario/page.tsx", "app/(pt)/estado/page.tsx", "app/(pt)/operadores/page.tsx"]) {
      expect(raw(p)).toContain("Registo Técnico");
    }
  });

  it("the glossary defines the canonical mapping (Registo Técnico → BANZA Technical Registry)", () => {
    const glo = raw("app/(pt)/glossario/page.tsx");
    expect(glo).toMatch(/name:\s*"Registo Técnico"/);
    expect(glo).toMatch(/en:\s*"BANZA Technical Registry"/);
  });
});
