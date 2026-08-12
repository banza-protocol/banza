# Local validation — BANZA network infrastructure

Runnable, **local-only** checks for the infrastructure versioned in `infra/banza-network/`
and the apps in `apps/`. They provision nothing, touch no VM, use no real secrets, certs,
IPs or data, publish nothing, and never call an external LLM. Throwaway containers and
self-signed material are created and destroyed inside each script.

Run individually:
```bash
bash infra/banza-network/tests/validate-compose.sh        # compose static invariants
bash infra/banza-network/tests/validate-schema.sh         # schema on ephemeral pgvector
bash infra/banza-network/tests/smoke-website.sh           # website (host build)
bash infra/banza-network/tests/smoke-verification-api.sh  # verification-api + postgres
bash infra/banza-network/tests/smoke-banzai-api.sh        # banzai-api (mock, offline)
bash infra/banza-network/tests/e2e-full-stack.sh          # whole stack through nginx
bash infra/banza-network/tests/smoke-banzai-real-llm.sh   # MANUAL opt-in only — prints SKIPPED by default
```

## What each script proves
| Script | Proves |
|---|---|
| `validate-compose.sh` | `docker compose config` valid; only `:80`/`:443` published; PostgreSQL exposes no host port; `banza-data` internal; no `privileged`. |
| `validate-schema.sh` | `postgres/init/001_schema.sql` applies on ephemeral `pgvector/pgvector:pg16`: 23 tables (incl. `banzai_answer_cache` with hnsw embedding index, the onboarding tables, and the ADR-076 validation-journey receipt store with append-only triggers), segregated roles, pgvector active, `protocol_state.phase = pre-production`, `operators` empty. |
| `smoke-website.sh` | `website` builds; routes 200 / unknown 404; `pt-PT` honest framing; no operator brand; machine routes not HTML-shadowed by the site; BanzAI demo guardrails. |
| `smoke-verification-api.sh` | `services/verification-api` on a real ephemeral PostgreSQL: 5 machine routes 200 + `application/json` (never HTML); `/operators` = `[]`; `production_certificates: false`; `status: pre-production`; PASS clarified as verifiable technical evidence, not a status grant; writes → 405; unknown → JSON 404. |
| `smoke-banzai-api.sh` | `services/banzai-api` in **mock** mode: `external_model_called: false`; the 9 mandatory questions all grounded with ≥1 cited source; guardrails (cannot certify, PASS is evidence, keys off-VM); insufficient-sources handled; `/index` dry-run computes 0 embeddings; `LLM_PROVIDER=mock`, no `LLM_API_KEY`. |
| `e2e-full-stack.sh` | The whole stack (postgres + verification-api + banzai-api + website + nginx) up locally via throwaway TLS; `nginx -t` valid with real upstreams; website + www→apex + machine routes (JSON, not HTML) + `/operators=[]` + pre-production + BanzAI (grounded, no external model) all served **through nginx**; postgres not published. |
| `smoke-banzai-real-llm.sh` | **Manual, opt-in only — never CI/E2E.** Exercises one REAL hosted call (DeepSeek or Qwen) against a locally started `banzai-api`. Runs only when `RUN_REAL_LLM_TEST=1` **and** `LLM_PROVIDER=deepseek\|qwen` **and** `LLM_API_KEY` are all set; otherwise prints `SKIPPED` (exit 0). Never echoes the key. |

## Local-test overlay
`e2e-full-stack.sh` and the two API smokes apply `compose.local-test.yml` on top of
`compose.yml`. The overlay is **local only** — it builds the app images, publishes
loopback-only ports, uses PostgreSQL `trust` auth (role SEGREGATION via GRANTs is still
enforced — only password auth is relaxed) and forces `LLM_PROVIDER=mock` with no key.
Production continues to use the base `compose.yml` (pinned GHCR tags, no published API
ports). All curls pin `host:8443 -> 127.0.0.1`, so the tests only ever reach the local
stack and never the live domain.

## Status
`verification-api` and `banzai-api` are now **implemented** in `apps/` and exercised
end-to-end above. BanzAI supports **real** LLM inference via hosted DeepSeek/Qwen APIs
(`LLM_PROVIDER` allowlist: `mock` | `deepseek` | `qwen`; the VM runs no models and
needs no GPU) — but the automated tests above always run `mock` and **never** call an
external LLM. Real-provider validation is exclusively the manual, opt-in
`smoke-banzai-real-llm.sh` (guarded by `RUN_REAL_LLM_TEST=1` + key outside Git). The
real embedding indexer (pgvector population) is still a follow-up: `/index` is a
dry-run here.

BanzAI is cost-optimized: deterministic critical answers → exact cache → semantic
cache → budget gate → limited RAG, with the external LLM strictly last. The unit
suite (`npm test` in `services/banzai-api`) proves offline — via an injected HTTP stub —
that critical questions, cache hits, exhausted budgets and ungrounded questions
never reach DeepSeek/Qwen.
