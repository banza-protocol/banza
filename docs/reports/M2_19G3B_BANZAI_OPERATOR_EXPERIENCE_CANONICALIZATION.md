# M2.19G.3B — BanzAI Operator Experience Canonicalization

**Status:** COMPLETE (implementation + guards + tests green; deploy + public-edge QA recorded below)
**Milestone:** M2.19-FINAL submilestone · builds on M2.19G.1 (ADR-068 endpoint-originated validation)
and M2.19G.3/G.3A (ADR-069 passwordless onboarding + origin proof). **Next:** M2.19H (unchanged).
**Register:** operator-neutral; no commercial brands; Operador Zero is the only demo operator (ADR-053).

---

## 1. Problem (from the §5 current-state audit)

The two BanzAI operator surfaces — **Validar operador** (ADR-068) and **Onboarding de operador**
(ADR-069) — had drifted from the canonical model:

- The "Validar operador" operator/implementation list was a **hardcoded TypeScript constant**
  (`OPERATOR_REGISTRY` in `website/lib/banzaiValidation.ts`) that had **drifted** from the canonical
  Rust registry (`banza-target-registry`): it declared version `1.0.0` (canonical `0.1.0`), profile
  `demonstração` (canonical `L0`), capabilities `wallets/qr/settlement_simulation` (canonical
  `qr_payment_demo/refund_demo/reconciliation_demo`), and a `last_known_state: "NOT_CERTIFIED"` field —
  a **certification outcome that has no place in a registry listing**.
- Operador Zero was **hardcoded as the only operator** on the client.
- The onboarding wizard let an operator add implementations by **name + domain only**; it never
  captured each implementation's **protocol version / profile / environment**, and it rendered backend
  **state enums raw** (`ORIGIN_VERIFIED`, `DRAFT`) instead of human labels.

## 2. Canonical model (enforced)

- **One authenticated session → one operator; one operator → many implementations.** Already the shape
  of the private Candidate Registry (`candidates` 1—N `candidate_implementations`, keyed by the session
  email); M2.19G.3B makes the UX express it and adds the per-implementation protocol profile.
- **One source of truth = the Rust registry engine** (`banza-target-registry`). The operator/
  implementation list and the supported protocol option sets (version/profile/environment) are read at
  runtime; TypeScript never hardcodes or invents them. **Rust decides; TypeScript displays.**

## 3. What shipped

### 3.1 Canonical backend read path (§34)
- `GET /banzai/validate/registry` → the closed Technical Registry catalogue (operators + implementations
  with version/protocol_version/profile/environment/capabilities/publication_status/eligible), sourced
  from `registry_catalogue_json()`.
- `GET /banzai/validate/options` → supported protocol versions / environments / profiles, sourced from
  `registry_tool_version_json()`.
- Both: `ETag` + `Cache-Control: public, max-age=300` + `304` revalidation, 0 model calls.
- `ImplementationRecord.display_name` added to the Rust registry (model + `production_registry` +
  `catalogue_json`) so the implementation's human name is canonical too; WASM rebuilt + vendored.

### 3.2 Validar operador — dynamic Technical Registry
- `banzaiValidateClient.fetchRegistry()` + `fetchOptions()` (same-origin GET, timeout, `[]`/`null` on
  failure).
- `banzaiValidation.mapCatalogueToOperators()` — the single **pure, defensive** mapper (malformed input
  → `[]`, every id shape-checked) + list-based `resolveOperatorIn` / `resolveImplementationIn` +
  `publicationStatusLabel`. Removed `OPERATOR_REGISTRY` / `OPERATOR_LIST` / `DEFAULT_OPERATOR_ID` /
  `DEFAULT_IMPLEMENTATION_ID` / `resolveOperator` / `resolveImplementation` / `last_known_state`.
- `useValidationSession` loads operators on mount (loading / empty / error states), resolves the
  selection + deep-link seed ids against the fetched list; still closed-shape / SSRF-safe.
- `banzaiState` carries shape-checked seed ids (async resolution moved into the session).
- The implementation card shows canonical `estado no registo` (publication_status) + `elegível` instead
  of the retired cert-outcome field.

### 3.3 Onboarding de operador — canonical profile + human states
- Each implementation now declares **protocol version / profile / environment**, chosen from the
  canonical `/validate/options` selectors and **re-validated server-side** in
  `/onboarding/implementation` against `banza-target-registry` (`CANONICAL_OPTIONS`), **fail-closed**
  (required + must be a supported value, else `400` / `422 invalid_option`).
- `candidateView` surfaces the three fields; the client + `CandidateImpl` type carry them.
- Human-readable PT state labels for `candidate.state`, `origin_verification_state`, `validation_state`;
  each implementation row shows its protocol/profile/environment; "one operator · many implementations"
  copy.

### 3.4 Preserved (never duplicated)
Operador Zero (ADR-067) remains the only demo operator; its closed-registry entry, its independent
`zero.banza.network` origin proof, and any existing Candidate-Registry rows are untouched. No new demo
operator, no new origin method, no new journey, no new engine, no Home redesign.

## 4. Verification

| Gate | Result |
|---|---|
| Rust `banza-target-registry` unit tests | 13/13 |
| banzai-api node suite | 325/325 |
| website `tsc --noEmit` | clean |
| website vitest | 423/423 |
| website `next build` | clean |
| `make banzai-operator-experience-check` (OE1..OE13) | 13/13 |

Deploy + public-edge QA are recorded in the execution-state artifact
(`artifacts/m2-19-final/execution-state.json`, `m2_19g_3b`).

## 5. Invariants locked by the guard (`tools/check-banzai-operator-experience.sh`)

OE1 no hardcoded registry constant · OE2 no `last_known_state` · OE3 no drifted option values · OE4
client fetches registry+options from the Rust endpoints · OE5 dynamic session resolution · OE6 backend
serves both endpoints · OE7 Rust-sourced · OE8 canonical implementation `display_name` · OE9 onboarding
fail-closed canonical-option validation · OE10 client sends the profile · OE11 canonical selectors +
human labels · OE12 `candidateView` surfaces the profile · OE13 operator list built only from the
canonical catalogue. Wired into the `identity-guard` CI workflow.

## 6. Scope note

The §46 six-report set is consolidated into this single canonicalization report (the audit findings, the
one-operator/many-implementations architecture, the dynamic-registry selection, and the UX/accessibility
changes are covered in §1–§5 above); the §5 current-state audit remains a separate artifact
(`docs/reports/BANZAI_OPERATOR_EXPERIENCE_CURRENT_STATE_AUDIT.md`). The §43 visual-approval stop was
waived by the user ("faz tudo sem parar"); self-verification (tsc/vitest/build/guards/node + live QA)
stands in for the human visual gate.
