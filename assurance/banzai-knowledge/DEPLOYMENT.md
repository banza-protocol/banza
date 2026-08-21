# Deployment — `src-2a01974`

## What was deployed, and only that

The runtime diff between the previous production SHA and the merge commit touches
**`services/banzai-api` and `engines/banzai-query-core`** and nothing else. `website/` is untouched:

```
$ git diff --name-only 14df955 2a01974 | grep -c '^website/'
0
```

So **one** service was recreated. Every other container kept its uptime across the deployment, which
is the check that the claim is true rather than intended:

| container | image | restarts | uptime after deploy |
|---|---|---|---|
| banzai-api | `banzai-api:src-2a01974` | 0 | **19:52:23** ← recreated |
| website | `banza-website:src-14df955` | 0 | 17:25:36 |
| reverse-proxy | `nginx:1.27-alpine` | 0 | 22:53:49 |
| verification-api | `banza-verification-api:src-80e6a3b` | 0 | 22:54:20 |
| postgres | `pgvector/pgvector:pg16` | 0 | 22:53:49 |
| banza-fetcher | `banza-fetcher:src-80e6a3b` | 0 | 22:53:49 |
| llama-local | `llama.cpp@sha256:b832a7b…` | 0 | 22:53:49 |

No database migration was required and none was applied; postgres was not restarted.

## Gates cleared before deploying

| | |
|---|---|
| PR #39 checks | 307/307 SUCCESS |
| required contexts | 7/7 SUCCESS |
| merge state | CLEAN, merged as a normal merge commit |
| merge commit | `2a019744fc84e65ac054d92f4bbb471a95667627` |
| parents | `14df955…` (previous main), `0593774…` (PR head) |
| post-merge main CI | 9/9 success — checked on main, not inferred from the PR |
| VM tree | clean, 0 modified files, at the exact merge SHA |

## Rollback

`banzai-api:rollback-prev` on the VM is the pre-deploy `src-14df955` image, tagged before the build.

```bash
cd /srv/banza-protocol/runtime
docker tag banzai-api:rollback-prev ghcr.io/banza-protocol/banzai-api:src-14df955
sed -i 's/^BANZAI_TAG=.*/BANZAI_TAG=src-14df955/' .env
docker compose up -d --no-deps --pull never banzai-api
```

## Post-deploy health

`banzai-api` reports `healthy`; `GET /banzai/runtime` returns `status: ok`, `model_available: true`,
`degraded_capabilities: []`, `external_calls: false`.
