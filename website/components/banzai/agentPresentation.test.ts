import { describe, it, expect } from "vitest";
import {
  BANZAI_AGENT, AGENT_RULE_SOURCES, AGENT_GUIA_TEXT, SESSION_NOTICE,
  AGENT_WHO_DOES_WHAT, MODES, TAB_META, TABS, REPO_LINK,
  VALIDATION_COPY, DRAFT_COPY, AUTHORITY_COPY, BADGES, CONFORMIDADE_LEVELS,
} from "@/components/banzai/banzai-agent";
import { AGENT_COPY, agentCopy, agentCopyIds, getAgentPresentation } from "@/components/banzai/agentPresentation";

// The agent data module is where the workspace keeps its largest body of reader copy, and it is a plain
// module — no React, so no provider context reaches it. This file holds the two properties that make
// that safe: the Portuguese did not change when it moved, and English exists for everything.
//
// Semantic fields are checked to have stayed OUT of the catalogue. `mode`, `key`, `group`, `href` and
// the L0–L4 ids are routing and protocol identity; duplicating them per locale would let the two
// languages disagree about which tab a button opens, which is worse than a bad translation.

describe("agent presentation — Portuguese moved without changing", () => {
  it("every catalogue entry realizes both locales", () => {
    const ids = agentCopyIds();
    expect(ids.length).toBeGreaterThanOrEqual(50);
    for (const id of ids) {
      expect(AGENT_COPY[id].pt, `${id}: missing pt`).toBeTruthy();
      expect(AGENT_COPY[id].en, `${id}: missing en`).toBeTruthy();
    }
  });

  it("the Portuguese realization matches the live agent module byte for byte", () => {
    const pairs: Array<[string, string]> = [
      ["agent.subtitle", BANZAI_AGENT.subtitle],
      ["agent.assistantIntro", BANZAI_AGENT.assistantIntro],
      ["agent.heroText", BANZAI_AGENT.heroText],
      ["agent.boundary", BANZAI_AGENT.boundary],
      ["agent.boundaryTop", BANZAI_AGENT.agentBoundaryTop],
      ["agent.shortPhrase", BANZAI_AGENT.shortPhrase],
      ["agent.assistantPlaceholder", BANZAI_AGENT.assistantPlaceholder],
      ["agent.ruleSources", AGENT_RULE_SOURCES],
      ["agent.guiaText", AGENT_GUIA_TEXT],
      ["agent.sessionNotice", SESSION_NOTICE],
      ["validation.header", VALIDATION_COPY.header],
      ["validation.intro", VALIDATION_COPY.intro],
      ["validation.entities", VALIDATION_COPY.entities],
      ["validation.onlyOperatorHint", VALIDATION_COPY.onlyOperatorHint],
      ["validation.originNote", VALIDATION_COPY.originNote],
      ["draft.title", DRAFT_COPY.title],
      ["draft.subtitle", DRAFT_COPY.subtitle],
      ["draft.banner", DRAFT_COPY.banner],
      ["authority.noCertify", AUTHORITY_COPY.noCertify],
      ["authority.runsTools", AUTHORITY_COPY.runsTools],
      ["authority.caDecides", AUTHORITY_COPY.caDecides],
      ["authority.passIsEvidence", AUTHORITY_COPY.passIsEvidence],
      ["authority.preProduction", AUTHORITY_COPY.preProduction],
      ["link.repository", REPO_LINK.name],
    ];
    for (const [id, live] of pairs) {
      expect(agentCopy(id as never, "pt"), `${id} drifted from banzai-agent.ts`).toBe(live);
    }
  });

  it("mode, tab and badge labels match the live module", () => {
    for (const m of MODES) expect(agentCopy(`mode.${m.mode}` as never, "pt")).toBe(m.name);
    for (const [key, meta] of Object.entries(TAB_META)) {
      expect(agentCopy(`tab.${key}` as never, "pt")).toBe(meta.name);
    }
    for (const t of TABS) expect(agentCopy(`tab.${t.key}` as never, "pt")).toBe(t.name);
    for (const lvl of CONFORMIDADE_LEVELS) {
      expect(agentCopy(`profile.${lvl.id}` as never, "pt")).toBe(lvl.name);
    }
    const badgeIds = agentCopyIds().filter((i) => i.startsWith("badge."));
    expect(badgeIds.length).toBe(BADGES.length);
    expect(badgeIds.map((i) => agentCopy(i, "pt")).sort()).toEqual([...BADGES].sort());
  });

  it("who-does-what roles and sentences both survive", () => {
    expect(AGENT_WHO_DOES_WHAT.length).toBe(6);
    const sentences = AGENT_WHO_DOES_WHAT.map(([, s]) => s);
    const roles = AGENT_WHO_DOES_WHAT.map(([r]) => r);
    for (const id of agentCopyIds().filter((i) => i.startsWith("whoDoesWhat.") && !i.includes(".role."))) {
      expect(sentences, `${id} is not a live sentence`).toContain(agentCopy(id, "pt"));
    }
    for (const id of agentCopyIds().filter((i) => i.startsWith("whoDoesWhat.role."))) {
      expect(roles, `${id} is not a live role`).toContain(agentCopy(id, "pt"));
    }
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
    expect(pt.boundary).toBe(BANZAI_AGENT.boundary);
    expect(en.boundary).not.toBe(BANZAI_AGENT.boundary);
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
