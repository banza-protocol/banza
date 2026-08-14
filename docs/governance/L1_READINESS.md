# L1 Readiness — Technical Preparation (BanzAI)

> **L1 Readiness é preparação técnica. Não é certificação, não é aprovação e não cria operador. A
> conformidade é demonstrada por evidência verificável, nunca concedida por uma autoridade.**

L1 readiness is the BanzAI view of the **L0-demo → L1-technical-preparation** transition. It
tells an independent operator whether the minimum technical artifacts are *structured and internally
consistent* to be assembled into verifiable conformance evidence. It attains nothing: L1 conformance is
**demonstrated by verifiable conformance evidence that any party can independently reproduce**, never
awarded by an authority.

Engine: [`engines/banza-l1-readiness`](../../engines/banza-l1-readiness) (Rust → WASM). Everything below
— per-artifact verdicts, the aggregate status, readiness, the endpoint contract and the report hash — is
computed in Rust. The TypeScript adapter (`website/lib/banzaL1Readiness.ts`) only loads the WASM and
marshals JSON; it decides nothing.

## Artifacts

**Required** (a missing one → `L1_INCOMPLETE`; an invalid one → a specific blocker):

| Artifact | Source tool | Blocker if invalid |
|---|---|---|
| `operator_manifest` | Operator Manifest Validator | `L1_BLOCKED_BY_MANIFEST` |
| `simb_pre_review` | SimB pre-review | `L1_BLOCKED_BY_SIMB` |
| `conformance_l0` | Conformidade L0 | `L1_BLOCKED_BY_L0` |
| `key_manifest` | Trust & BRL | `L1_BLOCKED_BY_TRUST` |
| `certificates` | Certificates document | `L1_INVALID` if it claims production/active |
| `brl` | Trust & BRL | `L1_BLOCKED_BY_TRUST` |

**Recommended** (absence → warning, never a blocker): `conformance_evidence`, `evidence_bundle`,
`well_known`.

## Well-known endpoints (path contract, no network)

The paths an operator candidate is expected to expose. They are verified here **by contract** — the tool
never fetches a URL. Operator-URL validation is a future phase and will require explicit confirmation.

```
/.well-known/banza/operator.json      → Operator Manifest
/.well-known/banza/key-manifest.json  → Key Manifest (raiz de confiança)
/certificates                         → Certificates document
/federation/revocation-list.json      → BRL (revogação)
/conformance/evidence                 → Conformance evidence
```

## Status (Rust-computed, in precedence order)

| Status | Meaning |
|---|---|
| `L1_INVALID` | An artifact claims production/certification — boundary violation. |
| `L1_BLOCKED_BY_MANIFEST` | Operator Manifest is invalid. |
| `L1_BLOCKED_BY_SIMB` | SimB pre-review did not PASS. |
| `L1_BLOCKED_BY_L0` | Conformidade L0 did not PASS. |
| `L1_BLOCKED_BY_TRUST` | Key manifest or BRL missing/invalid. |
| `L1_INCOMPLETE` | A required artifact is missing. |
| `L1_READY_FOR_TECHNICAL_REVIEW` | Minimum artifacts present, consistent and non-production. |

`L1_READY_FOR_TECHNICAL_REVIEW` means *ready to be reviewed*, not *reviewed* and not *certified*. The
report always carries `not_a_certificate: true`, `not_an_approval: true`,
`does_not_create_operator: true`, `requires_conformance_evidence_review: true`, `llm_calls: 0`,
`external_model_called: false`, `test_only: true`.

## Where it appears

- **Conformidade** — the `Preparação L1` section: checklist, fixture selector, "Validar readiness L1"
  and "Usar estado actual" (feeds the live manifest/SimB/L0 into the aggregator).
- **Programadores** — the `Well-known endpoints` section: the path contract, an example structure, and a
  disabled URL field (validation by URL is a future phase).
- **Evidence Bundle** — the `L1 readiness report` recommended artifact.
- **Assistente** — the `l1_readiness` knowledge intent explains all of the above.

See the phase report:
.
