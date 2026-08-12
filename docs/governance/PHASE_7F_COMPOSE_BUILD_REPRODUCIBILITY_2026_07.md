# Phase 7F — Website Compose Build Reproducibility (2026-07)

**Base:** `main` `54c5e73` · **Branch:** `fix/phase-7f-compose-website-build-reproducibility-2026-07`
**Status:** non-normative record.

## Cause
`infra/banza-network/compose.yml` declared `build.context: ../../website`. That relative
path is correct **from the repo** (`repo/infra/banza-network/ → repo/website`), but the
running stack is deployed to `/srv/banza-protocol/runtime/`, where `../../website` resolves
to `/srv/website` (does not exist). The real source is `/srv/banza-protocol/repo/website`.
Phase 7E therefore needed a manual `docker build` workaround outside compose.

## Fix (minimal, permanent)
`build.context` now uses an absolute path variable with a VM-correct default:
`context: ${BANZA_REPO:-/srv/banza-protocol/repo}/apps/<service>` (applied to `website`,
`verification-api`, `banzai-api` for consistency). Consequences:
- On the VM, `docker compose build website` (from the runtime dir) resolves to
  `/srv/banza-protocol/repo/website` with **no `.env` change and no manual workaround**.
- For a local build, set `BANZA_REPO=$(git rev-parse --show-toplevel)`.

## Files changed
- `infra/banza-network/compose.yml` — build contexts + explanatory comment.
- `infra/banza-network/.env.example` — documents the optional `BANZA_REPO` override (not a secret).
- `infra/banza-network/README.md` — official "rebuild & deploy the website (only)" flow, with rollback and the rule that reverse-proxy / verification-api / banzai-api / postgres are never recreated for a website change.
- `infra/banza-network/tests/validate-compose.sh` — regression guard asserting the website build context is an absolute `.../website` path (not the relative `../../` / `/srv/apps` form).

## Validation
`validate-compose.sh` ALL PASSED (incl. the new context assertion) · `reference-svg-check` 27/27 ·
`purity-check` PASS · `identity-check` PASS · `invariant-check` PASS.

## Scope
No protocol/contract/conformance/API/runtime change; no website content change; no
reverse-proxy/verification-api/banzai-api/postgres/DNS/Cloudflare/TLS/secrets/`.env` change.
Protocol v1.0 · `VERSION=1.0.0` · `/operators=[]` · `production_certificates=false` · BanzAI mock.
