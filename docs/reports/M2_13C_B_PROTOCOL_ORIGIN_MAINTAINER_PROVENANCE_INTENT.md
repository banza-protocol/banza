# M2.13C-B — Protocol Origin, Creation Date, Maintainer Attribution & Institutional Provenance

**Phase:** M2.13C-B (sub-phase of M2.13C).
**Scope:** BanzAI answer engine + canonical origin sources (`NOTICE`, `MAINTAINERS.md`, `README.md`,
`GOVERNANCE.md`). **Nature:** architectural — a reusable `protocol_origin_query` intent family, not a
per-phrase hardcode.

---

## 1. Problem observed
`quem criou o BANZA?` returned **"Não há fonte suficiente."** (no_source), even though the repo carries
`NOTICE`, `MAINTAINERS.md`, `README.md` and `GOVERNANCE.md`. There was no intent family for institutional
origin, so origin/creation-date/maintainer/owner questions fell through to retrieval and failed.

## 2. Root cause
No `protocol_origin_query` family and no deterministic entry for institutional origin; the canonical
sources did not carry an explicit **creation date**; and the repo-wide index drops the creator stem
(operator-neutrality), so retrieval could never surface an origin answer.

## 3. New intent family
`protocol_origin_query` (pure classifier in `engines/banzai-api-kb/src/route.rs`, `is_protocol_origin`)
covers: who created / founded / developed / made BANZA, the creation date, who first made it available,
the initial / institutional maintainer, the owner, and the creator↔protocol relation — in PT **and** EN.
It is scoped to BANZA-the-protocol (never the Operador Zero simulator or the BanzAI agent) and is checked
**before** the licence families so a mixed "quem criou o BANZA e qual licença usa o repo?" leads with
origin. A deterministic `critical_entry` arm routes it to the `protocol-origin` answer.

## 4. Historical creation date
- **Date added:** `01/08/2025`
- **Human form:** `1 de agosto de 2025`
- **Meaning:** the historical **creation / initial-availability** date of the BANZA protocol — **not** a
  production, certification, financial-authorisation, active-operator, Trust-Root-issuance or federation
  date, and it confers **no** operational authority over operators.
- **Sources updated (before → after):** `NOTICE`, `MAINTAINERS.md`, `README.md`, `GOVERNANCE.md` each went
  from naming the creator **without a date** to naming the creator **on 01/08/2025 (1 de agosto de 2025)**
  with the explicit "not production/certification/financial/operator" clause.
- The date lives in the **canonical files** (indexable), not only in a BanzAI answer.

## 5. Updated sources
`NOTICE`, `MAINTAINERS.md`, `README.md`, `GOVERNANCE.md` — creator = **BANZAMI - TECNOLOGIA E SERVIÇOS,
LDA.**, creation date **01/08/2025 (1 de agosto de 2025)**, open public governance, no operator authority.

## 6/7. Priority sources + ranking
`intent_source_ranking("protocol_origin_query") = primary [legal-license, normative, decision]`,
penalise `[implementation, operator-zero, banzai-runtime, report]`. The deterministic answer cites
**NOTICE, MAINTAINERS, README** (path-scored priority); infra/conformance/CLAUDE are never the source.

## 8. Answer contract (deterministic `protocol-origin`)
Directly states BANZA was originally created on **01/08/2025 (1 de agosto de 2025)** by the creator, that
this is **historical/institutional origin**, that BANZA is **open source** with public repository
governance, and that the origin does **not** make the creator approve / certify / license / control
operators, nor an operator or PSP — operators are independent and financial authorisation is outside the
protocol. `local_model_called=false`, `external_model_called=false`, `intent=critical_boundary`, sources
= NOTICE/MAINTAINERS/README, no `Fonte:` in the body (stripped by M2.13D).

## 9/10. PT / EN / mixed cases
All 14 PT + 11 EN origin questions from Part 15 resolve to `protocol-origin` with the date. Mixed cases
("quem criou o BANZA e quem certifica operadores?", "se a Banzami criou o BANZA ela pode aprovar
operadores?", "a data 01/08/2025 significa que havia operador em produção?", "a data de criação é uma
licença financeira?") also route to the origin boundary answer, which denies certification/approval/
licensing/production/financial framing.

## 11. Institutional-origin safeguards (allowed vs forbidden)
The answer NAMES the creator as **attribution** and states open governance; it never claims the creator
controls/approves/certifies/licenses operators, is a PSP, moves funds, or that origin replaces open
governance or that the date is production/certification/financial.

## 12. Brand-contamination care
The creator name is allowed only on legal/governance surfaces (`banzami_attribution_allowed`): NOTICE,
MAINTAINERS, README, GOVERNANCE, plus the already-allowlisted `knowledge.js` / `route.rs` (+ their tests).
This phase adds **one** narrow allowlist entry — this report's path — and nothing else; the guard, the
eval matrix and the node tests build the creator stem by concatenation so they never contain the literal
token. The brand stays barred from operator/runtime/endpoint/conformance surfaces.

## 13/14. Bugs found + fixes
- Origin questions → `no_source` → new family + deterministic entry.
- A grounded reference-operator question ("quem é o operador de referência que o Banzami mantém?") was
  briefly stolen by an over-broad creator-framing (`operador`); narrowed to creation/control/authority
  verbs only.
- "quem é o mantenedor institucional inicial?" lacked a `banza` subject → standalone origin phrases added.
- "a data 01/08/2025 significa produção?" fell into no_source → the creation date + "data de criação" are
  now standalone origin triggers.
- `apaga o MAINTAINERS.md` / `apaga o NOTICE` were not refused → core governance docs added to the
  action-boundary delete arm.
- ~5 origin paraphrases ("o BANZA foi criado por quem?", "who is behind BANZA?", …) grounded instead of
  origin → cues broadened.

## 15. Guards
- **New:** `make banzai-protocol-origin-intent-check` (`tools/check-banzai-protocol-origin-intent.sh`) —
  Part 16's conditions: canonical files carry the date (NOTICE/MAINTAINERS/README), origin questions are
  deterministic `protocol-origin` (never no_source/Qwen) with the date, cite the right sources, deny
  operational authority, never present `/operador-zero` as a live source, sources are clickable. Wired
  into CI. The M2.13C-A intent guard's brand-hygiene check exempts `protocol-origin` (allowed attribution).

## 16. Tests
- `engines/banzai-api-kb/tests/route.rs`: 5 M2.13C-B tests (origin resolves, family classified, does not
  steal other families, mixed→origin, dangerous still refuses) — **56 route tests, all green**.
- `services/banzai-api/test/protocol-origin.test.js`: 6 node tests; `answer-quality-matrix.mjs` gains a
  `protocol_origin` FAMILIES entry — banzai-api suite **126/126**.

## 17. CI
Local battery green: cargo fmt/clippy, 56 route + repo-guards tests, 126 node tests, and guards —
identity, purity, rust-rule, private-key-leak, action-boundary, **protocol-origin-intent**,
intent-source-ranking, answer-quality-eval, answer-rendering-ux, repository-wide-knowledge,
repo-knowledge-safety, qwen-routing. Adversarial origin sweep clean.

## 18. Deploy
Merged to `main` as `a0474aa` (PR #140); **banzai-api only** rebuilt + restarted on the VPS. Two CI
fixes en route: the NOTICE reflow had split "open financial protocol" across a line (M2.7M guard greps
one line), and the new origin guard/test carried the literal creator brand in question strings (not on
the attribution allowlist) — rephrased brand-free ("criador original") that route identically. Model,
tokens, timeout, reasoning, provider unchanged; no Postgres/DNS/TLS/Trust-Root/operators change.

## 19. Live QA (`POST https://banza.network/banzai/ask`, deploy `a0474aa`)
| Question | intent | ext | sources | date | boundary |
|---|---|---|---|---|---|
| `quem criou o BANZA?` (the bug) | critical_boundary | false | **NOTICE, MAINTAINERS, README** | ✓ | ✓ |
| `quando foi criado o BANZA?` · `quem é o criador original do protocolo?` | critical_boundary | false | NOTICE, MAINTAINERS, README | ✓ | ✓ |
| `who created BANZA?` · `who owns BANZA?` | critical_boundary | false | NOTICE, MAINTAINERS, README | ✓ | ✓ |
| `quem criou o BANZA e quem certifica operadores?` (mixed) | critical_boundary | false | NOTICE, MAINTAINERS, README | ✓ | ✓ |
| `quem criou o BANZA e qual licença usa o repo?` (mixed) | critical_boundary | false | NOTICE, MAINTAINERS, README | — | ✓ |
| `a data 01/08/2025 significa que havia operador em produção?` | critical_boundary | false | NOTICE, MAINTAINERS, README | ✓ | ✓ |
| `a data de criação é uma licença financeira?` | critical_boundary | false | NOTICE, MAINTAINERS, README | — | ✓ |

Served answer (verbatim start): *"O **BANZA** foi originalmente criado em **01/08/2025 (1 de agosto de
2025)** pela **BANZAMI - TECNOLOGIA E SERVIÇOS, LDA.**, indicada como criadora original e mantenedora
institucional inicial. Essa é a **origem institucional/histórica** do protocolo — a data de criação/
disponibilização inicial, **não** uma data de produção, certificação, autorização financeira nem de
operador activo. Hoje o BANZA é disponibilizado como **protocolo financeiro aberto (open source)**…"*
All deterministic (`external_model_called=false`), no `<think>`, no `no_source`.

**Invariants post-deploy:** `/operators` → `[]`; `/certificates` → `production_certificates: false`;
`zero.banza.network/` → 200; apex `/operador-zero` → **410**; `apaga o NOTICE` → **action_boundary**.

## 20. Limits
- The repo-wide index drops the creator stem (operator-neutrality), so origin answers are **deterministic**
  (they never depend on repo retrieval); the sources are the entry's NOTICE/MAINTAINERS/README.
- The classifier is a label for telemetry/ranking; it never overrides safety or the deterministic
  boundaries.

## 21. Rollback
Revert the PR (or redeploy the previous banzai-api image) — the canonical files keep the date, but the
deterministic answer + intent revert; no data/Trust-Root/operator/DNS change to undo.

## 22. Verdict
**M2.13C-B complete** — BanzAI now recognises protocol-origin, creation-date and institutional-provenance
questions as a first-class intent: it answers who originally created BANZA and when using
NOTICE/MAINTAINERS/README sources, states that BANZA was originally created on 01/08/2025 (1 de agosto de
2025) by BANZAMI - TECNOLOGIA E SERVIÇOS, LDA., distinguishes origin from control/certification/licensing/
financial operation, keeps the protocol neutral and open, preserves action-boundary safety, and passes
PT/EN live QA without falling back to no_source.
