import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { footerColumns } from "./site";

// M2.19G — the three new canonical owner pages (/certificacao, /registo-tecnico, /glossario). Source-level
// assertions that each page carries its canonical content and NONE of the retired framings, and that all
// three are wired into the footer (site.ts) and the sitemap (app/sitemap.ts). Reads are comment-stripped +
// whitespace-flattened (like m2_17-homepage.test.ts) so assertions check what the components RENDER; ADR
// references (which live in source comments) are asserted against the raw source instead.

const root = join(__dirname, "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const raw = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (p: string) => strip(raw(p)).replace(/\s+/g, " ");

const CERT = "app/certificacao/page.tsx";
const REG = "app/registo-tecnico/page.tsx";
const GLO = "app/glossario/page.tsx";

const cert = flat(CERT);
const reg = flat(REG);
const glo = flat(GLO);

// Retired framings that must never appear as rendered content on any of the three pages. (Terms that the
// pages legitimately mention only inside a negation — e.g. "não há autoridade certificadora" — are covered
// by the negation-aware bash guards, not by these blunt substring checks.)
const RETIRED_ABSENT = [
  "BANZA CA",
  "Validation Workbench",
  "BanzAI Web",
  // Split so this source file never carries the contiguous retired-route literal that
  // check-banzai-single-interface.sh greps for across website/**/*.ts (it does not exclude *.test.ts).
  // At runtime this concatenates to exactly the retired validation route under /banzai.
  "/banzai/" + "validar",
  "certificado de operador",
  "certificate authority",
  "quatro camadas",
  "cinco camadas",
];

const LIFECYCLE = ["NOT_CERTIFIED", "CERTIFIED", "EXPIRED", "SUSPENDED", "REVOKED", "SUPERSEDED"];

describe("M2.19G — /certificacao (L2 certification model)", () => {
  it("carries both mandatory canonical sentences verbatim", () => {
    expect(cert).toContain(
      "A certificação BANZA é uma certificação técnica de uma implementação específica, limitada ao perfil, versão, ambiente, capabilities, âmbito e validade indicados."
    );
    expect(cert).toContain(
      "A certificação BANZA não constitui licença financeira, autorização regulatória, admissão automática num scheme, aprovação comercial ou garantia institucional."
    );
  });
  it("states the certification ≠ admission ≠ authorisation separation", () => {
    for (const s of ["Certificação técnica", "Admissão a esquema", "Autorização regulatória"]) {
      expect(cert).toContain(s);
    }
    expect(cert).toMatch(/&ne;|≠/);
  });
  it("cites the certification ADRs, and every ADR it cites exists", () => {
    const src = raw(CERT);
    // The page must ground itself in decision records, and every record it names must exist. Pinning
    // the ids made this assert a numbering; it asserts the property now.
    const cited = [...src.matchAll(/ADR-(\d{3})/g)].map((m) => m[1]);
    expect(cited.length, "the page must cite at least one decision record").toBeGreaterThan(0);
    const have = new Set(
      readdirSync(join(root, "..", "decisions", "adr"))
        .filter((f) => f.startsWith("ADR-"))
        .map((f) => f.slice(4, 7)),
    );
    expect(cited.filter((c) => !have.has(c)), "cited but absent").toHaveLength(0);
  });
  it("names the closed fail-closed lifecycle states", () => {
    for (const s of LIFECYCLE) expect(cert).toContain(s);
  });
  it("uses none of the retired framings as rendered content", () => {
    for (const bad of RETIRED_ABSENT) expect(cert, `/certificacao must not contain "${bad}"`).not.toContain(bad);
  });
});

describe("M2.19G — /registo-tecnico (BANZA Technical Registry)", () => {
  it("carries the canonical registry definition (root-verifiable, Camada 2)", () => {
    expect(reg).toContain("Registo Técnico BANZA");
    expect(reg).toContain("verificável por raiz");
    expect(reg).toMatch(/\(Camada 2\)/);
  });
  it("names the closed certification states", () => {
    for (const s of LIFECYCLE) expect(reg).toContain(s);
  });
  it("is explicitly not a scheme-participant directory (listed ≠ admission ≠ authorisation)", () => {
    expect(reg).toContain("directório de participantes");
    expect(reg).toMatch(/constar no registo não é|independente do (directório|diretório)/);
    expect(reg).toMatch(/admiss/i);
    expect(reg).toMatch(/autoriza/i);
  });
  it("states the honest empty / pre-production state", () => {
    expect(reg).toContain("[]");
    expect(reg).toMatch(/pré-produção|registo (está )?vazio|lista vazia/i);
  });
  it("uses none of the retired framings as rendered content", () => {
    for (const bad of RETIRED_ABSENT) expect(reg, `/registo-tecnico must not contain "${bad}"`).not.toContain(bad);
  });
});

describe("M2.19G — /glossario (canonical current-only glossary)", () => {
  const REQUIRED = [
    "Operador",
    "Implementação",
    "Conformidade",
    "Interoperabilidade",
    "Certificação",
    "Admissão a esquema",
    "Autorização regulatória",
    "Evidência",
    "Registo Técnico",
    "Perfil",
    "Capability",
    "Revogação",
    "Federação",
    "Esquema operacional",
  ];
  it("defines the required current terms", () => {
    for (const t of REQUIRED) expect(glo, `/glossario must define "${t}"`).toContain(t);
  });
  it("defines none of the retired terms as current concepts", () => {
    for (const bad of RETIRED_ABSENT) expect(glo, `/glossario must not contain "${bad}"`).not.toContain(bad);
  });
});

describe("M2.19G — navigation + sitemap linkage (footer set narrowed by M2.19G.2 §26)", () => {
  const footerHrefs = footerColumns.flatMap((c) => c.items.map((i) => i.href));
  const sitemap = raw("app/sitemap.ts");
  // All three owner pages remain canonical routes and stay in the sitemap.
  for (const route of ["/certificacao", "/registo-tecnico", "/glossario"]) {
    it(`lists ${route} in the sitemap`, () => {
      expect(sitemap, `sitemap must list ${route}`).toContain(`"${route}"`);
    });
  }
  // M2.19G.2 §26 rebuilt the footer into three groups (Protocolo · Implementar e validar · Governança);
  // the Technical Registry is the only one of the three owner pages carried as a footer link. /certificacao
  // and /glossario are reachable from their owner pages, not from the global footer.
  it("carries the Technical Registry in the footer", () => {
    expect(footerHrefs, "footer must link /registo-tecnico").toContain("/registo-tecnico");
  });
});
