# BANZA v1.0.0 — VM E2E Reset

> Phase B of the truth reset. The BANZA runtime was destroyed and rebuilt. No secrets, key material,
> passwords, tokens or certificate private material appear in this report.
>
> **The Trust Root was not touched.** Its private material has never resided on the VM (ADR-028) and
> is held offline under 2-of-3 custody. "Fresh trust" in this milestone means a clean deployment of
> the already-approved public chain, not a new ceremony.

| | |
|---|---|
| Host | `banza-prod`, Ubuntu 26.04 LTS |
| Rebuilt from | `main` `27c13c5` |
| Deploy | performed |
| Root Trust Ceremony | **not performed, by decision** |

---

## 1. Before → After

| | Before | After |
|---|---|---|
| Containers | 7 | **7** |
| Images | **19** (8 rollback/dangling) | **7** |
| Volumes | 2 | **2** (new) |
| Docker networks (BANZA) | 4 | **4** (new) |
| Build cache | **45.84 GB** | 2.99 GB |
| `/srv/banza-protocol` | 489 MB + 4.4 GB models | rebuilt |
| `.env.bak-*` files | **7** | **0** |
| DB backups / dumps | **5** | **0** |
| `compose.yml.bak-*` | **3** | **0** |
| Disk used | **63 GB** | **21 GB** |
| Public ports | 22, 80, 443 | 22, 80, 443 |

## 2. Destroyed

Every BANZA runtime artifact, without migration:

- all containers, then the compose project;
- all BANZA images including eight `rollback-pre-m2-*` tags, plus dangling images and the entire
  45.8 GB build cache;
- both volumes, including `pgdata` — the PostgreSQL data directory;
- the whole `/srv/banza-protocol` tree: the previous repository clone, the runtime, `.env`, seven
  `.env.bak-*` files, three `compose.yml.bak-*` files, five database dumps and SQL backups, the
  application logs, the `bench/` tree, `secrets/`, `artifacts/`, and the TLS material.

No Redis existed. No BANZA systemd unit, timer or cron job existed. No BANZA nginx configuration
existed on the host — nginx runs only in a container.

**No `/old`, `/legacy`, `/archive` or equivalent was created.** Git holds the history; the VM holds
only the present.

## 3. One preservation, stated

The Qwen GGUF weights (4.4 GB) were moved aside and restored. They are a third-party binary
dependency in the same category as a base image — they contain no BANZA state, and re-downloading
them reproduces identical bytes from an external host. Everything else was destroyed and regenerated.

## 4. Rebuilt

| Element | Source |
|---|---|
| Repository clone | `git clone` of `main` at `27c13c5` |
| `compose.yml`, nginx config, DB init SQL | copied from that clone |
| Application secrets | **all regenerated**; no value carried over |
| PostgreSQL | new volume, schema created from `001_schema.sql`, roles from a `002_roles.sql` generated at deploy from the new `.env` |
| TLS | **new certificate and key**, generated on the clean install |
| Images | pulled from GHCR at the pinned tags in `compose.yml` |

Database after rebuild: **24 tables, every one at 0 rows.**

## 5. Two findings the reset produced

### 5.1 The deployed model was right and the repository was wrong

The VM ran Qwen2.5-7B-Instruct from a directory named `candidates/` while the repository documented
Qwen3-4B. That reads as drift; it is the opposite. The benchmark verdict records an explicit selection
of the 7B over the 14B under unchanged thresholds.

Phase A had deleted that verdict because nothing cited it. It was restored, and the selection was made
reproducible in `docs/banzai/LOCAL_QWEN_MODEL_SETUP.md` and `.env.example` before the rebuild, so the
VM was rebuilt from a repository that agrees with it (`c9303f7`).

**The lesson, recorded because it cost real work:** absence of citation does not prove absence of
function.

### 5.2 A deploy step was documented but easy to miss

`001_schema.sql` creates the service roles with `LOGIN` and no password; the passwords are applied by
a `002_roles.sql` *generated at deploy from `.env`*, as the infra README states. Skipping it produces a
subtle failure: local socket connections succeed under `trust`, so the database appears healthy, while
every TCP connection from the application containers fails password authentication.

The symptom was misleading in a way worth recording — the verification API returned `503` with a
correct-looking pre-production body, which is indistinguishable at a glance from ADR-031's honest
empty state. It is not: an empty registry returns **200**. A 503 there means the registry is
unreachable.

## 6. End-to-end validation

**Infrastructure** — `nginx -t` passes; TLS serves the new certificate; public ports are 22, 80 and
443 only; **PostgreSQL is not published**, verified from off-host; no Redis.

**Website** — `/`, `/whitepaper/pt`, `/referencia`, `/banzai`, `/registo-tecnico`, `/certificacao`
all 200.

**Protocol publication** — `/.well-known/banza/key-manifest.json`, `/.well-known/banza/root.json`,
`/federation/revocation-list.json`, `/conformance/evidence` all **200**; `/operators` returns
**`[]`**.

**Declared state** — `pre_production: true`, `production_certificates: false`, `/operators == []`.

**Negative / fail-closed** — `DELETE /operators` → 405; unknown route → 404; the retired
`/certificates` route → 404; malformed JSON to `/banzai/ask` → 400; PostgreSQL unreachable from
outside.

**No-legacy** — "Certificate Authority", `banza-conformance/run.py`, "Banzami Operational Scheme" and
the retired "quatro classes" trust wording are all absent from the served surface. BanzAI answers
about `BCJ/1` and mentions none of them.

## 7. The gap that prevents declaring the reset complete

**No workflow in the repository builds or publishes the application images.**

`.github/workflows/` contains no image build step. The GHCR tags the VM pulls — `banza-website:v1.0.0`,
`banzai-api:v0.1.0`, `banza-verification-api:v0.1.0`, `banza-fetcher:v0.1.0` — were produced outside
the repository, and nothing in `main` reproduces them.

So the rebuild satisfied §57 for everything `main` controls: the clone, compose, nginx, database
schema and migrations, secrets, TLS and the model configuration. It cannot satisfy it for the
application code itself, because the path from a commit to a running image does not exist in the
repository.

The practical consequence: **the repository consolidation from Phase A is not yet running.** The
deleted development history, the corrected trust wording, the operator-neutral layer name and the
licensing hierarchy are all in `main`; the containers serve images built before them.

This is the deepest form of the divergence this milestone set out to eliminate, and it cannot be
closed by a cleanup. It needs a committed build-and-publish pipeline, which is a change to how the
project releases software.
