# ADR-041 — BanzAI as Native Protocol Agent

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-001, ADR-003, ADR-005, ADR-037, ADR-038, ADR-039, ADR-040, `docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md`, `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md`

## 1. Context

BANZA is an open financial protocol. Independent operators must implement its rules, prepare a manifest,
run SimB, demonstrate conformance, sign protocol metadata, produce traces, assemble an Evidence Bundle,
publish to the Public Protocol Registry and interoperate through federation. By ADR-038/039/040 the
protocol has **no central human authority over operators**: participation is demonstrated by verifiable
evidence, not granted by an admitter.

The absence of a human gatekeeper raises the importance of clear, verifiable, reproducible **guidance**.
BanzAI already exists as an explanation-and-tools layer (often surfaced as the Workbench interface), but it
has never been formalized as a layer of the protocol itself. It must be recognised as the official
**guidance and orchestration** layer — not an authority, not a normative source, not an autonomous
creator of rules.

## 2. Problem

- An open protocol can be hard to implement from documentation alone.
- Operators need a guide that accompanies the whole path, from the manifest to federation.
- That guide must not become an authority, certifier, licensor or normative source.
- The statement "BanzAI does not approve" is incomplete unless the protocol also states **who does
  what**.
- Formalizing BanzAI as a protocol agent demands a clear **rule-provenance** rule: the agent must never
  invent rules, architectural decisions or normative behaviour that do not exist in the official
  sources.

## 3. Decision

> **BanzAI becomes an official layer of the BANZA protocol as a native AI agent. BanzAI guides
> operators, simulates flows, invokes verifiable tools, explains results, prepares evidence and helps
> navigate the reference. Verifiable decisions continue to be computed by deterministic Rust/WASM engines
> and demonstrated by public evidence. BanzAI does not create rules, does not add architectural decisions
> and does not turn proposals into active protocol.**

Canonical statement:

> "BANZA é um protocolo financeiro aberto acompanhado por um agente IA nativo: BanzAI. BanzAI guia
> operadores, simula fluxos, invoca ferramentas verificáveis, explica resultados, ajuda a corrigir
> falhas e prepara evidência. BanzAI não aprova, não certifica, não licencia, não decide participação,
> não inventa regras, não adiciona decisões arquitecturais e não substitui a Referência BANZA nem os
> motores determinísticos Rust/WASM."

Clarification: **BanzAI não aprova operadores porque, no BANZA, operadores não são aprovados por uma
entidade central. Operadores demonstram compatibilidade por evidência verificável.**

Clarification: **BanzAI guia a implementação do protocolo existente; não cria protocolo novo.**

## 4. Quem faz o quê no BANZA

| Área | Quem faz | Nota |
|---|---|---|
| Licença / autorização financeira | Entidades competentes, reguladores e o enquadramento legal próprio do operador | Fora do BANZA. Cada operador responde pelo seu próprio enquadramento legal, financeiro e operacional. |
| Participar no protocolo | O próprio operador, por auto-publicação | Implementa, publica manifesto/metadata/evidência. Não pede autorização ao BANZA, ao BanzAI ou a uma autoridade central. |
| Conformidade protocolar | Motores determinísticos Rust/WASM sobre as regras públicas | O resultado é evidência verificável, não aprovação, licença ou certificação. |
| Orientação do processo | BanzAI | Guia, simula, invoca ferramentas, explica resultados e ajuda a corrigir falhas. Não decide por conta própria. |
| Interoperar com outro operador | Cada operador/par, localmente, sobre a evidência publicada | Verifica metadata, registry, evidence, capabilities e revocation/fail-closed antes de interoperar. Sem permissão central. |
| Evolução do protocolo | Governança aberta | Mantém e evolui specs, ADRs, RFCs, segurança e versões. Não aprova operadores individualmente. |
| Evidência | Operador gera/publica; motores verificam; pares consomem | A participação é demonstrada, não concedida. |
| Novas regras / decisões arquitecturais | Governança formal via proposta → RFC/ADR → revisão → testes → merge → release → publicação | BanzAI pode ajudar a redigir propostas, mas nunca transforma uma sugestão em regra activa. |

**No BANZA, não existe uma autoridade central de admissão de operadores.**

**Operadores não são aprovados; demonstram compatibilidade por evidência verificável.**

**Novas regras entram no protocolo por governança formal, não por output do BanzAI.**

## 5. BanzAI and Rule Provenance

BanzAI may only guide from **existing** normative or explanatory sources. Valid sources:

- the BANZA Reference;
- accepted ADRs;
- accepted RFCs, or RFCs explicitly marked as proposal;
- specs;
- contracts;
- schemas;
- invariants;
- outputs of the Rust/WASM engines;
- the Evidence Bundle;
- public protocol metadata.

BanzAI **cannot** invent rules, cannot create an architectural decision, cannot convert a suggestion into
a norm, and cannot resolve specification silence with its own opinion. When a source is missing, BanzAI
must answer that the rule is **not defined** and may suggest an RFC/ADR process. Proposals produced by
BanzAI must be marked `proposal`, `draft` or `not active protocol rule`.

> **BanzAI is not a protocol rule source.**
> **BanzAI may help draft RFCs or ADRs, but it cannot make them active.**
> **A protocol rule becomes active only through the governance process and publication in the BANZA
> Reference, specs, contracts or accepted ADRs/RFCs.**
> **If the protocol has no rule for a question, BanzAI must say so instead of inventing one.**

## 6. O que BanzAI faz

Guia operadores; explica a referência; simula jornadas; invoca ferramentas verificáveis; valida inputs
através dos motores; explica erros; recomenda próximos passos; prepara o Evidence Bundle; ajuda a
interpretar trust metadata; ajuda a preparar publicação no registry; acompanha o operador até à
federação/interoperabilidade; identifica lacunas; pode ajudar a redigir propostas RFC/ADR; aponta fontes
oficiais relevantes.

## 7. O que BanzAI não faz

Não aprova operadores; não certifica operadores; não licencia operadores; não decide participação; não
move fundos; não processa pagamentos; não substitui a Referência BANZA; não substitui os motores
Rust/WASM; não é autoridade regulatória; não é fonte normativa; não é gatekeeper de admissão; não cria
regras do protocolo; não adiciona decisões arquitecturais; não altera invariantes; não muda o trust
model; não muda o federation model; não muda o registry model; não trata proposta como regra activa.

## 8. Relação com os motores Rust/WASM

BanzAI orquestra. Os motores calculam. A evidência prova. O output do modelo/IA nunca é evidência por si
só. O Evidence Bundle inclui resultados dos motores, não a opinião do agente.

## 9. Relação com a Referência BANZA

A Referência é fonte normativa e explicativa. BanzAI cita e guia; não inventa regras. Se não houver
fonte, BanzAI deve dizer que não tem fonte suficiente. Se houver lacuna, BanzAI pode sugerir RFC/ADR, mas
deve marcar como proposta.

## 10. Relação com operadores

O operador usa BanzAI como entrada operacional; executa/corrige a sua implementação; publica manifesto e
evidência; continua responsável pelo seu enquadramento legal, regulatório, financeiro e operacional; não
recebe permissão BANZA para participar; demonstra compatibilidade.

## 11. Relação com a federação

BanzAI guia até à federação. A federação depende de evidência, metadata, registry e revogação/
fail-closed. BanzAI não "admite" um operador na federação; cada par avalia localmente a evidência
publicada antes de interoperar.

## 12. Relação com a governança

A governança mantém e evolui o protocolo; não aprova operadores individualmente. Novas regras e decisões
arquitecturais entram por RFC/ADR/spec/release. BanzAI pode ajudar a redigir propostas, mas não as
activa.

## 13. Consequences

- Update the reference; update the architecture docs; update the SVGs; update the BanzAI UI; update the
  guards; update the BanzAI evidence/intents; update the tests; reinforce the boundary; reinforce rule
  provenance; reinforce the fallback when a normative source is missing.

---

**BanzAI guia; os motores verificam; a evidência prova.**

**BanzAI é agente do protocolo, não autoridade do protocolo.**

**A integração de BanzAI no protocolo não cria aprovação central, certificação, licença ou poder de
admissão de operadores.**

**Participação é demonstrada por evidência verificável, não concedida por uma entidade central.**

**BanzAI guia a implementação do protocolo existente; não cria protocolo novo.**

**Output de IA nunca é regra do protocolo.**
