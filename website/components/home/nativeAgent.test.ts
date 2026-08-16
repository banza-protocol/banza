import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BANZAI_AGENT } from "../banzai/banzai-agent";

// M2.7H — BanzAI as native protocol agent. Source-level contract over the reference, the home
// architecture section and the BanzAI UI constants: BanzAI is the guidance/orchestration AGENT, the
// "quem faz o quê" split + rule provenance are stated, and the old "BanzAI Workbench" brand is gone
// from the public product name.

const root = join(__dirname, "..", "..");
const ref = readFileSync(join(root, "..", "docs", "reference", "pt", "BANZA_REFERENCIA.md"), "utf8");
// M2.15A: the home architecture section (OperatorArchitectureSection) was removed from the homepage;
// the canonical protocol architecture + BanzAI framing now live in the reference (asserted above) and
// the BanzAI UI constants (below). The old source-level assertions over that component are retired.

describe("M2.7H — reference presents BanzAI as the protocol agent", () => {
  it("has the '## 12. BanzAI — Agente do Protocolo' chapter (M2.7L canonical, §12 after the M2.12B renumbering)", () => {
    expect(ref).toContain("## 12. BanzAI — Agente do Protocolo");
  });
  // M2.19G.5F — §12 is the canonical 7-section rewrite (ADR-036/ADR-036/ADR-036). These assertions track
  // the CURRENT canonical §12 wording, preserving the original intent. Reconciled during the Ch04 editorial
  // pass: the earlier assertions matched an older §12/§4 (an "Autoridade e fronteiras" matrix and the §4
  // "o Rust compreende…/…explica uma vez" sentence). The 5F rewrite renamed §12's sections to "Autoridade
  // e limites" + "Proveniência" + "Como o BanzAI responde", and the Ch04 rewrite removed that old §4
  // sentence — so the assertions now point at the live §12 headings and phrasing.
  it("presents the authority rule and the source provenance split (§12 canonical)", () => {
    expect(ref).toContain("### Autoridade e limites");
    expect(ref).toMatch(/O BanzAI orienta; os motores verificam; a evidência prova; a autoridade competente decide/);
    expect(ref).toContain("### Proveniência");
    expect(ref).toContain("As fontes **Normativas**");
    expect(ref).toContain("A **Governação e racional** regista decisões");
  });
  it("states the rules are not invented — BanzAI reads, cites, orchestrates and explains", () => {
    expect(ref).toContain("Lê, cita, orquestra e explica");
    expect(ref).toMatch(/a validade das regras vem do protocolo e os veredictos e a evidência vêm dos motores/);
  });
  it("carries the canonical boundary (not a fourth layer / not normative; works without it)", () => {
    expect(ref).toContain("Não constitui uma quarta camada do BANZA e não é fonte normativa");
    expect(ref).toContain("O protocolo permanece utilizável e verificável sem o BanzAI");
  });
  it("states the canonical single-synthesis architecture (§12 'Como o BanzAI responde', ADR-036/ADR-036)", () => {
    expect(ref).toContain("### Como o BanzAI responde");
    expect(ref).toMatch(/percurso determinístico em Rust/i);
    expect(ref).toMatch(/nunca a resposta final/i);
    expect(ref).toMatch(/verificação final, obrigatória e em Rust/i);
  });
});

describe("M2.7H — BanzAI UI constants use the agent framing, not the old brand", () => {
  it("names the experience 'BanzAI' with subtitle 'Agente do protocolo'", () => {
    expect(BANZAI_AGENT.name).toBe("BanzAI");
    expect(BANZAI_AGENT.subtitle).toMatch(/^Interface interactiva do protocolo/);
    expect(BANZAI_AGENT.name).not.toContain("Workbench");
  });
  it("the short phrase is the canonical agent triad", () => {
    expect(BANZAI_AGENT.shortPhrase).toBe("BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.");
  });
  it("the boundary denies authority (não decide / não certifica / não inventa regras)", () => {
    for (const s of ["não decide", "não certifica", "não inventa regras"]) {
      expect(BANZAI_AGENT.boundary).toContain(s);
    }
  });
});
