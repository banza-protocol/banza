# Phase M2.7E — Systemwide SVG Quality Repair & Visual QA

**Date:** 2026-07-18 · **Branch:** `feat/m2-7e-systemwide-svg-quality-repair-2026-07`
**Type:** `fix(svg)` — repair all protocol diagrams + add visual-quality checks (website-only)

## Objective
Audit, repair, redesign, or remove every SVG used in the website, reference, docs, and assets so that no
diagram shows overlapping text, clipped text, misaligned elements, low legibility, old language, or an
outdated architecture — and make those guarantees machine-enforced. The named trigger: the "BanzAI ·
adjacente" text overlap in the protocol-overview diagram.

## Decision
Official BANZA SVGs are protocol-documentation artifacts. A diagram with overlapping text, broken layout,
stale semantics, or low legibility **fails review**. Codified in
[`SVG_QUALITY_POLICY.md`](SVG_QUALITY_POLICY.md); enforced by `make svg-visual-quality-check` +
`make reference-svg-check`.

## Audit (PARTE 1)
68 SVGs inventoried (`docs/diagrams`, `docs/reference/diagrams`, `docs/images`, `website/public/diagrams`,
`conformance/badges`). Deep 27-agent per-file audit of the reference-served set + 5 batch audits (32
agents, 0 errors). Full record: [`M2_7E_SVG_QUALITY_REPAIR_AUDIT.md`](M2_7E_SVG_QUALITY_REPAIR_AUDIT.md).
Every served diagram already had `<title>`/`<desc>`/`viewBox` and was pure-vector; the defects were
overlap/clip/tiny-text and stale internal semantics out of sync with already-clean captions.

## The overlap defect (PARTE 2)
`banza-protocol-architecture-overview-v1.svg` (SVG-P-057): the "BanzAI · adjacente" left label (`x=266`)
collided with the right-anchored "explica · não decide · não certifica · não é fonte normativa" (`x=636`,
`y=466`) — ~43px overlap. Repaired by shortening the right label to "explica · não decide · não certifica"
(clear >70px gap). Same diagram's stale footer (`certificado BANZA`, `certificados de produção dependem de
M2/M3`) was rewritten to the active-model state. Verified in the browser — no overlap.

## Repairs & redesigns
- **4 semantically-heavy items (hand-authored + browser-verified):**
  `banza-protocol-architecture-overview` (SVG-P-057), `banza-trust` (SVG-P-031 — "Certificados" layer →
  signed metadata + evidence), `banza-controlled-federation-gate` (SVG-P-054 — M2/M3 gate → Open Trust
  Evaluation + L3+), `banza-roadmap-m1-m6` (SVG-P-050 — "Primeiro Operador Certificado" → "em Produção").
- **10 mechanical repairs (parallel workflow, each independently re-verified):** clip/overlap/term/font
  fixes across `banza-federation`, `banza-developer-flow`, `banza-local-execution-model`, `banza-operators`,
  `banza-governance`, `banza-operator-conformance-lifecycle`, `banza-certification`,
  `banza-boundary-protocol-operator-infra`, `banzai-cognitive-engine`, `banzai-non-goals`.
- **EN + docs:** 3 `docs/reference/diagrams/en/*` got a `<desc>` and active-model term fixes
  (`certification criteria`/`operator certs` → conformance / evidence); 2 `docs/diagrams/*` raised from
  7.5px to ≥8px. Broken embed `banza-vision-2030-v1.svg` (never created) removed from
  `docs/reference/overview.md`.

## Removals (PARTE 8)
11 orphan SVGs (embedded nowhere) removed from `website/public/diagrams`: 6 byte-duplicates of the
canonical `docs/diagrams/` copies (which remain) + 5 unique-unused (recoverable from git history). The
served tree is now exactly the 27 reference-embedded diagrams. Registry updated
([`BANZA_SVG_REGISTRY.md`](../reference/BANZA_SVG_REGISTRY.md)).

## New quality guard (PARTE 6)
`tools/check-svg-visual-quality.sh` (`make svg-visual-quality-check`, CI job `svg-visual-quality`) holds
official diagram SVGs to: `<title>`/`<desc>`/`viewBox` present; pure-vector (no data:/base64/`<image>`/no
external resource ref — example URLs in text are allowed); 8px legibility floor; and active-model
semantics (bilingual PT/EN, negation-aware; badges structure-exempt; `docs/images` legacy out of scope).
Ships with 12 self-tests (fixtures for BANZA CA, operador certificado, raster, missing title/desc, tiny
font, "Clientes e Comerciantes", EN certificate authority, external href — must fail; valid diagram,
negated certificate, example-URL-in-text, EN-negated — must pass). Self-test bugs found and fixed during
build: `while read` last-line skip; over-broad external-URL match (text URLs); marked-absence
("intentionally empty") negation cue.

## Tests (PARTE 10)
`make svg-visual-quality-check` ✓ · reference-svg-check ✓ · public-surface-clean ✓ · home-minimal ✓ ·
workbench-only ✓ · governance-docs-clean ✓ · open-governance ✓ · regulatory ✓ · identity ✓ · purity ✓ ·
invariant ✓ · private-key-leak ✓. Website: type-check ✓ · 115/115 vitest ✓ · `next build` (81 pages) ✓.

## Browser QA (PARTE 7 & 12)
`/referencia/completa`: 27 diagrams render, 0 broken, no diagram exceeds the viewport (the only horizontal
overflow comes from pre-existing `<code>`/`<table>` content in their own scroll boxes — not diagrams),
0 console errors. Full-size screenshots confirmed the 4 heavy redesigns render clean with no overlap: the
overview's "BanzAI · adjacente" row is now clearly separated; the trust diagram shows no "Certificados"
layer; the roadmap shows "Primeiro Operador em Produção"; the federation gate shows Avaliação Aberta de
Confiança + Âmbito L3+.

## Adversarial review (PARTE 11)
The 17 changed SVGs were re-examined by an independent adversarial pass (per-file skeptic hunting for
overlap/clip/tiny-text/outside-viewbox/forbidden-semantic). 15 came back clean; 2 confirmed defects were
fixed and re-verified clean: a row-④ clip in `banza-federation-v1.svg` ("— compensação bilateral" past
its highlight band → font 8.5 + x-nudge) and a same-baseline overlap of the two model-arrow labels in
`banzai-cognitive-engine-v1.svg` ("call: draft" / "draft ↑ verify" at y=440 → staggered to y=428/462).
Guard + browser QA re-run green.

## Negative confirmations (PARTE 12/14)
No BANZA CA, operator certificate, certified operator, certification-as-flow, certificate authority,
central human approval, `Clientes e Comerciantes`/`Utilizadores` as a layer, legacy operator brand, or
M2/M3-as-operator-tool asserted in any SVG. No raster/base64/external-resource references. No DNS/TLS/
Cloudflare/Postgres/`.env`/secrets touched. `/operators = []` and `production_certificates = false`
unchanged. Deploy is website-only.
