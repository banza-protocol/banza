# Deployment

Two controlled deployments, one per merged repair. Both touched **one** service.

## `src-4238558` (current)

Merge commit `4238558d20b42f1a722751e57b705dc0c2b500cf` — parents `2a01974…` (previous main) and
`48dc8c6…` (PR #40 head). PR checks 307/307 SUCCESS, all 7 required contexts SUCCESS, merge state
CLEAN, post-merge **main** CI 9/9 success — checked on main, never inferred from the PR.

The runtime diff touches `services/banzai-api` and `engines/banzai-query-core`. `website/` is
untouched:

```
$ git diff --name-only 2a01974 4238558 | grep -c '^website/'
0
```

So one container was recreated. The evidence that this is true rather than intended is the uptime
column — every other service still shows the time it started before the deployment:

| container | image | restarts | uptime after deploy |
|---|---|---|---|
| banzai-api | `banzai-api:src-4238558` | 0 | **21:20:17** ← recreated |
| website | `banza-website:src-14df955` | 0 | 17:25:36 |
| reverse-proxy | `nginx:1.27-alpine` | 0 | 22:53:49 |
| verification-api | `banza-verification-api:src-80e6a3b` | 0 | 22:54:20 |
| postgres | `pgvector/pgvector:pg16` | 0 | 22:53:49 |
| banza-fetcher | `banza-fetcher:src-80e6a3b` | 0 | 22:53:49 |
| llama-local | `llama.cpp@sha256:b832a7b…` | 0 | 22:53:49 |

`banzai-api` reports `healthy`. No database migration was required, none was applied, and postgres was
not restarted.

## `src-2a01974` (previous)

Merge commit `2a019744fc84e65ac054d92f4bbb471a95667627` — parents `14df955…` and `0593774…` (PR #39
head). Same shape: 307/307 PR checks, 7/7 required, main CI 9/9, `banzai-api` alone recreated.

## Rollback

`banzai-api:rollback-prev` on the VM is the pre-deploy image, tagged before each build. It currently
holds `src-2a01974`.

```bash
cd /srv/banza-protocol/runtime
docker tag banzai-api:rollback-prev ghcr.io/banza-protocol/banzai-api:src-2a01974
sed -i 's/^BANZAI_TAG=.*/BANZAI_TAG=src-2a01974/' .env
docker compose up -d --no-deps --pull never banzai-api
```

No rollback was needed on either deployment.
