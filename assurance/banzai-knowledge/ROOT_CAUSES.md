# BanzAI knowledge & reasoning — root-cause catalogue

Every entry below was reproduced against **production** (`src-14df955`, repo `14df955`) with the
read-only probe in `assurance/banzai-knowledge/`, and then isolated locally against the Rust
query-core (`engines/banzai-query-core`, via `services/banzai-api/src/rustkb`). Each names the
**owner** — the lowest layer that decides the behaviour — not the surface where it was noticed.

## RC-1 — A principle named by an ordinary adjective hijacks unrelated definitions

`glossary::is_named_principle_query` opens the definition gate, and resolves the term, when a query
merely *contains* one of `simples / seguro / robusto / resiliente / simple / secure / robust /
resilient` together with a definition lead. Those are ordinary words in both languages, so the R²S²
Fundamental Principles answer is served for questions that have nothing to do with principles.

Reproduced (production and locally):

| question | resolved |
|---|---|
| `o que e um canal seguro` | `def-r2s2` |
| `o que e transporte seguro` | `def-r2s2` |
| `what is the secure boot` | `def-r2s2` |
| `o que e um ledger simples` | `def-r2s2` |
| `explica o que e um ledger de forma simples` | `def-r2s2` |

The failure is *confident*: `action: deterministic`, `grounded: true`. A reader asking about a secure
channel is told about the four Fundamental Principles as though that were the answer.

This is the whole-token-versus-subject form of a bug this file already documents one level down: a
name that is present is not a name that is being asked about.

**Owner:** `engines/banzai-query-core/src/glossary.rs :: is_named_principle_query`.

## RC-2 — A BANZA requirement question resolves to the generic identity entry

`o BANZA exige um ledger` / `does BANZA require a ledger` resolve to `what-is-banza`, whose sources
are ADR-001. The model is then asked a **normative** question with none of the normative evidence
in front of it, and it obliges:

> O **BANZA** não exige um ledger específico, pois os modelos subjacentes a qualquer sistema de
> pagamento, incluindo o ledger, não são comercialmente distintivos e cada operador os constrói por
> si mesmo.

> **BANZA** does not require a ledger as the underlying models are not commercially distinctive and
> every operator builds them privately.

Both contradict `contracts/invariants.json`, which carries INV-LEDGER-001…005 and INV-WALLET-001 at
severity `critical`, and ADR-012. The knowledge is present in the corpus — entry
`financial-invariants` states it exactly — and was never retrieved.

The whole family behaves this way: `o banza define idempotencia`, `o banza garante atomicidade`,
`does banza define idempotency` all resolve to `what-is-banza`.

**Owner:** the routing/subject layer — `route.rs` never treats "does BANZA ⟨verb⟩ ⟨concept⟩" as a
question *about the concept*.

## RC-3 — The definition gate is narrower than the ways people ask

`glossary::glossary_entry` opens only for `starts_definition_lead && toks <= 6`, a bare term
(`toks <= 2`), or a boundary query. Three natural shapes fall outside it and are refused:

- **explanatory** — `explica X` / `explain X` are absent from `starts_definition_lead`, though the
  sibling predicate `is_r2s2_acronym` in the same file already reads them. `Explica BCJ/1.` resolves
  (2 tokens); `Explica BCJ/1 de forma simples.` and `Explain BCJ/1 simply.` do not.
- **comparative** — `qual a diferenca entre A e B` / `what is the difference between A and B` never
  open the gate. `clearing` and `settlement` each resolve alone; the comparison is refused.
- **locative** — `onde ficam os saldos` / `where do balances live` is refused, though INV-WALLET-001
  states that balances are derived from the ledger and ADR-013 states where they do *not* live.

**Owner:** `engines/banzai-query-core/src/glossary.rs :: starts_definition_lead` and the gate in
`glossary_entry`.

## RC-4 — A comparison that resolves one side is published as an answer

`Qual é a diferença entre L2 e L3?` resolves to `def-profile-l2` and returns **the L2 definition
alone**, never mentioning L3, with `degraded: true` and `terminal_kind: operational_failure` — while
the reader sees a confident, well-formed answer to a question that was not answered.

On the model path the same question confabulates instead: EN returned "L2 and L3 differ in their
level of abstraction and coordination", citing ADR-021 (reason codes) and ADR-039 (root authority) —
neither of which discusses profiles at all.

**Owner:** the comparison path — a comparison whose second subject never resolved must not be served
as a comparison.

## RC-5 — `insufficient_source` has no reader text in either locale

`TERMINAL_TEXT.contextual_fallback` (services/banzai-api/src/pipeline.js) declares only
`out_of_scope` and `ambiguous`. The pipeline can also produce `insufficient_source`, which therefore
falls through to `unavailableRealization(locale)` — wording that exists to say *"this answer is not
yet available in your language"*, and which ends with **"The sources that support it are still
listed below."**

Served for `Uma implementação pode usar PostgreSQL?` with `sources: []`. The sentence promises
evidence that is not there, and blames a translation gap for what is actually a retrieval outcome.
Both halves are false.

**Owner:** `services/banzai-api/src/pipeline.js :: TERMINAL_TEXT.contextual_fallback`.

## RC-6 — English readers cannot reach the safety boundaries at all

163 of 178 deterministic entries have no `en` realization. The consequence is not a cosmetic one:
the questions that carry the protocol's most important boundaries return the placeholder.

| question | terminal | what the English reader receives |
|---|---|---|
| `If I pass L3 am I certified?` | `safety_refusal` | *A deterministic answer is not yet available in English…* |
| `If I am certified am I authorised by the regulator?` | `safety_refusal` | *…not yet available in English…* |
| `Can BanzAI certify me?` | `safety_refusal` | *…not yet available in English…* |
| `Does BANZA use a blockchain or a distributed ledger?` | `canonical_definition` | *…not yet available in English…* |

The engine reaches the correct terminal and then has nothing to say. `grounded: true` is reported
for an answer that was never delivered.

**Owner:** the realization corpus in `services/banzai-api/src/knowledge.js`.

## RC-7 — `answer_locale` is absent on every model answer, and the gate accepts absence

Measured across the baseline: `answer_locale` is present on **31/31** deterministic terminals and
absent on **9/9** `explanatory_trunk` terminals, in both locales.

`website/components/home/banzaiKb.ts :: localeMatches` documents that "an absent declaration is
accepted". So the locale gate — the property this repository closed in PR #37/#38 — is enforced on
exactly the paths whose text is fixed and reviewed, and is **silent on the one path that generates
free prose**. The check holds where it cannot matter.

**Owner:** the API — the model terminal must declare its locale like every other terminal.

## RC-8 — Model answers cite sources that do not support them

Beyond RC-2 and RC-4:

- `Por que não posso normalizar Unicode antes de verificar?` (PT) cited
  `federation-trust-evaluation.production.schema.json` and
  `public-protocol-registry.production.schema.json` for a BCJ/1 canonicalization rule. The EN twin
  cited ADR-011, which *is* the authority — so the citation is a coin-flip, not a derivation.
- `What is the difference between a centralized and a distributed ledger?` cited `SECURITY.md` and
  `conformance/README.md`.

**Owner:** the retrieval plan feeding the FactualPackage, and the claim verifier that accepted them.

## RC-9 — The status question is not answered

`O BANZA está pronto para produção?` returned the generic "what BANZA is" definition with
`degraded: true`, `fallback_reason: synthesis_output_unvalidated`. The English twin confabulated a
reason: *"BANZA is not production ready as it is an open financial protocol and not a commercially
distinctive payment system component."*

The canonical lifecycle facts are already derived into `src/lifecycleFacts.generated.json` — version,
pre-production, freeze, independent-implementation and trial booleans — and were not used.

**Owner:** the status/lifecycle route.
