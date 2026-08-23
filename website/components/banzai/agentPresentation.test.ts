import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MODES, TAB_META, TABS, REPO_LINK, RFC_DOCS, PROTOCOL_MAP_NODES } from "@/components/banzai/banzai-agent";
import { AGENT_COPY, agentCopy, agentCopyIds, getAgentPresentation } from "@/components/banzai/agentPresentation";

// The agent data module is where the workspace keeps its largest body of reader copy, and it is a plain
// module — no React, so no provider context reaches it. This file holds the two properties that make
// that safe: the Portuguese did not change when it moved, and English exists for everything.
//
// Semantic fields are checked to have stayed OUT of the catalogue. `mode`, `key`, `group`, `href` and
// the L0–L4 ids are routing and protocol identity; duplicating them per locale would let the two
// languages disagree about which tab a button opens, which is worse than a bad translation.

describe("agent presentation — the Portuguese surface is frozen, and the data module holds none of it", () => {
  it("every catalogue entry realizes both locales", () => {
    const ids = agentCopyIds();
    expect(ids.length).toBeGreaterThanOrEqual(160);
    for (const id of ids) {
      for (const l of ["pt", "en"] as const) {
        expect(AGENT_COPY[id][l].trim().length, `${id}/${l}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the Portuguese surface byte-for-byte", () => {
    // These are the strings the data module carried before Q8 moved them. Pinning them here is what makes
    // "the Portuguese did not change" checkable now that there is no module left to compare against.
    expect(agentCopy("agent.subtitle", "pt")).toBe("Interface interactiva do protocolo · consulta, valida e orienta");
    expect(agentCopy("agent.shortPhrase", "pt")).toBe("BanzAI guia; os motores verificam; a evidência prova; a autoridade competente decide.");
    expect(agentCopy("agent.assistantPlaceholder", "pt")).toBe("Pergunte ao BanzAI ou peça uma operação técnica…");
    expect(agentCopy("mode.ask", "pt")).toBe("Perguntar ao BanzAI");
    expect(agentCopy("mode.validation", "pt")).toBe("Validar operador");
    expect(agentCopy("mode.onboarding", "pt")).toBe("Onboarding de operador");
    expect(agentCopy("tab.resultados", "pt")).toBe("Resultados");
    expect(agentCopy("tab.rfc", "pt")).toBe("Referência");
    expect(agentCopy("validation.header", "pt")).toBe("Validação técnica de implementação");
    expect(agentCopy("draft.title", "pt")).toBe("Validar rascunho");
    expect(agentCopy("link.repositoryName", "pt")).toBe("Repositório");
    expect(agentCopy("starter.whatIsBanza", "pt")).toBe("O que é o BANZA?");
  });

  it("leaves NO reader copy in the data module", () => {
    // The assertion that would have caught Q8's finding. The module may hold ids, icons, keys, groups and
    // hrefs; it may not hold a sentence, because a sentence there has only one language.
    const src = readFileSync(new URL("./banzai-agent.ts", import.meta.url), "utf8");
    // FORBIDDEN_PHRASES is machine guard input — a needle list asserted against the catalogue and never
    // rendered. It is exempted BY NAME, not by pattern, so a new Portuguese constant cannot hide beside it.
    const withoutGuardInput = src.replace(/export const FORBIDDEN_PHRASES = \[[\s\S]*?\];/, "");
    const code = withoutGuardInput.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const prose = [...code.matchAll(/"([^"\n]{4,})"/g)]
      .map((m) => m[1])
      // Prose has words. A single token like the protocol-map node id `Federação` is IDENTITY — it names
      // the node in the diagram and carries `idLabelId` beside it for the reader — so it is not copy.
      .filter((t) => /\s/.test(t.trim()))
      .filter((t) => /[À-ú]/.test(t) || /[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(t))
      .filter((t) => !t.startsWith("@/") && !/^https?:/.test(t));
    expect(prose, "reader copy left in the agent data module — it can only be Portuguese there").toEqual([]);
  });

  it("keeps semantic identity on the records and copy ids beside it", () => {
    // `mode`, `key`, `group`, `href` and the ADR/node ids are routing and protocol identity. They stay on
    // the record; only the NAME is an id into the catalogue.
    for (const m of MODES) {
      expect(m.mode).toMatch(/^(ask|validation|onboarding)$/);
      expect(agentCopy(m.nameId, "en")).not.toBe(agentCopy(m.nameId, "pt"));
    }
    for (const t of TABS) {
      expect(TAB_META[t.key].nameId).toBe(t.nameId);
      expect(t.group).toMatch(/^(recursos|resultados)$/);
    }
    expect(REPO_LINK.href).toBe("https://github.com/banza-protocol/banza");
    for (const d of RFC_DOCS) {
      expect(d.id).toMatch(/^(ADR-\d+|RFCs)$/);
      expect(agentCopy(d.titleId, "en")).not.toBe(agentCopy(d.titleId, "pt"));
    }
    for (const n of PROTOCOL_MAP_NODES) expect(agentCopy(n.qId, "en")).not.toBe(agentCopy(n.qId, "pt"));
  });
});

describe("agent presentation — locale is explicit and English is real", () => {
  it("English is not a copy of Portuguese", () => {
    // Proper nouns legitimately coincide; anything longer must actually be translated.
    const copied = agentCopyIds().filter((id) => AGENT_COPY[id].pt === AGENT_COPY[id].en);
    const substantive = copied.filter((id) => AGENT_COPY[id].pt.length > 24);
    expect(substantive, "English realizations that are Portuguese copies").toEqual([]);
  });

  it("getAgentPresentation returns the requested locale, never the other one", () => {
    // E2-C2's owning assertion: a selector that ignores its argument fails here.
    const pt = getAgentPresentation("pt");
    const en = getAgentPresentation("en");
    expect(pt.boundary).toBe(agentCopy("agent.boundary", "pt"));
    expect(en.boundary).not.toBe(agentCopy("agent.boundary", "pt"));
    expect(en.boundary).toMatch(/does not certify/);
    expect(en.assistantPlaceholder).toMatch(/Ask BanzAI/);
    expect(pt.assistantPlaceholder).toMatch(/Pergunte ao BanzAI/);
  });

  it("English preserves the distinctions the Portuguese keeps apart", () => {
    const en = (id: string) => agentCopy(id as never, "en");
    expect(en("agent.boundary")).toMatch(/does not certify/);
    expect(en("agent.boundary")).toMatch(/does not license/);
    expect(en("agent.boundary")).toMatch(/verifiable evidence/);
    expect(en("authority.passIsEvidence")).toMatch(/not a certificate/);
    expect(en("validation.entities")).toMatch(/responsible entity/);
    expect(en("validation.entities")).toMatch(/technical system evaluated/);
    expect(en("validation.originNote")).toMatch(/not a Certification Record/);
    expect(en("authority.preProduction")).toMatch(/pre-production/);
  });

  it("an unknown id or a missing realization fails loudly, never silently", () => {
    expect(() => agentCopy("nope.not.a.thing" as never, "en")).toThrow(/unknown semantic id/);
  });

  it("semantic identity stays OUT of the catalogue", () => {
    // Routing and protocol identity are single-source in banzai-agent.ts. If a `mode`, `key`, `href` or
    // profile id ever appeared here per locale, the two languages could disagree about behaviour.
    const values = agentCopyIds().flatMap((id) => [AGENT_COPY[id].pt, AGENT_COPY[id].en]);
    expect(values).not.toContain(REPO_LINK.href);
    for (const m of MODES) expect(values).not.toContain(m.mode);
    for (const t of TABS) expect(values).not.toContain(t.group);
  });
});
