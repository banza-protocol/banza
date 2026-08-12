# M2.19G — SVG Rebuild

**The 12 rewrites, 2 new diagrams, 8 deletions and the registry update**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`
**Files:** `website/public/diagrams/protocol/*.svg`, `docs/reference/BANZA_SVG_REGISTRY.md`

M2.19G realigned the public protocol diagram family to the three-layer / L2 model. Every diagram now speaks
the current architecture; no diagram presents a retired concept (central emission authority, per-operator
credential, four/five layers, BanzAI as a layer, Validation Workbench, the 7-step journey, Operador Zero as
a simulator, an interactive ledger, score-as-certification, or L0–L4 as certification levels). **Rust
decides; Qwen explains** is stated on the authority diagrams.

Net change: **12 rewritten (id + filename preserved), 2 new, 8 deleted.**

---

## 1. Twelve rewrites (id + file kept)

| SVG id | File | What changed |
|---|---|---|
| **SVG-P-057** | `banza-protocol-architecture-overview-v1.svg` | **Flagship** — rebuilt into the operator-neutral **three-layer institutional overview** (title: "Arquitectura institucional do BANZA em três camadas"). L1 Protocolo / L2 Certificação / L3 Esquema Operacional (designated operator, regulatory prep, real money off); BanzAI transversal, not a 4th layer/authority; "o Rust compreende, encaminha, executa, valida e decide; o Qwen explica uma vez e nunca decide"; the three-determinations non-propagation. (+157 lines) |
| SVG-P-071 | `banza-protocol-architecture-v1.svg` | Three-layer note + Rust/Qwen authority rule. |
| SVG-P-073 | `banzai-operator-journey.svg` | Nine canonical steps (Descoberta → Manifesto → Chaves → Conformidade → Interoperabilidade → Confiança → Federação → Evidência → Prontidão), label alignment. |
| SVG-P-040 | `banza-operators-v1.svg` | L0–L4 recast as **conformance scopes**, not certification levels. |
| SVG-P-041 | `banza-operator-l0-endpoints-v1.svg` | L0 framed as a **sandbox scope**. |
| SVG-P-044 | `banza-reference-operator-v1.svg` | Footer L0–L4 recast as scopes. |
| SVG-P-050 | `banza-roadmap-m1-m6-v1.svg` | Legacy "Estúdio de Validação" removed; M4 marked complete. |
| SVG-P-078 | `postgresql-service-access-v1.svg` | The `/certificates` route removed. |
| SVG-P-031 | `banza-trust-v1.svg` | "cinco camadas" corrected — five trust **levels**, not layers (was in `<desc>`). |
| SVG-P-038 | `banza-federation-v1.svg` | Absolute "sem acordos bilaterais" qualified to "sem acordos bilaterais prévios entre pares". |
| SVG-P-054 | `banza-controlled-federation-gate-v1.svg` | L3+ recast as a conformance scope. |
| SVG-P-029 | `banza-certification-v1.svg` | L0–L4 recast as conformance scope. |

---

## 2. Two new diagrams

| SVG id | File | Subject | Sources |
|---|---|---|---|
| **SVG-P-092** | `certification-emission-registry-v1.svg` | **Emission & certification lifecycle (L2)** — title "Emissão e ciclo de vida do certificado de conformidade (L2)". The emission flow Prontidão → Certification Engine (`banza-conformance`, Rust) → Certification Record (scope · validity · `record_hash`) → Technical Registry (`/operators`), plus the **closed ADR-066 state machine** (`NOT_CERTIFIED` fail-closed default, `CERTIFIED` the only valid state, `EXPIRED`, `SUSPENDED`, `SUPERSEDED`, `REVOKED` terminal). Decided in Rust only; no authority "emits" the certificate; no L2 transition propagates to admission (L3) or the regulator. | ADR-064/065/066/061 |
| **SVG-P-093** | `certification-admission-authorisation-v1.svg` | **Three distinct determinations** — title "Três determinações distintas — certificado, admissão e autorização". Technical Certificate (L2, Rust engines / BANZA governance) ≠ Scheme Admission (L3, the operational scheme) ≠ Regulatory Authorisation (competent regulator, outside the protocol); three distinct owners; state does not propagate in any direction; being in the Technical Registry is never "admitted" nor "authorised"; BANZA issues no licences and authorises no financial activity. | ADR-061 |

Both are registered CANONICAL and served from `website/public/diagrams/protocol/`; both map to reference §7.

---

## 3. Eight deletions (retired simulator diagrams)

The Operador Zero simulator diagram set was removed — it carried simulador / mutable ledger / `100/100` /
`PASS demo` / negative-flow-execution framing that ADR-067 retires. The clean v2 read-only set
(SVG-P-088/089/090/091: validation-target, separation-of-responsibilities, 9-step validation journey,
proof-chain) supersedes it.

| SVG id | Deleted file |
|---|---|
| SVG-P-079 | `operador-zero-architecture-v1.svg` |
| SVG-P-080 | `operador-zero-e2e-journey-v1.svg` |
| SVG-P-081 | `operador-zero-negative-flow-v1.svg` |
| SVG-P-082 | `operador-zero-ledger-kzdemo-v1.svg` |
| SVG-P-083 | `operador-zero-architecture-mono-v1.svg` |
| SVG-P-084 | `operador-zero-e2e-journey-mono-v1.svg` |
| SVG-P-085 | `operador-zero-ledger-mono-v1.svg` |
| SVG-P-086 | `operador-zero-negative-flow-mono-v1.svg` |

> Reconciliation with Gate-0: `svg-inventory.json` *planned* REWRITE 12 · REPLACE 3 · DELETE 5. In
> execution the 3 "REPLACE" diagrams were deleted rather than superseded in place — the v2 read-only set
> already covers their content — so the executed result is **12 rewrites, 2 new, 8 deletions**.

---

## 4. Registry update (`docs/reference/BANZA_SVG_REGISTRY.md`)

- SVG-P-079..086 struck through and marked **RETIRADO (M2.19G §29)**, each with a one-line reason and the
  v2 replacement (e.g. "substituído por SVG-P-090 (jornada de validação de nove passos, sem score)").
- A new **§29 — "Alinhamento dos diagramas à arquitectura canónica em três camadas"** section documents the
  realignment: the three layers, the 9-step journey, the emission → registry state machine, and the
  cert ≠ admission ≠ authorisation separation, with the explicit list of retired concepts no diagram now
  presents, followed by the list of 12 rewrites (id + file kept) and a table registering SVG-P-092 and
  SVG-P-093 as CANONICAL.
- The v2 Operador Zero note updated: "substituem os diagramas antigos do simulador (SVG-P-079..086,
  **retirados em M2.19G §29**)".

The identity/contamination allowlist for the operator-neutral flagship SVG-P-057 was extended so the
three-layer overview passes the SVG and identity guards while remaining operator-neutral (L1/L2 name no
operator; L3 names Banzami only as the designated scheme operator).

---

## Verdict

The public diagram family now depicts the three-layer architecture, the 9-step validation journey, the L2
emission → registry state machine and the three-determinations separation. The flagship overview is
operator-neutral three layers; two new diagrams own the certification-lifecycle and the
cert ≠ admission ≠ authorisation concepts; the eight simulator diagrams are gone and the registry records
each retirement and each addition.
