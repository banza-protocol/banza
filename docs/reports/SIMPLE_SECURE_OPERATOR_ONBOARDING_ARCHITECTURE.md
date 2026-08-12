# M2.19G.3 — Simple & Secure Operator Onboarding — Architecture

> Onboarding is a **BanzAI-hosted service**, not a protocol rule (§2). Email authenticates a
> person; a `.well-known` challenge confirms control of the canonical origin; the published
> endpoints supply the artifacts; **Rust decides**; the private Candidate Registry stores progress;
> the Technical Registry publishes eligible technical state. Resend only transports the code.

- **Milestone:** M2.19G.3 (submilestone of M2.19-FINAL). **ADR:** ADR-069 (new).
- **Branch:** `release/m2-19g3-simple-secure-operator-onboarding` off `main` `cb4655e`.
- **Rollback:** `rollback-pre-m2-19g3-simple-secure-operator-onboarding` → `cb4655e`.
- **Status:** RUNNING. Discovery (§40 steps 1–10) COMPLETE; this doc = design foundation (step 11).

---

## 1. Found architecture (audit result — reuse, never assume)

**Services (Node, `services/`):**
- `banzai-api` — dependency-free `node:http`, port 8091. Public via nginx (`infra/banza-network/nginx/conf.d/banza.conf`): only `/banzai/ask`, `/banzai/validate/step`, `/banzai/validate/journey`. Config = **env vars only** (no dotenv, no mounted secret files); already carries `LLM_API_KEY` + `DATABASE_URL` (role `banzai_rw`) but **no `pg` code today**. Rate limiting: in-process `RateLimiter` (`src/limits.js`) + nginx `limit_req`. **No email/OTP/auth/session/cookie exists** → greenfield. On networks `banza-edge`+`banza-fetch` (both non-internal → has outbound egress for Resend).
- `verification-api` — Node + `pg` (role `banza_ro`), owns `GET /operators` (Postgres `operators` table, seeded EMPTY → `[]`).
- `banza-fetcher` — the SSRF-hardened Rust fetcher (`engines/banza-artifact-fetcher`), reached by `banzai-api/src/fetcherClient.js` at `http://banza-fetcher:8092/fetch`. Only component that reaches operator endpoints; never a user URL.

**9-stage validation** already exists end-to-end (`services/banzai-api/src/validate.js` + vendored Rust WASM under `src/validatewasm/*` + `banza-fetcher`): `discovery, manifest, keys, conformance, interoperability, trust, federation, evidence, certification`. **Rust decides every verdict**; JS assembles the OperationReceipt/JourneyReceipt (schemas in `contracts/production/`). `certification_status` always `NOT_CERTIFIED`.

**Rust (28 standalone crates under `engines/`, NO workspace).** Reuse: `banza-artifact-fetcher` (content-agnostic SSRF fetch), `banza-target-registry` (closed registry + Operador Zero seed `production_registry()`), `banza-trust` (Ed25519), `sha2`. **Absent in Rust (build net-new):** `hmac`, KDF/argon2, OTP, sessions/tokens, rate-limiting. WASM via `wasm-pack --target nodejs`, vendored into `services/banzai-api/src/<name>wasm/`.

**Postgres** (`pgvector/pg16`, internal-only): canonical schema `infra/banza-network/postgres/init/001_schema.sql` (runs once on empty volume) + **manual idempotent** migrations `infra/banza-network/postgres/migrations/M<ms>_<slug>.sql` (applied via `psql` at deploy). Roles: `banza_ro`/`banza_gov`/`banzai_rw`. `check-postgres-data-boundary.sh` scans only `init/*.sql` and **forbids columns named `token`/`password`/`secret_key`/…** → use hash names.

**Operador Zero** — 5 authoritative defs; canonical backend truth = Rust `banza-target-registry::production_registry()` (`operator-zero` / `operator-zero-ref-impl`, origin `https://zero.banza.network`, sandbox, Published, NOT_CERTIFIED). **NOT a Postgres row.** Drift to reconcile: TS mirror `website/lib/banzaiValidation.ts` has version/profile/capabilities differing from the Rust seed.

**Counts (collapse to one source):** hardcoded in `website/lib/protocolStatus.ts` `REGISTRY_SUMMARY={0,1,0}`, `components/home/OperatorRegistry.tsx` (two literal `0` + `/operators` length), `HeroStatusBar.tsx`, and static strings in `app/{estado,registo-tecnico,operadores}/page.tsx`.

**Secrets** — `.env`-only interpolation (`/srv/banza-protocol/.env`, 0600), no docker secrets. Add `RESEND_API_KEY`/`BANZAI_OTP_PEPPER`/`EMAIL_*` following the existing `LLM_API_KEY` pattern on the `banzai-api` service. `next_free_adr=ADR-069`; repo-guards `engines/banza-repo-guards/src/lib.rs` bound `1..=68` must become `1..=69`.

---

## 2. Component boundary (Rust decides · Node = I/O glue · Postgres persists)

```
Browser (UI, forms, nav) ──HTTPS(same-origin)──▶ banzai-api (Node glue)
   │  never: auth, decisions, counts, verification, receipts (§7)          │
   │                                                                       ├─▶ engines/banzai-onboarding (Rust→WASM): OTP gen/verify (HMAC+pepper,
   │                                                                       │     constant-time), session-token derive/verify, candidate state machine,
   │                                                                       │     origin-challenge nonce + receipt, rate-limit policy  ── DECIDES
   │                                                                       ├─▶ Postgres (pg, role banzai_rw): email_challenges, candidate_sessions,
   │                                                                       │     candidates, candidate_implementations, origin_challenges, onboarding_audit
   │                                                                       ├─▶ banza-fetcher (Rust): .well-known ownership fetch (SSRF-hardened)
   │                                                                       ├─▶ existing validatewasm engines + banza-fetcher: the 9 stages
   │                                                                       └─▶ ResendEmailDeliveryProvider (node:https → api.resend.com): OTP transport only
```
Node does **only** I/O: pg queries (parametrized), the Resend HTTPS POST, cookie headers. Every security decision (is-allowed, otp-digest, next-state, verdict) comes from Rust. Nothing security-related runs in the browser.

---

## 3. Minimal data model (§16 — DDL in `init/001_schema.sql` + idempotent migration; hash-named)

- **email_challenges**: `challenge_id` pk, `purpose`, `email_normalized`, `otp_hash` (HMAC digest, never plaintext), `issued_at`, `expires_at`, `attempts`, `verified_at`, `invalidated_at`, `provider_message_id`, `request_id`.
- **candidate_sessions**: `session_id` pk, `session_hash` (opaque token digest), `email_normalized`, `issued_at`, `last_seen_at`, `expires_at`, `revoked_at`.
- **candidates**: `candidate_id` pk, `owner_email`, `operator_name`, `institutional_name?`, `state`, `created_at`, `updated_at`, `last_activity_at`, `published_operator_id?`.
- **candidate_implementations**: `candidate_implementation_id` pk, `candidate_id` fk, `implementation_name`, `description?`, `expected_protocol_version`, `expected_profile`, `expected_environment`, `canonical_domain`, `origin_verification_state`, `validation_state`, `receipts jsonb`, `blockers jsonb`, `published_implementation_id?`.
- **origin_challenges**: `challenge_id` pk, `candidate_implementation_id` fk, `domain`, `challenge_hash`, `issued_at`, `expires_at`, `verified_at`, `result`, `reason_code`, `receipt_ref`.
- **onboarding_audit**: append-only `id`, `event`, `entity_type`, `entity_id`, `at`, `meta jsonb` (NO otp/session/secret/PII).

Boundary-safe column names (avoid `token`/`password`/`secret`/`funds`/`balance`/`wallet`/`iban`/etc.). Grant `banzai_rw` SELECT/INSERT/UPDATE(/DELETE where needed) on these; bump `validate-schema.sh` table count.

## 4. New endpoints (banzai-api, behind nginx `/banzai/onboarding/*`)
`POST /banzai/onboarding/otp/request` · `POST /banzai/onboarding/otp/verify` · `GET /banzai/onboarding/candidates` · `POST /banzai/onboarding/candidates` · `POST /banzai/onboarding/candidates/:id/recover|abandon` · `POST /banzai/onboarding/origin/challenge` · `POST /banzai/onboarding/origin/verify`. All mutations: CSRF + `__Host-` session cookie + Rust authorization. Then the existing `/banzai/validate/*` runs the 9 stages.

## 5. Canonical decisions (mirror of spec §6–§26)
- OTP: 6-digit numeric, CSPRNG, 10-min TTL, single-use, ≤5 attempts, ≥60s reissue, prior invalidated, HMAC-SHA256 + `BANZAI_OTP_PEPPER`, constant-time compare, never plaintext. Neutral response always ("Caso o endereço seja elegível, enviaremos um código de acesso.") → no enumeration.
- Session: opaque high-entropy, `__Host-` cookie (HttpOnly/Secure/SameSite=Strict/Path=/, no Domain), server stores only the hash, rotate on login, 12h idle / 7d absolute, revocable; progress lives server-side (never localStorage/query/cookie).
- Rate limits (§14): per-email 60s / 5·h / 15·d, per-IP 20·h, ≤5 attempts/OTP, progressive cooldown; IP kept only as HMAC/truncated short-lived indicator; no mandatory CAPTCHA.
- Form (§18): public operator name, optional institutional name, canonical domain, public implementation name, optional description; email read-only from session; **no jurisdiction/country** — "Âmbito actual do protocolo: Angola" from a canonical protocol source; version/profile/environment dropdowns from schemas; endpoints supply operator_id/implementation_id/capabilities/keys after discovery.
- Origin proof (§20): ONE method — `GET https://<domain>/.well-known/banza/ownership-challenge.json`, domain-only input, via `banza-fetcher`; emit `OriginVerificationReceipt`; consume challenge on success. No DNS-TXT.
- Journey activation (§22): only after candidate exists + domain verified + origin fixed + endpoints resolvable → the **same** existing 9 steps (no privileged/simplified journey).
- Technical Registry (§23): stays public read-only; publication only when existing technical policy deems eligible; publication ≠ scheme admission/licence/authorisation.
- Canonical surface source (§24): one Rust read-only snapshot feeds Home/BanzAI/Estado/Registo Técnico/Operador Zero; counts computed in Rust; "Estado temporariamente indisponível" on failure (never zeros).
- Operador Zero (§25/§26): stays reference/sandbox/Published/NOT_CERTIFIED/real-funds-off/not-production; re-enrolled once through the REAL flow (contact@banza.network real OTP + zero.banza.network `.well-known` proof + 9 steps), linked to the existing entry (no second OZ), **no bypass/fixtures/manual DB verification**. The one human gate: after the real OTP is sent, stop and ask the user to enter it.

## 6. Secrets (§8/§9) — never printed/committed/in-CI/in-image-layers/in-frontend
`RESEND_API_KEY` (raw `re_` key, canonical host path `/Users/fm65/RESEND_API_KEY`, installed into `/srv/banza-protocol/.env` 0600 at deploy), `BANZAI_OTP_PEPPER` (generated at deploy), `EMAIL_PROVIDER=resend`, `BANZAI_EMAIL_FROM="BanzAI <acesso@auth.banza.network>"`, `BANZAI_EMAIL_REPLY_TO=contact@banza.network`. Referenced as `${VAR}` in the `banzai-api` compose `environment:` block (LLM_API_KEY pattern). No SMTP, no webhooks, no tracking, no real mailbox for acesso@.

## 7. Reconciliations required
- repo-guards `1..=68` → `1..=69` (+ stale comment/message) for ADR-069.
- ADR-069 written to BOTH `decisions/adr/` and byte-mirror `website/content/decisions/adr/`.
- `validate-schema.sh` table count (currently already stale 12 vs 11) → correct new count.
- Rust `production_registry()` ↔ TS `banzaiValidation.ts` Operador Zero drift (version/profile/capabilities).
- The 9 hardcoded count sites → one canonical source.

## 8. Out of scope (must NOT start)
M2.19H, Banzami Operational Scheme workflows, KYB, AML/CFT, scheme admission, real funds, passkeys, passwords, magic links, advanced team mgmt, multi-level permissions, operator API keys, Resend webhooks, DNS-TXT second proof, federated registry, release candidate, M2.19I. **Home = data-wiring only (no redesign).**
