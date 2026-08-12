import { describe, it, expect } from "vitest";
import { getReferenceChapters, getReferenceChapter } from "./reference";
import { decisions, getDecision } from "./decisions";

// M2.7L — public information architecture: canonical chapter order, PostgreSQL=05, FAQ last,
// Racional merged into ch.02, stable slugs, clean public cards, and ADR-037..042 in the index.
// M2.12B — Operador Zero inserted at 09, BETWEEN Operadores and Federação, shifting 09..14 to 10..15.

const ORDER = [
  "o-que-e", "porque-existe", "principios", "arquitectura", "estado-protocolar", "confianca",
  "certificacao", "operadores", "operador-zero", "federacao", "governacao", "banzai",
  "programadores", "roteiro", "faq",
];

describe("Reference chapter order (M2.7L)", () => {
  const chapters = getReferenceChapters();

  it("has exactly 15 chapters", () => {
    expect(chapters.length).toBe(15);
  });

  it("is in the canonical order with correct numbers", () => {
    expect(chapters.map((c) => c.slug)).toEqual(ORDER);
    chapters.forEach((c, i) => expect(c.num).toBe(i + 1));
  });

  it("places Estado Protocolar at 05 (after Architecture) and FAQ last (15)", () => {
    const pg = getReferenceChapter("estado-protocolar")!;
    expect(pg.num).toBe(5);
    expect(pg.title).toContain("Estado Protocolar");
    expect(getReferenceChapter("arquitectura")!.num).toBe(4);
    const faq = chapters[chapters.length - 1];
    expect(faq.slug).toBe("faq");
    expect(faq.num).toBe(15);
  });

  // M2.12B — the position is the point, not the presence. Operador Zero after Operadores because
  // chapter 8 says WHO implements the protocol and 9 shows a complete implementation running;
  // before Federação because federation is tested against the operators and artifacts 8 and 9
  // establish. At the end it would read as an appendix rather than as the protocol's own proof.
  it("places Operador Zero at 09, between Operadores and Federação", () => {
    const oz = getReferenceChapter("operador-zero")!;
    expect(oz.num).toBe(9);
    expect(oz.title).toContain("Operador Zero");
    const i = chapters.findIndex((c) => c.slug === "operador-zero");
    expect(chapters[i - 1].slug).toBe("operadores");
    expect(chapters[i + 1].slug).toBe("federacao");
    expect(getReferenceChapter("operadores")!.num).toBe(8);
    expect(getReferenceChapter("federacao")!.num).toBe(10);
  });

  // The chapter must state the boundary, and must never claim status or name a commercial operator.
  it("the Operador Zero chapter carries its boundary and claims nothing", () => {
    const body = getReferenceChapter("operador-zero")!.content.toLowerCase();
    expect(body).toContain("não é banco");
    expect(body).toContain("psp, carteira");
    expect(body).toContain("kz_demo");
    expect(body).toContain("não movimenta dinheiro real");
    for (const claim of ["é certificado", "é aprovado", "é licenciado", "é autorizado"]) {
      expect(body).not.toContain(claim);
    }
    // The institutional comparison belongs to ADR-052 alone (M2.12A decision).
    expect(body).not.toContain(["banz", "ami"].join(""));
  });

  it("next(arquitectura)=estado-protocolar; prev=arquitectura, next=confianca", () => {
    const i = chapters.findIndex((c) => c.slug === "estado-protocolar");
    expect(chapters[i - 1].slug).toBe("arquitectura");
    expect(chapters[i + 1].slug).toBe("confianca");
  });

  it("names chapter 11 Governança and 14 Evolução do Protocolo", () => {
    expect(getReferenceChapter("governacao")!.title).toContain("Governança");
    expect(getReferenceChapter("roteiro")!.title).toContain("Evolução do Protocolo");
  });

  it("keeps the /referencia/estado-protocolar slug stable", () => {
    expect(getReferenceChapter("estado-protocolar")).toBeDefined();
  });
});

describe("Chapter 02 — Por Que o BANZA Existe (M2.7L merge + Ch02 final revision)", () => {
  it("has no standalone racional chapter", () => {
    expect(getReferenceChapter("racional")).toBeUndefined();
    expect(getReferenceChapters().some((c) => c.slug === "racional")).toBe(false);
  });

  // The Ch02 final editorial revision retired the "Racional Estratégico" strategic-rationale
  // section (and its decision→risk figure): a motivation chapter must explain why the protocol
  // exists, not carry a strategic pitch. The canonical thesis is open, comparable, verifiable
  // interoperability — and no branded product comparison.
  it("presents the motivation as open/verifiable interoperability, not a strategic pitch", () => {
    const ch = getReferenceChapter("porque-existe")!;
    expect(ch.content).toContain("A interoperabilidade financeira já existe");
    expect(ch.content).toMatch(/verific/i);
    expect(ch.content).toMatch(/reproduz/i);
    expect(ch.content).not.toContain("Racional Estratégico");
    // No named external products/entities in a conceptual chapter (institutional neutrality).
    for (const brand of ["M-Pesa", "Pix", "UPI", "Nubank", "Safaricom", "EMIS"]) {
      expect(ch.content).not.toContain(brand);
    }
  });
});

describe("Chapter 03 — Princípios Fundamentais (final revision)", () => {
  const ch = getReferenceChapter("principios")!;

  // Design principles are invariants that must survive implementation change — stated as
  // significado → consequência → fronteira, not a slogan list. Neutrality is explained by
  // invariants, never through branded comparisons (the retired "Nubank / Pix" pair).
  it("presents design invariants and is institutionally neutral (no brands)", () => {
    expect(ch).toBeDefined();
    for (const p of ["Neutralidade", "Decisão determinística", "Fecho por omissão", "Separação de responsabilidades", "Evidência e reprodutibilidade"]) {
      expect(ch.content).toContain(p);
    }
    for (const brand of ["M-Pesa", "Pix", "UPI", "Nubank", "Safaricom", "EMIS"]) {
      expect(ch.content).not.toContain(brand);
    }
  });

  // Principles must not age with the operational state, nor be reduced to promotional slogans.
  it("carries no operational-state or promotional language", () => {
    for (const term of ["trustless", "fonte de verdade", "pilares", "mandamentos", "Registo Técnico está vazio"]) {
      expect(ch.content).not.toContain(term);
    }
  });
});

describe("Chapter 04 — Arquitectura do Protocolo (final revision)", () => {
  const ch = getReferenceChapter("arquitectura")!;

  // Architecture = three institutional layers (named "Camada 1/2/3") + transversal BanzAI (not a
  // fourth layer). The letter L is RESERVED for the L0–L4 conformance PROFILES (§7) — never for layers.
  // Converges to the Whitepaper convention; describes responsibilities, not deployment.
  it("presents the three named Camadas, a transversal BanzAI, and layers≠profiles", () => {
    expect(ch).toBeDefined();
    for (const t of ["Camada 1", "Camada 2", "Camada 3", "transversal", "quarta camada", "L0–L4"]) {
      expect(ch.content).toContain(t);
    }
    // each layer carries its responsibility name (assert the name, not a bare number)
    expect(ch.content).toMatch(/Camada 1[^\n]*Protocolo/i);
    expect(ch.content).toMatch(/Camada 2[^\n]*(Certificaç|Conformidade)/i);
    expect(ch.content).toMatch(/Camada 3[^\n]*(Esquema|operacion)/i);
    // camadas ≠ perfis is stated explicitly (profiles keep the reserved letter L)
    expect(ch.content).toMatch(/perfis de conformidade L0[–-]L4/i);
    // CONTEXT-AWARE BAN: no bare L1/L2/L3 layer token survives in §4 (the letter L is reserved for
    // profiles; §4 carries no endpoint tiers Ln+ nor the L0–L4 ladder, so this cannot false-fire).
    expect(ch.content).not.toMatch(/\bL[123]\b(?!\+)/); // bare layer token; (?!\+) exempts endpoint tiers Ln+
    // authority does not propagate across responsibilities
    expect(ch.content).toMatch(/certificaç[ãa]o técnica ≠ admiss[ãa]o|admiss[ãa]o a um esquema ≠ autoriza/i);
  });

  // Timeless: no deployment/runtime/model detail and no operational-state chips that would age.
  it("carries no deployment, runtime, model, or operational-state detail", () => {
    // §5 is now "Estado Protocolar" — the §4 close cross-reference no longer names PostgreSQL, so PostgreSQL
    // is banned from §4 like any other ageing infra-tech (the audit proved it is not part of the protocol identity).
    for (const term of ["Qwen", "Docker", "nginx", "VPS", "PostgreSQL", "/operators = []", "i64", "v1.0 congelada", "BANZA CA"]) {
      expect(ch.content).not.toContain(term);
    }
  });
});

describe("Chapter 10 — Federação (final revision)", () => {
  const ch = getReferenceChapter("federacao")!;

  it("exists at position 10 with 8 concept-first H3", () => {
    expect(ch).toBeDefined();
    expect(ch.num).toBe(10);
    const h3 = (ch.content.match(/^### /gm) || []).length;
    expect(h3).toBe(8);
  });

  // Federation is a bounded, local, per-interaction technical RELATION (ADR-040): the result vocabulary
  // is ROUTING_ALLOWED/FAIL_CLOSED, it is non-symmetric and non-transitive, L3 is a necessary-not-sufficient
  // profile (never Camada 3), and BANZA is not in the trust or funds path and obliges no one.
  it("defines federation as a local per-interaction evaluation with the canonical boundary", () => {
    // Primary definition is the EVALUATION (local, per-interaction), not a persistent relation/status.
    expect(ch.content).toContain("avaliação técnica");
    expect(ch.content).toContain("ROUTING_ALLOWED");
    expect(ch.content).toContain("FAIL_CLOSED");
    expect(ch.content).toContain("não obriga a encaminhar"); // ROUTING_ALLOWED ≠ mandatory routing
    expect(ch.content).toMatch(/certificação técnica da Camada 2/i); // never "certificação L2"
    expect(ch.content).not.toMatch(/certifica(ç[ãa]o|do) L2|L2 certification/i);
    expect(ch.content).toContain("não é automaticamente simétrica");
    expect(ch.content).toContain("não é transitiva");
    expect(ch.content).toMatch(/necessário mas nunca suficiente/i);
    expect(ch.content).toMatch(/perfil de conformidade L3/i); // L3 = profile
    expect(ch.content).toContain("Camada 3"); // and L3 is distinguished from Camada 3 (the scheme)
    expect(ch.content).toContain("não movimenta fundos e não executa liquidação");
    expect(ch.content).toContain("admissão a um esquema operacional");
    expect(ch.content).toMatch(/não decide com quem um operador se relaciona/i);
    expect(ch.content).toContain("não se propaga automaticamente");
    expect(ch.content).toMatch(/não está no caminho da confiança nem no caminho dos fundos/i);
  });

  // No network/membership slippage, no ageing current-state (that belongs to §5/§14), and the retired
  // money-flow figure is gone while the two canonical figures are embedded.
  it("carries no network/membership framing nor current-state", () => {
    expect(ch.content).not.toContain("rede BANZA");
    expect(ch.content).not.toMatch(/operadores? federad/i); // no "operador federado" as a status
    expect(ch.content).not.toMatch(/entrar? na rede/i);
    for (const term of ["/operators", "Estado da Federação", "Compensação", "Efeito Económico"]) {
      expect(ch.content).not.toContain(term);
    }
    expect(ch.content).not.toMatch(/\bM[123]\b/); // no milestone current-state
    expect(ch.content).not.toContain("banza-federation-v1.svg"); // retired money-flow figure
    expect(ch.content).toContain("banza-controlled-federation-gate-v1.svg");
    expect(ch.content).toContain("banza-federation-non-propagation-v1.svg");
  });
});

describe("Chapter 11 — Governança (final revision)", () => {
  const ch = getReferenceChapter("governacao")!;

  it("exists at position 11 with 8 concept-first H3", () => {
    expect(ch).toBeDefined();
    expect(ch.num).toBe(11);
    const h3 = (ch.content.match(/^### /gm) || []).length;
    expect(h3).toBe(8);
  });

  // Governance is a PUBLIC PROCESS conducted by the active maintainers — not a constituted institution,
  // not a regulator of operators. Humans govern the RULES; the deterministic engines apply them to cases.
  it("defines governance as a public process over rules, run by maintainers", () => {
    expect(ch.content).toContain("processo público pelo qual as regras do protocolo evoluem");
    expect(ch.content).toContain("maintainers activos");
    expect(ch.content).toContain("os humanos governam as regras"); // humans govern rules, not cases
    expect(ch.content).toContain("não decide quem implementa o protocolo"); // not a regulator of operators
    expect(ch.content).toContain("não administra os operadores");
    // origin attribution: original creator + initial institutional maintainer, not private control
    // (the creator's brand token is asserted only in the corpus, which is on the identity allowlist).
    expect(ch.content).toContain("criadora original e mantenedora institucional inicial");
    expect(ch.content).toContain("atribuição de origem, não controlo privado");
    expect(ch.content).toContain("passo **futuro**"); // a formal entity is a FUTURE step, not present
    expect(ch.content).toContain("não que qualquer pessoa possa alterar directamente o protocolo");
  });

  // The authority boundary: governance decides RULES; the verdict, admission, authorisation and the
  // operator relationship each belong to a different owner — and the Trust Root is not the government.
  it("states where governance authority ends", () => {
    expect(ch.content).toContain("motor determinístico da Camada 2"); // verdict, not a governance decision
    expect(ch.content).toContain("Camada 3, que permanece institucionalmente independente"); // admission
    expect(ch.content).toContain("autorização regulatória");
    expect(ch.content).toContain("Raiz de Confiança assina apenas o Manifesto de Chaves");
    expect(ch.content).toContain("não governa o protocolo"); // root is anchor, not government
    expect(ch.content).toContain("repartida por limiar");
    expect(ch.content).toContain("número concreto de detentores é configuração operacional"); // number-free
    expect(ch.content).toContain("não vota, não aprova, não promulga"); // BanzAI is not in governance
  });

  // No silent mutation, no retroactivity: a published version is not rewritten, and a new version does
  // not rewrite prior evidence — it creates a new subject. Editorial changes are not a version bump.
  it("guarantees no silent mutation and no retroactivity", () => {
    expect(ch.content).toContain("não é alterada silenciosamente");
    expect(ch.content).toContain("não reescreve a evidência");
    expect(ch.content).toContain("novo sujeito de avaliação");
    expect(ch.content).toContain("não constituem uma nova versão do protocolo"); // editorial ≠ version
  });

  // No constituted "Entidade de Governação" as a present organ; the three figures are embedded.
  it("carries no present-tense governing institution and embeds the three figures", () => {
    expect(ch.content).not.toContain("Entidade de Governação"); // no constituted present organ
    expect(ch.content).not.toContain("rede BANZA");
    expect(ch.content).toContain("banza-normative-hierarchy-n1-n5-v1.svg");
    expect(ch.content).toContain("banza-governance-authority-boundaries-v1.svg");
    expect(ch.content).toContain("banza-governance-v1.svg");
  });
});

describe("Chapter 13 — Recursos para Programadores (final revision)", () => {
  const ch = getReferenceChapter("programadores")!;

  it("exists at position 13 with 9 concept-first H3", () => {
    expect(ch).toBeDefined();
    expect(ch.num).toBe(13);
    const h3 = (ch.content.match(/^### /gm) || []).length;
    expect(h3).toBe(9);
  });

  // The chapter's central discipline: normative artefacts DEFINE; tools/SDKs/reference code merely help,
  // and no language, database or stack is a protocol requirement.
  it("separates normative artefacts from tools and keeps the stack neutral", () => {
    expect(ch.content).toContain("os artefactos normativos — contratos, invariantes e vectores de conformidade — definem as regras aplicáveis");
    expect(ch.content).toContain("não se torna normativa por ser mantida pelo projecto"); // tool ≠ authority
    expect(ch.content).toContain("qualquer linguagem, com qualquer base de dados e qualquer ambiente de execução");
    expect(ch.content).toContain("Rust é a linguagem dos motores oficiais de referência; não é um requisito para os operadores");
    expect(ch.content).toContain("a base de dados de uma implementação (PostgreSQL, ou outra) não faz parte do protocolo");
    expect(ch.content).toContain("O BANZA não apresenta actualmente um SDK público como recurso de integração"); // SDK availability (no phantom resource)
    expect(ch.content).not.toContain("SDKs (opcionais)"); // the figure/prose never present an SDK as available
    expect(ch.content).toContain("OpenAPI descrevem interfaces HTTP específicas"); // not the whole spec
    expect(ch.content).toContain("não é uma especificação nem uma implementação a copiar"); // Operador Zero
    expect(ch.content).toContain("O BanzAI orienta, localiza regras e explica; não decide conformidade");
    expect(ch.content).toContain("não significa automaticamente"); // implementar/validar ≠ certificar/admitir/autorizar
  });

  // No stale mirror as a source; the pitch/dependency-title/operator-stack figure removed; figures embedded.
  it("cites no stale mirror, drops the pitch, and embeds the two §13 figures", () => {
    expect(ch.content).not.toContain("docs/reference/pt/completa.md"); // stale mirror never a source
    expect(ch.content).not.toContain("banza-reference-operator-v1.svg"); // operator-stack figure retired from §13
    expect(ch.content).not.toContain("Dependências Externas Obrigatórias"); // mistitled table removed
    expect(ch.content).not.toContain("Porque Construir sobre o BANZA"); // pitch removed
    expect(ch.content).not.toContain("como invariante"); // T+0 no longer an invariant
    expect(ch.content).toContain("banza-developer-resource-authority-v1.svg");
    expect(ch.content).toContain("banza-developer-flow-v1.svg");
  });
});

// Ch14 was reframed from a milestone roadmap ("Roteiro de Maturidade", M1–M6, dates) into a durable
// "Evolução do Protocolo": directions of evolution as possibilities, not promises; state → §5, process → §11.
describe("Chapter 14 — Evolução do Protocolo (reframed roadmap)", () => {
  const ch = getReferenceChapter("roteiro")!; // route slug preserved for stability
  it("exists at position 14 titled 'Evolução do Protocolo' with the route slug 'roteiro'", () => {
    expect(ch).toBeDefined();
    expect(ch.num).toBe(14);
    expect(ch.slug).toBe("roteiro");
    expect(ch.title).toContain("Evolução do Protocolo");
  });
  it("states durability and non-commitment, delegating state to §5 and process to §11", () => {
    expect(ch.content).toContain("Não é um calendário, uma promessa de entrega nem um plano de produto");
    expect(ch.content).toContain("adoptada, versionada e publicada"); // authority/versioning
    expect(ch.content).toContain("não se pressupõe um L5"); // no invented profile
    expect(ch.content).toContain("não se pressupõe uma Camada 4"); // no invented layer
    expect(ch.content).toContain("não introduz uma CA central"); // no invented CA
    expect(ch.content).toContain("permanecer correcto mesmo que as prioridades internas"); // durability
  });
  it("carries no milestone/date/roadmap-timeline tokens or the retired figure", () => {
    expect(ch.content).not.toMatch(/\bM[1-6]\b/); // no milestone codes
    expect(ch.content).not.toMatch(/\b20[2-9][0-9]\b/); // no roadmap years
    expect(ch.content).not.toMatch(/em breve|\bmilestones?\b|\broadmap\b/i);
    expect(ch.content).not.toContain("primeiro operador");
    expect(ch.content).not.toContain("primeira certificação");
    expect(ch.content).not.toContain("banza-roadmap-m1-m6-v1.svg"); // timeline figure retired
    expect(ch.content).not.toContain("Roteiro de Maturidade"); // old title gone
  });
});

// Ch15 was rewritten from 68 questions saturated with roadmap/current-state contamination into a durable
// compression layer: ~34 pyramid questions in 6 blocks, each correcting the mental model then pointing to
// its canonical chapter. It must never re-introduce the shorthand the earlier chapters removed.
describe("Chapter 15 — Perguntas Frequentes (FAQ compression layer)", () => {
  const ch = getReferenceChapter("faq")!;
  it("exists last, at position 15, titled 'Perguntas Frequentes' with slug 'faq'", () => {
    expect(ch).toBeDefined();
    expect(ch.num).toBe(15);
    expect(ch.slug).toBe("faq");
    expect(ch.title).toContain("Perguntas Frequentes");
    expect(getReferenceChapters()[getReferenceChapters().length - 1].slug).toBe("faq");
  });
  it("states its function and authority: compresses the Reference, is not a spec or source", () => {
    expect(ch.content).toContain("não é uma segunda especificação nem uma fonte normativa");
    expect(ch.content).toContain("não os substituem"); // resumem ... não substituem
  });
  it("preserves the canonical boundaries the chapters established", () => {
    expect(ch.content).toContain("Federação é a avaliação técnica, local e por interacção"); // §10 def
    expect(ch.content).toContain("não obriga a encaminhar"); // ROUTING_ALLOWED ≠ order
    expect(ch.content).toContain("assina apenas o Manifesto de Chaves"); // Trust Root ≠ governance
    expect(ch.content).toContain("O BanzAI orienta"); // BanzAI ≠ authority
    expect(ch.content).toMatch(/não decorre automaticamente|não se propaga/); // non-propagation
    expect(ch.content).toContain("não é o primeiro operador"); // Operador Zero premise corrected
    expect(ch.content).toContain("adoptada, versionada e publicada"); // evolution ≠ availability
  });
  it("delegates current state to §5 instead of duplicating volatile values", () => {
    expect(ch.content).toMatch(/estado actual[\s\S]{0,120}§5|§5 Estado Protocolar/);
    expect(ch.content).toContain("a FAQ não duplica esses valores");
  });
  it("carries no roadmap/current-state/dangerous-shorthand tokens", () => {
    expect(ch.content).not.toMatch(/\bM[1-6]\b/); // milestone codes
    expect(ch.content).not.toMatch(/\b20[2-9][0-9]\b/); // roadmap years
    expect(ch.content).not.toMatch(/pré-produção|condições de produção/i);
    expect(ch.content).not.toContain("/operators = []");
    expect(ch.content).not.toContain("production_certificates");
    expect(ch.content).not.toMatch(/rede BANZA|membro BANZA|operador L[0-9]|apto a federar/);
    expect(ch.content).not.toMatch(/operador[es]? certificad|certificado de operador/); // M2.9D bigram
    expect(ch.content).not.toMatch(/resultados de simulação/); // retired SimB
    // "primeiro operador" appears exactly twice — the Operador-Zero question posing the premise and the
    // answer's negated correction ("não é o primeiro operador") — and nowhere else (no roadmap "first
    // operator" promise). The negated answer occurrence is asserted in the boundaries test above.
    expect((ch.content.match(/primeiro operador/g) || []).length).toBe(2);
  });
});

// The letter L is reserved for conformance PROFILES — asserted POSITIVELY, in the profiles chapter (§7).
// This is the other half of the layer/profile naming invariant: Camada 1/2/3 = architecture (§4);
// L0–L4 = conformance capabilities/scope (§7). Neither namespace may leak into the other.
describe("Conformance profiles reserve the letter L (§7)", () => {
  const ch = getReferenceChapter("certificacao")!;
  it("defines L0–L4 as profiles/capabilities with their capability names", () => {
    expect(ch).toBeDefined();
    for (const t of ["L0", "L1", "L2", "L3", "L4"]) expect(ch.content).toContain(t);
    expect(ch.content).toMatch(/Capacidade de Pagamento Central/i); // L1 profile
    expect(ch.content).toMatch(/Capacidade de Iniciação de Pagamento/i); // L2 profile
    expect(ch.content).toMatch(/Interoperabilidade entre Operadores/i); // L3 profile
  });
});

describe("Public reference cards are clean (M2.7L)", () => {
  const summaries = getReferenceChapters().map((c) => c.summary).join("\n");
  const forbidden = [
    /M[0-9]\/M[0-9]/, /M1[–-]M6/, /especificação congelada/i, /produção dependente de/i,
    /operador[es]* certificad/i, /certificado de operador/i, /certificados de produção/i,
    /BANZA CA/, /BanzAI Workbench/i, /\bWorkbench\b/i, /sistema adjacente/i,
    /livro-razão de partidas dobradas/i, /compensação bilateral/i,
  ];
  it("no roadmap/certificate/workbench/legacy language in card summaries", () => {
    for (const re of forbidden) {
      expect(re.test(summaries), `card summary must not match ${re}`).toBe(false);
    }
  });
  it("PostgreSQL card states protocol state, not financial value", () => {
    expect(getReferenceChapter("estado-protocolar")!.summary).toMatch(/não guarda valor financeiro/i);
  });
});

describe("ADR decisions index backfill (M2.7L)", () => {
  for (const id of ["adr-037", "adr-038", "adr-039", "adr-040", "adr-041", "adr-042"]) {
    it(`${id} is present with metadata`, () => {
      const d = getDecision(id);
      expect(d, `${id} must be in the decisions index`).toBeDefined();
      expect(d!.title.length).toBeGreaterThan(3);
      expect(d!.summary.length).toBeGreaterThan(3);
      expect(d!.path).toMatch(/decisions\/adr\//);
    });
  }
  it("the index is unique by id", () => {
    const ids = decisions.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Estado Protocolar is discoverable in the Reference (M2.7L; header simplified in M2.15B)", () => {
  it("is a Reference chapter reachable at /referencia/postgresql", () => {
    // M2.15B removed the Protocolo nav dropdown; the chapter lives in the Reference, not the header.
    const ch = getReferenceChapter("estado-protocolar");
    expect(ch).toBeTruthy();
    expect(`/referencia/${ch!.slug}`).toBe("/referencia/estado-protocolar");
  });
});
