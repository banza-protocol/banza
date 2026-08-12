import { describe, it, expect } from "vitest";
import { getReferenceChapter } from "./reference";

// The BanzAI reference chapter (§12, /referencia/banzai) is the canonical, Whitepaper-level
// description of the agent: exactly 6 H3 sections, ~999 words of body prose, exactly TWO complementary
// diagrams (external position + internal cognitive engine), authority stated as PROSE (no authority
// table), and "Registo Técnico" (PT canonical). This mirrors the shell guard
// tools/check-banzai-reference-canonical.sh so a regression fails in unit tests too.

const ch = getReferenceChapter("banzai")!;
const body = ch.content;

// Body prose word count: exclude headings, table rows, image embeds, hr, fenced code.
function proseWordCount(md: string): number {
  let fence = false;
  let n = 0;
  for (const raw of md.split("\n")) {
    if (/^```/.test(raw)) { fence = !fence; continue; }
    if (fence) continue;
    const l = raw.trim();
    if (l === "" || l.startsWith("#") || l.startsWith("|") || l.startsWith("![") || l === "---") continue;
    const t = l.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*`>#|]/g, " ");
    n += t.split(/\s+/).filter(Boolean).length;
  }
  return n;
}

describe("BanzAI reference chapter — canonical", () => {
  it("keeps the canonical H2 title", () => {
    expect(ch.title).toBe("12. BanzAI — Agente do Protocolo");
  });

  it("has exactly 6 H3 sections in the canonical order", () => {
    const h3 = body.split("\n").filter((l) => l.startsWith("### ")).map((l) => l.replace(/^###\s+/, "").trim());
    expect(h3).toEqual([
      "Papel no BANZA",
      "Como o BanzAI responde",
      "Fontes e ferramentas",
      "Proveniência",
      "Autoridade e limites",
      "Implementação",
    ]);
  });

  it("has body prose between 850 and 1100 words", () => {
    const wc = proseWordCount(body);
    expect(wc).toBeGreaterThanOrEqual(850);
    expect(wc).toBeLessThanOrEqual(1100);
  });

  it("embeds exactly the two complementary diagrams: external position then cognitive engine", () => {
    // Document order: "Papel no BANZA" (where the BanzAI sits) precedes "Como o BanzAI responde"
    // (how it works). The Reference is self-contained — a related Whitepaper figure is not a reason
    // to drop either here.
    const imgs = [...body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(imgs).toEqual([
      "/diagrams/protocol/banzai-no-protocolo.svg",
      "/diagrams/protocol/banzai-motor-cognitivo.svg",
    ]);
  });

  it("does not embed the retired competing diagrams", () => {
    expect(body).not.toContain("banzai-cognitive-architecture.svg");
    expect(body).not.toContain("banzai-single-answer-pipeline.svg");
  });

  it("states the frozen architecture (typed contracts, secure fetch → snapshot, FactualPackage, optional model, rejected path)", () => {
    expect(body).toContain("FactualPackage");
    expect(body).toContain("contrato tipado");
    expect(body).toContain("obtenção segura");
    expect(body).toContain("snapshot");
    expect(body).toMatch(/caminho directo.*(rejeitad|→ modelo →)/i);
    expect(body).toMatch(/opcional/i);
  });

  it("lists the three provenance levels", () => {
    expect(body).toContain("Normativas");
    expect(body).toContain("Governação e racional");
    expect(body).toContain("Informativas");
  });

  it("states authority as prose (no authority table)", () => {
    const headers = body.split("\n").filter((l) => /^\|\s*Função\s*\|\s*BanzAI\s*\|/.test(l));
    expect(headers.length).toBe(0);
    expect(body).toContain("### Autoridade e limites");
    expect(body).toContain("orquestrar ferramentas não transfere");
  });

  it("carries the conversational-context and authority-boundary prose", () => {
    expect(body).toContain("contexto conversacional");
    expect(body).toContain("não constitui evidência");
    expect(body).toContain("não substitui um resultado");
  });

  it("has no extended FAQ inside the chapter", () => {
    expect(body).not.toMatch(/^###\s+.*\?/m);
    expect(body).not.toMatch(/^###\s+(perguntas frequentes|faq)/im);
  });

  it("never frames BanzAI as a fourth layer, passive UI, or mandatory hop; states the protocol works without it", () => {
    // "quarta camada" only appears negated
    for (const line of body.split("\n")) {
      if (/quarta camada/i.test(line)) expect(line).toMatch(/\b(não|nao|nunca)\b/i);
    }
    expect(body).not.toMatch(/simples chat|interface passiva|wrapper do modelo|encaminhador de pedidos/i);
    expect(body).toMatch(/funciona sem o BanzAI|verificável sem o BanzAI/);
  });

  it("uses Registo Técnico (PT canonical) and not the bare EN label", () => {
    expect(body).toContain("Registo Técnico");
    expect(body).not.toContain("Technical Registry");
  });
});
