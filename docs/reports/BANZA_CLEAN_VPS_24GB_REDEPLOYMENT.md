# BANZA Clean VPS Redeployment — 24 GB Production Server

> Clean production redeployment of the BANZA protocol stack onto a new server, replacing the previous
> production VPS. **Not a migration**: no runtime data, database volumes, logs, Docker images or legacy
> server state were carried over. PostgreSQL was initialised from an empty volume through the canonical
> migrations; new runtime secrets were generated; the existing Cloudflare Origin Certificate was reused.
> Date: 2026-07-25 (UTC). No secrets appear in this report.

## 1. Objective
Rebuild the entire BANZA production stack from the canonical repository on a new server, validate every
service origin-direct, cut Cloudflare DNS over to the new origin, run live QA on the public domain, and
hand the previous VPS to the operator for cancellation. Explicitly a **clean redeployment**, not a data
migration — confirmed by the project owner that no operational data needed preserving.

## 2. Initial state (source of truth, read-only inventory)
- Previous VPS `195.20.246.118` (Ubuntu), live SHA **`fd67b91`**, 6 containers: `reverse-proxy`
  (nginx:1.27-alpine), `website`, `verification-api`, `banzai-api`, `llama-local` (pinned), `postgres`
  (pgvector/pgvector:pg16).
- Domains: `banza.network`, `www`, `docs`, `banzai`, `zero` (Cloudflare-proxied, Full-strict).
- Config replicated (non-secret): `LLM_PROVIDER=local_qwen`, `COMPOSE_PROFILES=llama-local`,
  `BANZAI_BENCHMARK_APPROVED=true`, `BANZAI_LOCAL_INFERENCE_ENABLED=true`, **`BANZAI_INTENT_INTERPRETER=0`**,
  model `Qwen3-4B-Q4_K_M.gguf`, `EMBEDDING_MODEL=qwen3-embedding`.
- No `pg_dump`, no volume copy, no PostgreSQL data-dir copy, no log/image/checkout copy (per the rules).

## 3. Destination
New IONOS VPS **`82.165.165.97`** — **Ubuntu 26.04 LTS**, 12 vCores, 24 GB RAM, 720 GB NVMe. No Plesk.
(Note: originally provisioned as AlmaLinux 9, re-imaged to Ubuntu 26.04 by the operator before setup;
hardening was adapted from `dnf`/`firewalld` to `apt`/`ufw` accordingly.)

## 4. Hardening (PART 1)
Full `apt` upgrade; hostname `banza-prod`; timezone UTC; admin user `banza` (key-only login + passwordless
sudo, verified from a second session **before** any SSH lockdown); SSH key-only (`PasswordAuthentication
no`, root `prohibit-password`, neutralised the cloud-init password override); 8 GB swap; file/process
limits; journald caps + retention; chrony time-sync; unattended security upgrades.

## 5. Firewall (PART 2)
UFW default-deny inbound; only **22/80/443** open. fail2ban active on the sshd jail (systemd backend).
PostgreSQL, llama-local and the internal APIs have **no host ports** — reachable only on private Docker
networks.

## 6. Docker (PART 3)
Docker Engine **29.6.2** + Compose **v5.3.1** from Docker's official apt repo (the `resolute` release is
available). Daemon enabled at boot; `banza` in the docker group; storage driver overlayfs.

## 7. Structure (PART 4)
`/srv/banza-protocol/{repo,runtime,secrets,certs,postgres,models,artifacts,logs}` — `secrets/` and
`certs/` mode 700; code from Git, secrets outside Git, models outside Git, runtime separate from checkout.

## 8. Repository (PART 5)
`git clone https://github.com/banza-protocol/banza` → checked out the canonical live SHA **`fd67b91`**
(clean tree, correct remote). No files copied from the old VPS.

## 9. New secrets (PART 6)
Fresh `PG_ADMIN/RO/GOV/BANZAI_PASSWORD` generated on-server (`openssl rand`, never printed). `.env`
(chmod 600) replicates the current public config with new secrets and **`BANZAI_INTENT_INTERPRETER=0`
preserved**. `002_roles.sql` generated from `.env` (chmod 640, owner = postgres uid). No secret reused
from the old VPS; no secret value in logs or this report.

## 10. New certificate (PART 7)
The existing Cloudflare **Origin Certificate** was reused per the operator's decision (provided from the
owner's dossier). Installed at `nginx/certs/origin.{pem,key}` (key mode 600). Verified: issuer *CloudFlare
Origin CA*, SAN `*.banza.network` + `banza.network`, valid **→ 2041**, cert/key modulus match confirmed
on-server. Cloudflare SSL mode remains **Full (strict)**.

## 11. Empty PostgreSQL (PART 8)
`pgvector/pgvector:pg16`, internal-only, fresh empty `pgdata` volume. Extensions `vector` + `pgcrypto`.
Segregated roles `banza_ro` / `banza_gov` / `banzai_rw` — **none superuser**. No dump restored.

## 12. Migrations (PART 8)
`001_schema.sql` (schema + roles) and generated `002_roles.sql` (role passwords) ran from the empty
volume via `docker-entrypoint-initdb.d`. Verified pre-production state: **operators=0, certificates=0,
banzai_document=0**, `protocol_state.phase="pre-production"`, `production_certificates=false`.

## 13. Deploy (PART 9)
Images **built on-host from `fd67b91`**: website (342 MB), verification-api (236 MB), banzai-api (233 MB).
`docker compose up -d` with `COMPOSE_PROFILES=llama-local`. Model `Qwen3-4B-Q4_K_M.gguf` downloaded fresh
from the official Qwen HF repo — size 2,497,280,256 bytes, **sha256 `7485fe6f…8534fdf5` (byte-exact match**
to the benchmarked artifact). `BANZAI_INTENT_INTERPRETER=0`; DeepSeek not enabled; no new two-pass model.
All 6 containers healthy.

## 14. Tests (PART 10 — pre-DNS, origin-direct via `curl --resolve`)
Homepage 200; `www`→301→apex; `docs` 200. `/operators`→`[]`; `/certificates` `production_certificates:false`;
`/.well-known/banza/root.json`+`key-manifest.json` 200; **`/operador-zero`→410**. BanzAI: `ADR 002`→
resolves `ADR-002`; informational answers grounded via local_qwen; boundaries (`transfere`, `publica`,
`expõe a chave`) refuse deterministically in ~4 ms; **`reasoning_trace` present, interpreter OFF
(`interpreter_status: skipped`)**; **no internal source (CLAUDE.md) leaked**; no internal port exposed.
Repository-level guards/tests (identity, purity, source-policy, boundary, Rust/Node) were green in CI at
the deployed SHA `fd67b91`.

## 15. Capacity (PART 11)
Idle: ~3.8 GB RAM used / **~19 GB available**, swap unused, load ~1.7, disk 3 %. Per-container: llama
2.6 GB / 7 GB cap; website 52 MB; others < 30 MB; 0 OOM, 0 restarts. **~16–19 GB RAM headroom** remains
for the future single two-pass input/output model (not installed in this phase).

## 16. Cloudflare (PART 12 setup)
Reused Origin cert (§10); SSL Full (strict) unchanged. DNS: apex `banza.network` A-record →
`82.165.165.97` (proxied); `www`/`docs`/`banzai`/`zero` are CNAMEs to the apex and follow automatically.
IONOS mail/domain records (MX/TXT/_dmarc/autodiscover/_domainconnect) untouched. No unrelated Cloudflare
setting changed. DNS records edited by the operator in the dashboard.

## 17. Cutover (PART 12 verification)
Confirmed via unique-probe log correlation: a tagged request to the **public** edge appeared in the
**new VPS** nginx access log (Cloudflare edge IPs forwarding to `82.165.165.97`). Public
`https://banza.network/`→200, **TLS verified (Full-strict validates the origin cert)**; all 5 hostnames
serve. Old VPS quiet immediately after (no fresh public hits).

## 18. Live QA (PART 13 — public edge)
Pages `/`, `/referencia`, `/operadores`, `/banzai`, `/estado`, `/decisoes` → 200. `/operators`→`[]`;
`production_certificates:false`; well-known 200; **`/operador-zero`→410**. TLS HTTP/2 + HSTS +
`X-Frame-Options: DENY` + `X-Content-Type-Options: nosniff` + CSP. BanzAI: boundaries refuse (<0.1 s),
**interpreter OFF**, no leak, no 5xx. Post-traffic: 6/6 healthy, **0 restarts, no 5xx, no ERROR/FATAL**.

## 19. Old-VPS removal (PART 14)
Preconditions met (Cloudflare → new origin; all green; live QA passed; old VPS idle; no DNS/record points
to `195.20.246.118`). Per the mandatory gate, the operator gave explicit final confirmation and elected to
**cancel the old VPS themselves in the IONOS panel** — no teardown action was performed from this session.
No rollback is retained, per the operator's decision.

## 20. SHAs
- Deployed protocol SHA: **`fd67b91`** (`fd67b91e60071f9b21b3e675940af01e83def97e`).
- Repo remote: `github.com/banza-protocol/banza`, branch `main`.

## 21. Images
- `ghcr.io/banza-protocol/banza-website:v1.0.0` (built on-host from `fd67b91`).
- `ghcr.io/banza-protocol/banza-verification-api:v0.1.0` (built on-host).
- `ghcr.io/banza-protocol/banzai-api:v0.1.0` (built on-host, includes the Rust→WASM engines).
- `pgvector/pgvector:pg16`, `nginx:1.27-alpine`, `ghcr.io/ggml-org/llama.cpp@sha256:b832a7b7252a…55d3`
  (digest-pinned).

## 22. Incidents
1. **OS re-image → SSH host-key change.** The server was re-imaged to Ubuntu 26.04, so `ssh-copy-id`
   aborted with "REMOTE HOST IDENTIFICATION HAS CHANGED". Resolved: `ssh-keygen -R` cleared the stale
   key; the operator re-ran `ssh-copy-id` to reinstall the key on the fresh image.
2. **`002_roles.sql` permission-denied on first init.** The file was mode 600 owned by `banza`, so the
   postgres container uid (999) could not read it — roles were created (001) but passwords not set (002).
   Fixed by `chown 999:999` + `chmod 640` on the init scripts, then a clean wipe (`down -v`) and re-init
   of the still-empty volume; both scripts then applied cleanly (3× `ALTER ROLE`, no error). Zero data
   affected.
No other incidents. No boundary/source-policy regression; interpreter never activated.

## 23. Final state
`banza.network` (and `www`/`docs`/`banzai`/`zero`) is **live on the new 24 GB Ubuntu 26.04 server
`82.165.165.97`**, serving the canonical `fd67b91` stack: 6/6 containers healthy, PostgreSQL initialised
empty via migrations, boundaries enforced deterministically, source policy intact, the semantic intent
interpreter **disabled** (`BANZAI_INTENT_INTERPRETER=0`), only 22/80/443 exposed, TLS Full-strict on the
reused Origin cert, ample capacity for the next model phase. The previous VPS carries no traffic and is
being cancelled by the operator.

---

**Verdict** — *BANZA clean VPS redeployment complete — the production protocol stack has been rebuilt from
the canonical repository on the new Ubuntu 26.04 server at 82.165.165.97 with 12 vCores, 24 GB RAM and
720 GB NVMe. No runtime data, database volumes, logs or legacy server state were migrated. PostgreSQL was
initialised from an empty volume through the canonical migrations, new runtime secrets were installed and
the existing Cloudflare Origin Certificate was reused, and the complete infrastructure, protocol, BanzAI,
boundary and source-policy validation passed before and after DNS cutover. The semantic intent interpreter
remains disabled during this infrastructure transition. The previous VPS was confirmed idle after the new
origin went live and is being cancelled by the operator.*
