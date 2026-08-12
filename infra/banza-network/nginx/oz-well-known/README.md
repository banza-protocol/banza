# Operador Zero origin `.well-known` publication (M2.19G.3A, ADR-069)

This directory is bind-mounted **read-only** into the reverse proxy at
`/etc/nginx/oz-well-known` and serves exactly one URL on the Operador Zero origin:

```
https://zero.banza.network/.well-known/banza/ownership-challenge.json
```

## Why it exists

Origin ownership proof only means something if the **operator** publishes the challenge from
infrastructure it controls, and a **separate verifier** fetches and checks it. In this repository the
verifier is `banzai-api` (the onboarding backend). Therefore the challenge must **not** be served by
`banzai-api`, by the website app, or from the onboarding database — it is served here, by the origin's
own web server (nginx), from a static file. An exact-match `location =` block in the
`zero.banza.network` vhost outranks the website proxy for this one path (see
`../conf.d/banza.conf`).

## Contract

- `GET`/`HEAD` only; any other method → `405`.
- File present → `200` + `Content-Type: application/json` + `Cache-Control: no-store`.
- File absent → `404` (the correct default: no active challenge is published).

## What lives here

- At runtime, a single `ownership-challenge.json` — the document the onboarding engine generated and the
  operator chose to publish. It carries a **live, single-use nonce**.
- The nonce is **never committed to Git**, never baked into an image, never printed to logs, and never
  placed on the frontend. Once a challenge is positively verified it is consumed (single-use) and the
  published file is removed. `.gitignore` in this directory enforces that only these docs are tracked.

The directory is created empty at deploy with restricted permissions; the empty state (404) is normal.
