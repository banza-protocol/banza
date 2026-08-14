# BANZA dedicated infrastructure — Phase 1 bundle

Provider-agnostic infra-as-code for the **BANZA/BanzAI-only** VM. Nothing here runs an operator,
wallet, ledger, KYC/KYB or payments. PostgreSQL is never exposed. No production keys on the VM.

## Documentation (read these first)
This directory holds the **deployable artifacts**. The authoritative docs are:
- **Formal annex** — architecture, rationale, topology, routes, key policy, acceptance criteria:
  [`docs/governance/ANNEX-BANZA-NETWORK-INFRASTRUCTURE.md`](../../docs/governance/ANNEX-BANZA-NETWORK-INFRASTRUCTURE.md)
- **Operations** — install, operate, verify, migrate, recover, incidents, golden rules:
  operational deployment notes are maintained outside the public repository.

Design decisions are documented in the canonical ADR set under `decisions/adr/`.

## Contents
| File | Purpose |
|---|---|
| `bootstrap.sh` | Run as root on a fresh Ubuntu 24.04 VM: SSH hardening (key-only, no root/password), ufw (22/80/443), 4 GB swap, fail2ban, unattended-upgrades, Docker, `/srv/banza-protocol/` structure, `banza` service user |
| `compose.yml` | Declarative stack: reverse-proxy (nginx) · website · verification-api · banzai-api · postgres (+pgvector). Fixed image tags. PG internal-only. |
| `nginx/conf.d/banza.conf` | apex site + machine routes; `www`→apex; `docs.` + `banzai.` subdomains; Cloudflare Full-strict + Origin Cert |
| `postgres/init/001_schema.sql` | Dedicated DB `banza_protocol`: trust manifests, operators (empty), BRL, conformance evidence (hashes), audit, BanzAI RAG index + answer cache (pgvector), segregated roles, pre-production marker |
| `.env.example` | Secrets template (copy to `.env`, chmod 600, never commit). Image tags, PG passwords, `LLM_PROVIDER` allowlist (`mock` \| `deepseek` \| `qwen`) + hosted-API settings |
| `backup/banza-backup.sh` | `age`-encrypted pg_dump (daily) + artifacts (weekly), pushed off-VM. Not a runtime dependency |
| `systemd/*.service`,`*.timer` | Boot the stack; scheduled encrypted backups |

## Order of execution (on the new VM)
1. **Provision** the VM (your action — see spec below), get its IP, add your SSH public key.
2. `scp` this bundle to the VM; as root: `SSH_PUBKEY_FILE=/root/.ssh/authorized_keys bash bootstrap.sh`
   → **verify `banza@VM` key login works BEFORE the SSH lockout takes full effect.**
3. Copy `compose.yml`, `nginx/conf.d/`, `postgres/init/` into `/srv/banza-protocol/`.
4. Create `/srv/banza-protocol/.env` from `.env.example` (fill secrets).
5. Place **Cloudflare Origin Certificate** at `nginx/certs/origin.pem` + `origin.key` (chmod 600).
6. As `banza`: `cd /srv/banza-protocol && docker compose up -d`.
7. **Validate the origin LOCALLY** (`curl --resolve banza.network:443:127.0.0.1 -k https://banza.network/`)
   **before any DNS cutover.** No Cloudflare change until origin serves 200.

## Rebuilding & deploying the website (only)

The repo checkout lives at `/srv/banza-protocol/repo`; the running stack (compose + `.env` +
`nginx/` + `postgres/`) lives at `/srv/banza-protocol/runtime`. The `build.context` uses
`${BANZA_REPO}` (default `/srv/banza-protocol/repo`), so the official build works from the
runtime dir with **no manual workaround** and no `.env` change:

```bash
# on the VM, as `banza`
cd /srv/banza-protocol/repo && git pull --ff-only          # get the merged main
cd /srv/banza-protocol/runtime
docker tag ghcr.io/banza-protocol/banza-website:$(grep -oP 'WEBSITE_TAG=\K.*' .env) \
           banza-website:rollback-prev                     # keep a rollback image
docker compose build website                               # builds from /srv/banza-protocol/repo/website
docker compose up -d --no-deps --pull never website        # recreate ONLY the website container
```

- `--no-deps` + naming only `website` guarantees **reverse-proxy, verification-api, banzai-api and
  postgres are NOT recreated** — a website change must never restart them.
- `--pull never` uses the just-built local image instead of re-pulling the old GHCR tag.
- **Rollback:** `docker tag banza-website:rollback-prev ghcr.io/banza-protocol/banza-website:<tag> && docker compose up -d --no-deps --pull never website`.
- Local build (off-VM): `export BANZA_REPO=$(git rev-parse --show-toplevel)` first.

## Configuring the grounded synthesis (M2.18B.6, CPU-only, LIVE)

BanzAI answers with a single grounded synthesis: Rust resolves intent, entity and retrieval
deterministically, the local Qwen2.5-7B explains once from the FactualPackage, and Rust validates before
publishing. The deterministic grounding is the **automatic emergency fallback only** (served if the model
is unavailable or the auto-rollback breaker trips). It is configured entirely from `.env` (the compose env
allowlist + `-fa` flag are already wired above). Accepted CPU profile: brief grounded p50 ≈ 6–11 s compute
(live edge, cold, is higher). Not a sub-10-second SLA. Production values on the current VPS (12 vCore / 24 GiB):

```
LLM_PROVIDER=local_qwen
LLM_MODEL=qwen2.5-7b-instruct-q4_k_m
LLM_MAX_TOKENS=768
LLAMA_MODEL_PATH=/models/candidates/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf   # split gguf; llama.cpp auto-loads shard 2
LLAMA_THREADS=10
LLAMA_CPU_LIMIT=11          # -t 10 needs the cores; leave ~1 for the rest of the stack
LLAMA_MEM_LIMIT=14g
LLAMA_FLASH_ATTN=on         # ~6% generation gain, free
BANZAI_SYNTHESIS_MODEL=qwen2.5-7b-instruct-q4_k_m
BANZAI_SYNTHESIS_TIMEOUT_MS=45000
BANZAI_SYNTHESIS_AUTO_ROLLBACK=1            # circuit-breaker trips to the safe grounding on a bad live error rate
```

Apply: `cd /srv/banza-protocol/runtime && docker compose up -d llama-local banzai-api` (7B model load ~15–30 s).
Any retired flag left in a stale `.env` is ignored and never fails boot. **Emergency rollback**: the
banzai-api image rollback tag is
`ghcr.io/banza-protocol/banzai-api:rollback-pre-m2-18b6`. The runtime auto-rollback breaker already fails
individual turns safe to the deterministic grounding without a redeploy.

## PostgreSQL protocol-state operations

The database is a **verifiable protocol-state store**, not a financial database (ADR-013,
`docs/governance/POSTGRESQL_PROTOCOL_STATE.md`). It holds signed public artifacts, the BanzAI
document index, an audit log and pre-production state markers — never funds, balances, real payment
transactions, bank accounts, cards, KYC/AML data, personal data of end users, or private keys/secrets.
The schema (`postgres/init/001_schema.sql`) is the single source of truth; the boundary is enforced by
`make postgres-data-boundary-check` (CI on every push/PR).

**Read-only audit** (safe; never mutate production during an audit):

```bash
# on the VM, as `banza`, from /srv/banza-protocol/runtime
docker compose exec -T postgres psql -tAX -U banza_admin -d banza_protocol \
  -c "select relname, n_live_tup from pg_stat_user_tables order by relname"   # row counts
docker compose exec -T postgres psql -tAX -U banza_admin -d banza_protocol \
  -c "select extname from pg_extension order by extname"                      # vector, pgcrypto
docker compose exec -T postgres psql -tAX -U banza_admin -d banza_protocol \
  -c "select rolname, rolsuper, rolcanlogin from pg_roles where rolname ~ '^banza'"
docker compose exec -T postgres psql -tAX -U banza_admin -d banza_protocol \
  -c "select table_name, privilege_type from information_schema.role_table_grants where grantee='banzai_rw' order by table_name"
```

- Expected in pre-production: `operators = 0`, `conformance_evidence = 0`, BanzAI index empty; only
  `protocol_state` populated. `banza_ro` is SELECT-only; `banzai_rw` writes only `banzai_document` /
  `banzai_chunk` / `banzai_answer_cache`. No service role is a superuser.
- **Schema changes** go through `postgres/init/*.sql` + `make postgres-data-boundary-check`, never ad-hoc
  DDL. Adding any column/table that can hold financial or personal data must fail the boundary check.
- Role passwords are injected at deploy from `.env` (generated `002_roles.sql`) — never committed.
- Backups are `age`-encrypted and off-VM (ADR-002); they are a recovery mechanism, never in the
  serving path.

## Approved VM spec (Phase 1)
- Region: **EU**. Min: **4 vCPU / 8 GB RAM / 160 GB NVMe / 4 GB swap**. Ubuntu 24.04 LTS.
- 2 vCPU/4 GB only as a throwaway test env.

## Guardrails encoded here
- PostgreSQL: no `ports:` → never reachable from host/internet (only `banza-data` docker net).
- `/operators`, conformance evidence, BRL, manifests → served as **JSON with `status: pre-production`** (M2/M3 pending; PASS = evidence, not certification). **Never** redirect machine routes to HTML.
- BanzAI (`banzai-api`): `BANZAI_MODE=demo`, role `banzai_rw` can write **only** the doc index; reads artifacts to explain; never writes trust/certs; no production keys.
- BanzAI LLM inference (`LLM_PROVIDER` allowlist: `mock` | `deepseek` | `qwen` | `local_qwen`; anything else refuses to start). `deepseek`/`qwen` are hosted (off-host); `local_qwen` (ADR-036) is an internal, sandboxed `llama.cpp` model on the Docker network — on-host CPU, **no GPU**, no key, nothing leaves the host, profile-gated and benchmark-gated (default stays `mock` until the VPS XL+ benchmark approves it; GGUF installed manually, never in Git). A hosted provider key, if used, lives only in `.env` on the VM. Automated tests always run `mock` and never call an external LLM.
- BanzAI cost control: the LLM is the **last resort** — deterministic critical answers → exact cache → semantic cache (pgvector table `banzai_answer_cache` on the VM) → daily/monthly budget gate → limited RAG. Past budget BanzAI keeps answering from deterministic entries and caches, never calling DeepSeek/Qwen. `/ask` is rate-limited per client.
- No root/issuing private keys anywhere. The VM serves signed public artifacts only.
