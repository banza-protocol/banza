# ADR-008 — Protocol infrastructure independent of any operator

- **Status:** Accepted
- **Date:** 2026-07
- **Supersedes/relates:** ADR-001 (implementation independence), ADR-001 (operator separation), ADR-002 (ecosystem hierarchy)

## Context
BANZA is an open protocol. Its public surface (`banza.network`, the site, the verification
anchors) must not be hosted **as a guest tenant on any operator's VM**: sharing an operator's
reverse proxy, TLS certificates and Docker networks would couple the protocol's availability and
blast radius to a single operator's banking stack — contradicting the operator-neutrality
invariant (BANZA must never depend on any operator).

## Decision
BANZA and BanzAI run on a **dedicated VM/VPS used exclusively for the protocol**, with its own
reverse proxy, TLS, network and database. The VM contains **only** protocol artifacts and BanzAI —
no operator code, wallet, ledger, KYC/KYB, payments, accounts, or commercial operator names.

## Consequences
- The protocol's availability no longer depends on any operator.
- Clear separation: operator infrastructure and protocol infrastructure never share a host.
- Slightly higher operational cost (a dedicated VM) — accepted as the price of neutrality.
- All examples remain neutral (Operador A/B/C); the reference operator has no privileged position.

---

## Dedicated PostgreSQL and encrypted off-VM backups

- **Status:** Accepted
- **Date:** 2026-07
- **See also:** ADR-026 (canonical, enforced protocol-state data boundary)

## Context
The protocol must serve public, signed artifacts (key manifest, root manifest, operator registry,
revocation list, conformance evidence hashes) and index its own documentation for
BanzAI. This requires durable storage that is **not** a managed external backend (no Supabase /
Firebase / external managed DB as an operational dependency), to keep the protocol self-contained
and operator-neutral.

## Decision
BANZA runs its **own dedicated PostgreSQL** (with `pgvector` for BanzAI) inside the protocol VM's
Docker-internal network. The database:
- is **never** published to the host or the internet (internal Docker network only);
- uses **segregated roles**: `banza_ro` (serve public routes), `banza_gov` (governed writes to
  trust/registry, audited), `banzai_rw` (BanzAI doc index only — never trust/registry);
- stores **only** public protocol artifacts, the BanzAI document index, and a protocol audit log —
  **no** wallet/ledger/balance/account/KYC data, and **no private keys**. The normative
  data boundary — what the protocol database may and may not represent — is defined and enforced
  by ADR-026.

Backups are **encrypted with `age`**, **off-VM** (object storage), daily (`pg_dump`) and weekly
(public artifacts). Backups are a **recovery mechanism only**, never an operational runtime
dependency; the private decryption key stays off the VM.

## Consequences
- Self-hosted, no external managed backend dependency.
- Least-privilege DB access enforces "BanzAI explains, does not define".
- Recovery is possible without the backups being in the serving path.

---

## Deploy model: Docker Compose, pinned images, secrets outside Git

- **Status:** Proposed
- **Date:** 2026-07

## Context
The protocol infrastructure must be simple, reproducible and auditable, without leaking secrets into
version control and without a build toolchain on the production VM.

## Decision
- The stack is defined by a single **Docker Compose** file, versioned in `banza-protocol/banza`.
- Service images are built in **CI** and published to **GHCR with fixed tags** (no `:latest`); the
  VM **pulls pinned tags** (no on-VM build).
- **Secrets** live only in `/srv/banza-protocol/.env` (`chmod 600`, **not in Git**); a committed
  `.env.example` documents required variables.
- Host lifecycle via **systemd** (`banza-protocol.service` on boot; `unattended-upgrades`; `ufw`).
- Rollback = previous pinned tags + `pg_dump` taken before migrations.

## Consequences
- Reproducible, declarative deployments; clear rollback path.
- No secrets in Git; no build dependencies on the serving VM.
- Config is code (in Git); data and secrets are not.

---

## DNS and TLS: Cloudflare proxied, Full (strict), Origin Certificate

- **Status:** Accepted
- **Date:** 2026-07

## Context
`banza.network` is managed on Cloudflare. The origin must present a trusted certificate and the
machine routes must never be cached stale or shadowed by redirects.

## Decision
- `banza.network` (and `docs.`/`banzai.` subdomains) are **proxied** through Cloudflare (orange),
  with SSL/TLS mode **Full (strict)** and a **Cloudflare Origin Certificate** on the origin nginx.
- `www.banza.network` → 301 to the apex. "Always Use HTTPS" enabled.
- **Cache bypass** for the canonical machine routes (`/.well-known/banza/*`, `/operators`,
  `/federation/*`, `/conformance/*`); normal caching for static site assets.
- **DNS cutover only after the new origin serves 200 locally** (validated with `--resolve`), to
  avoid prolonging the `521` state.

## Consequences
- Trusted TLS end-to-end (edge Universal SSL + validated origin cert).
- Machine routes are always fresh and never HTML-redirected.
- Controlled, verifiable cutover.
