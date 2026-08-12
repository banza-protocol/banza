# Final Protocol Repository Architecture (2026-07)

**Base:** `main` `1bccf1a` · **Branch:** `chore/final-protocol-repo-architecture-2026-07`
**Status:** non-normative record of a structural change. No protocol semantics changed.

## Purpose

Apply the definitive **protocol-only** repository architecture. BANZA had accreted
an operator-era layout (`apps/`, root `BANZA_*.md` entry docs, a `docs/{adr,rfc,protocol}`
mix). This change gives every top-level directory a single, unambiguous role so the
repository reads as a *protocol specification* and nothing else.

## The constitutional layout

Each top-level directory answers exactly one question:

| Directory | Question it answers |
|---|---|
| `spec/` | What the protocol **is** — human-normative specification |
| `contracts/` | How a **machine** implements it — OpenAPI, JSON Schemas, events, invariants registry |
| `conformance/` | How correctness is **proven** — suite, vectors, fixtures |
| `decisions/` | How the protocol is **governed** — `adr/` (ADRs) + `rfc/` (RFCs) |
| `docs/` | **Human** documentation — reference, governance, security, guides, images |
| `examples/` | Conceptual illustrations (non-normative) |
| `website/` | The public site — `banza.network` (the only app) |
| `services/` | Minimal public services — `verification-api`, `banzai-api` (mock) |
| `infra/` | Reproducible public infra — compose, nginx, DB schema |
| `tools/` | Validation — purity/identity/invariant checks, conformance CLI |
| `assets/` | Public brand & social assets |

Separation of powers: `spec/` says what is correct; `contracts/` makes it
machine-checkable; `conformance/` proves it; `decisions/` records why. No directory
absorbs another's role. The boundary is fixed in
[`REPOSITORY_STRUCTURE.md`](REPOSITORY_STRUCTURE.md).

## Moves applied (231 renames, history-preserving `git mv`)

| From (operator-era) | To (protocol-only) |
|---|---|
| `docs/protocol/**` | `spec/**` |
| `docs/protocol/federation/**` | `spec/federation/**` |
| `docs/adr/**` | `decisions/adr/**` |
| `docs/rfc/**` | `decisions/rfc/**` |
| `apps/website/**` | `website/**` |
| `apps/verification-api/**` | `services/verification-api/**` |
| `apps/banzai-api/**` | `services/banzai-api/**` |
| `BANZA_ARCHITECTURE.md` | `spec/overview.md` |
| `BANZA_REFERENCE.md` / `BANZA_REFERENCIA.md` | `docs/reference/en/complete.md` / `docs/reference/pt/completa.md` |
| `BANZA_MANIFESTO.md` | `docs/reference/manifesto.md` |
| `BANZA_GOVERNANCE.md` / `BANZA_CERTIFICATION.md` / `BANZA_ROADMAP.md` | `docs/governance/{README,certification-boundary,roadmap}.md` |
| `BANZA_CONFORMANCE.md` | `docs/guides/conformance.md` |
| `BANZA_SECURITY.md` | `docs/security/README.md` |

The empty operator-era `apps/` tree was removed (0 tracked files remained).

## Link & reference integrity

- A context-aware rewrite updated every literal path reference across `.md/.json/.yaml/.yml/.tsx/.ts/.js/.mjs/.sh/.py` and `Dockerfile`/`Makefile` (`.gitignore` fixed separately).
- Depth changes from the moves were repaired with a **suffix-matching resolver**: for each relative link it locates the intended target's real path (preferring the canonical copy over the website's `content/` mirror) and rewrites to the correct relative path.
- Cross-**repo** links into the sibling BanzAI layer (`../banzai/BANZAI_*.md`) were removed: the layer navigation now points to the canonical public home, and deep document references became honest plain text (no fabricated deep URLs). A protocol repo must not hard-link a sibling repo's filesystem.
- **Result: 0 broken relative links** across all tracked Markdown.

The website keeps its self-contained `content/` mirror (`website/content/BANZA_REFERENCIA.md`, read by `website/lib/reference.ts`); its internal filename and diagram provenance captions were intentionally left unchanged.

## Guards & CI updated

- **`purity-check`** — required roots now include `spec/`, `decisions/`, `services/`, `infra/`, `assets/` and the root files (`README.md`, `VERSION`, `LICENSE`, `SECURITY.md`, `Makefile`). The docs taxonomy is fixed to `docs/{reference,governance,security,guides,images}`; `docs/{adr,rfc,protocol,core,…}`, a tracked top-level `apps/`, and root `BANZA_*.md` / `deploy.sh` now fail the guard. ADR series check reads `decisions/adr/`.
- **`identity-check`** and **`purity-check`** — the governance-doc exclusion regex was extended to `SNAKE_CASE` filenames so formal policy/records under `docs/governance/` are consistently excluded from the terminology/brand scan.
- **`validate-compose.sh`** — asserts the three build contexts resolve to absolute repo paths (`.../website`, `.../services/verification-api`, `.../services/banzai-api`); the old `apps/` layout now fails.
- CI path filters and workflow references contain no old paths.

## New / rewritten root & governance content

- **`SECURITY.md`** (new, root) — coordinated-disclosure policy, `security@banza.network`, explicit pre-production / no-bounty / no-certified-operator posture, pointing to `docs/security/`.
- **`README.md`** — Repository Structure block and "contains" note rewritten to the final architecture; the `svg-check` target reference corrected to `reference-svg-check`.
- **Certification claim softened** — "Any operator that passes conformance becomes certified" → an operator that passes conformance produces **technical evidence**; certification, when it applies, is a **separate governance step** — never automatic, never self-declared.
- **`REPOSITORY_STRUCTURE.md`** — rewritten to the constitutional layout and boundary rules.

## Validation

`purity-check` PASS · `identity-check` PASS (Level 1 clean; Level 2 advisory only) ·
`invariant-check` PASS · `reference-svg-check` 27/27 · `validate-compose.sh` ALL PASSED
(three contexts verified) · `docker compose build website` succeeds from the runtime dir ·
JSON/YAML parse-valid · **0 broken relative links**.

## Scope (unchanged)

No change to protocol semantics, contracts, conformance vectors, APIs, or runtime
behaviour. Protocol **v1.0** · `VERSION=1.0.0` · `/operators=[]` ·
`production_certificates=false` · BanzAI remains **mock**. The ADR series
(`ADR-001..036`) and RFC series (`RFC-0001..0006`) are unchanged in content — only
their location moved (`docs/` → `decisions/`). No `.env`, secret, certificate, DNS,
Cloudflare, TLS, PostgreSQL, reverse-proxy, or operator-runtime change.
