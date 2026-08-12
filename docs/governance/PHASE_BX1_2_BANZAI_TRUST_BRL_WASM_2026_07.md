# BANZA / BanzAI — Phase BX1.2: Trust & BRL WASM Tool

**Date:** 2026-07-16
**Branch:** `feat/bx1-2-banzai-trust-brl-wasm-2026-07`
**Scope:** Transform the BanzAI Workbench `Trust & BRL` tab from a static explainer into a real,
in-browser verification tool powered by the Rust `banza-trust` engine compiled to WASM.
**Boundary:** Verification only — TEST-ONLY fixtures. No production key, no signing of production
certificates, no `/operators` or `/certificates` change, no M2/M3, no certification decision.

---

## 1. What shipped

| Layer | Artifact | Role |
|---|---|---|
| Engine (Rust) | `engines/banza-trust/src/tool.rs` | JSON-in/JSON-out tool envelope over the verifier; **status computed in Rust** (VALID / INVALID / REVOKED / MALFORMED) |
| Engine (Rust) | `engines/banza-trust/src/wasm.rs` | 6 `#[wasm_bindgen]` exports (gated on `wasm32`) |
| Engine (Rust) | `engines/banza-trust/Cargo.toml` | `crate-type = ["cdylib", "rlib"]` + `wasm-bindgen` for `wasm32` |
| Engine (Rust) | `engines/banza-trust/tests/tool.rs` | 7 native tests: status mapping, fail-closed, `llm_calls=0` |
| WASM bundle | `website/lib/wasm/banza_trust*` | `wasm-pack --target web` output (312 KB), vendored with provenance |
| Adapter (TS) | `website/lib/banzaTrust.ts` | Load + marshal only; **no verification/decision logic** |
| UI | `website/components/banzai/BanzaiChat.tsx` → `TrustPanel` | Real tool: fixture selector, paste-JSON, 4 verify buttons, result + sidebar |
| Tests (TS) | `website/lib/banzaTrust.test.ts` | Render-only `statusTone` mapping (6 cases) |

### Rust exports (browser)

```
verify_certificate_json(input) -> String
verify_brl_json(input) -> String
verify_key_manifest_json(input) -> String
check_chain_json(input) -> String
trust_demo_fixtures_json() -> String
trust_tool_version_json() -> String
```

Each verification output is an envelope:
`{ status, outcome, verified, kind, target, detail, evidence, errors, warnings, tool,
tool_version, production_disclaimer, test_only:true, llm_calls:0, external_model_called:false }`.

### Status is decided in Rust

`status_of()` in `tool.rs` maps the verifier `TrustResult` → UI status:
`verified → VALID`; `missing signature → MALFORMED`; chain revocation → `REVOKED`; else `INVALID`.
`EXPIRED` / `UNSUPPORTED` are declared in the TS type union for completeness but the verifier is
**signature-only** (no expiry evaluation), so they are never emitted — documented, not faked.
TypeScript never computes a status; `statusTone()` is a pure render-only status→colour mapping.

### TEST-ONLY fixtures (signed in Rust)

`trust_demo_fixtures()` builds deterministic fixtures from `sign::TestKeypair::from_seed` (a fixed
demo seed) — every artifact carries `note: "TEST ONLY — NOT PRODUCTION"`:
`cert_valid`, `cert_invalid` (tampered post-signing), `cert_revoked` (+ BRL revoking its subject),
`brl_empty`, `brl_revocation`, `manifest_valid`, `manifest_tampered`.
No real key material, no production certificate.

---

## 2. Verification (all green)

**Rust** (`engines/banza-trust`):
- `cargo fmt` clean, `cargo clippy --all-targets` clean.
- `cargo test`: 7 tool tests + 9 verifier/golden tests + golden parity — **all pass**.
- `make trust-rs-check`: golden ed25519 parity ✓.

**Website** (authoritative gates — no website CI):
- `tsc --noEmit` — clean.
- `next lint` — no warnings/errors.
- `next build` — success; `/banzai/workbench` and `/banzai/chat` both build (119 kB First Load).
- `vitest run` — 16 tests pass (banzaTrust 6 + traceVerifier 4 + workbench 6).

**Repo gates:** `make rust-rule-check` PASS (84 files; `wasm/` glue excluded), `identity-check`,
`purity-check`, `invariant-check`, `reference-svg-check` — all PASS (identity advisories pre-existing).

**Live browser E2E** (`next dev`, `/banzai/workbench` → Trust & BRL):
- Fixtures loaded from Rust WASM (`trust_demo_fixtures_json`).
- Button gating reads the real fixture shape (manifest button disabled for a cert-only fixture).
- `cert_valid` → **VALID — assinatura válida**; `cert_invalid` → **INVALID**; `cert_revoked` + chain
  → **REVOKED — revogado na BRL**; pasted unsigned cert → **MALFORMED**.
- Every result showed `llm_calls=0`, `external_model_called=false`, `tool: banza-trust v0.1.0`.
- Disclaimer "Não é certificado de produção" present.
- "Perguntar ao Assistente" bridge switches to the Assistente and answers.
- Console: only the pre-existing root-`<html>` `js`-class hydration warning (unrelated, all pages).

---

## 3. Boundary preserved

- The Workbench Trust tool **verifies**; it does not certify, approve, or emit certificates.
- No production key is generated or loaded; no signature is produced in the browser (fixtures are
  pre-signed in Rust from a TEST seed).
- `/operators` and `/certificates` are untouched. Pre-production posture intact:
  mock provider, `llm_calls=0`, no external model, no certified operators.
- Sidebar + panel disclaimers repeat: **technical verification, not certification; certification is a
  BANZA CA decision.**

---

## 4. Provenance

`website/lib/wasm/banza_trust*` built from `engines/banza-trust` with
`wasm-pack build --target web --out-name banza_trust --release`. The sibling WASM modules
(`banzai_core`, `banzai_evidence`) and the shared `package.json` were restored to avoid incidental
`wasm-opt` re-optimisation churn unrelated to this phase.
