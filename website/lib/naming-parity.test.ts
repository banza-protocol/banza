import { describe, it, expect } from "vitest";
import { GLOSSARY_TERMS } from "@/lib/glossaryTerms";
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

// A per-edition content module holds BOTH editions in one file, so scanning it whole would report the
// English edition's own correct term as a Portuguese-surface violation. Only the Portuguese entry is a
// Portuguese surface; the English entry is checked by the English naming rules, not these.
const PT_EDITION_ONLY = new Set(["components/pages/statusContent.tsx"]);
const ptSurface = (p: string) => {
  const src = raw(p);
  if (!PT_EDITION_ONLY.has(p)) return src;
  const start = src.indexOf("\n  pt: {");
  const end = src.indexOf("\n  en: {");
  return start >= 0 && end > start ? src.slice(start, end) : src;
};

// Keep only "rendered" source lines: drop dev comments and the glossary `en:` gloss fields.
const renderedLines = (src: string) =>
  src
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .filter((l) => !/\ben:\s*"/.test(l))
    .join("\n");

const PAGES = [
  "components/pages/statusContent.tsx",
  "app/(pt)/registo-tecnico/page.tsx",
  // app/roteiro/page.tsx retired — the standalone roadmap surface now permanent-redirects to
  // §14 "Evolução do Protocolo" at /referencia/roteiro (no standalone page to scan).
  "app/(pt)/operadores/page.tsx",
  "app/(pt)/page.tsx",
  "lib/glossaryTerms.ts",
];

const EN_RX = /Technical Registry|Public Protocol Registry/;

// Block F — the status page's structure and copy moved into one shared view plus a per-edition content
// module, which is why the route file no longer carries this text. Reading the content module is the
// same property at its new owner, and it now covers both editions at once.
describe("M2.19G.5C — Technical Registry naming parity", () => {
  for (const p of PAGES) {
    it(`${p} uses no EN 'Technical Registry' / 'Public Protocol Registry' in rendered strings`, () => {
      const rendered = renderedLines(ptSurface(p));
      expect(rendered).not.toMatch(EN_RX);
    });
  }

  it("layout meta description carries no 'public protocol registry'", () => {
    const rendered = renderedLines(raw("app/(pt)/layout.tsx"));
    expect(rendered.toLowerCase()).not.toContain("public protocol registry");
  });

  it("PT surfaces use the term 'Registo Técnico'", () => {
    for (const p of ["app/(pt)/registo-tecnico/page.tsx", "lib/glossaryTerms.ts", "components/pages/statusContent.tsx", "app/(pt)/operadores/page.tsx"]) {
      expect(ptSurface(p)).toContain("Registo Técnico");
    }
  });

  it("the glossary defines the canonical mapping (Registo Técnico → BANZA Technical Registry)", () => {
    // Asserted on the SEMANTIC RECORD, not on source syntax. The previous version matched
    // `name: "Registo Técnico"` as text, which stopped meaning anything the moment the term became a
    // per-locale object — and a regex loosened to accept both shapes would have proved nothing at all.
    const term = GLOSSARY_TERMS.find((t) => t.key === "technical-registry");
    expect(term, "the technical-registry term must exist in the glossary").toBeTruthy();
    expect(term!.name.pt).toBe("Registo Técnico");
    expect(term!.name.en).toBe("BANZA Technical Registry");
  });
});
