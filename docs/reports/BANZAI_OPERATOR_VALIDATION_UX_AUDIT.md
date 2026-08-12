# BanzAI Operator-Validation UX Audit (M2.19G.1 §8)

Read-only audit of the BanzAI interface (`/banzai`) ahead of the rebuild toward **endpoint-originated operator validation**. Every claim below is anchored to `file:line`. Nothing was modified; the only writes are this report and the companion `artifacts/m2-19g1/banzai-operator-validation-audit.json`.

Branch: `release/m2-19g1-endpoint-originated-operator-validation`.

---

## 1. Headline findings

1. **The official journey consumes ZERO endpoint-originated data.** The 9-step validation mode has no paste/upload/URL widgets — but it reads **bundled fixtures and precomputed Operador Zero artifacts** for every step. `target.artifacts_base = "https://zero.banza.network"` is declared (`website/lib/banzaiValidation.ts:32`) and **never fetched**; the journey reads `readArtifact()` from a vendored blob instead (`website/lib/operadorZero.ts:44`, generated in `operadorZeroArtifacts.generated.ts:12`). Confirmed: no `fetch`/`XHR` anywhere in `validationJourney.tsx` or `BanzaiValidationMode.tsx`.
2. **All manual-input surfaces live in the sibling ask-mode analysers** (the "Resultados" tabs), which **duplicate** the journey's subject matter (manifest, conformance, trust, federation, evidence). These are the paste/upload/fixture surfaces that must move to developer tools.
3. **One final verdict is authored in TypeScript** — step 9 "Certification Readiness" (`computed_in: "typescript-aggregation"`, `validationJourney.tsx:549-600`). Qwen decides **nothing** (every receipt is `qwen_calls: 0, external_calls: 0`).
4. **The sidebar carries two competing progress models, orphan tabs, relabelled tabs, and receipts shown three times.**

---

## 2. Current sidebar / tab structure

Rendered by `BanzaiAgent.tsx:2988-3047`; data in `banzai-agent.ts:71-105`.

```
MODOS                         (banzai-agent.ts:71 MODES)
  • Perguntar ao BanzAI        → ask mode          (chat)
  • Validar uma implementação  → validation mode   (9-step journey)

JORNADA DE VALIDAÇÃO           (validation mode only — BanzaiAgent.tsx:3014)
  1 Discovery  2 Manifest  3 Keys  4 Conformance  5 Interoperability
  6 Trust      7 Federation 8 Evidence Bundle  9 Certification Readiness
                               (ValidationStepNav — BanzaiValidationMode.tsx:67)

RECURSOS                       (TABS group "recursos" — banzai-agent.ts:97-99)
  • Guia          → GuiaPanel
  • Referência    → RfcPanel
  • Programadores → ProgramadoresPanel
  • Repositório   → external GitHub link (BanzaiAgent.tsx:3023)

RESULTADOS                     (TABS group "resultados" — banzai-agent.ts:100-104)
  • Receipts        → ValidationReceiptsPanel
  • Relatórios      → ConformidadePanel     (panel title says "Conformidade")
  • Traces          → TracesPanel
  • Artefactos      → ManifestPanel         (panel title says "Manifest")
  • Evidence Bundle → EvidencePanel
```

**Hidden / not in the sidebar** but still renderable via `renderPanel` (`BanzaiAgent.tsx:2923-2937`) and reachable through cross-links:

- `trust` → **TrustPanel** (title "Trust") — reached via `GuiaPanel` GUIA_FIRST (`BanzaiAgent.tsx:2636`).
- `simb` → **SimbPanel** (title "Federação") — reached via `SimbPrereqBlock`/`onGoSimb` (`BanzaiAgent.tsx:1805,2929`).
- `assistente` → the chat (the default in ask mode).

### Naming inconsistencies (label vs panel title)

`TAB_META` (`banzai-agent.ts:79-91`) relabels tabs so the sidebar and the panel disagree:

| Sidebar label | Opens panel titled | Source |
|---|---|---|
| Relatórios | **Conformidade** | `banzai-agent.ts:85` vs `BanzaiAgent.tsx:1350` |
| Artefactos | **Manifest** | `banzai-agent.ts:87` vs `BanzaiAgent.tsx:2625` |
| Federação (hidden) | **Federação** / SimB | `banzai-agent.ts:90` |

---

## 3. Manual-input surfaces (exact `file:line`)

The **official 9-step journey has none** — but the interface as a whole exposes the following manual surfaces, all in ask-mode analysers that overlap the journey:

### 3.1 File pickers — `JsonUpload` component (`BanzaiAgent.tsx:236`), used 6×
- `manifest` — `BanzaiAgent.tsx:2527` (ManifestValidator)
- `conformidade` — `BanzaiAgent.tsx:1356` (ConformidadePanel)
- `trust` — `BanzaiAgent.tsx:1631` (TrustPanel)
- `federacao` — `BanzaiAgent.tsx:1889` (SimbPanel)
- `evidence_bundle` — `BanzaiAgent.tsx:2141` (EvidencePanel)
- `traces` — `BanzaiAgent.tsx:2340` (TracesPanel)

The upload is explicitly self-described as **"Modo avançado. Não é exemplo oficial."** (`BanzaiAgent.tsx:291`), guarded by the Rust `scanUpload` gate (`BanzaiAgent.tsx:261`), in-memory only (`uploads` store, `BanzaiAgent.tsx:2788`). No drag-drop anywhere.

### 3.2 Textareas (paste)
- ManifestValidator manifest JSON — `BanzaiAgent.tsx:2510`
- TracesPanel trace JSON — `BanzaiAgent.tsx:2330`
- (Ask input textarea — `BanzaiAgent.tsx:3248` — belongs to the conversation, not a validation surface.)

### 3.3 URL input (disabled)
- WellKnownEndpoints `<input type="url" disabled>` — `BanzaiAgent.tsx:498`, with the note *"Validação por URL será uma fase futura e exigirá confirmação explícita."* (`:501`). This is the vestigial placeholder for the endpoint-origin path the rebuild must actually build. Parallel "endpoint … desactivado" rows exist in PaymentFlowL2 (`:680-684`), FederationL3 (`:868-872`), InteropL4 (`:1063-1067`).

### 3.4 Fixture-loader selectors (11)
`ConformidadePanel` FONTE L0 (`:1362`), `ManifestValidator` cenários (`:2501`), `TrustPanel` EXEMPLOS (`:1639`), `SimbPanel` cenários (`:1898`), `TracesPanel` EXEMPLOS (`:2315`), `L1Preparation` (`:430`), `L2Preparation` (`:607`), `L3Preparation` (`:795`), `L4Preparation` (~`:945`), `AssurancePanel` (`:1136`), `DeepAssurancePanel` (`:1240`).

---

## 4. Fixtures / mocks used AS official evidence (the core problem)

Inside the **official journey** (`validationJourney.tsx`):

| Step | Runner | Data origin | Evidence |
|---|---|---|---|
| 1 Discovery | `runDiscovery` :184 | **precomputed** `readArtifact()` | bundled manifest/federation/key |
| 2 Manifest | `runManifest` :232 | **precomputed** `readArtifact()` | bundled manifest |
| 3 Keys | `runKeys` :268 | **fixture** `loadTrustFixtures()[0]` | trust fixture substituted for real key material (explicit comment :273-276) |
| 4 Conformance | `runConformance` :306 | **fixture** scenario `valid_l0` | `runL0Demo({scenario:"valid_l0"})` :308 |
| 5 Interoperability | `runInteroperability` :341 | **fixture** `loadL2Fixtures` + SimB | :345-357 |
| 6 Trust | `runTrust` :398 | **fixture** `loadTrustFixtures()[0]` | :401-403 |
| 7 Federation | `runFederation` :435 | **fixture** `loadL3Fixtures` + SimB demo | :440-452 |
| 8 Evidence | `runEvidence` :488 | **precomputed** built + bundled compare | :488-524 |
| 9 Certification | `runCertification` :549 | **none** (TS aggregation) | hardcoded NOT_CERTIFIED |

**Operador Zero bypasses:**
1. `artifacts_base` declared but never fetched — bundled `readArtifact()` used instead.
2. `runKeys`/`runTrust` substitute Rust trust **fixtures** for the operator's published key material.
3. `runCertification` hardcodes `demo_only`/`production_allowed=false` (`:561-582`) regardless of step verdicts.

Mock generators on the public surface: `runSimbFederationDemo` / `runSimbScenario` (local simulator), `demoBundle` (`BanzaiAgent.tsx:2086`).

---

## 5. Duplication / orphan / non-actionable areas

### 5.1 Duplicate navigation (journey step ↔ Resultados tab)
- Manifest: step 2 (`validationJourney.tsx:232`) ↔ "Artefactos"/ManifestPanel (`BanzaiAgent.tsx:2926`).
- Conformance: step 4 (`:306`) ↔ "Relatórios"/ConformidadePanel (`:2927`).
- Trust: steps 3+6 (`:268,398`) ↔ Trust tab (`:2928`, orphan).
- Federation: step 7 (`:435`) ↔ "Federação"/SimbPanel (`:2929`, orphan).
- Evidence: step 8 (`:488`) ↔ "Evidence Bundle"/EvidencePanel (`:2930`).

### 5.2 Orphan tabs (2)
`trust` and `simb` are in `TAB_META`/`renderPanel` but **absent from the `TABS` sidebar list** (`banzai-agent.ts:96-105`). Reachable only via cross-links.

### 5.3 A second, competing progress model
`PreReviewFlow` (`BanzaiAgent.tsx:1763`) draws its own "PRÉ-REVISÃO OBRIGATÓRIA" SimB→L0→Evidence→Publish strip, with `SimbPrereqBlock` (`:1792`) and `ManifestPrereqBlock` (`:1813`) gating cross-links — a parallel mini-journey competing with the 9-step journey. Recommend deletion.

### 5.4 Non-actionable controls (5)
Disabled URL input (`:498`); three "endpoint desactivado" rows (`:680,:868,:1063`); "Preparar Evidence Bundle (em preparação)" button (`:1461`).

### 5.5 A second session store
Ask-mode holds ~18 report `useState` slots (`BanzaiAgent.tsx:2765-2781`) **separate** from `useValidationSession`. This is a duplicate results store that drives the redundant right-panel context (§6).

---

## 6. Results / receipts / artifacts / evidence shown more than once

### 6.1 Receipts (3 views)
- ValidationWorkspace "Painel técnico (recibo)" + raw JSON — `BanzaiValidationMode.tsx:251-275`.
- ValidationContextPanel `RECEIPTS` section — `:437-457`.
- ValidationReceiptsPanel (Receipts tab) — `:477-534`.

`JourneyReceipt` is likewise shown in the workspace (`:278`), the Receipts tab (`:497`) and echoed as `request_id` in the context panel (`:450`).

### 6.2 Right-panel context vs header (validation mode)
`ValidationHeader` shows an 8-field metadata grid + overall badge (`BanzaiValidationMode.tsx:139-148,127`). `ValidationContextPanel` **restates** the same TARGET + PROGRESSO (`:367-396`). Two surfaces, one dataset.

### 6.3 Ask-mode right-panel restatements (redundant context, ~6)
For each analyser tab the right panel restates the panel's own body: traces (`BanzaiAgent.tsx:3294`), trust (`:3323`), simb (`:3350`), conformidade (`:3375`), evidence (`:3400`), manifest (`:3426`). Plus repeated FRONTEIRA/ESTADO boundary blocks (`:3458,:3466`) and the many per-panel `StatusNote` boundary lines.

### 6.4 Evidence / artifacts
Manifest artifact: journey discovery+manifest steps **and** ManifestValidator. Evidence Bundle: journey evidence step **and** EvidencePanel **and** Receipts. Key material: journey keys+trust steps **and** TrustPanel.

---

## 7. Non-contextual actions

- **"Executar esta etapa"** (`BanzaiValidationMode.tsx:194`) stays the **primary** button (bordo, sparkle icon) even after the step is `VERIFIED`/`FAILED`; there is no relabel to "Re-executar" / "Próxima etapa" / "Ver evidência". After a run the natural next action is not surfaced as primary.
- Per-step **"Ver recibo" / "Exportar recibo"** (`:200-208`) duplicate the Receipts tab's export — three ways to reach the same receipt.
- The header's **"Executar jornada completa" / "Executar próxima etapa" / "Reiniciar" / "Exportar JourneyReceipt"** (`:151-162`) remain uniformly enabled/disabled by `runningAll` only, not by journey state.

---

## 8. Progress language

- Overall badge renders `"{evaluated}/{total} · {STATUS}"` → e.g. **"9/9 · Bloqueado"** (`BanzaiValidationMode.tsx:127-130`). The `BLOCKED` overall comes from step 9's TS certification (`validationJourney.tsx:585`, status `"BLOCKED"`), so a fully-run demo reads as "9/9 · Bloqueado" — which looks like failure when it only means "NOT_CERTIFIED because demo". Progress ("steps evaluated") and outcome ("certification") should be separated.
- `PreReviewFlow` uses `locked`/`incomplete`/`pending`/`external` tones (`BanzaiAgent.tsx:1752-1760`) — a second, inconsistent status vocabulary alongside the journey's `VERIFIED/PENDING/FAILED/BLOCKED/NOT_EVALUATED` (`STATUS_LABEL_PT`, `validationJourney.tsx:657-663`).

---

## 9. TypeScript verdict points vs Rust vs Qwen

- **Qwen decision points: 0.** Qwen is only invoked via "Explicar no BanzAI" (`BanzaiValidationMode.tsx:197`, `explainPrompt:59`) which explains an already-computed Rust verdict. Every receipt asserts `qwen_calls: 0, external_calls: 0` (`operationReceipt.ts:34-35,53-54`).
- **Rust:** all step engines (manifest/trust/conformance/simb/l1-l4/evidence_bundle) are Rust/WASM (`website/lib/wasm/*.wasm`).
- **TypeScript verdicts (6):** `runCertification` step 9 (`validationJourney.tsx:549`); `toneToStatus` (`:167`); the `VERIFIED→PENDING` downgrade when `simb!=PASS` in `runInteroperability` (`:362`) and `runFederation` (`:457`); `runDiscovery` `recognised` MALFORMED check (`:193`); `aggregateStatus` rollup (`operationReceipt.ts:145`). The rebuild should move the certification aggregation into Rust (or make it a read-only summary) so no TS code authors a verdict.

---

## 10. Backend contract (high level)

- `services/banzai-api/src/server.js:479` — **`/ask` is the only publicly-proxied route** (nginx `location = /banzai/ask`); everything else (`/health`, `/sources`) is internal (`:490-494`).
- `services/banzai-api/src/journey.js` — a Rust-WASM state machine that **re-derives the ask-mode operator-journey context** server-side (never trusts the browser). This is the *ask-mode* journey, **distinct from the 9-step validation journey** — the naming overlap is a source of confusion.
- **Validation mode makes no backend call**: it runs the client WASM engines only. Endpoint-originated validation is therefore a **new** client/edge fetch concern, not an extension of `/ask`.

---

## 11. Desktop / tablet / mobile / a11y observations (from source)

- **Layout** (`BanzaiAgent.tsx:2988-2992`): `flex-col` stacked on small screens; `lg:` switches to a 3-column grid `[clamp(232px,20vw,288px) · minmax(0,1fr) · clamp(252px,22vw,336px)]`. Column order is reflowed with `order-*` so on mobile the workspace (`order-1`) leads, context (`order-2`) second, sidebar (`order-3`) last (`:2994,3050,3265`).
- **Scroll caps**: `max-h-[58vh]` on the workspace/scroll region for small screens, lifted at `lg:` (`:3054,:3073`). Long receipt JSON is `max-h-[26rem] overflow-auto` and focusable (`tabIndex={0}`) (`BanzaiValidationMode.tsx:272,298`).
- **a11y present**: `aria-current="step"/"page"` on nav (`BanzaiValidationMode.tsx:78`, `BanzaiAgent.tsx:2948,2968`); `role="status"` + `aria-live="polite"` on the thinking indicator with a stable sr-only announcement and `prefers-reduced-motion` handling (`BanzaiAgent.tsx:121-145`); `focus-visible:ring` throughout; `aria-label`s on inputs/receipts; `sr-only` H1 (`page.tsx:34`); `aria-pressed` on fixture pills.
- **a11y gaps**: the hidden file input is `aria-hidden + tabIndex=-1` with the visible button as the control (fine) (`BanzaiAgent.tsx:276-279`); `window.confirm` used for reset (`BanzaiValidationMode.tsx:112-113`) — not a styled/focus-trapped dialog; several status colours (ok/pend/bordo dots) convey state largely by colour with a small text label alongside — verify contrast + non-colour cues on the tiny 5–7px dots; the ~18-field mono metadata grids are dense at mobile widths.

---

## 12. Proposed target structure

```
Modos
  • Perguntar ao BanzAI        (ask — unchanged)
  • Validar operador           (the ONE official journey, endpoint-originated)

Jornada de validação           (9 steps, each fetching a PUBLISHED endpoint)
  1 Discovery … 9 Certification Readiness

Resultados                     (ONE area, sub-views — replaces the flat tab list)
  • Resumo                     (overall outcome, blockers, next action)
  • Receipts                   (the single receipt surface)
  • Relatórios                 (per-step Rust verdicts)
  • Artefactos                 (fetched artifacts + hashes)
  • Traces                     (journey trace evidence, read-only)
  • Evidence Bundle            (the fetched, validated bundle)

Recursos
  • Guia
  • Referência
  • Programadores              (home for the moved paste/upload/fixture DEVELOPER tools:
                                ManifestValidator, TracesPanel, TrustPanel, SimbPanel,
                                L1–L4 preparation, Assurance/DeepAssurance, demoBundle)
```

**Rebuild deltas implied by this audit**
1. Journey steps fetch the implementation's **published endpoints** (via `artifacts_base`); remove `readArtifact()` + fixture inputs from the official flow (`REMOVE_FROM_OFFICIAL_FLOW`).
2. Collapse the flat "Resultados" tab list into one area with the sub-views above; retire the orphan `trust`/`simb` tabs and the naming divergence.
3. Move every paste/upload/fixture analyser to **Programadores** (developer tools); delete the `PreReviewFlow` competing progress model and the second ask-mode results store.
4. De-duplicate receipts (3→1) and header-vs-context metadata (2→1).
5. Make the primary step action **contextual** (Run → Re-run/Next/View evidence).
6. Move the step-9 certification aggregation into **Rust** so no verdict is TS-authored; separate "steps evaluated" from "certification outcome" in the progress language.
7. Realise the disabled endpoint-URL control (`:498`) as the real (Operador-Zero-only, closed-registry) endpoint origin — Operador Zero validated via its **published endpoints**, not fixtures/bundled artifacts.
