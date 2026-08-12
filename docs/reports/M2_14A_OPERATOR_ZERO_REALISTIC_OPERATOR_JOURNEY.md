# M2.14A — Operador Zero Realistic Operator Journey, Demo Registry & Step-by-Step BanzAI Integration

**Phase:** M2.14A. **Scope:** how the Operador Zero simulator is *used inside BanzAI* + how its demo
validation state is shown on `zero.banza.network`. **Nature:** product/UX correction + a versioned demo
status artifact + a demo-simulators zone + BanzAI Q&A — no protocol, Trust-Root, operator, DNS or model
change.

---

## 1. Problem observed
Inside BanzAI, one click on **`Carregar Operador Zero`** loaded the full simulator run and the journey
became **practically complete at once** — manifest, conformidade, trust, pagamento, federação,
reconciliação, evidence bundle and relatório all credited from a single button. That is not how a real
operator implements the protocol, and it made the journey read as "done" before any step was validated.

## 2. Root cause
`loadOperadorZero()` ran the whole `runOperadorZeroE2E()` and the clone then awarded **every** journey
step at once: `cloneEvidenceFor(zeroTrace, step)` fed the evidence model for all six scored steps
unconditionally. So the single load produced 7/7 · 6/6 · 100/100.

## 3. Journey change (incremental, gated demo session)
The model is now **session-based and incremental**:
- **Starting a session** establishes only the demo operator's **identity** (`operator-zero`, KZ_DEMO,
  `demo_only`) — it awards **no** step (`zeroRan = {}` → 0/6, 0/100).
- A step is credited **only** when the visitor explicitly runs it (`zeroRan[step]`), reading the verdict
  from the deterministic Rust run (valid→happy, negativo→negative).
- A step **unlocks only after the previous scored step passes** (`stepUnlocked` in the pure lib
  `website/lib/operadorZeroJourney.ts`), enforced both in the UI and in `runZeroStep` (a locked step is
  refused, not merely hidden). Order: Manifest → Conformidade → Trust → Federação → Evidence Bundle →
  Traces/Relatório.

## 4. Buttons removed / renamed
- **Removed:** the all-at-once `Carregar Operador Zero` loader (and its Guia twin `Começar com Operador
  Zero`), and the generic **`Carregar exemplo válido`** manifest button.
- **Renamed / new:** start = **`Iniciar jornada com Operador Zero`** (session only); per step —
  Manifest `Carregar manifest do Operador Zero`, Conformidade `Executar conformidade do Operador Zero`,
  Trust `Validar trust demo`, Federação `Simular federação demo`, Evidence Bundle `Gerar evidence bundle
  demo`, Traces `Gerar relatório da sessão`; each with an **Operador Zero — cenário negativo** variant.
- After start the strip reads *"Operador Zero iniciado nesta sessão. Complete a jornada etapa por etapa
  para gerar evidência demo."* — never "cenário completo, 7 passos".

## 5. Examples removed
No loose generic example survives inside BanzAI. The Manifest validator's example section is reframed as
**"Cenários de teste do protocolo (avançado)"** (bring-your-own-manifest vectors), and the UI states
**"O Operador Zero é o único exemplo oficial de operador demo no BanzAI."** Negative scenarios are the
Operador Zero's own (`Operador Zero — manifest inválido`, `… chave revogada`, `… versão incompatível`, …).

## 6. New step-by-step flow
The journey strip renders on every journey step: before a session, the single start CTA + boundary +
single-official-example line; after a session, the demo identity, the honest progress (`N/6`), the
current step's files, and the step's run actions — **locked until the previous step passes**, with a
PASS-demo / bloqueio-demo verdict chip after a run.

## 7. Files per step (Part 7)
`STEP_FILES` exposes only the current step's files (clickable to the `zero.banza.network` read-only
endpoints where one exists): Manifest (`operator-zero.manifest.valid.json`, `…invalid…`, schema);
Conformidade (`conformance-pass/warn/fail.json`); Trust (`demo-key-manifest`, `demo-operator-root.public`,
`revocation-list.demo`, `trust-pass/revoked`); Federação (`federation-manifest.demo`, `federation-pass`,
`federation-incompatible`, peers demo); Evidence Bundle (`evidence-bundle.complete/partial/invalid`);
Traces (`full-e2e-trace`, `failed-e2e-trace`, `operator-zero-session-summary`). No secrets, no private
keys, no `.env`.

## 8. Demo status on zero.banza.network
New **versioned** artifact `examples/operators/zero/status/operator-zero-validation-state.json`
(vendored into the site by `tools/gen-operador-zero-artifacts.mjs` as `VALIDATION_STATE`, drift-guarded
by `make operator-zero-check`). The lab renders an **"Estado do Operador Zero"** panel: `PASS demo ·
validado como simulador demo · não certifica`, etapas 7/7, artefactos 6/6, score 100/100, blockers 0,
KZ_DEMO, `real_money:false`, `production_allowed:false`, `certification:false`, `operator_real:false`,
last phase M2.14A, links to trace + evidence bundle, and the boundary line *"Este estado é demonstração
técnica. Não é certificação, não é aprovação, não é licença financeira e não representa operador de
produção."* No `aprovado`/`certificado` language.

## 9. Special demo zone
A **"Simuladores demo · ambiente de demonstração"** section on the lab presents Operador Zero as the
single validated demo simulator with the mandatory labels (`demo_only`, `KZ_DEMO`, `sem dinheiro real`,
`não PSP`, `não produção`, `não certificado`, `evidência local`) and states it lives in a zone
**separated from real operators** and never appears in `/operators`.

## 10. Relation to /operators
`/operators` (verification-api) stays the **empty** real-operator registry (`production_certificates:
false`); the demo simulator is never listed there as a real operator and is never mixed with real
operators. No `/operators` contamination.

## 11. Language safeguards
BanzAI corrects "aprovado" → **"validado como simulador demo"** (PASS demo, evidência local); PASS never
certifies; the demo operator is never a real operator/PSP/bank/wallet/licensed operator and never moves
real money. Deterministic entries carry the negated framing.

## 12. Guards
- **New:** `make operator-zero-realistic-journey-check`
  (`tools/check-operator-zero-realistic-journey.sh`) — the 16 Part-13 conditions (static over the UI +
  the status artifact, plus a Node pass over the real Rust engine for the answers, plus the vitest gating
  suite when available). Wired into the Makefile `.PHONY` + CI (`identity-guard.yml`).
- **Updated:** `check-operator-zero-full-e2e.sh` — the BanzAI clone assertion now accepts the in-memory
  Rust engine (`runOperadorZeroE2E`) as the bundled/no-network source (it replaced the `readArtifact`
  cross-check), keeping the "never fetch the retired apex" invariant.

## 13. Tests
- `website/lib/operadorZeroJourney.test.ts` — **14** vitest cases (start awards nothing; each step
  unlocks only after the previous passes; no leapfrog; per-step files; negatives belong to OZ; no
  secrets; single-official-example). Website suite **276/276**.
- `engines/banzai-api-kb/tests/route.rs` — **+3** M2.14A route tests (status/approval/journey
  deterministic; PASS-certifies stays with `pass-is-not-certificate`; publish-to-/operators still
  refuses). **59 route tests**.
- `services/banzai-api/test/operador-zero-journey.test.js` — **8** node tests; `answer-quality-matrix.mjs`
  gains 6 MANDATORY fixtures. banzai-api suite **134/134**.

## 14. CI
Local battery green: cargo fmt/clippy + 59 route + repo-guards tests, 134 node tests, 276 vitest, tsc,
next lint, and guards — identity, purity, private-key-leak, rust-rule, operator-zero (all seven),
**operator-zero-realistic-journey**, the banzai suite (action-boundary, answer-quality-eval,
intent-source-ranking, answer-rendering-ux, repository-wide-knowledge, protocol-origin-intent,
qwen-routing, repo-knowledge-safety, operator-journey, vocabulary-contract), website-public-copy-current,
home-layout-copy, reference-information-architecture.

## 15. Deploy
Merged to `main` as `1591e7f` (PR #142). On the VPS: `git pull` the repo, `docker compose build
banzai-api website` + `up -d --no-deps banzai-api website`, then `nginx -s reload` on the reverse-proxy
so it re-resolved the recreated containers' IPs (a routine post-recreate step — no DNS/nginx-config
change). Both containers report **healthy**. Model, tokens, timeout, reasoning, provider unchanged; no
Postgres/DNS/TLS/Trust-Root/operators change; the versioned status artifact ships in the website image.

## 16. Live QA (deploy `1591e7f`)
**BanzAI journey** (`https://banza.network/banzai`): the "Operador Zero — jornada demo" strip shows the
single start CTA **`Iniciar jornada com Operador Zero`** + *"Nada fica concluído de uma só vez."* + *"O
Operador Zero é o único exemplo oficial de operador demo no BanzAI."* + the boundary; before starting,
every progress item reads **PENDENTE** (no 7/7 · 6/6 · 100/100); no `Carregar exemplo válido`.

**BanzAI answers** (`POST /banzai/ask`) — all `intent=critical_boundary`, `external_model_called=false`,
no `<think>`:
| Question | answer |
|---|---|
| `o Operador Zero está aprovado?` | *"No BANZA não se usa \"aprovado\"… está validado como simulador demo…"* |
| `o Operador Zero foi validado?` | validado como simulador demo (PASS demo, evidência local) |
| `o Operador Zero aparece em /operators?` | *"Não… nunca aparece em /operators como operador real…"* |
| `o PASS demo certifica?` | *"Não. Um PASS… não um certificado…"* |
| `onde vejo o estado do Operador Zero?` | *"…em zero.banza.network…"* |
| `por que não carrega tudo de uma vez?` | *"…etapa por etapa — não se carrega tudo de uma só vez…"* |

**zero.banza.network** (200): shows **Estado do Operador Zero**, **validado como simulador demo**, **PASS
demo**, **Simuladores demo** zone, **não certifica**, KZ_DEMO — and **no** unqualified
`aprovado`/`certificado`.

**Invariants:** `/operators` → `[]`; `/certificates` → `production_certificates: false`; apex
`/operador-zero` → **410**; `zero.banza.network/` → **200**; `mete o Operador Zero em /operators` and
`apaga o NOTICE` → **action_boundary** (`external_model_called=false`).

## 17. Limits
- The demo journey's per-step verdicts come from the deterministic Rust simulator (`operator-zero-core`),
  not from re-typing the panel engines; the per-panel validators remain for bring-your-own-file use.
- The versioned status artifact's `last_validation_commit` records the last validated main commit and is
  updated per validation phase (it is documentation, not a live feed).

## 18. Rollback
Revert the PR (or redeploy the previous website + banzai-api images). No data / Trust-Root / operator /
DNS change to undo; the canonical status artifact simply reverts with the code.

## 19. Verdict
**M2.14A complete** — Operator Zero now behaves as a realistic demo operator journey inside BanzAI: it no
longer loads the full 7-step flow in one click, no parallel generic examples remain, each phase exposes
only the required files and unlocks the next phase through local evidence, `zero.banza.network` shows demo
validation status without certification language, and real operators remain separated from demo
simulators.
