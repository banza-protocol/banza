import { describe, it, expect } from "vitest";
import {
  BANZAI_AGENT, TABS, MODES, TAB_META, BADGES, AUTHORITY_COPY, FORBIDDEN_PHRASES,
  AGENT_SUGGESTIONS, CONFORMIDADE_LEVELS, TRUST_CARDS,
  EVIDENCE_CONTENT, RFC_DOCS, PROTOCOL_MAP_NODES, DEV_COMMANDS, DEV_QUESTIONS, DEV_ENDPOINTS,
} from "./banzai-agent";

// M2.19EF2 — the single BanzAI shell naming/navigation/copy contract. One app at /banzai, two modes
// (ask/validation), four sidebar groups (Modos · Jornada de validação · Recursos · Resultados). These
// assertions guard the required authority/boundary copy, the absence of forbidden claims, and the
// removal of outdated (pre-Rust-first) developer commands.

describe("BanzAI single-shell naming + navigation (M2.19EF2)", () => {
  it("names the experience 'BanzAI' (the native protocol agent), not 'Workbench'/'Chat'/'Sistema de Conhecimento'", () => {
    expect(BANZAI_AGENT.name).toBe("BanzAI");
    expect(BANZAI_AGENT.heroTitle).toBe("BanzAI");
    expect(BANZAI_AGENT.subtitle).toMatch(/^Interface interactiva do protocolo/);
    expect(BANZAI_AGENT.shortPhrase).toBe("BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.");
    // the public product name is no longer "BanzAI Workbench"
    expect(BANZAI_AGENT.name).not.toContain("Workbench");
    expect(BANZAI_AGENT.heroTitle).not.toContain("Workbench");
  });

  it("exposes the three modes (Modos): Perguntar · Validar operador · Onboarding (M2.19G.1/ADR-034, M2.19G.3/ADR-037)", () => {
    expect(MODES.map((m) => m.mode)).toEqual(["ask", "validation", "onboarding"]);
    expect(MODES.map((m) => m.name)).toEqual(["Perguntar ao BanzAI", "Validar operador", "Onboarding de operador"]);
    // ask is the default entry mode.
    expect(MODES[0].mode).toBe("ask");
    // The old label was retired.
    expect(MODES.map((m) => m.name)).not.toContain("Validar uma implementação");
  });

  it("collapses Resultados to ONE entry and Recursos to Guia · Referência · Programadores (ADR-034 §29)", () => {
    // Resultados is a SINGLE sidebar entry (in-area sub-views, not separate tabs).
    expect(TABS.filter((t) => t.group === "resultados").map((t) => t.key)).toEqual(["resultados"]);
    expect(TABS.filter((t) => t.group === "recursos").map((t) => t.key)).toEqual([
      "guia", "rfc", "programadores",
    ]);
    // The per-analyser Resultados tabs were retired (folded into the single "resultados" area).
    for (const gone of ["receipts", "conformidade", "traces", "manifest", "evidence", "trust", "simb"]) {
      expect(TABS.map((t) => t.key as string)).not.toContain(gone);
    }
    // Every group is one of the two shared-shell groups.
    for (const t of TABS) expect(["recursos", "resultados"]).toContain(t.group);
    // No redundant "BanzAI" nav item (the page already IS the BanzAI agent).
    expect(TABS.map((t) => t.name)).not.toContain("BanzAI");
    // No milestone (M2.x) label ever appears as a public nav label.
    for (const t of TABS) {
      expect(t.name).not.toContain("M2");
      expect(t.key).not.toContain("m2");
    }
    // No banned legacy labels in the sidebar.
    for (const banned of ["Chat", "Assistente de Certificação", "Pesquisa de Conhecimento", "Trust Engine", "RFC / ADR"]) {
      expect(TABS.map((t) => t.name)).not.toContain(banned);
    }
  });

  it("TAB_META resolves a name + icon for every WbTab (assistente/guia/rfc/programadores/resultados)", () => {
    for (const key of ["assistente", "guia", "rfc", "programadores", "resultados"] as const) {
      expect(TAB_META[key]).toBeDefined();
      expect(TAB_META[key].name.length).toBeGreaterThan(0);
    }
    expect(TAB_META.assistente.name).toBe("Perguntar ao BanzAI");
    expect(TAB_META.resultados.name).toBe("Resultados");
  });

  it("exposes accurate configured-default status badges (no mock/demo wording; no per-answer overstatement)", () => {
    expect([...BADGES]).toEqual([
      "Motor por omissão: Qwen local",
      "Inferência local (on-host)",
      "Sem chamadas externas",
      "Estado por resposta",
      "Não normativo",
      "Pré-produção do protocolo",
    ]);
    // Must never advertise mock/demo/provider framing while local_qwen is the active default.
    for (const b of BADGES) {
      expect(b.toLowerCase()).not.toMatch(/mock|demonstra|demo\b|provider/);
    }
    // The standing badge must describe the CONFIGURED default ("por omissão"), never assert that
    // every answer used Qwen — the per-answer status line carries that truth (M2.8F).
    expect(BADGES[0]).toMatch(/por omissão/);
    expect([...BADGES]).not.toContain("Qwen local activo");
  });
});

describe("authority boundary copy (BX0)", () => {
  it("keeps the required boundary statements", () => {
    expect(AUTHORITY_COPY.noCertify).toContain("não certifica");
    expect(AUTHORITY_COPY.caDecides).toContain("decisão humana central");
    expect(AUTHORITY_COPY.passIsEvidence).toContain("não certificado");
    expect(AUTHORITY_COPY.preProduction).toContain("pré-produção");
    expect(BANZAI_AGENT.boundary).toContain("evidência verificável");
  });

  it("never uses a forbidden claim anywhere in the Workbench copy", () => {
    const publicCopy = [
      ...Object.values(BANZAI_AGENT),
      ...MODES.map((m) => m.name),
      ...TABS.map((t) => t.name),
      ...Object.values(AUTHORITY_COPY),
      ...AGENT_SUGGESTIONS,
      ...CONFORMIDADE_LEVELS.map((l) => l.name),
      ...TRUST_CARDS.flatMap((c) => [c.title, c.q]),
      ...EVIDENCE_CONTENT,
      ...RFC_DOCS.flatMap((d) => [d.title, d.q]),
      ...PROTOCOL_MAP_NODES.flatMap((n) => [n.role, n.q]),
      ...DEV_COMMANDS, ...DEV_QUESTIONS, ...DEV_ENDPOINTS,
    ].join("  ");
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(publicCopy).not.toContain(phrase);
    }
    // BX1.5A — Portuguese public copy must not use the word "corpus" (use "base de conhecimento").
    expect(publicCopy.toLowerCase()).not.toContain("corpus");
  });

  it("suggests operational duration/metric demonstrators (ADR-036)", () => {
    const joined = AGENT_SUGGESTIONS.join(" ");
    // Still anchored on the validation journey, but now exercising the operational telemetry answers:
    // total duration, the slowest step, and a run-over-run comparison.
    expect(joined).toContain("validação");
    expect(joined.toLowerCase()).toContain("tempo");
    expect(joined.toLowerCase()).toContain("duração");
  });
});

describe("developer commands are Rust-first (BX0; SimB retired from active surfaces — ADR-036)", () => {
  it("uses banza-conformance-rs / banza-trust, not the outdated pip install, and no longer advertises SimB", () => {
    const cmds = DEV_COMMANDS.join(" ");
    expect(cmds).not.toContain("pip install banza-conformance");
    expect(cmds).toContain("banza-conformance-rs");
    expect(cmds).toContain("banza-trust");
    // ADR-036: SimB is retired from active surfaces. The banza-simb engine, its SIMB_PRE_REVIEW gate
    // and the isolated draft-validation libs (BLOCKED_BY_SIMB) are kept; it is simply no longer
    // advertised as a developer command on the public /banzai surface.
    expect(cmds).not.toContain("banza-simb");
  });
});
