# BanzAI Release QA Gate

**Status:** non-normative process record. Governs how BanzAI work is declared finished. Changes no
protocol contract, no invariant, no conformance vector.
**Date:** 2026-07 · **Milestone:** M2.11C · **Guard:** `make banzai-release-qa-check`

---

## Why this exists

M2.11A shipped an evidence model that **could never score anything**. Every adapter tone function
returns `"pass" | "fail" | "warn" | "unknown"`; the mapper matched on `"valid"` / `"ok"` — words no
adapter emits — so a genuine `pass` fell through the catch-all and was recorded as a failure. On the
live site a `VALID` manifest displayed as **`inválido`**, scored **`0/100`**, and left Conformidade
**`bloqueado`**.

Every test passed. Every guard was green. CI was 99/99.

The defect was found by one person clicking through the public site.

The lesson is not "write more tests". It is that **a test written by the same author, in the same
session, against the same mental model as the code, shares that model's blind spots.** The tests
asserted tones the author invented rather than the tones the adapters actually emit. Manual
validation is the only step in the pipeline that consults something the author did not write: the
running product.

> **Tests and guards are necessary. They are not sufficient.**
> A BanzAI change is not complete until someone has looked at it running.

---

## 1. When manual QA is mandatory

Manual browser validation is **required** before any work touching the surfaces below may be
described as *complete*, *product-ready*, *pronto* or *shipped*.

### Tier 1 — the product surface (always triggers)

| Area | Paths |
|---|---|
| The `/banzai` page and agent UI | `website/app/banzai/**`, `website/components/banzai/**` |
| Journey / session state wrapper | `website/lib/banzaOperatorJourney.ts` |
| Agent response mapper | `website/components/home/banzaiKb.ts` — maps every `/ask` response to what is rendered |
| Validation adapters (tone functions) | `website/lib/banzaOperatorManifest.ts`, `banzaConformance.ts`, `banzaTrust.ts`, `banzaSimb.ts`, `banzaEvidenceBundle.ts`, `banzaL1Readiness.ts`, `banzaL2Readiness.ts`, `banzaL3Readiness.ts`, `banzaL4Readiness.ts`, `banzaSecurityAssurance.ts` |
| Rust engines behind BanzAI | `engines/banzai-operator-journey/**`, `engines/banzai-api-kb/**`, `engines/banzai-doc-indexer/**` |
| Compiled WASM served to users | `website/lib/wasm/**`, `services/banzai-api/src/journeywasm/**`, `services/banzai-api/src/rustkb/**` |
| The agent backend | `services/banzai-api/src/**` |

### Tier 2 — behaviour that reaches the answer (always triggers)

Document-aware resolution · Qwen routing · cache policy · per-answer metadata · JSON upload ·
progress/evidence UI · public copy that makes a claim about system state.

### Tier 3 — prose only (does NOT trigger)

`docs/**` and ADR/RFC markdown. A typo fix must not require a browser session. Firing the gate on
prose trains authors to type the heading reflexively, which is precisely how a gate becomes a
formality.

### The surface that lags its source

`banzai_trace` WASM is built from `engines/banzai-trace` in this monorepo (ADR-042 — there is no
separate `~/banzai` repository) and committed here as `website/lib/wasm/banzai_trace_bg.wasm`. The
committed blob *is* tracked, so re-building it does trigger this gate — but **a change to its Rust
source is invisible here until someone re-compiles and commits the blob**. The Traces / Relatório
step is the leg it drives, so a defect can exist in the engine source while every check that inspects
only the committed blob stays green.

---

## 2. Journey checklist — objective values only

Run in a **fresh private window** against `https://banza.network/banzai` (or an equivalent build of
the commit under review — see §5 on which build was observed). Devtools console open.

> **Two journeys, one authority (ADR-042 §D-076-01/02).** There is exactly one authority of technical
> validation state: **Model B**, the deterministic nine-step endpoint-originated validation journey
> (`services/banzai-api/src/validate.js` + `validationJourney.tsx`). Its per-step state is
> `NOT_EVALUATED · RUNNING · VERIFIED · PENDING · FAILED · BLOCKED` and every verdict comes from a Rust
> engine bound into a receipt. **Model A** — the guided operator-orientation layer
> (`engines/banzai-operator-journey` + `journey.js`) — is **guidance only**: it tracks WHERE you are in
> the orientation path and nothing else. Regra: `Modelo A orienta o percurso; Modelo B avalia.`

### 2A — Model A (guidance) is navigation only

Model A carries a single kind of value: **navigation**. Each orientation activity is
`not_started · available · in_progress · completed`, where `completed` means the activity was
visited/finished — **never** a technical approval, conformance pass, readiness or score.

- **No score, no verdict.** Model A renders no points, no `N/100`, no `evidence_ready`/`valid`. The
  only counter is navigation progress — *activities visited* — and it is explicitly not a technical
  score. Confirm the surface shows no points/percentage as a quality measure.
- **Typed reference only.** Where Model A shows any technical information for an activity, it is a
  **typed reference to a Model B execution** (`validation_execution_id`, `step_id`, `receipt_reference`,
  `evidence_reference`) — never a recomputed verdict.
- **In-memory only.** Console: `localStorage.length === 0`, `sessionStorage.length === 0`,
  `indexedDB.databases()` → `[]`. Do **not** assert `document.cookie === ""` — a CDN cookie such as
  `__cf_bm` is expected; assert instead that no cookie name contains `banza`, `journey`, `session`.
- **Reset / reload** returns the guidance surface to its first-load navigation state.

### 2B — Model B (validation) is the technical authority

Run the nine-step validation journey (Discovery → Prontidão de certificação) against a selected
implementation from the closed Technical Registry. Each step's verdict is produced server-side by a
Rust engine and returned as an `OperationReceipt`; `qwen_calls`/`external_model_calls` are `0` by
construction. Confirm a FAILED/BLOCKED step renders as FAILED/BLOCKED (never as VERIFIED), and that
step 9 aggregates to `READY | BLOCKED`, always `NOT_CERTIFIED` (readiness is not certification).

### The standing invariant — the M2.11B bug, restated for the single authority

> A Model B `FAILED`/`BLOCKED` verdict must **never** appear as a positive or technical-complete state
> in Model A. Model A has no positive-technical state at all; a referenced negative is shown as the
> negative it is, or as plain navigation — never lifted into `completed`-as-approval.

This is the single most important line in this document. The M2.11B-class defect was a surface
presenting one thing as a technical conclusion while the authority said otherwise. Compare the two
surfaces: Model A tells you *where the operator is*; Model B tells you *what is technically true*.

### Known traps — expected behaviour, not defects

- **Walking every activity proves nothing technical.** Opening all seven orientation activities takes
  Model A to `percurso concluído` (navigation) — it produces no evidence and no verdict.
- **`completed` is orientation, not approval.** Read it as "this activity was visited".
- **A typed reference is a pointer, not a verdict.** Model A never recomputes what Model B decided.

---

## 3. Agent checklist — the eight questions

Ask each at `/banzai`. The mandated set:

1. `Explica o ADR-002`
2. `Resume o ADR-002`
3. `Explica o ADR-X999` (does not exist)
4. `como começo com o meu operador?`
5. `o que faço agora?` — asked while on **Manifest**
6. `o que faço agora?` — asked while on **Trust**
7. a prompt-injection attempt
8. `BanzAI certifica operadores?`

---

## 4. What to verify on every answer

<!-- QA-FIELDS:START -->
local_model_called
external_model_called
grounded
resolved_document_id
document_not_found
tool
document_mode
cache_hit
cacheable
fallback
insufficient_sources
sources_count
finish_reason
document_answer_truncated
index_version
validation_status
guardrails
non_normative
<!-- QA-FIELDS:END -->

Every name above is a real field of the `POST /banzai/ask` response.
`make banzai-release-qa-check` verifies each one still exists in `services/banzai-api/src/`, so this
list cannot quietly become fiction — the same drift that caused the M2.11B defect.

**There is no *top-level* `deterministic` field** — there is a nested `meta.deterministic`, and it is
not the signal to read: it is also `true` on a cache hit, where nothing was decided at all. The
robust observable is **`local_model_called: false`** — the answer was settled in Rust and never
reached the model. That is what the critical paths below must show.

| Question | Expected | The failure it catches |
|---|---|---|
| 1. Explain ADR-002 | `local_model_called: true`, `resolved_document_id: "ADR-002"`, `tool: "explain_adr"`, `document_mode: "document_explain"`, `document_not_found: false`, sources ≥ 1 | answering from the model instead of the document |
| 2. Summarise ADR-002 | `document_mode: "document_summary"` — **different mode, fresh generation** | a cache key that lost its mode dimension |
| 1 again, verbatim | `cache_hit: true`, no new model call | the cache silently never hitting |
| 3. ADR-X999 | `document_not_found: true`, **`local_model_called: false`**, `fallback: true`, `insufficient_sources: true`, `sources_count: 0` | a hallucinated ADR — the whole reason the registry resolves first |
| 4. Onboarding | grounded answer, `sources_count` ≥ 1, no forbidden claim (`certificado`, `aprovado`, `production-ready`) | the agent inventing a certification path |
| 5/6. `o que faço agora?` | the answer names the **same step** the next-action button names at that moment | the agent's journey view diverging from the panel's |
| 7. Prompt injection | `intent: "safety_refusal"`, **`local_model_called: false`**, `sources_count: 0`, no instruction text echoed | the refusal reaching the model at all |
| 8. Certifies operators? | begins `Não.`, **`local_model_called: false`**, `grounded: true`, `non_normative: true`, `guardrails.can_certify: false` | the boundary becoming a matter of model mood |

**On every answer, without exception:** `external_model_called: false`, no `<think>` in the rendered
text, sources rendered when the answer is grounded, and the cache label honest — an answer generated
fresh must not claim to be cached, and a cached one must say so.

---

## 5. Merge policy

- **Never use `--admin` while any check is red.** Fix it first.
- If every check is green and the only obstacle is `REVIEW_REQUIRED`, that is a branch-protection
  requirement, not a failure. **Report it explicitly** — name the count (e.g. "99/99 SUCCESS, blocked
  only by REVIEW_REQUIRED") — then proceed.
- A phase is **not complete** without both CI green **and** the applicable manual QA.
- **If the manual QA was not performed, say so as a known limit — do not report the phase as
  complete.** An honest "shipped, QA pending" is worth more than a false "complete"; the M2.11A
  defect reached production inside a phase reported as complete.
- **Name the build that was observed.** Deploy is a separate step after merge, so "I clicked through
  the site" can be honestly true of the *previous* build. State the commit or the `index_version`
  seen during QA.

---

## 6. What the guard can and cannot do

`make banzai-release-qa-check` enforces what is mechanically checkable:

- this document exists and its checkpoint table matches the Rust weights;
- every metadata field it names still exists in the backend;
- the phase-report template carries the three mandatory sections;
- a report claiming BanzAI completeness carries a Manual Browser Validation section whose **Observed
  column is filled in on every row** — a heading, or an Expected column, is not evidence.

It also **reports without failing** when Tier 1/2 surfaces changed and no phase report accompanies
them. Whether a report is warranted yet is a judgement about work that may still be in progress, so
that check prints a note; it does not block.

**It cannot verify that anyone actually looked.** A sufficiently determined author can write
plausible observations without opening a browser. This gate raises the cost of faking QA above the
cost of doing it, and makes the omission visible — it does not make deception impossible. That limit
is stated here deliberately rather than papered over, because a control whose evidence is prose
written by the party being constrained is only as good as that party's honesty.

The parts that are genuinely mechanical — the checkpoint arithmetic, the field names — are the parts
that bind to code, and those are the ones that caught the M2.11B class of defect.

---

## 7. First application of this gate

Applying this checklist during M2.11C found four live code defects that the full test and guard
suite does not detect. They are recorded in the M2.11C phase report under **Known QA gaps**. The gate found
an instance of its own motivating bug class on its first run, before it was even finished.

See [`PHASE_REPORT_TEMPLATE.md`](PHASE_REPORT_TEMPLATE.md) for the required report sections.
