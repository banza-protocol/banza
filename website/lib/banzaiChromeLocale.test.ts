import { describe, it, expect } from "vitest";
import { agentCopy, type AgentCopyId } from "@/components/banzai/agentPresentation";
import { getBanzaiRuntimeContract } from "@/lib/banzaiArchitecture";
import { LOCALES, type Locale } from "@/lib/i18n";

// The BanzAI shell chrome, in the reader's own language.
//
// The answer-locale work fixed the answer, the provenance line and the availability states. It did not
// touch the shell around them, so an English reader still navigated an English app through Portuguese
// signposts: MODOS above "Ask BanzAI", RECURSOS above "Guide", FONTES E CONTEXTO over the inspector,
// FRONTEIRA and ESTADO over the panels, "Enviar" on the send button — and the entire runtime card, down
// to its Sim/Não values.
//
// Two properties are pinned, and the second is the one that matters. The first says every id realizes in
// both editions. The second says the English realization does not contain Portuguese — because an entry
// that was added by pasting the Portuguese string into both slots satisfies the first test perfectly.

const editions = LOCALES as readonly Locale[];
const RT = getBanzaiRuntimeContract();

/** Words that cannot occur in correct English chrome. Diacritics alone are too weak: "Modo" has none. */
const PORTUGUESE = /\b(Modos|Recursos|Fontes|Fronteira|Estado|Enviar|Sim|Não|Modo|Serviço|Inferência|Ocultar|Mostrar|inspetor|externa|sem inferência|Perguntar|Fonte|Verificado|runtime não confirmado)\b/i;

describe("the BanzAI shell chrome realizes in both editions", () => {
  const SHELL_IDS: AgentCopyId[] = [
    "section.modes",
    "section.results",
    "section.resources",
    "section.sourcesAndContext",
    "section.boundary",
    "section.state",
    "shell.send",
    "shell.hideInspector",
    "shell.showInspector",
    "shell.clearConversation",
    "shell.continue",
    "tab.assistente",
  ];

  it("gives every shell id a non-empty realization in each edition", () => {
    for (const id of SHELL_IDS) {
      for (const locale of editions) {
        expect(agentCopy(id, locale).trim().length, `${id} / ${locale}`).toBeGreaterThan(0);
      }
    }
  });

  it("does not leave Portuguese in the English realization", () => {
    for (const id of SHELL_IDS) {
      const en = agentCopy(id, "en");
      expect(PORTUGUESE.test(en), `${id} → "${en}" reads as Portuguese`).toBe(false);
    }
  });

  it("keeps the two editions distinct where the languages differ", () => {
    // "BanzAI" is the same word in both and is deliberately not on this list.
    for (const id of SHELL_IDS) {
      expect(agentCopy(id, "pt"), id).not.toBe(agentCopy(id, "en"));
    }
  });
});

describe("the runtime card speaks the reader's language", () => {
  // This card is served from the canonical architecture manifest, so the test reads the manifest rather
  // than the component: the component is forbidden from composing prose of its own, and pinning the
  // manifest is what keeps that true.
  it("realizes every field and value label in both editions", () => {
    const groups = [RT.field_labels, RT.value_labels];
    for (const group of groups) {
      const keys = Object.keys(group);
      expect(keys.length, "expected labels in the manifest").toBeGreaterThan(0);
      for (const key of keys) {
        for (const locale of editions) {
          expect(group[key][locale].trim().length, `${key} / ${locale}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("does not leave Portuguese in the English card", () => {
    const english = [
      RT.section_label.en,
      RT.aria_label.en,
      RT.labels.provenance_en,
      RT.labels.verified_prefix_en,
      RT.labels.fallback_en,
      RT.labels.fallback_detail_en,
      RT.rule_en,
      ...Object.values(RT.field_labels).map((l) => l.en),
      // "local (on-host)" is identical in both editions on purpose — a technical term, not prose.
      ...Object.values(RT.value_labels).map((l) => l.en),
    ];
    for (const s of english) {
      expect(PORTUGUESE.test(s), `"${s}" reads as Portuguese`).toBe(false);
    }
  });

  it("keeps the Portuguese card Portuguese", () => {
    // The complement: proving the English card is English is only half a fix if the Portuguese one was
    // overwritten to get there.
    expect(RT.field_labels.status.pt).toBe("Estado");
    expect(RT.value_labels.yes.pt).toBe("Sim");
    expect(RT.labels.provenance_pt).toMatch(/^Fonte:/);
    expect(RT.rule_pt).toMatch(/\/estado/);
  });

  it("sends each edition to its own status page", () => {
    // The rule sentence names the status page. The English one must be splittable on its English anchor,
    // or the component would render the sentence with no link at all.
    expect(RT.rule_en.split("the status page").length, "EN rule must name 'the status page'").toBe(2);
    expect(RT.rule_pt.split("/estado").length, "PT rule must name '/estado'").toBe(2);
  });
});
