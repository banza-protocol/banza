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

## 7. Provenance, and a correction to an earlier reading of it

An earlier draft of this report treated the absence of a GHCR/GitHub Actions image pipeline as a
blocker. **That reading was wrong**, and the correction matters more than the conclusion.

**BANZA does not use GHCR or GitHub Actions as its build or publication mechanism.** The registry
names in `compose.yml` are local tag names, not a dependency: every first-party service carries a
`build:` context pointing into `${BANZA_REPO:-/srv/banza-protocol/repo}`. The stack is built on the
host from the cloned repository. Nothing was missing — the first rebuild simply used `compose pull`
where `compose build` was the correct operation.

The images were therefore rebuilt from source, with provenance made unambiguous rather than assumed:

- the four first-party images were removed;
- `docker compose build --no-cache --pull=false` rebuilt them from the clone at `80e6a3b`;
- they are tagged **`src-80e6a3b`** — a tag that exists in no registry, so a pulled image could not
  satisfy it;
- no first-party image without that tag remains on the host.

| Service | Image | Source |
|---|---|---|
| website | `banza-website:src-80e6a3b` | `website/` at `80e6a3b` |
| verification-api | `banza-verification-api:src-80e6a3b` | `services/verification-api/` |
| banzai-api | `banzai-api:src-80e6a3b` | `services/banzai-api/` |
| fetcher | `banza-fetcher:src-80e6a3b` | `engines/banza-artifact-fetcher/` |

Third-party dependencies remain at the versions the repository pins: `nginx:1.27-alpine`,
`pgvector/pgvector:pg16`, and the digest-pinned `llama.cpp`.

The model is the external dependency it has always been, kept out of Git and verified in place:
`qwen2.5-7b-instruct-q4_k_m`, 3 993 201 344 bytes, SHA-256 recorded at deploy. This is the model the
benchmark selected, per §5.1.

**Everything running on the VM is now traceable to `80e6a3b`.**

## 8. TLS — the transitional certificate was replaced

A self-signed certificate was generated during the reset as a workaround, because the previous origin
certificate had been destroyed with the rest of the runtime and no reissue path was available at that
moment.

It has been replaced by the project's **Cloudflare Origin Certificate**, supplied out of band and
installed into the path the deployment defines:

- issuer: CloudFlare Origin SSL Certificate Authority;
- covers `banza.network` and `*.banza.network`;
- valid to 2041-07-15;
- certificate and private key verified as a matching pair before any reload, without exposing key
  material;
- private key `0600`, owned by the service user; no copy left in a home or temporary directory;
- the transitional self-signed certificate and key are gone, and the origin no longer serves them.

`nginx -t` passes and the origin serves the Cloudflare Origin certificate. **The origin is
technically prepared for Cloudflare Full (strict).** Whether the zone is actually set to Full (strict)
could not be verified from the VM — no Cloudflare credentials are present, and none were introduced.
That setting should be confirmed in the Cloudflare dashboard.

## 9. Final end-to-end

Re-run after the rebuild from source and the certificate installation.

**Infrastructure** — `nginx -t` passes; the origin serves the Cloudflare Origin certificate; the
self-signed is gone; the private key is `0600`; public ports are 22, 80, 443 only; PostgreSQL is not
published; no Redis exists.

**Website** — `/`, `/whitepaper/pt`, `/referencia`, `/banzai`, `/registo-tecnico` all 200.

**Protocol** — `key-manifest.json`, `root.json`, `revocation-list.json`, `/operators`,
`/conformance/evidence`, `/banzai/runtime` all 200. `/operators` is `[]`; `pre_production` is true;
`production_certificates` is false.

**Negative** — `DELETE /operators` → 405; unknown route → 404; the retired `/certificates` → 404;
malformed JSON → 400; PostgreSQL unreachable from off-host.

**Database** — 24 tables from the committed schema, containing only the two rows the initialisation
seeds into `protocol_state`. No historical data.

**No-legacy** — "Certificate Authority", `banza-conformance/run.py`, "Banzami Operational Scheme" and
the retired trust wording are absent from the served surface.

## 10. BanzAI's role is unchanged

The deployment is orchestrated on the host, from the repository. That is an operational arrangement
and it changes nothing about BanzAI's standing: it is not a normative source, it determines no
conformance, it is not a fourth layer, and no protocol message or payment is required to pass through
it. The authority remains the Normative Manifest and the specification.

## 11. Runtime source alignment

Repository HEAD and runtime source commit differ, and the difference was proven rather than assumed.

| | |
|---|---|
| Repository HEAD | `c7c720c` |
| Runtime source commit | `80e6a3b` |
| Difference | **documentation only — no runtime-affecting file changed** |

**Runtime remains at `80e6a3b` because every change through `c7c720c` was proven non-runtime-affecting.**

The interval `80e6a3b..c7c720c` contains one commit and modifies exactly one file: this report. It was
checked against every consumer that could carry a document into the runtime, not merely classified by
its extension:

| Consumer | Contains it? |
|---|---|
| BanzAI document index | no — `docs/audit/` contributes 0 chunks |
| BanzAI repository index | no |
| Canonical protocol vocabulary | no |
| `banzai_api_kb` WASM | no |
| Website content | no |
| Normative manifest | no |
| Any Dockerfile `COPY` | no — none of the four copies `docs/` |

The decisive check is structural rather than textual: **`docs/` lies outside all four build contexts.**
Every first-party context is a subdirectory — `website/`, `services/verification-api/`,
`services/banzai-api/`, `engines/banza-artifact-fetcher/` — so no file under `docs/` can enter an image
regardless of its content.

Confirmed by comparing the trees directly: all four build contexts are **git-identical** between the
two commits, and `infra/banza-network/` is unchanged. Rebuilding from `c7c720c` would reproduce the
same images from the same sources, so it was not done.

## 12. Final verification

**Provenance — source commit to running container.** Each first-party service was matched from its
image to the container executing it:

| Service | Image `src-80e6a3b` | Running container image | |
|---|---|---|---|
| website | `2de0f9e976f3` | `2de0f9e976f3` | match |
| verification-api | `e7d4adf73333` | `e7d4adf73333` | match |
| banzai-api | `edd1d7ef8574` | `edd1d7ef8574` | match |
| fetcher | `ceee5469171d` | `ceee5469171d` | match |

**Model.** `qwen2.5-7b-instruct-q4_k_m`, 3 993 201 344 bytes,
SHA-256 `dfce12e3862a5283ccfb88221b48480e58745165de856439950d0f22590580db`, at the runtime path the
`.env` declares. This is the benchmark-selected model of §5.1. No new benchmark was run.

**TLS.** nginx references `origin.pem` and `origin.key`; the pair still matches; the key is `0600`;
the origin serves the CloudFlare Origin SSL Certificate Authority; no self-signed certificate exists
anywhere under `/srv`. `nginx -t` passes.

**Origin readiness for Full (strict): PASS.** The Cloudflare zone mode requires owner-side panel
confirmation — no Cloudflare credentials are present on the VM and none were introduced.

**Legacy scan.** Zero on every axis: no `rollback-pre-*` image, no first-party image outside the
`src-` tag, no exited container, no dangling volume, no `.env.bak*`, no `compose.yml.bak*`, no dump or
backup, no self-signed certificate, no Qwen3-4B artifact, no `candidates/` directory, and no `/old`,
`/legacy` or `/archive` tree.

**Database.** 24 tables, 2 rows — the `protocol_state` seed and nothing else. PostgreSQL is not
published; listening ports are 22, 53 (local resolver), 80 and 443.

---


**BANZA v1.0.0 — REPOSITORY & VM E2E TRUTH RESET COMPLETE.**

`protocol_version` is unchanged at 1.0.0. The Whitepaper was not touched. The Trust Root was not
touched, and no ceremony was performed.
