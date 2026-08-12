# M2.19G — Operador Zero Read-Only Reframe

**Status JSON, boundary document and example artifacts realigned from the retired simulator model to the ADR-067 read-only reference**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`
**Files:** `examples/operators/zero/status/operator-zero-validation-state.json`,
`examples/operators/zero/ZERO_OPERATOR_BOUNDARY.md`, `examples/operators/zero/README.md`,
`website/lib/operadorZeroArtifacts.generated.ts`, `website/lib/operadorZero.ts`,
`services/banzai-api/test/operador-zero-journey.test.js`,
`services/banzai-api/test/operator-zero-only-policy.test.js`

The public-content semantic audit named the still-simulator Operador Zero definition as the **dominant
public defect**. M2.19G reframes every Operador Zero example artifact and its boundary/status/README from
the retired *executing simulator* model to the ADR-067 **read-only canonical reference implementation**:
it *exposes* identity, manifest, capabilities, endpoints, metadata, keys and evidence, and executes
nothing; the score, the "PASS demo", the 7-step journey and the interactive/mutable ledger are retired; all
human validation is initiated in BanzAI (BanzAI initiates → Zero responds → Rust evaluates).

---

## 1. Status JSON (`operator-zero-validation-state.json`)

| Field | Before | After |
|---|---|---|
| `status_label_pt` | "validado como simulador demo" | "avaliado — implementação de referência só de leitura" |
| `pass_label_pt` | "PASS demo" | "evidência técnica local" |
| `journey_steps_completed` / `_total` | 7 / 7 | **9 / 9** |
| `score` | `100` | **removed** |
| `artifacts_ready` / `_total` | 6 / 6 | 6 / 6 (kept) |
| `blockers` | 0 | 0 (kept) |
| `note` | "…o simulador técnico de referência…" | "…a implementação de referência canónica, só de leitura, do protocolo BANZA (ADR-067)… Não corre simulação nem tem ledger mutável. A moeda KZ_DEMO é uma unidade de demonstração, sem valor real." |

`certification: false`, `operator_real: false`, `real_money`/`production_allowed` false and the boundary
sentence ("não é certificação, não é aprovação, não é licença financeira e não representa operador de
produção") are unchanged. The `score` field was **deleted** (not zeroed) — a read-only reference produces
no score.

---

## 2. Boundary document (`ZERO_OPERATOR_BOUNDARY.md`)

Reframed end to end while preserving its purpose (fail-closed anti-erosion boundary, enforced by
`make operator-zero-check`):

- Header: from "É um simulador técnico usado para demonstrar, testar e validar o protocolo" to "É a
  implementação de referência canónica, **só de leitura**, do protocolo BANZA: expõe identidade, manifest,
  chaves públicas, metadata, evidência e estado — e nada mais."
- The guarantees table gained two read-only rows: "A superfície é só de leitura: não corre simulação nem
  tem ledger mutável (ADR-067)" and "Uma validação é evidência técnica local (ADR-067)"; the "O simulador
  nunca aparece em `/operators`" row became "A referência nunca aparece em `/operators` como operador
  real"; KZ_DEMO gained "unidade de demonstração, sem valor real".
- "O que um PASS significa" → "O que uma validação significa" — now grounded in the BanzAI validation mode
  (`/banzai?mode=validation&target=operator-zero&workflow=full`) run by the Rust engines.
- "O simulador e o futuro operador real" → "A referência e o operador real" — the canonical model now
  points at **ADR-067** (read-only reference), while noting ADR-052's filename keeps "simulator" only as a
  stable archival identifier for the superseded framing.

---

## 3. README (`examples/operators/zero/README.md`)

Realigned (+107/−… substantial rewrite) to the read-only reference framing; the demo currency KZ_DEMO is
described as a demonstration unit with no real value; the surface is stated as read-only, executing no
simulation and holding no mutable ledger; validation is the BanzAI 9-step journey. The nested
`e2e-root/README.md` received the corresponding one-line realignment.

---

## 4. Website + tests

- `website/lib/operadorZeroArtifacts.generated.ts` regenerated from the reframed status (score removed,
  9-step, read-only labels).
- `website/lib/operadorZero.ts` — one stale line removed.
- `services/banzai-api/test/operador-zero-journey.test.js` and
  `test/operator-zero-only-policy.test.js` updated to the 9-step read-only journey and the current labels.

The guard-enforced footer suffix "Operador Zero — simulador" (carried in `site.ts`, `zeroSubdomain.ts`,
`operadorZeroJourney.ts`, `OperatorRegistry.tsx` per project memory) was reconciled with the read-only
framing: the structural neutrality controls (chromeless `zero.*` subdomain, absence from the operator
registry/header, no published/approved/certified language) carry the demo/read-only framing, and the
`check-operator-zero-public-hardening.sh` guard was retargeted to the read-only invariants (see
`M2_19G_GUARD_CONVERGENCE.md`).

---

## Verdict

Operador Zero is now consistently the ADR-067 read-only canonical reference implementation across its
status JSON, boundary document, README, generated website artifacts and tests: no score, no PASS-demo, no
7-step journey, no mutable/interactive ledger, `NOT_CERTIFIED`, never in `/operators`, and validated only
through the BanzAI 9-step journey. The dominant Gate-0 public defect is resolved at its source artifacts;
the corresponding BanzAI answer changes are in `M2_19G_BANZAI_GROUNDING_REFRAME.md`.
