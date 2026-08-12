# Phase 7T — Pre-existing Broken Relative Links Closure (2026-07)

**Base:** `main` `3df04e6` · **Branch:** `fix/phase-7t-broken-relative-links-closure-2026-07`
**Status:** documentation micro-phase. Repairs the 7 pre-existing broken relative links surfaced
during Phase 7S. **No** protocol version, contract, conformance-vector, OpenAPI, schema, service,
runtime, VM or secrets change; **no normative wording change** beyond the link paths themselves.

## Objective

Leave the Markdown corpus with **0 broken relative links** and a reproducible check. The 7 links
are relative-depth residues of the 7E/7H restructure (`docs/adr`,`docs/rfc`,`docs/protocol` →
`decisions/` + `spec/`; top-level `reference/` → `docs/reference/`). All target directories exist;
no folder is recreated and no redirect is invented.

## Link checker & how it was validated

Checker: `scratchpad/linkcheck.py` — walks every `.md` (excluding `.git`, `node_modules`, `.next`,
`dist`, `build`, `coverage`, `target`), **skips fenced code blocks and inline code spans** to avoid
false positives, ignores `http(s)`/`mailto`/`tel`/`#anchor`/site-absolute(`/…`)/`data:`, accepts
existing files **and** directories, and reports `file:line [link] -> resolved (reason)`.

**Validation (self-test).** Because Phase 7S hit a silent-zero sweep (shell is `zsh`, which does not
word-split unquoted variables; `grep` resolves to `ugrep`), the checker prints a self-test on every
run: `relative links tested = 259; positive-control links seen = 18` with a known-good control
(`README.md → docs/governance/certification-boundary.md`, target exists = True). Only after the
self-test passes is the "0 broken" result trusted.

**Initial broken count: 7** (exactly reproduced from 7S). **Final broken count: 0.**

## The 7 links

| # | Source | Line | Old link | Classification | New link / action | Reason |
|---|---|---|---|---|---|---|
| 1 | `docs/governance/README.md` | 53 | `[…](decisions/adr/)` | DEPTH_FIX | `[…](../../decisions/adr/)` | From `docs/governance/`, `decisions/adr/` is at repo root (`../../`). |
| 2 | `docs/reference/getting-started.md` | 146 | `[…](adr/)` | DEPTH_FIX | `[…](../../decisions/adr/)` | ADRs live in `decisions/adr/` (display text already said `decisions/adr/`). |
| 3 | `docs/reference/getting-started.md` | 147 | `[…](rfc/)` | DEPTH_FIX | `[…](../../decisions/rfc/)` | RFCs live in `decisions/rfc/`. |
| 4 | `spec/README.md` | 62 | `[`../reference/`](../reference/)` | CURRENT_PATH_FIX | `[`docs/reference/`](../docs/reference/)` | The diagram registry/standards (`BANZA_SVG_REGISTRY.md`, `BANZA_SVG_STANDARDS.md`) live in `docs/reference/`, not a top-level `reference/`. |
| 5 | `spec/federation/FEDERATION_TRUST_MODEL.md` | 19 | `[…](../../../contracts/federation/)` | DEPTH_FIX | `[…](../../contracts/federation/)` | Sibling rows in the same "canonical sources" table correctly use `../../`; only this row was one level too deep. |
| 6 | `spec/federation/FEDERATION_TRUST_MODEL.md` | 20 | `[…](../../../conformance/federation/)` | DEPTH_FIX | `[…](../../conformance/federation/)` | Same table; `conformance/federation/` exists. |
| 7 | `spec/invariants.md` | 41 | `[`contracts/qr/`](../../contracts/qr/)` | DEPTH_FIX | `[`contracts/qr/`](../contracts/qr/)` | From `spec/`, `contracts/qr/` is `../contracts/qr/`; `../../` resolved above the repo root. |

No link was classified HISTORICAL_CONTEXT_ACCEPTED, REMOVE_LINK_KEEP_TEXT, or MANUAL_REVIEW: the
`FEDERATION_TRUST_MODEL.md` rows are a live "**The canonical sources are:**" pointer table (only the
draft *below* it is superseded), so the correct action is a depth fix, not delinking.

## Website publication

None of the 5 changed files is consumed or snapshotted by the website (the website reads
`website/content/` + `website/components/`; no snapshot or `lib`/`app` reference to any of them).
**No website deploy is required** for this phase.

## Old-path sweep

0 forbidden-old-path hits in the 5 changed files. All 7 new links resolve to real current
directories (`decisions/adr`, `decisions/rfc`, `docs/reference`, `contracts/federation`,
`conformance/federation`, `contracts/qr`).

## Files changed

- `docs/governance/README.md` (1 link)
- `docs/reference/getting-started.md` (2 links)
- `spec/README.md` (1 link)
- `spec/federation/FEDERATION_TRUST_MODEL.md` (2 links)
- `spec/invariants.md` (1 link)
- `docs/governance/PHASE_7T_BROKEN_RELATIVE_LINKS_CLOSURE_2026_07.md` (this report)

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · JSON/YAML/OpenAPI valid · website build ·
**broken relative links = 0** (self-test validated).

## Deploy plan

No website-consumed file changed → **no container rebuild/redeploy**. The VM repo is fast-forwarded
to `main` for consistency (inert `git pull`; no rebuild), preserving all container uptime.

## Remaining risk

None. The corpus has 0 broken relative links; the protocol-only architecture is unchanged; the
protocol remains v1.0 / `VERSION=1.0.0`.

## Verdict

All pre-existing broken relative links are repaired with minimal diff and a validated, reproducible
0-broken result. Protocol-only architecture intact; no public regression.
