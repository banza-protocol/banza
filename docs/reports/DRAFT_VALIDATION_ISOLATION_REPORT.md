# Draft Validation Tool Isolation — M2.19G.1 (ADR-068 §4.5, §17)

- **Milestone:** M2.19G.1 — Endpoint-Originated Operator Validation
- **Branch:** `release/m2-19g1-endpoint-originated-operator-validation`
- **Base commit:** `a272d32` · **ADR:** ADR-068 §4.5 / §17
- **Date:** 2026-07-30

## 1. Decision

Uploading and pasting artifacts is permitted **only** in a local developer draft tool, fully separated
from the official journey. A draft result is `DRAFT_VALIDATION_RESULT`: **local, non-authoritative, never
evidence** (ADR-068 §4.5).

## 2. Why isolation was required

The pre-rebuild audit (`docs/reports/BANZAI_OPERATOR_VALIDATION_UX_AUDIT.md` §3) found the manual-input
surfaces scattered across the ask-mode analysers that **duplicated** the journey's subject matter:
`JsonUpload` used 6× (manifest, conformidade, trust, federação, evidence_bundle, traces), paste textareas
in ManifestValidator and TracesPanel, and 11 fixture-loader selectors. These paste/upload/fixture
surfaces overlapped the official steps and could be mistaken for official verdicts. The rebuild moves
**every** manual-input surface into one isolated tool and removes them from the official flow.

## 3. Where it lives

- Component: `website/components/banzai/DraftValidationTool.tsx` ("Validar rascunho").
- Home: `website/components/banzai/ProgramadoresTools.tsx` — the **Programadores** (developer) area,
  under the `FERRAMENTAS` heading. It is never reachable from the official "Validar operador" journey.
- Copy: `DRAFT_COPY` in `website/components/banzai/banzai-agent.ts` (title, subtitle, permanent banner,
  `resultLabel: "DRAFT_VALIDATION_RESULT"`).

## 4. What it is — and is not

The draft tool accepts pasted JSON **or** an uploaded `.json` file, an artifact-type choice, and runs the
matching Rust/WASM schema/type/invariant validator locally:

| Artifact type | Engine |
|---|---|
| Operator Manifest | `banza-operator-manifest` |
| Evidence Bundle | `banza-evidence-bundle` |
| Relatório de conformidade | `banza-conformance` |
| Trust / signed metadata | `banza-trust` |
| Trace | `banzai-core` (trace verifier) |

It **never**:

- advances the journey,
- produces an official `OperationReceipt`,
- feeds the Evidence Bundle,
- yields `VERIFIED` or a Certification Readiness,
- touches endpoints, the registry, remote artifacts, evidence or certification.

It imports **nothing** from the validation session (`DraftValidationTool.tsx` header comment; no
`useValidationSession` import), so it cannot reach the official result path.

## 5. Isolation controls (source-anchored)

1. **Distinct result type.** `DraftResult.label` is the literal `"DRAFT_VALIDATION_RESULT"`
   (`DraftValidationTool.tsx:34`), rendered as the result header (`:206`).
2. **Permanent banner.** A `role="note"` banner from `DRAFT_COPY.banner` is always shown above the tool
   (`:143-147`), plus the per-result footnote: *"Resultado de rascunho. Não avança a jornada, não produz
   recibo oficial, não alimenta o Evidence Bundle e nunca devolve VERIFIED nem Prontidão de
   Certificação."* (`:224`).
3. **Explicit "oficial: não".** The result grid renders `oficial: não` (`:215`) and a "rascunho" verdict
   pill ("esquema válido (rascunho)" / "inválido (rascunho)", `:208`) — the outcome vocabulary is
   deliberately different from the journey's `VERIFIED/PENDING/FAILED/BLOCKED`.
4. **In-session only, no network.** The subheader states *"validação Rust/WASM · sem rede"* (`:139`) and
   the footnote *"O ficheiro é lido apenas nesta sessão do navegador; nada é enviado nem publicado. Não é
   exemplo oficial."* (`:199`).
5. **Upload safety gate.** Uploads are `.json`-only, non-empty, ≤ 256 kB, and pass the Rust `scanUpload`
   gate (JSON parse + secret/credential detection) before any validation runs (`:94-104`). The file
   input is a11y-annotated (`aria-hidden`, `tabIndex={-1}`, visible button as the control).

## 6. Guard coverage

`banzai-draft-validation-isolation-check` (ADR-068 §4.5/§17) asserts the tool is isolated, emits
`DRAFT_VALIDATION_RESULT`, carries the banner, lives under Programadores, and never yields
`VERIFIED`/readiness/an official receipt. Complemented by
`banzai-no-manual-input-official-flow-check` (no textarea/file-picker/drag-drop/paste/URL/fixture-loader
in the official flow) and `banzai-no-fixture-as-production-evidence-check` (no example/vendored fixture
flows into the official Evidence Bundle or a VERIFIED verdict). Upload copy is locked by the realigned
`check-banzai-upload-copy.sh`.

## 7. Result

The official journey and the draft tool share no result path (threat model M2.19G.1 trust boundary
"official journey vs draft tool"). The draft tool is a genuine developer convenience — real Rust/WASM
schema validation, in-browser, no network — that can never be mistaken for, or promoted into, an official
origin-bound verdict.
