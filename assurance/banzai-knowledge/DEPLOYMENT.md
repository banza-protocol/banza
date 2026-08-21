# Deployment

Three controlled deployments, one per merged repair. Each touched **one** service.

| deployed SHA | merge commit | parents | PR checks | required | main CI |
|---|---|---|---|---|---|
| `src-acfba64` | `acfba64c…` | `4238558…` + `5508305…` | 307/307 | 7/7 | 9/9 |
| `src-4238558` | `4238558d…` | `2a01974…` + `48dc8c6…` | 307/307 | 7/7 | 9/9 |
| `src-2a01974` | `2a019744…` | `14df955…` + `0593774…` | 307/307 | 7/7 | 9/9 |

Post-merge CI was checked **on main** each time, never inferred from the PR. All three were normal
merge commits — no squash, no rebase, no force push, no admin override.

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
| banzai-api | `banzai-api:src-acfba64` | 0 | **22:20:11** ← recreated |
| website | `banza-website:src-14df955` | 0 | 17:25:36 |
| reverse-proxy | `nginx:1.27-alpine` | 0 | 22:53:49 |
| verification-api | `banza-verification-api:src-80e6a3b` | 0 | 22:54:20 |
| postgres | `pgvector/pgvector:pg16` | 0 | 22:53:49 |
| banza-fetcher | `banza-fetcher:src-80e6a3b` | 0 | 22:53:49 |
| llama-local | `llama.cpp@sha256:b832a7b…` | 0 | 22:53:49 |

`banzai-api` reports `healthy` after each. No database migration was ever required, none was applied,
postgres was never restarted, and no rollback was needed.

## Rollback

`banzai-api:rollback-prev` on the VM is the pre-deploy image, tagged before each build. It currently
holds `src-4238558`.

```bash
cd /srv/banza-protocol/runtime
docker tag banzai-api:rollback-prev ghcr.io/banza-protocol/banzai-api:src-4238558
sed -i 's/^BANZAI_TAG=.*/BANZAI_TAG=src-4238558/' .env
docker compose up -d --no-deps --pull never banzai-api
```
