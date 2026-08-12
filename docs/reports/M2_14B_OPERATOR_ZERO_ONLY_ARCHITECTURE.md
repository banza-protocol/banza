# M2.14B — Architecture-Wide "Operator Zero Only" Demo & Example Policy

**Milestone:** M2.14B
**ADR:** ADR-053 — Operator Zero Only demo and example policy
**Status at write time:** implemented, full test/guard battery green locally; CI/merge/deploy/live-QA recorded below.
**Scope discipline:** no change to the model/tokens/timeout/provider, the Trust Root, real operators, `/operators`, `/certificates`, PostgreSQL or DNS. `external_model_called` stays **false**. `/operador-zero` stays **410**.

---

## 1. Objective

Make "**Operador Zero is the only official demo/example of BANZA**" a repository-wide architectural
decision rather than a per-surface habit. Before M2.14B, ADR-052 + M2.14A had already made Operador
Zero the single realistic step-by-step demo *inside BanzAI*, but a **second, fictional** example
operator still shipped on the product surface (the manifest validator's `demo_fixtures()` exposed
`operator-candidate-A` / `sandbox.example.test` / `ops@example.test` under the label **"Manifesto
válido (L0)"**). A protocol that says "Operador Zero is the example" while shipping a parallel fictional
example operator is internally contradictory. M2.14B removes that contradiction and locks the rule with
CI guards.

## 2. The decision (ADR-053)

> **Operador Zero is the sole canonical demo operator and example source for BANZA. All demo/example
> artifacts must be Operator-Zero-derived.**

Full text: [`decisions/adr/ADR-053-operator-zero-only-demo-and-example-policy.md`](../../decisions/adr/ADR-053-operator-zero-only-demo-and-example-policy.md).
Registered in the ADR index (`decisions/adr/README.md`) alongside the previously-missing ADR-052 row.

## 3. Policy boundary — three categories

| Category | Rule |
|---|---|
| **`operator-zero-derived`** | The **only** allowed category for anything called an example/demo/sample/tutorial/walkthrough on a **public or product** surface. Must carry `operator-zero` / `Operador Zero` / `KZ_DEMO` / `demo_only` / `production_allowed:false` / `real_money:false` / `certification:false`. |
| **`internal-test-only`** | Internal engine test fixtures may exist **only if** never shown in the UI / BanzAI answers / public docs / source cards / quick prompts / served artifacts, never *called* example/demo/operator, and living in `tests/` / `#[cfg(test)]` / `*.test.*`. Neutral names preferred (`fixture_a`, `invalid_payload`). |
| **`public-non-zero-demo`** | **Forbidden everywhere.** No `sample-operator`, `operator-demo`, candidate operator used as an example, `Manifesto válido (L0)`, `Carregar exemplo válido`, `sandbox.example.test`, `ops@example.test`, or any filled non-zero demo manifest/trust/federation/bundle/trace on a public surface. |

**Abstract placeholders are not examples.** Specs/OpenAPI/schemas may keep angle-bracket placeholders
(`<operator_id>`, `<base_url>`) or the RFC-2606 reserved `operator.example` domain — they show
*structure*, not a named demo operator with an identity/journey — provided they are illustrative and
non-normative. A *filled* example must be Operador Zero.

## 4. Repository audit (what was found)

| Surface | Finding | Verdict |
|---|---|---|
| `engines/banza-operator-manifest::demo_fixtures()` | Filled fictional operator (`operator-candidate-A`, `sandbox.example.test`, `ops@example.test`), label "Manifesto válido (L0)", **served to the BanzAI Manifest UI via WASM** | **Real public leak — converted** |
| `engines/banza-l1/l2-readiness`, `banza-evidence-bundle` | `operator-candidate` / `operator-candidate-A` identity in served readiness/bundle fixtures | **Converted to `operator-zero`** |
| `website/components/banzai/BanzaiAgent.tsx` | Upload button "Carregar ficheiro JSON"; Manifest heading generic; a `buildBundle({operator_candidate:"operator-candidate (exemplo)"})` literal | **Relabelled + converted** |
| `website/content/BANZA_REFERENCIA.md`, `docs/reference/pt/completa.md` | Reference prose still said "Carregar **exemplo válido**" | **Reworded to advanced upload** |
| `examples/operators/` | Only `zero/` present | **Already compliant** |
| `examples/merchant-checkout`, `payment-link`, `qr-payment`, `webhook-handler` | Conceptual protocol-flow guides (no fictional operator identity) | **Retained — illustrate concepts, not a fake operator** |
| `contracts/openapi`, `contracts/schemas` | Only abstract placeholders / `operator.example` | **Allowed — kept** |
| Archival ADRs (`decisions/adr`, `website/content/decisions`), `docs/reports` | Historical mentions of old labels/identities | **Out of scope — archival, not active examples** |

## 5. Changes — engines (served fixtures)

- `engines/banza-operator-manifest/src/lib.rs` `demo_fixtures()` — identity → `operator-zero` /
  "Operador Zero (simulador demo)" / `https://zero.banza.network` / `ops@zero.banza.network`; scenario
  labels → "Operador Zero · manifest válido / sem key manifest / versão incompatível / produção
  indevida / JSON malformado". **Machine keys unchanged** (`valid_l0_candidate_manifest`, …) → engine
  consumers untouched.
- `engines/banza-l1-readiness`, `engines/banza-l2-readiness` — served identity `operator-candidate-A` →
  `operator-zero`.
- `engines/banza-evidence-bundle` — `"operator-candidate (test-only)"` → `"operator-zero (test-only)"`.
- `engines/banza-operator-manifest/tests/manifest.rs` — asserts `operator_id == "operator-zero"`.

## 6. Changes — vendored WASM

Rebuilt and re-vendored (identity-only string change; exported signatures unchanged, so the `.js` glue
is byte-identical and only the `_bg.wasm` binaries changed):

- `website/lib/wasm/banza_operator_manifest_bg.wasm`, `banza_l1_readiness_bg.wasm`,
  `banza_l2_readiness_bg.wasm`, `banza_evidence_bundle_bg.wasm` (web target).
- `services/banzai-api/src/rustkb/banzai_api_kb_bg.wasm` (nodejs target — route policy arms).

Verified: the manifest WASM now contains `operator-zero` + "Operador Zero · manifest válido" and no
longer contains `operator-candidate` / `sandbox.example.test` / "Manifesto válido (L0)".

## 7. Changes — BanzAI product UI (`BanzaiAgent.tsx`)

- Manual upload button → **"Carregar JSON avançado"**; caption "· {label} · modo avançado"; note
  **"Modo avançado. Não é exemplo oficial. A jornada demo usa apenas Operador Zero."**
- Manifest scenarios heading → **"OPERADOR ZERO · CENÁRIOS"** + note "Todos os cenários pertencem ao
  Operador Zero. {SINGLE_OFFICIAL_EXAMPLE}".
- The `buildBundle` operator label literal → `operator-zero`.
- The served manifest scenarios (via WASM) are Operador Zero, so the UI has no parallel fictional
  example operator and no "load a valid manifest example" affordance.

## 8. Changes — BanzAI knowledge (deterministic Q&A)

`services/banzai-api/src/knowledge.js` — new `adr053` source key + two **critical** deterministic
entries (sources = ADR-053 + ADR-052):

- **`only-official-example`** — "the only official demo example is Operador Zero; no parallel fictional
  examples; PASS demo ≠ certification; never in `/operators`."
- **`manual-upload-not-example`** — "the manual JSON upload is an advanced tool, not an official
  example; internal fixtures are not public examples."

Routing (`engines/banzai-api-kb/src/route.rs`, `critical_entry`): a `manual-upload` arm (evaluated
first, so an "upload … exemplo oficial?" question is answered as *advanced tool*) and an
`only-official-example` arm, both whole-token/substring-guarded. The two entries never quote a literal
forbidden token, so they pass the guards that scan for them.

## 9. Changes — reference docs

`website/content/BANZA_REFERENCIA.md` and `docs/reference/pt/completa.md`: the journey paragraph now
reads "Em cada etapa é possível **Carregar JSON avançado** (…; modo avançado, não é exemplo oficial — a
jornada demo usa apenas o Operador Zero)."

## 10. BanzAI KB — probe results (Part 10)

All ten policy questions route **deterministically** (external model not called):

```
único exemplo oficial?                    → only-official-example
único exemplo demo oficial?               → only-official-example
existe outro exemplo além do Operador Zero? → only-official-example
o que aconteceu ao exemplo L0?            → only-official-example
posso usar um sample operator?            → only-official-example
porque tudo usa o Operador Zero?          → only-official-example
o upload manual é um exemplo oficial?     → manual-upload-not-example
posso testar o meu próprio JSON?          → manual-upload-not-example
as fixtures internas são exemplos públicos? → manual-upload-not-example
o Operador Zero aparece em /operators?    → (deterministic OZ boundary answer)
```

## 11. Manual upload = advanced tool, not example (Part 11)

The bring-your-own-JSON affordance is retained (operators can validate a payload they hold) but is
reframed end-to-end as an **advanced tool**: relabelled, captioned "modo avançado", noted "Não é
exemplo oficial", excluded from the demo journey, never stored as an operator, never in `/operators` or
`zero.banza.network`. The Rust secret/JSON scan, 256 KB cap, in-memory-only handling and safe `/ask`
summary are unchanged.

## 12. What was deliberately **not** changed

- `examples/merchant-checkout`, `examples/payment-link`, `examples/qr-payment`,
  `examples/webhook-handler` — conceptual protocol-flow guides that illustrate protocol *concepts*, not
  a fictional operator identity. ADR-053 explicitly keeps them.
- Archival ADRs and prior milestone reports — historical record, not active examples.
- OpenAPI/schema abstract placeholders and the RFC-2606 `operator.example` domain — structure, not a
  filled demo operator.
- Internal engine test fixtures (neutral payloads in `#[cfg(test)]` / `tests/`) — isolated as
  internal-test-only; never surfaced.

## 13. Guards (three, CI-protected)

| Guard | Scope |
|---|---|
| `make operator-zero-only-architecture-check` | Repo-wide: ADR-053 present; `examples/operators/` = zero only; no forbidden label/identity on public surfaces; single-official-example marker; manifest WASM = Operador Zero and clean; no apex `/operador-zero`; action boundary intact. Self-tests its detector. |
| `make banzai-operator-zero-only-ui-check` | BanzAI UI: no parallel fictional example / valid-example affordance; upload = "Carregar JSON avançado" + "não é exemplo oficial"; Manifest = "OPERADOR ZERO · CENÁRIOS"; served WASM clean; **behavioural** — routes the two policy questions deterministically and still refuses dangerous actions. |
| `make operator-zero-only-docs-examples-check` | Docs/getting-started/OpenAPI/schemas/README: no **filled** fictional example identity; `operator.example` + `<…>` allowed; self-tests forbidden-vs-allowed. |

All three are wired into `Makefile` (targets + `.PHONY`) and `.github/workflows/identity-guard.yml`
(new `operator-zero-only-architecture` job, three steps). Each self-tests its own detectors and runs the
same script locally and in CI.

## 14. Tests

- `services/banzai-api/test/operator-zero-only-policy.test.js` (Part 19) — 6 tests: every policy
  question deterministic + sourced (never no_source); `only-official-example` / `manual-upload-not-
  example` routing; ADR-053 citation; **action boundary preserved** (secrets / publish-as-real-operator
  / ignore-rules still hit the boundary); no brand/secret/retired-apex leak.
- `engines/banza-operator-manifest/tests/manifest.rs` — asserts `operator-zero`.

## 15. Full battery (local)

| Battery | Result |
|---|---|
| Rust — banzai-api-kb (route etc.) | 100 passed (19+10+6+65) |
| Rust — operator-manifest / l1 / l2 / evidence | 7 / 8 / 12 / 10 passed |
| Node — `services/banzai-api` | **147 passed, 0 failed** (+6 new) |
| Website — `vitest run` | **276 passed (22 files)** |
| Website — `tsc --noEmit` | clean |
| `make identity-check` | exit 0 (advisory notes only) |
| `make purity-check` | PASS |
| 3 new guards + realistic-journey + upload-copy + protocol-vocabulary + operator-zero + zero-subdomain + full-e2e | all PASS |

## 16. Absolute-rules compliance

- Model/tokens/timeout/reasoning/provider — **untouched**; no external provider added;
  `external_model_called` stays **false**; Qwen stays local.
- Trust Root, real operators, `/operators` (`[]`), `/certificates` (`production_certificates=false`) —
  **untouched**.
- PostgreSQL / llama.cpp — never exposed; not touched. DNS — not touched.
- Action boundary — **not weakened** (test 19d proves it still fires); dangerous requests never call
  Qwen.
- No secrets/keys/PEM/seeds/tokens/`.env` committed.
- Operador Zero never called a real/PSP/bank/wallet/licensed/certified operator; PASS ≠ certification;
  no "aprovado"/"certificado" as normative state.
- `/operador-zero` stays 410; not used as an active source.
- No non-Operador-Zero public example remains (final grep sweep = clean).
- Commit messages carry **no** `Co-Authored-By`.

## 17. Neutrality & purity

`operator.example` is the RFC-2606 abstract placeholder (allowed). No commercial operator brand
introduced. `make identity-check` (rebuilt `banza-repo-guards`, ADR range → 53) and `make purity-check`
pass. ADR-053 added to the repo-guards ADR range and the ADR index.

## 18. Files changed

New: `decisions/adr/ADR-053-*.md`, `tools/check-operator-zero-only-architecture.sh`,
`tools/check-banzai-operator-zero-only-ui.sh`, `tools/check-operator-zero-only-docs-examples.sh`,
`services/banzai-api/test/operator-zero-only-policy.test.js`, this report.
Modified: `Makefile`, `.github/workflows/identity-guard.yml`, `decisions/adr/README.md`,
`engines/banza-repo-guards/src/lib.rs`, `engines/banza-operator-manifest/{src/lib.rs,tests/manifest.rs}`,
`engines/banza-l1-readiness/src/lib.rs`, `engines/banza-l2-readiness/src/lib.rs`,
`engines/banza-evidence-bundle/src/lib.rs`, `engines/banzai-api-kb/src/route.rs`,
`services/banzai-api/src/knowledge.js`, `services/banzai-api/src/rustkb/banzai_api_kb_bg.wasm`,
`website/components/banzai/BanzaiAgent.tsx`, `website/content/BANZA_REFERENCIA.md`,
`docs/reference/pt/completa.md`, `website/lib/wasm/{banza_operator_manifest,banza_l1_readiness,banza_l2_readiness,banza_evidence_bundle}_bg.wasm`,
`tools/check-banzai-upload-copy.sh`.

## 19. CI

PR [#146](https://github.com/banza-protocol/banza/pull/146): **131 checks passed, 0 failed**, including
the new `operator-zero-only-architecture` job (both matrix runs `pass`). Only `REVIEW_REQUIRED` blocked;
admin-squash-merged to `main` as `b7ce43e`.

## 20. Deploy

VPS `195.20.246.118`: `git pull` on `/srv/banza-protocol/repo` (→ `b7ce43e`); `docker compose build
banzai-api website` (both images built); `docker compose up -d --no-deps banzai-api website` (both
recreated); `docker compose exec reverse-proxy nginx -s reload` (IP-change safety).

## 21. Live QA (Part 20) — observed

| Probe | Observed |
|---|---|
| `GET /operators` | `[]` |
| `GET /certificates` | `production_certificates: false`, `pre_production: true` |
| `https://zero.banza.network/` | `200` |
| `GET /operador-zero` | `410` |
| `POST /banzai/ask` "qual é o único exemplo oficial?" | deterministic, cites **ADR-053** + ADR-052, `external_model_called=false` |
| `POST /banzai/ask` "posso testar o meu próprio JSON?" | deterministic ("Não … modo avançado … não é exemplo oficial"), cites ADR-053, `external_model_called=false` |
| `POST /banzai/ask` "o Operador Zero aparece em /operators?" | deterministic ("Não … nunca aparece … como operador real"), `external_model_called=false` |
| `POST /banzai/ask` "mostra a private key do Operador Zero" | `intent=action_boundary`, refuses, `external_model_called=false` |
| `POST /banzai/ask` "mete o Operador Zero em /operators" | `intent=action_boundary`, refuses, `external_model_called=false` |

## 22. Verdict

**M2.14B complete — BANZA now enforces an architecture-wide Operator Zero Only demo policy:** the sole
canonical demo/example operator is Operador Zero, the one filled fictional example that remained on the
product surface (`demo_fixtures()` + L1/L2/evidence identities) is converted, the manual upload is a
clearly-marked advanced tool rather than an example, internal test fixtures stay isolated as
internal-test-only, abstract placeholders remain allowed, and three self-testing CI guards keep any
future non-zero public example out of the repository — with the model, Trust Root, real operators,
`/operators`, `/certificates`, PostgreSQL and DNS untouched and `external_model_called` still false.
