# Deployment

Three controlled deployments, one per merged repair. Each touched **one** service.

| deployed SHA | merge commit | parents | PR checks | required | main CI |
|---|---|---|---|---|---|
| `src-acb0f1b` | `acb0f1b…` | `6c56a6a…` + `84be776…` | 307/307 | 7/7 | 9/9 |
| `src-6c56a6a` | `6c56a6a…` | `1c893be…` + `e15902f…` | 307/307 | 7/7 | 9/9 (Identity Guard flaked once; re-run green) |
| `src-1c893be` | `1c893be…` | `ef21f43…` + `aec6fd6…` | 307/307 | 7/7 | 9/9 |
| `src-acfba64` | `acfba64c…` | `4238558…` + `5508305…` | 307/307 | 7/7 | 9/9 |
| `src-4238558` | `4238558d…` | `2a01974…` + `48dc8c6…` | 307/307 | 7/7 | 9/9 |
| `src-2a01974` | `2a019744…` | `14df955…` + `0593774…` | 307/307 | 7/7 | 9/9 |

Post-merge CI was checked **on main** each time, never inferred from the PR. All three were normal
merge commits — no squash, no rebase, no force push, no admin override.

## The fourth deployment

`src-1c893be` carries the universe-closure work: the semantic denominator, the atomic invariant units,
the domain layer, the comparison and hybrid engines, and the conversational referents. It is the first
of the four whose service scope was proven by diffing each container's BUILD CONTEXT rather than the
tree as a whole:

```
$ git diff --stat ef21f43..main -- services/banzai-api engines/banzai-query-core engines/banzai-api-kb
  31 files changed, 5997 insertions(+), 443 deletions(-)
$ git diff --stat 14df955..main -- website
  (empty)
```

`verification-api` and `banza-fetcher` carry a delta relative to `src-80e6a3b` that predates this
programme and that this programme did not introduce. They were NOT deployed: "deploy only what is
proven changed" cuts both ways, and shipping an unrelated pending change under cover of this one would
make the uptime evidence below meaningless.

## Only one service, and the proof of it

The runtime diff never touched `website/`:

```
$ git diff --name-only 14df955 acfba64 | grep -c '^website/'
0
```

So one container was recreated each time. The evidence that this is true rather than intended is the
uptime column after the final deployment — every other service still shows the time it started before
any of this began:

| container | image | restarts | uptime |
|---|---|---|---|
| banzai-api | `banzai-api:src-1c893be` | 0 | **25 seconds** ← recreated |
| website | `banza-website:src-14df955` | 0 | 18 hours |
| reverse-proxy | `nginx:1.27-alpine` | 0 | 9 days |
| verification-api | `banza-verification-api:src-80e6a3b` | 0 | 9 days |
| postgres | `pgvector/pgvector:pg16` | 0 | 9 days |
| banza-fetcher | `banza-fetcher:src-80e6a3b` | 0 | 9 days |
| llama-local | `llama.cpp@sha256:b832a7b…` | 0 | 9 days |

`banzai-api` reports `healthy` after each. No database migration was ever required, none was applied,
postgres was never restarted, and no rollback was needed.

## Rollback

`banzai-api:rollback-prev` on the VM is the pre-deploy image, tagged before each build. It currently
holds `src-ef21f43`.

```bash
cd /srv/banza-protocol/runtime
docker tag banzai-api:rollback-prev ghcr.io/banza-protocol/banzai-api:src-ef21f43
sed -i 's/^BANZAI_TAG=.*/BANZAI_TAG=src-ef21f43/' .env
docker compose up -d --no-deps --pull never banzai-api
```
