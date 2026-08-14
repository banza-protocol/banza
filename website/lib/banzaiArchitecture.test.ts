import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getBanzaiArchitecture,
  getCanonicalPhrasePt,
  getBanzaiDiagrams,
  getBanzaiRuntimeContract,
} from "./banzaiArchitecture";
import { getReferenceChapter } from "./reference";

// M2.19G.5F FINAL CLOSURE — the canonical BanzAI architecture manifest
// (website/content/banzai/architecture-manifest.json) is the structured consistency contract behind
// Referência §12 (/referencia/banzai). This test mirrors tools/check-banzai-architecture-manifest.sh so
// a manifest ↔ §12 drift, or a terminology regression, fails in unit tests too.

const m = getBanzaiArchitecture();
const ch12 = getReferenceChapter("banzai")!;
const body = ch12.content;

describe("BanzAI architecture manifest — structure", () => {
  it("declares the banzai-architecture/1 schema", () => {
    expect(m.schema_version).toBe("banzai-architecture/1");
  });
  it("has 5 planes, 2 diagrams, 9 authority rows, 3 provenance levels", () => {
    expect(m.planes).toHaveLength(5);
    expect(m.diagrams).toHaveLength(2);
    expect(m.authority_matrix.rows).toHaveLength(9);
    expect(m.provenance_levels).toHaveLength(3);
  });
  it("carries the two complementary figures: external position (SVG-P-100) then cognitive engine (SVG-P-101)", () => {
    expect(getBanzaiDiagrams().map((d) => d.id)).toEqual(["SVG-P-100", "SVG-P-101"]);
    expect(getBanzaiDiagrams().map((d) => d.name)).toEqual(["banzai-no-protocolo", "banzai-motor-cognitivo"]);
  });
});

describe("BanzAI architecture manifest — canonical phrase (primary + transversal)", () => {
  it("the primary phrase is the primary/transversal formulation, not the isolated 'única'", () => {
    expect(getCanonicalPhrasePt()).toMatch(/interface humana primária e transversal/);
    expect(getCanonicalPhrasePt()).not.toMatch(/interface humana única/);
  });
  it("the primary phrase appears verbatim in §12", () => {
    expect(body).toContain(getCanonicalPhrasePt());
  });
});

describe("BanzAI architecture manifest — parity with §12", () => {
  it("still carries the 9-row authority matrix as machine-readable data (not a §12 table)", () => {
    expect(m.authority_matrix.rows).toHaveLength(9);
    // §12 now states authority as prose; it must not render an authority table.
    expect(body).not.toMatch(/^\|\s*Função\s*\|\s*BanzAI\s*\|/m);
  });
  it("every provenance level is present in §12", () => {
    for (const p of m.provenance_levels) {
      expect(body, `provenance level missing in §12: ${p.label_pt}`).toContain(p.label_pt);
    }
  });
  it("both served diagram paths are embedded in §12", () => {
    for (const d of m.diagrams) expect(body).toContain(d.served_path);
  });
  it("states the protocol works without the BanzAI", () => {
    expect(m.protocol_works_without_banzai.required_present).toBe(true);
    expect(body).toMatch(/funciona sem o BanzAI|verificável sem o BanzAI/);
  });
  it("shows the automatic-consumer direct path (direct public interfaces)", () => {
    expect(body).toMatch(/acessíveis directamente|independentemente do BanzAI|integrações máquina-a-máquina/);
  });
});

describe("BanzAI architecture manifest — runtime SSOT contract", () => {
  const rt = getBanzaiRuntimeContract();
  it("targets GET /banzai/runtime with the banzai-runtime/1 schema (ADR-036)", () => {
    expect(rt.route).toBe("/banzai/runtime");
    expect(rt.method).toBe("GET");
    expect(rt.schema_version).toBe("banzai-runtime/1");
    expect(rt.adr).toBe("ADR-036");
    expect(rt.authoritative).toBe(false);
  });
  it("carries the required runtime fields", () => {
    for (const f of [
      "schema_version", "service", "status", "mode", "model_available",
      "inference_location", "external_calls", "checked_at", "authoritative",
    ]) {
      expect(rt.fields).toContain(f);
    }
  });
  it("provides the runtime-strip provenance + verified labels + honest fallback", () => {
    expect(rt.labels.provenance_pt).toBe("Fonte: estado público do runtime");
    expect(rt.labels.verified_prefix_pt).toBe("Verificado em:");
    expect(rt.labels.fallback_pt).toMatch(/Estado do runtime não confirmado/);
  });
});

describe("BanzAI architecture manifest — chapter-12 card echoes the canonical form", () => {
  it("reference.ts ch.12 card carries 'interface humana primária' + 'transversal'", () => {
    const refLib = readFileSync(join(process.cwd(), "lib", "reference.ts"), "utf8");
    const line = refLib.split("\n").find((l) => l.includes('slug: "banzai"'))!;
    expect(line).toMatch(/interface humana primária/);
    expect(line).toMatch(/transversal/);
  });
});
