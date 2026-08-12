# Phase R0 — Rust Rule Compliance Audit (2026-07)

**Type:** Read-only audit. No code changed, no runtime touched, no deploy.
**Repos audited:**
- `banza-protocol/banza` @ `6d1d8ca` (branch `main`, clean, VERSION `1.0.0`)
- `banza-protocol/banzai` @ `20485d6` (branch `main`, clean)

**Branch:** `audit/phase-r0-rust-rule-compliance-2026-07`
**Method:** 10 read-only classification agents fanned out over the audit dimensions
(conformance, crypto/trust/BRL, shell/CI gates, website UI-vs-engine, infra/contracts,
banzai api-core, banzai cli/rag, banzai gates, banzai data/glue, docs-contradiction),
178 raw findings, deduplicated to **32 canonical engine components**. Base facts
(hashes, per-language file/line counts, engine file sizes) gathered deterministically.

> **Neither repo contains any Rust today** — 0 `Cargo.toml`, 0 `*.rs`, 0 `Cargo.lock`.
> Every computational engine in both repos is currently Python, TypeScript or Bash.
> Phase **H8** (branch `feat/phase-h8-rust-static-evidence-engine-2026-07`, in progress)
> is the first concrete Rust crate and the opening move of the R2 migration below.

---

## 1. Executive summary

The new architectural rule — **every BANZA/BanzAI engine, computation, parsing, indexing,
retrieval, scoring, normalization, conformance, crypto, guard, eval, verification or relevant
algorithmic logic must be Rust** — is currently **not satisfied by any component**, because
Rust does not yet exist in either repo. That is expected: the rule is new. The purpose of R0
is to establish, precisely, *which* components the rule binds, ranked by criticality, and the
safe order in which to migrate them.

**Result:** **8 P0**, **19 P1**, **5 P2** canonical engine components require migration
(banza 15, banzai 17). Everything else — React/Next UI, HTTP route handlers, CLI wrappers,
docker/compose, Makefiles, CI orchestration, JSON/OpenAPI data, prompts, fixtures, generated
`dist/` — legitimately stays non-Rust.

**No documentation contradiction was found.** All "technology-neutral / any language" prose in
both repos correctly refers to **external operator freedom**, which is a permanent protocol
principle and is *not* in tension with Rust-first for **official** engines. The only doc action
is additive: a new ADR that names the boundary explicitly (§10, R1).

**Critical path:** the two most dangerous gaps are (a) the **cryptographic trust root**
(`trust_root.py` — ed25519, BRL/certificate/manifest signing) and (b) the **conformance runner**
that emits PASS/FAIL certification verdicts (Python `run*.py` in banza; the TS stub in banzai).
These are the components that, once real operators and certificates exist (post-M2/M3), become
the integrity spine of the federation. They must be Rust before that functionality is exercised.

---

## 2. The mandatory Rust rule (as audited)

**Must be Rust** — engine / computation / algorithm: conformance runner (PASS/FAIL), crypto &
signature/certificate/BRL/root-key/trust-chain verification, invariant checkers,
ledger/integer-money math, retrieval/search/scoring/indexing, normalization, claim verification,
guard engines, evidence-bundle builders, protocol/semantic-schema validation, QR/webhook/event
validators.

**May stay TypeScript/JavaScript** — UI, React/Next.js, rendering, navigation, visual components,
thin glue, and **consumption of Rust-generated artifacts** (an index JSON, an evidence bundle, a
verdict).

**May stay Bash/Makefile** — orchestration, invoking Rust binaries, CI glue, deploy glue, simple
wrappers.

**Must not stay Python/Node/TS** — any *own computational engine* of BANZA/BanzAI.

**Permanent exception (not a violation):** *external operators* remain technology-neutral. The
Rust-first rule binds only the **official** BANZA/BanzAI engines and tooling. `CLAUDE.md`'s
"Protocol Implementation Guidance (Technology-Neutral)" section, `docs/governance/certification-boundary.md`,
and banzai `prompts/system/*` are operator-facing and correct as-is.

---

## 3. What may remain outside Rust (allowed surface)

| Category | Examples | Verdict |
|---|---|---|
| React/Next UI | banza `website/**/*.tsx`, `BanzaiChat.tsx`, page layouts, citation chips, badges, right-hand panel | ALLOWED |
| UI-only filtering | `website/components/decisoes/DecisionsExplorer.tsx` — client `useState` substring filter over a static array, no normative ranking | ALLOWED |
| Static data | `website/lib/decisions.ts` (825 L data + trivial `getDecision`), `decisions-content.ts`, banzai `data/knowledge-corpus.ts`, `contexts/`, `prompts/` | ALLOWED / data |
| HTTP glue | banzai `src/api/src/routes/*`, `index.ts` (Hono handlers, rate limiter), banza `services/verification-api`, `services/banzai-api` | ALLOWED |
| CLI wrappers | banzai `cli/commands/certify.ts`, `conformance.ts`, `ask.ts` (shell out to runner) | ALLOWED |
| Provider adapters | banzai `providers/mock.ts`, `vllm.ts`, `factory.ts`, `profile-config.ts` (external-model transport; operator-neutral) | ALLOWED |
| Build/deploy glue | Makefiles, `package.json`, `turbo.json`, `tsconfig*`, docker compose, `Dockerfile`, `.github/workflows/*` orchestration | ALLOWED |
| Contracts/spec | `contracts/**` (OpenAPI, webhook/QR/event schemas), `conformance/vectors/**`, `conformance/*/suite.json`, `report-schema.json` | ALLOWED / data |
| Generated / excluded | `dist/`, `.next/`, `.turbo/`, `__pycache__/`, `.pytest_cache/`, `node_modules/`, lockfiles, SVG/image assets, historical docs | EXCLUDED |

---

## 4. What must migrate (summary)

- **Crypto & trust:** ed25519 signing/verification, BRL, certificates, key manifests, the 9-step
  ADR-026 trust protocol, settlement netting. (banza `trust_root.py`, `fixture_server.py`,
  `runner_infra.py`)
- **Conformance:** the runner that emits PASS/FAIL and certification levels L0–L4. (banza
  `run_fed.py`/`run.py`; banzai `conformance-runner.ts`)
- **Protocol verification:** manifest/sandbox-safety validation, financial-invariant checking
  (`net+fee==gross`, double-entry). (banzai `manifest-validator.ts`, `trace-explainer.ts`)
- **BanzAI evidence engine:** normalization, intent routing, retrieval, scoring, decision
  resolution, eval harness. (banza `banzaiKb.ts` + `banzaiKb.eval.mjs`; banzai `knowledge-search.ts`)
- **Quality/authority gates:** operator-neutrality, authority, boundary, provider, diagram guards
  currently implemented as grep/awk/sed/python inline algorithms. (banza `tools/check-*.sh`;
  banzai `tools/check-*`)
- **Provider routing:** task-profile selection and fail-closed gates. (banzai `profile-router.ts`,
  `routing/router.ts`)

---

## 5. Inventory by repo

### banza (`6d1d8ca`)

| Area | Content | Bearing on the rule |
|---|---|---|
| `tools/banza-conformance/` | Python conformance + federation runner (`run.py` 948 L, `run_fed.py` 8 872 L, `trust_root.py` 503 L, `fixture_server.py`, `runner_infra.py`), PyPI package, Dockerfile | **P0 core** (crypto + verdicts) |
| `tools/root-ceremony/` | `ceremony_script.py` (1 144 L) offline root-key ceremony + custody test | crypto (offline, M2) — see §9 |
| `conformance/` | `tests/test_crypto_integrity.py` (P1); vectors + suites + schemas = data | mixed |
| `contracts/` | 32 JSON + 5 YAML + 4 MD — OpenAPI, webhook/QR/event/federation schemas | data (no hidden validator) |
| `tools/*.sh` | `check-invariants` (python inline), `check-repository-purity` (awk/grep/sed), `check-operator-contamination` (grep/diff), `check-openapi-compatibility` (python/diff), `assert-reference-svgs` (grep) | **P1/P2 gates** |
| `website/components/home/` | `banzaiKb.ts` (379 L engine), `banzaiKb.eval.mjs`, `banzaiKb.check.mjs` | **P0 + P1** |
| `website/**` (other) | Next.js pages, `BanzaiChat.tsx`, `DecisionsExplorer.tsx`, `lib/decisions.ts` | ALLOWED / data |
| `infra/banza-network/tests/` | smoke (`curl`) + `validate-compose/schema/security-headers` | glue / P2 |
| `services/` | `verification-api` (serves precomputed JSON), `banzai-api` (LLM dispatch glue) | ALLOWED |
| `.github/workflows/` | conformance / identity-guard / purity / publish — orchestration | ALLOWED (CI glue) |

### banzai (`20485d6`)

| Workspace / area | Content | Bearing on the rule |
|---|---|---|
| `src/api/src/tools/` | `conformance-runner.ts` (P0 stub), `manifest-validator.ts` (P0), `trace-explainer.ts` (P0), `knowledge-search.ts` (P1), `sdk-generator.ts` (P2) | **engine core** |
| `src/api/src/routing/` | `router.ts` — intent→model routing gate | **P1** |
| `src/api/src/providers/` | `profile-router.ts` (P1 gate); `mock/vllm/factory` = adapters (allowed) | mixed |
| `src/api/src/routes/`, `index.ts` | Hono HTTP handlers, rate limiter | ALLOWED (glue) |
| `src/api/src/data/`, `contexts/`, `prompts/` | knowledge corpus, fixtures, system prompts | data / excluded |
| `src/cli/src/commands/` | `validate.ts` (P1 dup validation); `certify/conformance/ask` = wrappers | mixed |
| `src/orchestrator`, `src/rag`, `src/tools` | currently **types-only** (`types.ts`, no implementation) — future engine homes | stubs (allowed now) |
| `tools/` | `check-authority/provider/boundaries/diagrams` (P1 guards), `validate-evidence` (P2), `check-links`/`build-index` (glue) | **P1/P2** |
| `scripts/` | `check-operator-contamination.sh` (P1), `validate-diagram-language.sh` (P2) | gates |
| `.github/workflows/identity-guard.yml` | inline duplicate of the neutrality guard | **P1** (de-dup) |
| `src/*/dist`, `.turbo` | compiled output | EXCLUDED |

> **Note on banzai `src/rag`:** it is currently only type definitions (no retrieval implementation).
> The *actual* BanzAI retrieval that exists today lives in `src/api/src/tools/knowledge-search.ts`
> (banzai) and `website/components/home/banzaiKb.ts` (banza). R2 must cover both and can populate
> `src/rag` as the Rust-backed home.

---

## 6. Inventory by language

| Repo | Ext | Files | ~Lines | Role |
|---|---|---:|---:|---|
| banza | py | 18 | 15 829 | conformance/crypto engines (**migrate**) + ceremony |
| banza | tsx | 39 | 9 059 | Next.js UI (allowed) |
| banza | ts | 10 | 1 700 | `banzaiKb.ts` engine (migrate) + `lib/*` data/glue |
| banza | js/mjs | 15 | 2 113 | eval/check runners (migrate) + config |
| banza | sh | 16 | 1 466 | gates (migrate P1) + smoke (glue) |
| banza | json/yaml/yml | 107 | 18 391 | contracts + conformance vectors (data) |
| banza | md | 217 | 43 829 | docs (excluded) |
| banzai | ts | 39 | 3 549 | engines (`tools/*`, `routing`, `providers`) + glue |
| banzai | sh | 3 | 253 | guards (P1) + wrappers |
| banzai | json | 14 | 4 068 | evals + config (data) |
| banzai | yml | 4 | 221 | CI (glue) + identity-guard (P1 inline logic) |
| banzai | md | 64 | 5 228 | docs + prompts (excluded) |

> `dist/`, `node_modules/`, `__pycache__/` excluded from counts. banza `py` count includes two
> physical copies of the conformance runner (`banza_conformance/` package + top-level scripts).

---

## 7. Findings — P0 / P1 / P2

### P0 — migrate before the functionality is exercised (8)

| # | Repo | Path | Why it is a P0 engine |
|---|---|---|---|
| 1 | banza | `tools/banza-conformance/banza_conformance/trust_root.py` | ed25519 signing/verification; BRL, certificate, key-manifest & evidence-package crypto per ADR-026 (INV-FEDEVAL-005, INV-ROOT-002). Non-negotiable crypto. |
| 2 | banza | `…/banza_conformance/fixture_server.py` | Implements the 9-step ADR-026 trust protocol (manifest→cert→signature→expiry→BRL→capability→binding) **and** settlement/netting computation. The conformance trust boundary. |
| 3 | banza | `…/banza_conformance/runner_infra.py` | Auto-signs BRLs and key manifests with test root keys; settlement/wallet state. Signing logic = P0. |
| 4 | banza | `…/banza_conformance/run_fed.py` | 84 federation conformance tests (FED-CERT…FED-FAIL): certificate/signature verification, invariant checks, state-machine assertions — all normative. |
| 5 | banza | `website/components/home/banzaiKb.ts` | BanzAI Chat engine: `norm()` normalization, ~43-intent router, `findDecision()` ADR resolution, decision library, keyword scoring. **H8 is already porting this to Rust.** |
| 6 | banzai | `src/api/src/tools/conformance-runner.ts` | Certification PASS/FAIL engine: `SUITE_DEFINITIONS`, `LEVEL_CAPABILITY_MAP` (L0–L4). Single point of certification truth (stub today). |
| 7 | banzai | `src/api/src/tools/manifest-validator.ts` | RFC-006 sandbox-safety guard (`environment=sandbox ⟹ simulated=true ∧ production_allowed=false`), capability-level consistency. A hard financial guardrail. |
| 8 | banzai | `src/api/src/tools/trace-explainer.ts` | Financial-invariant verifier: INV-TRACE-001 (trace_id propagation), INV-LEDGER-001 (double-entry), INV-STL-001 (`net+fee==gross`, no money creation). |

### P1 — migrate next (19)

| Repo | Path | Why |
|---|---|---|
| banza | `…/banza_conformance/run.py` | L0–L2 conformance orchestrator; verdict aggregation + cert-level decision (crypto core is #1). |
| banza | `conformance/tests/test_crypto_integrity.py` | Trust-boundary tests → become Rust integration tests with the trust-root crate. |
| banza | `tools/check-repository-purity.sh` | Protocol-purity/neutrality matcher implemented inline in awk/grep/sed (normative gate). |
| banza | `tools/check-operator-contamination.sh` | Operator-brand denylist + governance-claim matcher (grep/diff). |
| banza | `tools/check-invariants.sh` | Invariant checker with inline python. |
| banza | `tools/check-openapi-compatibility.sh` | OpenAPI breaking-change compatibility diff (python/diff). |
| banza | `website/components/home/banzaiKb.eval.mjs` | 70-case eval harness: link allowlist, forbidden-claim, intent/kind gates. |
| banza | `website/components/home/banzaiKb.check.mjs` | 24-case smoke runner. |
| banzai | `src/api/src/tools/knowledge-search.ts` | Retrieval `tokenize`/`scoreEntry`/ranking — the BanzAI evidence search (keyword scoring is still normative algorithmic logic). |
| banzai | `src/api/src/providers/profile-router.ts` | Provider gate engine: cost policy, evidence-required, allow-heavy, external-calls fail-closed gates. |
| banzai | `src/api/src/routing/router.ts` | Task-intent → model-selection routing gate (decides which model is invoked). |
| banzai | `src/cli/src/commands/validate.ts` | Duplicates manifest-validation logic (consolidate into the single Rust validator). |
| banzai | `tools/check-authority` | Authority-claim guard, negation-aware pattern engine. |
| banzai | `tools/check-provider` | Provider-mode guard: nine multi-part checks of A5 safe defaults. |
| banzai | `tools/check-boundaries` | Identity/boundary guard, negation-aware. |
| banzai | `tools/check-diagrams` | SVG diagram compliance engine (canon bordô colors, `<title>/<desc>`, family marker). |
| banzai | `scripts/check-operator-contamination.sh` | Operator-neutrality guard (Level 1 denylist + Level 2 governance claim). |
| banzai | `.github/workflows/identity-guard.yml` | Inline duplicate of the neutrality guard logic — collapse into the shared Rust binary. |
| banzai | `src/api/src/__tests__/{router,validate,trace,provider-router}.test.ts` | Eval/test suites for the engines above; migrate alongside them. |

### P2 — backlog / evaluate (5)

| Repo | Path | Why (borderline) |
|---|---|---|
| banza | `tools/assert-reference-svgs.sh` | Reference-SVG presence/marker check (single grep). |
| banza | `infra/banza-network/tests/validate-{compose,schema,security-headers}.sh` | Compose/schema/header smoke validators — light structural checks. |
| banzai | `tools/validate-evidence` | Evidence-manifest anchor check (`source_repo`, commit/hash). |
| banzai | `scripts/validate-diagram-language.sh` | SVG EN/PT language-purity check (perl regex). |
| banzai | `src/api/src/tools/sdk-generator.ts` | SDK template codegen — mostly documentation output; low normative weight. |

---

## 8. False positives (looks like an engine, is not)

| Path | Why it is **not** an engine |
|---|---|
| banzai `src/api/src/tools/sdk-generator.ts` (crypto view) | Contains HMAC-SHA256 **inside string templates** — instructional SDK code for operators, not BanzAI's own verification. (Still P2 for the templating, not P0 crypto.) |
| banzai `src/api/src/providers/vllm.ts` | External model-provider transport stub; operator-neutral technology choice; no crypto, no protocol computation. |
| banzai `src/api/src/providers/mock.ts` | Deterministic test-double response selection; not a protocol engine. |
| banzai `src/api/src/providers/factory.ts`, `profile-config.ts` | Provider factory/config data; instantiation glue. |
| banzai `src/api/src/index.ts` rate limiter | Simple in-memory bucket counter; not a security-critical verifier. |
| banza `website/lib/decisions.ts` | 825 lines of ADR/RFC **data** + trivial `getDecision(slug)` lookup; no algorithm. |
| banza `website/components/decisoes/DecisionsExplorer.tsx` | Client-side `useState` substring filter over a static array; UI convenience, not normative retrieval. |
| banzai `src/{orchestrator,rag,tools}/types.ts` | Type definitions only; no implementation. |
| banza `Makefile`, `.github/workflows/ci.yml` | Orchestration; call scripts/tools; no inline algorithm. |
| `CLAUDE.md` "Technology-Neutral" section, `certification-boundary.md`, banzai `prompts/system/*` | Operator-facing neutrality; **correct**, not a contradiction (see §10). |

---

## 9. Note — root-ceremony crypto (`tools/root-ceremony/`)

`ceremony_script.py` (1 144 L) and `test_ceremony_custody.py` implement the **offline** root-key
ceremony (M2). It is cryptographic and therefore in-scope for Rust, but it is **offline, air-gapped,
and single-use per ceremony**, not a serving-path engine. Classify it **P0-by-nature / R5-scheduled**:
it should be Rust, but it is safe to migrate in R5 alongside the trust/BRL verifier rather than on the
immediate critical path, because it is not invoked by any live request and M2 has not run. Do **not**
activate or run it during migration work.

---

## 10. Documentation & the policy ADR (R1)

**No contradiction found.** Every "any language / technology-neutral / any stack" hit in both repos
refers to **external operators**, whose implementation freedom is a permanent protocol principle.
The Rust-first rule and operator neutrality are **orthogonal**: one binds official engines, the other
frees operators.

**Recommended ADR — "Rust-first implementation policy for official BANZA/BanzAI engines"** (co-referenced
in both repos' `CLAUDE.md`). It must state:

1. **Operators** — any technology, any language, any runtime (unchanged, protocol invariant).
2. **Official engines** — conformance runner, crypto/trust/BRL/certificate verification, invariant
   checkers, BanzAI retrieval/search/scoring/indexing/normalization, claim/guard/eval engines,
   evidence-bundle builders, semantic validators → **Rust**.
3. **TypeScript/React/Next.js** — UI, rendering, navigation, thin glue, consumption of Rust artifacts.
4. **Python (legacy)** — the current conformance/crypto runner is legacy and will be migrated (R4/R5);
   until then it is a *compatibility wrapper*, not the canonical engine.
5. **Bash/Makefile** — orchestration and Rust-binary invocation only; no inline normative algorithm.

This ADR removes all ambiguity without editing the correct operator-neutral prose.

---

## 11. File → classification matrix (canonical, deduplicated)

32 engine components after de-duplication (178 raw findings collapsed):
**P0 = 8, P1 = 19, P2 = 5** (banza 15 · banzai 17). Full per-file rows are in §7. Everything not
listed there is ALLOWED_NON_RUST or EXCLUDED per §3.

| Class | Count | Meaning |
|---|---:|---|
| RUST_REQUIRED_P0 | 8 | Critical engine; Rust before the feature is exercised |
| RUST_REQUIRED_P1 | 19 | Algorithmic; migrate in the following waves |
| RUST_CANDIDATE_P2 | 5 | Backlog; evaluate, may stay temporarily |
| ALLOWED_NON_RUST | — | UI, glue, data, wrappers, CI, compose (majority of both repos) |
| EXCLUDED | — | Generated output, assets, lockfiles, historical docs |

---

## 12. Migration plan (phases R1–R6)

| Phase | Scope | Delivers |
|---|---|---|
| **R1 — Rust Policy ADR & Repository Guards** | Author the §10 ADR; add `no-new-ts-engine` guard (fails CI if a new engine file appears in a forbidden path); publish the ALLOWED (UI/glue) allowlist. | Policy on record; drift prevented. |
| **R2 — Rust BanzAI Evidence Engine** | Move normalization/index/search/scoring/evidence-bundle to Rust; generate artifacts consumed by the website; keep UI in TS. **Covers banza `banzaiKb.ts` (H8 already started) *and* banzai `knowledge-search.ts`.** | The BanzAI chat runs on a Rust engine. |
| **R3 — Rust BanzAI Guard & Eval Engine** | Move intent/guards/claim checks/eval runner to Rust; JS only invokes output. Covers banzai `check-*`, banza `banzaiKb.eval.mjs`, `check-repository-purity.sh`, `check-operator-contamination.sh`. | Gates share one auditable Rust binary. |
| **R4 — Rust BANZA Conformance Runner** | Create `banza-conformance-rs`; Python `run*.py` becomes a deprecated compatibility wrapper; new Docker/GHCR image; output-format parity. | Certification verdicts are Rust. |
| **R5 — Rust Trust/Crypto/BRL Verifier** | ed25519, certificate chain, BRL, key-manifest, root-ceremony (§9) → Rust CLI + library + ported test vectors. | Crypto spine is Rust. |
| **R6 — Deprecate legacy non-Rust engines** | Remove or freeze the old Python/TS engines; retain only wrappers. | Single canonical engine per function. |

**Ordering rationale:** R2/R3 first (BanzAI is live *today*, pre-production, low blast radius — safe
to migrate now and it retires the largest TS engine surface). R4/R5 (conformance + crypto) are P0 by
nature but not yet *exercised* (no operators, no certificates, M2/M3 pending), so they can follow with
full test-vector parity rather than being rushed.

---

## 13. Recommended checks (created in R1, not now)

- `make rust-rule-check` — umbrella.
- `make no-new-ts-engine-check` — fails if a new `*.ts/*.mjs/*.py` lands in an engine path
  (`src/api/src/tools`, `src/api/src/routing`, `website/components/home/banzaiKb*`, `tools/banza-conformance`)
  without an allowlist justification.
- `make banzai-rust-check` / `make conformance-rust-check` / `make rust-engine-check` — per-domain,
  green once the corresponding R-phase lands (build/test the crate + assert the wrapper only calls it).
- Guard shape: allow `website/components/**` UI only if it contains no engine keywords
  (`score/rank/retrieve/normalize/tokenize/verify signature`); allow shell wrappers that only invoke a
  binary; require an allowlist entry with justification for any exception.

---

## 14. Risks

- **Crypto correctness (R5):** a Rust re-implementation of ed25519/canonical-JSON signing must be
  byte-for-byte compatible with the Python trust root, or existing signed BRLs/manifests fail to
  verify. Mitigate with ported test vectors + cross-verification against the Python output before
  deprecating it.
- **Conformance verdict parity (R4):** verdict/report JSON must match the current schema so downstream
  consumers (badges, `/conformance/evidence`) don't break. Keep `report-schema.json` as the contract.
- **Dual-engine window:** during R2–R6 both a Rust and a legacy engine exist; the legacy one must be an
  explicit *wrapper*, never a second source of truth. `no-new-ts-engine-check` + the ADR enforce this.
- **WASM vs binary integration:** the website cannot shell out to a binary at request time; R2 must
  decide WASM (in-browser/edge) vs build-time precomputed artifacts. H8 currently takes the precomputed
  route with WASM deferred — acceptable and documented.
- **Scope creep into banzai:** R0 deliberately did **not** modify banzai. Any banzai change (guards,
  engines) is its own governed phase.

---

## 15. Negative confirmations

- **No functional change** — R0 added only this report; both working trees stayed clean during the audit.
- **No deploy, no VM, no DNS/Cloudflare/TLS, no Postgres, no `.env`, no secrets.**
- **No provider activation** — no real provider, no Qwen, no DeepSeek, no GPU, no external API call.
- **No VERSION change** (banza `1.0.0`). **No M2**, no operator, no certificate. `/operators=[]`,
  `production_certificates=false` untouched.
- **No `banza-protocol/banzai` modification** — banzai was read-only; its tree is unchanged at `20485d6`.
- The in-progress H8 crate was preserved on its own branch and is not part of this audit branch.

---

## 16. Next step

**Proceed to R1** (author the Rust-first policy ADR + `no-new-ts-engine` guard), then **R2** (Rust BanzAI
evidence engine — which **H8 has already begun**). R4/R5 (conformance + crypto) follow with full
test-vector parity, ahead of any M2/M3 activation. R0 is complete and read-only.
