# M2.14C-FIX1 — BanzAI Entity Formatting Consistency & Markdown Emphasis Contract Hardening

**Milestone:** M2.14C-FIX1 (correction on top of M2.14C)
**Scope:** every textual occurrence of a canonical ecosystem entity in an answer body is bold — not
just the first — through a single global emphasis layer, with canonical spelling and no collateral
damage to code / links / paths / domains / package names / document ids.
**Invariants (unchanged):** model/tokens/timeout/reasoning/provider untouched; `external_model_called`
stays **false**; Qwen stays local; no PostgreSQL/llama.cpp exposure; Trust Root, real operators,
`/operators`, `/certificates` untouched; `/operador-zero` stays 410; no real money / real Kz; KZ_DEMO
stays demo-only; the M2.14C rendering contract (clean body, sources only in `sources[]`, no
`Fonte:`/`Fontes citáveis:`/`Sources:` in the body) is preserved.

---

## 1. Problem observed

After M2.14C, some answers looked inconsistent: a canonical entity was bold on its **first** occurrence
and plain on every later one — e.g. "o que é o **Banzami**" bolded *Banzami* once and left the following
*BANZA* / *BanzAI* / *Banzami* mentions unformatted. The M2.14C highlight pass (`applyMinimalHighlights`)
bolded only the first hit of each capped term, so long answers read as bold-once / plain-thereafter.

## 2. Root cause

`applyMinimalHighlights` walked a term list and replaced only the **first** match per term (with a global
cap of 6 highlights). That produced the first-occurrence-only look. It was also term-drift-tolerant only
by accident (it wrapped the matched text as-is, so lower-cased "banzai" stayed lower-cased).

## 3. Fix — a single global layer `normalizeEntityEmphasis`

`applyMinimalHighlights` (+ `HIGHLIGHT_TERMS` / `HIGHLIGHT_CAP`) was **removed** and replaced by
`normalizeEntityEmphasis(md)` in `services/banzai-api/src/answerContract.js`, applied at the same single
choke point (step 3b of `normalizeBanzaiAnswer`, which the server runs on **every** `/ask` response). It:

1. splits the body on a **PROTECTED** regex — fenced ```code```, double- & single-backtick inline code,
   existing `**bold**`, inline `[links](…)` / `![images](…)`, full reference links/images
   `[t][ref]`, reference definitions `[ref]:`, `<autolinks>`, and bare `https?://…` URLs — and transforms
   only the plain segments (even indices), copying protected spans verbatim (odd indices);
2. bolds **every** whole-token occurrence of the canonical entities via **two combined single-pass
   replacers** (one case-insensitive → canonical spelling, one case-sensitive → as-is). A single global
   `replace` consumes each match and advances past it, so a broader entity ("Financial Action Boundary")
   is **never** re-scanned by a narrower one ("Action Boundary") — this is what prevents self-nesting;
3. as a belt-and-suspenders net, collapses any 4+-asterisk run left by an entity abutting a protected
   `**bold**` across a split boundary into two separated bold delimiters, so the body **never** carries
   `****`.

The earlier draft looped one `.replace()` **per entity**, which (a) re-wrapped "Action Boundary" inside
an already-wrapped "**Financial Action Boundary**" → `****`, and (b) glued a wrapped entity to an
adjacent protected `**bold**` → `****`. Both are fixed by the combined single-pass + collapse above (see
§12 adversarial verification).

## 4. Canonical entities

Ordered most-specific first (so "Financial Action Boundary" wins over "Action Boundary"):

| Entity (canonical) | Match | Spelling normalized? |
|---|---|---|
| Financial Action Boundary | case-insensitive | yes |
| Action Boundary | case-insensitive | yes |
| Apache License 2.0 | case-insensitive | yes |
| Operador Zero | case-insensitive | yes |
| Trust Root | case-insensitive | yes |
| KZ_DEMO | case-insensitive | yes |
| Banzami | case-insensitive | yes |
| BanzAI | case-insensitive | yes |
| BANZA | case-insensitive | yes |
| Qwen | case-insensitive | yes |
| PASS | exact | as-is |
| ADR / ADRs | exact | as-is (plural preserved) |
| RFC / RFCs | exact | as-is (plural preserved) |

`ci: true` entities emit the canonical spelling (so "banzai" → **BanzAI**, "operador zero" → **Operador
Zero**); `ci: false` entities (PASS, ADR, RFC) preserve the matched text so plurals like **ADRs** survive.

## 5. What is deliberately NOT an entity

Common words — protocolo, operador, pagamento, carteira, conta, ledger, etc. — are **not** in the table,
so ordinary prose is not peppered with bold. Only named ecosystem entities are emphasised.

## 6. Protection: code / links / URLs

Fenced code, inline code, existing bold, markdown links, and URLs are kept verbatim (split out before any
replacement). So `` `banza init` ``, `[banza](https://x/banza)`, `https://banza.network`, and a fenced
block containing `const banza = 1;` are never bolded, while a plain *BANZA* in the same paragraph is.

## 7. Protection: paths / domains / packages / document ids

Two lookaround boundaries frame every match:

```
const BEFORE = "(?<![\\w@])(?<!\\w[./-])";
const AFTER  = "(?![\\w@])(?![./-]\\w)";
```

A match must not be preceded/followed by a word char or `@`, nor sit inside a `word./-…` run. This spares
`banza.network`, `banzai-api`, `engines/banzai-api-kb`, `BANZA.md`, and `ADR-006`, while a trailing
sentence period ("… do BANZA.") still matches (the period is followed by a space, not a word char).

## 8. No double-bold

Because existing `**bold**` runs are part of the PROTECTED split, an already-bold entity is never
re-wrapped: the output never contains `****`. Verified across single, repeated, and mixed-case inputs.

## 9. Whole-word matching

`BANZA` never matches inside `Banzami` or `BanzAI` (the AFTER boundary rejects the following `m`/`A`). The
most-specific-first ordering plus the boundaries mean "Só o Banzami aqui." bolds only **Banzami**.

## 10. Guard — `make banzai-entity-formatting-consistency-check`

`tools/check-banzai-entity-formatting-consistency.sh` (static + behavioural + self-test):

- **Static (1–7):** `normalizeEntityEmphasis` defined and applied; the old `applyMinimalHighlights` pass
  is gone; PROTECTED regions (incl. fenced code) defined; `CANONICAL_ENTITIES` present with the core
  entities; the path-safe `BEFORE`/`AFTER` boundaries present; the server still applies the normalizer at
  the `/ask` choke point.
- **Behavioural (8–17, node drives the committed engine + normalizer):** every occurrence is bold; never
  `****`; existing bold intact; inline/fenced code, links, URLs protected; domains/packages/paths/doc-ids
  not bolded; canonical spelling emitted; whole-word (plurals bold, doc-ids preserved); common words not
  bolded; every sampled deterministic answer has ≥1 bold; the M2.14C clean-body/source-separation
  contract preserved.
- **Self-test (18):** all plain occurrences bolded, `banza.network` spared, no `****`.

Wired into `Makefile` (target + `.PHONY`) and CI (`identity-guard.yml`, BanzAI action-boundary job). The
M2.14C `banzai-global-answer-format-contract-check` condition 3b was updated from the old function name to
`normalizeEntityEmphasis`.

## 11. Tests

`services/banzai-api/test/entity-formatting-consistency.test.js` (13): every-occurrence bolding; no
`****` / existing bold kept; code/link/URL protected; paths/domains/packages/doc-ids not bolded;
canonical spelling; whole-word (plurals + doc-ids); common words not bolded; every sampled deterministic
answer has ≥1 bold; rendering-contract preserved; plus 4 `fix1/adv` regressions (multi-word entities
never self-nest; entity abutting protected bold never yields `****`; reference links/unclosed code not
emphasised inside; bold-italic `***` preserved). The M2.14C `answer-contract.test.js` highlight tests
still pass unchanged (they assert via the public `normalizeBanzaiAnswer`, so the rename is transparent).

## 11a. Adversarial verification + redesign

A 5-lens adversarial workflow (double-bold / over-bold / under-bold / protection-bypass / spelling-
integrity) generated **218 inputs**, ran each through the actual function, and a verifier re-ran every
candidate. It confirmed a **high-severity, real-world** defect in the first draft: the per-entity
sequential replace mangled the bare phrase **"Financial Action Boundary"** (a real M2.14D term) into
`**Financial **Action Boundary****` — a `****` on ordinary prose with no user asterisks — because the
narrower "Action Boundary" rule re-matched inside the already-wrapped broader term. Lower-severity `****`
cases were found where a wrapped entity abuts a protected `**bold**` with no whitespace, and bolding
leaked into reference-style links / unclosed code spans. The function was **redesigned** (combined
single-pass replacers + metacharacter-safe boundaries + expanded PROTECTED + a 4+-asterisk collapse net,
§3/§6/§7/§8). Re-verification: all confirmed inputs now render clean (a single bold, no `****`).
Regressions were added to both the node test (`fix1/adv` cases) and the guard (conditions 18).

## 12. Live QA (Part 12) — observed (ALL PASS)

`POST https://banza.network/banzai/ask` (deployed `57e3480`, banzai-api rebuilt + nginx reloaded):

| Check | Result |
|---|---|
| `o que é o banzami?` | `**Banzami**` ×3, `**BANZA**` ×3, `**BanzAI**` ×3 — **every** occurrence bold; no `****`; no in-body `Fonte:`/`Sources:`; `external_model_called=false` |
| `o que é a financial action boundary?` | no `****` (self-nesting regression fixed live); `external_model_called=false` |
| `transfere 100 kz` (M2.14D boundary) | `intent=action_boundary`; no `****`; `external_model_called=false` — refusal intact |
| invariants | `/operators`=`[]`, `production_certificates`=false, `zero.banza.network`=200, `/operador-zero`=410 |

## 13. Full battery (local)

node `services/banzai-api` **180** passed (167 + 13 new); `banzai-entity-formatting-consistency-check`
PASS; `banzai-global-answer-format-contract` / `banzai-action-boundary` /
`banzai-financial-action-boundary` / `banzai-governance-developer-vocabulary` / `banzai-protocol-
vocabulary` / `banzai-answer-rendering-ux` PASS; `identity-check` / `purity-check` / `rust-rule-check` /
`private-key-leak-check` PASS (banza-repo-guards rebuilt after the allowlist edit).

## 14. Invariants

`/operators`=`[]`, `production_certificates`=false, `zero.banza.network`=200, `/operador-zero`=410;
`external_model_called`=false; model/tokens/provider/Trust Root/Postgres/DNS untouched; KZ_DEMO demo-only.
This is a pure server-side rendering change (answerContract.js only — no WASM rebuild, no route/prompt
change, no website change).

## 15. Rollback

Revert the M2.14C-FIX1 commit (removes `normalizeEntityEmphasis` + the guard/test + the allowlist +
Makefile/CI wiring) and redeploy `banzai-api`. Additive and pure; reverting only restores the prior
first-occurrence highlighting. No data, no schema, no infra involved.

## Verdict

**M2.14C-FIX1 complete — BanzAI answers now format canonical ecosystem entities consistently:** every
textual occurrence of Banzami / BANZA / BanzAI / Operador Zero / KZ_DEMO / ADR / RFC / Qwen / Trust Root /
Action Boundary / Financial Action Boundary / Apache License 2.0 is bold and correctly spelled, through a
single global layer that never touches code, links, URLs, paths, domains, package names or document ids,
never double-bolds, and never over-bolds common words — while the M2.14C rendering contract is preserved.
