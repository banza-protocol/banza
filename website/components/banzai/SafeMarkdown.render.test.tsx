// M2.14F-FIX2 — the ONE shared BanzAI answer renderer (SafeMarkdown) turns answer_markdown into safe
// HTML: bold, lists, paragraphs, safe links; raw HTML / scripts / javascript: links are inert. Rendered
// with react-dom/server (no DOM needed). This is the renderer the hero widget and /banzai both use, so
// proving it here proves the unified contract; the guard proves the hero actually imports/uses it.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeMarkdown } from "@/components/banzai/SafeMarkdown";

const html = (text: string) => renderToStaticMarkup(createElement(SafeMarkdown, { text }));

// The composed capabilities answer, exactly as the server emits it (entities already bolded, `- ` lists).
const CAPABILITIES = [
  "O **BanzAI** é o agente IA nativo do protocolo **BANZA**: ajuda a compreender, implementar e verificar o protocolo, mas não cria regras nem substitui os motores verificáveis.",
  "",
  "**O que pode fazer:**",
  "- explicar regras, documentos, **ADRs**, manifestos, evidência e fluxos do **BANZA**;",
  "- orientar operadores a preparar manifestos, evidence bundles e testes de conformidade;",
  "- ajudar a simular fluxos demo com o **Operador Zero** (com **KZ_DEMO**, sem dinheiro real).",
  "",
  "**O que não pode fazer:**",
  "- certificar, aprovar ou licenciar operadores;",
  "- transformar **KZ_DEMO** em dinheiro real.",
].join("\n");

describe("SafeMarkdown — capabilities answer", () => {
  const out = html(CAPABILITIES);
  it("renders entities in bold (not literal **)", () => {
    expect(out).toContain("<strong");
    expect(out).toMatch(/<strong[^>]*>BanzAI<\/strong>/);
    expect(out).toMatch(/<strong[^>]*>BANZA<\/strong>/);
    expect(out).toMatch(/<strong[^>]*>Operador Zero<\/strong>/);
    expect(out).toMatch(/<strong[^>]*>KZ_DEMO<\/strong>/);
  });
  it("never leaves raw ** or **** in the output", () => {
    expect(out).not.toContain("**");
  });
  it("renders section headers in bold", () => {
    expect(out).toMatch(/<strong[^>]*>O que pode fazer:<\/strong>/);
    expect(out).toMatch(/<strong[^>]*>O que não pode fazer:<\/strong>/);
  });
  it("renders bullets as a real list (not '-explicar' text)", () => {
    expect(out).toContain("<ul");
    expect(out).toContain("<li");
    expect(out).not.toContain("-explicar");
    expect(out).not.toMatch(/(^|>)- explicar/); // the "- " marker is consumed, not shown
  });
});

describe("SafeMarkdown — entity answer (all occurrences + slash run)", () => {
  const out = html("O **Banzami** criou o **BANZA**. A distinção **Banzami**/**BANZA**/**BanzAI** é clara.");
  it("bolds every occurrence, no ** / ****", () => {
    expect((out.match(/<strong[^>]*>Banzami<\/strong>/g) || []).length).toBe(2);
    expect(out).not.toContain("**");
  });
  it("keeps the slash separators literal between bold entities", () => {
    expect(out).toMatch(/<strong[^>]*>Banzami<\/strong>\/<strong[^>]*>BANZA<\/strong>\/<strong[^>]*>BanzAI<\/strong>/);
  });
});

describe("SafeMarkdown — boundary / refusal answers", () => {
  it("renders a safe refusal as markdown, no raw **", () => {
    const out = html("Não. O **BanzAI** não movimenta fundos nem opera dinheiro real. Usa o **Operador Zero** (com **KZ_DEMO**).");
    expect(out).toMatch(/<strong[^>]*>BanzAI<\/strong>/);
    expect(out).not.toContain("**");
  });
});

describe("SafeMarkdown — sanitization (never trusts content)", () => {
  it("does not execute or emit <script>", () => {
    const out = html("Antes <script>window.__x=1</script> depois **BANZA**.");
    expect(out).not.toContain("<script");
    expect(out).toMatch(/<strong[^>]*>BANZA<\/strong>/);
  });
  it("strips javascript: and data: links to plain text", () => {
    const out = html("[clica](javascript:alert(1)) e [x](data:text/html,evil)");
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("data:text/html");
    expect(out).not.toMatch(/<a[^>]+href=["']javascript:/i);
  });
  it("does not link excluded/secret-looking external hosts as anchors", () => {
    const out = html("vê [malo](http://evil.example.com/x)");
    // safeLinks only permits GitHub-org / internal links; an arbitrary host renders as plain text.
    expect(out).not.toContain("evil.example.com");
  });
});

describe("SafeMarkdown — fallback answer", () => {
  it("renders bold entities and any bullets in a no_source fallback", () => {
    const out = html("Não tenho fonte suficiente. Posso responder sobre **BANZA**, **BanzAI** e a distinção **Banzami**/**BANZA**/**BanzAI**.");
    expect(out).toMatch(/<strong[^>]*>Banzami<\/strong>/);
    expect(out).not.toContain("**");
  });
});
