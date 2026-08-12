# M2.19G.3 — Simple, secure operator onboarding in BanzAI (ADR-069)

**Status:** COMPLETE + LIVE · **Date:** 2026-07-30 · **ADR:** [ADR-069](../../decisions/adr/ADR-069-simple-secure-operator-onboarding.md)
**PR:** [#236](https://github.com/banza-protocol/banza/pull/236) → `main` `5946ad8` (CI 247/247) · **Deployed:** banza.network (VPS 82.165.165.97)

> **Closure correction (M2.19G.3A).** The original M2.19G.3 re-enrolment of the Operador Zero stopped at
> `ORIGIN_PENDING` / a fail-closed "unreachable" verdict: the domain never actually published the
> challenge, so there was **no positive origin proof, no `OriginVerificationReceipt`, and the nine-stage
> journey was never executed**. *A re-enrolment attempt is not a completed re-enrolment.* The corrective
> **M2.19G.3A** closes the loop for real — the Operador Zero **origin** publishes the challenge from its
> own infrastructure (a static file served by the `zero.banza.network` nginx vhost, independent of the
> verifier), the secure Rust fetcher retrieves it over the public edge, the onboarding engine returns a
> positive verdict, the challenge is **consumed (single-use)**, the nine-stage journey is **executed**
> honestly, and the candidature is **reconciled** to the *existing* closed-registry Operador Zero entry
> without creating any duplicate or writing `/operators`. Full detail, receipts and metrics:
> [M2.19G.3A closure report](./M2_19G3A_OPERATOR_ZERO_ORIGIN_AND_REENROLMENT_CLOSURE.md).

---

## 1. What was built

Simple, secure onboarding of new operators **inside BanzAI** — no new authority, no protocol-contract
change. The design principle (ADR-069):

> The **email** authenticates the person · the **domain** confirms the origin · the **endpoints** supply
> the artifacts · **Rust** verifies · the **receipts** fix the results · the **Technical Registry**
> publishes the verifiable state — without closing the protocol.

Capabilities delivered:
- **Passwordless email-OTP login** — a 6-digit code delivered by Resend to the operator's inbox.
- **Private Candidate Registry** with **recovery** — a candidature is stored and re-openable with the
  same verified email.
- **`.well-known` origin proof** — the operator publishes a challenge document at the implementation's
  canonical domain; the secure Rust fetcher retrieves it and Rust confirms control of the origin.
- **Validation via the public endpoints** — reuses the ADR-068 endpoint-originated journey.
- **Operador Zero re-enrolment** through the same real flow.

## 2. Architecture — security + simplicity

- **Rust decides.** Every OTP / session / candidate-state / origin / rate-limit verdict is computed in
  `engines/banzai-onboarding` (pure JSON-in/JSON-out, vendored WASM in `services/banzai-api/src/onboardingwasm`).
  Node is I/O glue only: it supplies CSPRNG entropy (`crypto.randomBytes`) + time (`Date.now`), persists
  to Postgres as `banzai_rw`, sends one Resend email, and makes one secure fetch via `banza-fetcher`.
- **Secrets never leave the host.** `BANZAI_OTP_PEPPER` (HMAC pepper) and `RESEND_API_KEY` are `.env`-only
  (the LLM_API_KEY pattern), never committed / imaged / logged / in CI / in the frontend. Only HMAC-SHA256
  digests + opaque ids are stored (ADR-042 boundary) — never a plaintext code, session token, password or
  PII beyond a contact email.
- **Opaque sessions.** The `__Host-banzai_candidate` cookie carries `sessionId.token`; only
  `HMAC(pepper, token)` is stored. Verification is constant-time (`hmac::verify_slice`) in Rust. Cookie is
  `Secure + HttpOnly + SameSite=Strict + Path=/` (no Domain).
- **Dark by default.** OFF unless `BANZAI_ONBOARDING_ENABLED=1`; the whole `/banzai/onboarding/` surface
  404s until enabled at deploy. Fail-closed if enabled without a pepper.

## 3. Components

| Layer | Artifact |
|---|---|
| Rust engine | `engines/banzai-onboarding` (otp/session/candidate/origin/ratelimit, 9 tests) + vendored WASM |
| Postgres | 6 private tables (`email_challenges`, `candidate_sessions`, `candidates`, `candidate_implementations`, `origin_challenges`, `onboarding_audit`) in `init/001_schema.sql` + idempotent migration `M2_19G3_operator_onboarding.sql` |
| banzai-api | `src/onboarding/{config,db,engine,email,store,service,routes,http,constants,index}.js`; Resend `node:https` adapter; `pg` dependency |
| nginx | same-origin `location /banzai/onboarding/` → `banzai-api:8091/onboarding/` |
| website | third `/banzai` mode **"Onboarding de operador"** (`BanzaiOnboardingMode.tsx` + `banzaiOnboardingClient.ts`, `credentials:"include"`) |
| guards/CI | `operator-onboarding-check` + CI job; `banzai-onboarding` Rust CI job; 8 node onboarding tests |

## 4. Endpoints (`/banzai/onboarding/*`, same-origin)

`POST otp/request` · `POST otp/verify` · `GET session` · `POST logout` · `GET candidates` ·
`POST candidate` · `POST candidate/abandon` · `POST implementation` · `POST origin/challenge` ·
`POST origin/verify` · `GET version`.

## 5. Verification

**Offline (pre-merge):** Rust fmt + clippy (default & wasm) + 9 tests; banzai-api `node --test` **321/321**
(incl. 8 onboarding tests: OTP→session→candidate→implementation→origin verified/tampered/logout,
ownership isolation, per-email rate limit, and the assertion that **no plaintext code/token/pepper is
persisted**); website tsc clean, `next build` OK, vitest **419/419**; guards identity-check /
operator-onboarding / postgres-data-boundary / canonical-corpus-integrity (70/70) /
canonical-protocol-vocabulary / compose-validate green. CI **247/247**.

**Live (post-deploy, public edge banza.network):**

| Probe | Result |
|---|---|
| Real OTP email to `contact@banza.network` (Resend, from `acesso@auth.banza.network`) | delivered; code `821967`; not in API response |
| `POST otp/verify` (real code) | `verified` → `__Host-` session cookie set |
| `GET session` (authenticated) | `authenticated:true, contact@banza.network` |
| OZ candidate created | `state:DRAFT`, `published_operator_id:null` |
| OZ implementation `zero.banza.network` | `origin_verification_state:ORIGIN_PENDING` |
| origin challenge issued | `.well-known/banza/ownership-challenge.json` + publish URL + challenge document |
| origin verify (no published nonce) | **honest** `unreachable / http_status_not_ok` — fail-closed, no false positive |
| recovery (`GET candidates`) | candidate persisted (1) — private registry recovery works |
| logout | session revoked |
| `GET /operators` | `[]` — **no second Operador Zero published** |
| Boundaries at the edge | wrong-method 405 · no-session 401 · cross-site Origin 403 (CSRF) · bad code 401 |
| Existing surfaces | `/banzai` 200 · `/banzai?mode=onboarding` 200 · `/banzai/ask` 200 |
| Model isolation | onboarding is deterministic Rust — **0 Qwen / 0 external calls** |

## 6. Invariants held

- Rust decides; Node never decides. No plaintext code/token/pepper/key stored or logged. Only HMAC
  digests + opaque ids leave the engine.
- A candidate is never a published operator, active participant or certified entity
  (`published_operator_id:null`; `/operators` stays `[]`).
- Onboarding is a hosted BanzAI service, not a protocol rule — third parties need none of it to
  implement the protocol, publish endpoints, run the engines, validate, or generate receipts.
- Origin proof fails closed (no fixture / no bypass); the honest live result is `ORIGIN_PENDING`.
- Home = data-wiring only (registry counts collapsed to the canonical `protocolStatus`); no redesign.

## 7. Out of scope (NOT started)

M2.19H, the L3 Operational Scheme workflows, KYB, AML/CFT operational, scheme admission, real funds,
passkeys, passwords, magic links, advanced team management, multiple permission levels, operator API
keys, Resend webhooks, DNS-TXT as a second proof method, federated registry, release candidate, M2.19I.

## 8. Rollback

- Repo: `git revert 5946ad8` (single squash commit) or checkout `main` before it.
- Runtime: set `BANZAI_ONBOARDING_ENABLED=0` in `/srv/banza-protocol/runtime/.env` and
  `docker compose up -d banzai-api` → the surface goes dark (404) immediately; DB tables are inert.
  `.env` backup at `runtime/.env.bak-pre-m2-19g3-*`; DB backup at `runtime/backups/pre-m2-19g3-*.sql`.

## 9. Deploy notes / gotchas

- Runtime compose/nginx are **copies** under `/srv/banza-protocol/runtime`; synced from the repo at deploy.
- The `/banzai/onboarding/` route shares the `banzai_ask` nginx limit zone (20 r/m, burst 5) — pace
  QA harnesses ≥ ~3.2 s or the edge returns 503 (rate limit, not a defect).
- The reverse-proxy needed `--force-recreate` to load the changed bind-mounted nginx conf **and**
  re-resolve the recreated banzai-api/website upstreams (else 502).
- A new ADR requires: repo-guards ADR range bump, doc-index reindex (`banzai-doc-indexer`), api-kb WASM
  rebuild, vocabulary regen, and the contamination allowlist entry (ADR-069 names the scheme only in its
  out-of-scope list).
- The Postgres migration is applied via `psql` **stdin** (the container mounts only `init/`, not `migrations/`).
