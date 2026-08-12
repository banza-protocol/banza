# BANZAI Operator Experience — Current-State Audit (M2.19G.3B, Gate inicial)

**Milestone:** M2.19G.3B — BanzAI Operator Experience Canonicalization
**Base commit:** `2c4bfb74` · **Branch:** `feat/m2-19g3b-banzai-operator-experience` · **Rollback:** `rollback-pre-m2-19g3b-banzai-operator-experience`
**Method:** read-only fan-out over 8 subsystems (both tabs, shell + context panel + journey UI, onboarding backend + session model, Postgres schema/migrations + preserved data, Rust onboarding/validation engines + states, Technical Registry + version/profile/environment option sources, guards/tests/i18n/a11y). No files changed. Per §4: real state inspected, nothing assumed.

> **Canonical rule to converge on:** *An authenticated session works with a single operator. That operator may own several implementations. Each implementation has its own configuration, domain, origin proof, journey, evidence and receipts.*

---

## 0. Canonical sources of truth (confirmed, to be USED — not duplicated)

| Concern | Canonical source (authoritative) | Currently used by the UI? |
|---|---|---|
| Operator/implementation registry | `engines/banza-target-registry/src/registry.rs` → `production_registry()` (L168-194); WASM exports `catalogue_json()` / `tool_version_json()` | ❌ UI reads a hardcoded TS mirror instead |
| Protocol **version** | `registry.rs` `SUPPORTED_PROTOCOL_VERSIONS` = `["1.0.0","1.0"]` (L13) | ❌ hardcoded TS |
| **Environment** | `registry.rs` `SUPPORTED_ENVIRONMENTS` = `["sandbox","demo"]` (L15) | ❌ hardcoded TS |
| **Profile** | `registry.rs` `SUPPORTED_PROFILES` = `["L0".."L4"]` (L17) | ❌ hardcoded TS |
| Candidate **state enum** | `engines/banzai-onboarding/src/lib.rs` `candidate_states` (L33-47) + `next_state` (L224-240): `EMAIL_PENDING, EMAIL_VERIFIED, DRAFT, ORIGIN_PENDING, ORIGIN_VERIFIED, VALIDATING, BLOCKED, VALIDATION_COMPLETED, PUBLICATION_ELIGIBLE, PUBLISHED, EXPIRED` | partial — internal codes shown raw |
| Candidate Registry (private) | Postgres `banza_protocol`, tables in `infra/banza-network/postgres/init/001_schema.sql` (L102-174) + migrations `M2_19G3_operator_onboarding.sql`, `M2_19G3A_origin_single_use.sql` (`origin_challenges.consumed_at`) | via `services/banzai-api/src/onboarding/*` |
| Public selection source | `/registo-tecnico` prose → machine route `/operators` (`services/verification-api`, returns `[]` in pre-production) | onboarding not wired to it |
| Nine-stage journey | `validationJourney.tsx` STEPS + `services/banzai-api/src/validate.js` + `validatewasm` (Rust decides; receipts server-issued; `qwen_calls`/`external_model_calls`=0) | reused ✅ (keep) |

**Rust decides / Qwen only explains** holds at runtime for validation (browser POSTs closed `operator_id`+`implementation_id`; receipts are server-issued). The problem is the **display/selection layer**, the **session model**, and the **onboarding↔validation disconnect** — not the deterministic core.

---

## 1. Architectural problems

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| **A-01** | high | **Session is bound to a PERSON (email), not to ONE operator.** `candidate_sessions` is keyed on `email_normalized` with no candidate/operator column; one email may create and switch between **unlimited** candidates (operators). Violates "one session ↔ one operator". | `onboarding/store.js` + `service.js` (`authenticate()`→`{sessionId,email}`); `001_schema.sql` `candidate_sessions` (DB-01/OB-01) |
| **A-02** | high | **No server-side `active_candidate` binding.** The "active operator" is a client concern: the browser passes `candidate_id` in each POST body; server ownership-checks per request but nothing pins one operator to the session. | `onboarding/routes.js` + `service.js` (OB-02, DB-02, REG-07) |
| **A-03** | high | **"Submeter novo operador" / "Criar candidatura" lives inside an already-bound session** → one session can mint many operators. | `BanzaiOnboardingMode.tsx` dashboard (ONB-02); `banzaiOnboardingClient` (P8) |
| **A-04** | high | **Onboarding (private Candidate Registry) is disconnected from validation (public Technical Registry).** An onboarded, origin-verified candidate can never be selected in "Validar operador" because that tab reads a hardcoded TS registry, not `/operators` / the Rust registry. | `BanzaiValidationMode.tsx` ← `banzaiValidation.ts` vs `onboarding/*` (A-04/P3/P4) |
| **A-05** | high | **Operador Zero hardcoded as the ONLY operator**, structurally locked by a guard + 2 tests. Canonical rule: OZ must NOT be hardcoded as the only operator. | `banzaiValidation.ts` `OPERATOR_REGISTRY` single entry (L85-106); `validationJourney.tsx` `OPERATOR_LIST` (L521); home marquee fallback card (VO-03/P1/P3/REG-03/P2) |
| **A-06** | high | **Candidate-level state machine conflated with a single implementation's progress** (`candidates.state` alone), so it cannot represent an operator with several implementations at different stages; no journey linkage per implementation. | `lib.rs` single `candidates.state`; `candidate_implementations` has no journey column (A-06/P7/DB-03) |
| **A-07** | medium | **Broken onboarding→validation bridge**: "Ir para Validar operador" switches mode but the validation registry is hardcoded, so the just-verified implementation is absent. | `BanzaiOnboardingMode.tsx` CTA (ONB-08) |
| **A-08** | medium | **Free operator PICKER** in Fase 0 (`operators.map` → `selectOperator`) instead of a session-bound single operator (public side is intentionally multi-select; but the model/labels conflate "session" with "picker"). | `BanzaiValidationMode.tsx` `ValidationContextSetup` (VO-05) |

## 2. Data-consistency problems

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| **D-01** | high | **version/profile/environment/capabilities read from a hardcoded TS map that has DRIFTED from Rust.** TS `version 1.0.0 / profile "demonstração" / caps [wallets,qr,settlement_simulation] / ref "registo-tecnico:operator-zero"` vs Rust `version 0.1.0 / profile "L0" / caps [qr_payment_demo,refund_demo,reconciliation_demo] / ref "banza-technical-registry:operator-zero"`. | `banzaiValidation.ts` `OPERATOR_REGISTRY` (L85-106) vs `registry.rs` `production_registry()` (L176-192) (VO-01/D-01/P2/REG-02) |
| **D-02** | high | **Result sentence (Resumo) interpolates hardcoded TS version/profile**, not the Rust-issued receipt values — so the summary prints wrong metadata even after a real run. | `BanzaiValidationMode.tsx` L668-674 → `VALIDATION_COPY.resultPhrase` (banzai-agent.ts L124-125) (VO-02) |
| **D-03** | high | **Registry-empty contradiction:** the tab shows "Publicado no registo técnico (demonstração)" while `/registo-tecnico` declares "Hoje o registo está vazio (/operators devolve [])". Right-panel ESTADO also says "registo público vazio" while a reference implementation is shown. | `banzaiValidation.ts` L89 vs `registo-tecnico/page.tsx` L8/L13/L44; panel copy (VO-04/P5/D-03) |
| **D-04** | medium | **Two divergent definitions of the same operator** in one file: legacy `VALIDATION_TARGETS["operator-zero"]` (`environment "demo"`) vs `OPERATOR_REGISTRY` (`environment "sandbox"`). Environment inconsistent across surfaces. | `banzaiValidation.ts` L34-42 vs L85-106 (VO-07/P12/REG-04) |
| **D-05** | medium | **Onboarding never captures version/profile/environment**; when the route does accept them they are stored as unconstrained free text (`safeText(...,40)`), not validated against the canonical enums. | `banzaiOnboardingClient` impl-create sends only name+domain; `onboarding/service.js` + `store.js` (DB-04/DB-05/OB-06/P9) |
| **D-06** | medium | **Home registry counters hardcoded** ("Certificados"/"Em conformidade" literal `0` in JSX) rather than derived from the registry snapshot. | home `page.tsx` marquee (REG-05) — *note: home copy change is out of scope §44; counters are already canonical elsewhere — flag only* |
| **D-07** | low | **`candidate_implementations.canonical_domain` has no uniqueness constraint** → two candidates/implementations could claim the same domain. | `001_schema.sql` (DB-07) |
| **D-08** | high | **No git-tracked seed/migration for the existing production Banzami candidate + Banzami Sandbox implementation + `sandbox-operator.banzami.com` + its origin challenge.** They exist ONLY in the prod DB → must be preserved via idempotent handling, never duplicated, and are absent from local/CI DBs. | repo search: no fixture (DB-08) |

## 3. Functional problems

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| **F-01** | high | **`reconcileCandidate` fast-forwards a candidate straight to PUBLISHED** by firing state events in a loop, with NO real journey run, not wrapped in a transaction, binding to an arbitrary resolvable `(operator_id, implementation_id)`. | `onboarding/service.js reconcileCandidate` (OB-03/OB-04/OB-05/P5) — *pre-existing; treat carefully* |
| **F-02** | medium | **"Reiniciar sessão" is a misnomer** on the public tab: `reset()` keeps `operatorId`/`implementationId`, only clears in-memory results; shown even before a journey starts. | `validationJourney.tsx reset()` (L444-450); `BanzaiValidationMode.tsx confirmReset` (VO-06/F-02) |
| **F-03** | medium | **"Submeter novo operador" and "Continuar candidatura" do the identical action** (both `setStep("email")`), so the declared distinction is cosmetic. | `BanzaiOnboardingMode.tsx` pre-auth paths (ONB-11/P8) |
| **F-04** | low | **`CandidateImpl.validation_state` returned by backend but never rendered.** | onboarding client type vs UI (P10) |
| **F-05** | low | **`getCandidateDetail` implemented + exported but wired to no route** (dead read path; only list-all exists). | `onboarding/service.js` / `routes.js` (OB-07) |
| **F-06** | low | **`abandonCandidate` client exists but never wired into UI.** | `banzaiOnboardingClient` (ONB-12) |

## 4. Terminological problems

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| **T-01** | medium | **Internal state codes shown as primary status; no PT human labels for onboarding states.** `candidate.state` / `impl.origin_verification_state` rendered raw (validation side has `STATUS_LABEL_PT`, onboarding side has none). | `BanzaiOnboardingMode.tsx` (ONB-05/T-01/P4) |
| **T-02** | medium | **Singular/plural candidature confusion**: dashboard header "As suas candidaturas" (plural, lists many) contradicts the one-operator model. | `BanzaiOnboardingMode.tsx` (ONB-10) |
| **T-03** | low | **"NOT_CERTIFIED" used as an implementation "state"/certificationStatus** though it is not a member of the canonical candidate enum (it is a certification outcome). | `banzaiValidation.ts` `last_known_state` (VO-10/P11) |
| **T-04** | low | **Mode label "Validar operador" vs object "implementation"** surfaces the operator/implementation conflation the milestone must resolve. | `MODES` (banzai-agent.ts) vs journey (P8) |

## 5. Accessibility problems

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| **X-01** | medium | **Placeholder-as-label on all four onboarding inputs** (operator name, institutional name, implementation name, canonical domain) — no `<label>`/`aria-label`, no accessible name. | `BanzaiOnboardingMode.tsx` (ONB-07/X-01/P5) |
| **X-02** | medium | **a11y + responsive guards do not cover the onboarding component** (they scan page/shell/`BanzaiValidationMode`/`DraftValidationTool` only). | `tools/check-*a11y*` / responsive guard scope (P6) |
| **X-03** | medium | **IDs/origin data CSS-truncated with no way to read/copy** the full value (KV `.truncate`; traces `e.ref`; `shortHash`). | `BanzaiValidationMode.tsx` `KV` (L488) (VO-08/X-03) |
| **X-04** | low | **Validation header action cluster has no `flex-wrap`** → overflow on narrow/mobile. | `BanzaiValidationMode.tsx` `ValidationHeader` (P11) |
| **X-05** | low | **Resultados sub-views use `aria-current` buttons, not tablist semantics** (`role="tablist"/tab/tabpanel`). | `BanzaiValidationMode.tsx` results area (P12) |
| **X-06** | low | **No frontend tests for `BanzaiOnboardingMode.tsx` / `banzaiOnboardingClient`.** | test inventory (P7) |

## 6. Visual problems

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| **V-01** | low | **Raw origin-challenge JSON dumped open-by-default** after issuing the challenge (should be progressive disclosure). | `BanzaiOnboardingMode.tsx` (ONB-06/V-01) |
| **V-02** | low | **Legacy 7-step operator-journey residue** (`banzaOperatorJourney.ts`, `operadorZeroJourney.ts`, `operatorJourneyE2E.test.ts`) persists though the shell uses the 9-step journey. | test/lib inventory (P13) |

## 7. Security problems

| ID | Sev | Problem | Evidence |
|---|---|---|---|
| **S-01** | medium | **Canonical domain accepted as arbitrary free text** with only `!domain.trim()` client check (final validation is server-side, but no client guard for scheme/path/port/IP/localhost). | `BanzaiOnboardingMode.tsx` (ONB-13/S-01) |
| **S-02** | medium | **`reconcileCandidate` binds to an arbitrary existing `(operator_id, implementation_id)`** that merely resolves, with no cross-check to the verified candidate/domain. | `onboarding/service.js` (OB-04) |
| **S-03** | (verify) | Confirm no query-string `candidate_id` switching / IDOR is exploitable once `active_candidate` binding lands. | to be covered by §40 tests |

---

## 8. Classification summary

- **Arquitectural:** A-01…A-08 (5 high) — the core of the milestone (session↔operator binding, OZ-hardcoding, onboarding↔validation wiring, per-implementation states).
- **Consistência de dados:** D-01…D-08 (4 high) — hardcoded/drifted TS registry → replace with canonical Rust source; preserved Banzami data (D-08) is the key deploy risk.
- **Funcional:** F-01…F-06 — reset misnomer, submit/recover duplication, reconcile fast-forward (pre-existing, handle carefully).
- **Terminológico:** T-01…T-04 — human state labels + operator/implementation vocabulary.
- **Acessibilidade:** X-01…X-06 — labels, truncation-copy, guard coverage, tablist.
- **Visual:** V-01…V-02 — progressive JSON disclosure, legacy residue.
- **Segurança:** S-01…S-03 — domain guard, reconcile binding, IDOR verification.

## 9. Necessity demonstrated (per §4 "não substituir a arquitectura sem demonstrar a necessidade")

The audit demonstrates the required changes are **necessary and bounded**, not a rewrite:
1. Add a **server-side `active_candidate` binding** to the session (schema + Rust decision + API) — the current email-only session cannot express "one operator per session".
2. Replace the **hardcoded, drifted TS registry** in the validation tab with the **canonical Rust registry / `/operators`** source (a read path; no new engine).
3. Add **version/profile/environment** to the implementation model, sourced from the **canonical Rust supported sets** (no TS arrays).
4. Wire **onboarding→validation** through the same registry/journey (reuse; no second journey).
5. UX/i18n/a11y fixes (labels, human states, progressive disclosure, truncation-copy, mobile).

**Explicitly preserved / untouched:** the deterministic nine-stage journey + engines, the Rust security core (OTP/session/state-machine/origin-proof/rate-limit), the existing Banzami candidate + Banzami Sandbox + `sandbox-operator.banzami.com` + valid challenge, Operador Zero canonical entry, the public Technical Registry semantics, the Home, the Whitepaper. No KYB/AML/funds/passkeys/magic-links/API-keys/new-origin-method/new-engine/new-journey (all out of scope per the charter).

---

*This is the M2.19G.3B Gate-inicial deliverable. Design docs (one-operator-per-session, multi-implementation onboarding, dynamic registry selection) and implementation follow, ending at the §43 visual/functional human-approval gate before any merge or deploy.*
