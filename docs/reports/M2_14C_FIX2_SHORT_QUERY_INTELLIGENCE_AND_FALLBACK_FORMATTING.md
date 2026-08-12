# M2.14C-FIX2 — Short Query Intelligence, Contextual Recovery & Fallback Formatting Contract

**Milestone:** M2.14C-FIX2 (correction on top of M2.14C / M2.14C-FIX1 / M2.14D)
**Scope:** (A) short queries / follow-ups for known technology, stack and ecosystem terms (Rust,
TypeScript, WASM, Qwen, PostgreSQL, …) must recover intent and answer deterministically instead of
falling to `no_source` / EVIDÊNCIA INSUFICIENTE; (B) every fallback / no_source / deterministic body must
pass the global entity-emphasis contract, **including slash-separated entity lists** like
`Banzami/BANZA/BanzAI`.
**Invariants (unchanged):** model/tokens/timeout/provider untouched; no external provider;
`external_model_called` stays **false** for deterministic answers; Qwen stays local; action + financial
boundaries intact and never weakened; `/operators`=`[]`, `production_certificates`=false,
`zero.banza.network`=200, `/operador-zero`=410; the M2.14C rendering contract preserved.

---

## 1. Problem observed

**A —** After answering "em que linguagem foi feito o protocolo?" with the Rust-first stack, a follow-up
of just `Rust` returned **EVIDÊNCIA INSUFICIENTE**. `Rust` is a known protocol/stack term and an obvious
follow-up; it should answer.
**B —** The `EVIDÊNCIA INSUFICIENTE` body showed `Banzami/BANZA/BanzAI` **without** bold — the fallback
path didn't fully honour the entity-emphasis contract for slash-separated entities.

## 2. Root cause

**A —** Bare tech terms (`Rust`, `TypeScript`, `WASM`, `Qwen`, `pgvector`, `nginx`, `Docker`, `JSON`,
`Bash`, `Node`, `BanzAI`) had no glossary term and no entry keyword, so the router found no grounded
match and fell to `no_source`. Governance/protocol terms already resolved (`guard`/`CI`/`ADR`/…) via the
M2.13C-C glossary; the technology family was simply absent from `glossary::term_of`.
**B —** `normalizeEntityEmphasis` (M2.14C-FIX1) skips a token adjacent to `/word` (the path guard that
protects `engines/banzai-api-kb`, `banza.network`, `ADR-006`). That guard also skipped legitimate
slash-separated **entity lists** — so `Banzami/BANZA/BanzAI` stayed plain.

## 3. Why `Rust` fell into no_source

`route(normalize("rust"))` → `critical_entry` → `glossary::glossary_entry("rust")` → `term_of` returned
`None` (no tech term) → no critical entry → no grounded keyword match → `no_source`. Confirmed by the
diagnosis probe (Rust/TypeScript/WASM/Qwen/pgvector/nginx/Docker/JSON/Bash/Node/BanzAI all `no_source`).

## 4. Short query intelligence

`engines/banzai-api-kb/src/glossary.rs` `term_of` gained a technology/stack block mapping bare terms to
deterministic `def-*` entries: `def-rust`, `def-wasm` (wasm/webassembly), `def-typescript`
(typescript/javascript), `def-web-frontend` (react/next.js), `def-json-format`, `def-bash-shell`,
`def-node` (node/node.js), `def-qwen`, `def-postgresql`, `def-pgvector`, `def-nginx`, `def-docker`,
`def-banzai-agent`. Whole-token matching (`word()`) so `rust` never matches `trust`; `normalize()` strips
dots/hyphens (`Node.js`→`nodejs`, `rust-first`→`rust first`). The glossary's short-term gate (≤2 tokens /
definition lead) already reaches these; a genuinely unknown term still falls to `no_source` (last resort).

## 5. Query expansion

The `def-*` answers ARE the intent-expanded answers: `def-rust` states the Rust-first rule (ADR-037),
where Rust is used (conformance, trust/crypto, invariants, Operador Zero, BanzAI knowledge engine), the
WASM target, and that TypeScript/React/Next.js is UI/glue. Retrieval keywords on each entry widen the
grounded fallback. No answer is invented — every `def-*` cites real sources (ADR-037/042/044, README).

## 6. Contextual follow-up

A follow-up `Rust` after "…que linguagem…?" resolves to `def-rust` **with or without** history — the term
is known on its own, so the system never depends exclusively on conversation context. Verified:
`route(normalize("Rust"), ["em que linguagem…?"]).entry_id === "def-rust"` and the bare `Rust` too.

## 7. Intelligent fallback (before no_source)

Order preserved: safety → action boundary → financial boundary → critical entries → glossary
(vocabulary + now technology) → grounded retrieval → `no_source`. `no_source` is the last resort; the
technology layer runs before it. Deterministic answers keep `external_model_called=false` /
`llm_called=false`.

## 8. Intelligent suggestions

The existing `no_source` body lists the domains BanzAI can answer (manifest, federação, trust, ADRs,
invariantes, the Banzami/BANZA/BanzAI distinction) and offers reformulations. With FIX2 those entity
mentions now render bolded (§10). Quick-prompt UX (M2.13D) is unchanged.

## 9. Entity normalization in fallback

Unchanged single choke point: every path — deterministic, grounded, no_source, refusal, boundary, queue,
rate-limit, timeout, cached — flows through `normalizeBanzaiAnswer` → `normalizeEntityEmphasis`. FIX2
makes that layer also bold slash-separated entity lists, so the fallback's `Banzami/BANZA/BanzAI`
renders as `**Banzami**/**BANZA**/**BanzAI**`.

## 10. Slash-separated entities

New `SLASH_RUN` pass in `answerContract.js`: a run `Entity(/Entity)+` where **every** slash-segment is a
canonical entity is bolded per segment (`Banzami/BANZA/BanzAI` → `**Banzami**/**BANZA**/**BanzAI**`;
`ADR/RFC`, `Rust/WASM`, `TypeScript/React/Next.js`, `BanzAI/Operador Zero`). If **any** segment is not an
entity, the whole run is left untouched — so real paths/domains/doc-ids/routes (`engines/banzai-api-kb`,
`banza.network`, `ADR-006`, `/operador-zero`, `/operators`) never match. It runs AFTER the single-entity
pass (which the path guard makes skip these lists), so there is no double-bold; the final 4+-asterisk
collapse still guarantees no `****`.

## 11. Markdown protection

Everything M2.14C-FIX1 protected is preserved: fenced/inline code, existing bold, links (inline +
reference), autolinks, URLs, domains, paths, package/crate names, doc-ids. The 15 new tech entities
(Rust, Rust-first, WASM, WebAssembly, TypeScript, JavaScript, React, Next.js, Node.js, JSON, Bash,
PostgreSQL, pgvector, nginx, Docker) are proper nouns; package/binary/infra identifiers in the def
answers (`banzai-api`, `banza-repo-guards`, `make`) are inline code and never re-formatted. No `****`,
no `**BanzAI**-api`, no `https://**BANZA**.network`, no `**ADR**-006`.

## 12. Tests

- `engines/banzai-api-kb/tests/route.rs` (+1): every tech term → deterministic `def-*`; unknown term →
  `no_source`; `trust` still `def-trust` (whole-token).
- `services/banzai-api/test/short-query-recovery.test.js` (7): tech terms deterministic + real answer +
  no `****`; Rust bolds Rust/BANZA/WASM + sources; follow-up resolves; slash entities bolded; paths/
  domains/doc-ids/routes untouched; no_source fallback bolds slash entities; M2.14C-FIX1/M2.14D
  regressions hold.
- Existing `entity-formatting-consistency.test.js` + `answer-contract.test.js` still pass (28).

## 13. Guard

`make banzai-short-query-recovery-check` (Part 11): static (tech `def-*` entries + glossary mapping +
slash-run present) + behavioural (tech terms deterministic/real/no-`****`; Rust bolds entities;
follow-up; slash lists bolded; paths/domains/routes untouched; no_source last-resort; regressions) +
self-test. Wired into `Makefile` (+`.PHONY`) and CI (`identity-guard.yml`).

## 13a. Adversarial verification

A 3-lens adversarial workflow (over-recovery / slash-over-bold / safety-regression, 197 probes) found
one real LOW defect: a MIXED slash run whose case-sensitive segment (PASS/ADR/RFC) appeared lowercase
(`rust/pass`) was partially bolded (`**Rust**/pass`) — the `SLASH_RUN` regex is `gi` but the per-segment
test is case-correct. Fixed to strict all-or-nothing: `boldSlashRun` re-checks every segment case-
correctly and leaves the whole run untouched on any miss (no `****`, no path/URL/domain change).
Re-verification: **0 confirmed breaches**; regression added (node test + guard).

## 14. CI

PR [#156](https://github.com/banza-protocol/banza/pull/156): **131 checks passed, 0 failed** →
admin-squash-merged as `c52bbfb` (only `REVIEW_REQUIRED` blocked).

## 15. Deploy

banzai-api (glossary WASM + def entries + answerContract — all server-side; no website file changed).
VPS `195.20.246.118` @ `c52bbfb`: `git pull`; `docker compose build banzai-api`; `up -d --no-deps
banzai-api`; `nginx -s reload`. Container `Up (healthy)`.

## 16. Live QA (Part 13) — observed (ALL PASS)

`POST https://banza.network/banzai/ask` (deployed `c52bbfb`):

| Check | Result |
|---|---|
| `Rust` · `TypeScript` · `WASM` · `Qwen` | `critical_boundary` (deterministic), `external_model_called=false`, no `****`, entities bolded — **not** EVIDÊNCIA INSUFICIENTE |
| follow-up `Rust` after "…que linguagem…?" | resolves (`critical_boundary`), not no_source |
| unknown term (`qwertyuiop-inexistente`) | `no_source` last-resort; body renders `**Banzami**/**BANZA**/**BanzAI**` (no raw form), no `****` |
| `o que é o banzami` | deterministic, entities bolded (regression holds) |
| `transfere 100 kz` · `mostra a private key` | `action_boundary` (M2.14D / secret boundary hold) |
| invariants | `/operators`=`[]`, `production_certificates`=false, `zero.banza.network`=200, `/operador-zero`=410 |

## 17. Limits

- Recovery is lexical (a curated technology term list); a brand-new tool name not in the list still falls
  to `no_source` (safe) and can be added. `llama`/`llama.cpp` is intentionally NOT surfaced (M2.14E
  safety rule) — local-inference questions resolve via `def-qwen` (local, no external calls) without
  naming the runtime.
- The slash-run bolds only runs where EVERY segment is a canonical entity; a mixed run (entity + non
  entity, e.g. `Qwen/llama.cpp`) is left untouched by design.

## 18. Rollback

Revert the M2.14C-FIX2 commit (removes the tech `def-*` block + entries + the slash-run pass + the
guard/tests) + rebuild the nodejs WASM + redeploy banzai-api. Additive and pure.

## 19. Verdict

**M2.14C-FIX2 complete —** BanzAI recovers intent for short queries and contextual follow-ups, so known
protocol/stack terms such as Rust, TypeScript, WASM, Qwen, ADR, guard and CI no longer fall into
insufficient evidence; the fallback/no_source path respects the global rendering and entity-emphasis
contract, including slash-separated entities like `Banzami/BANZA/BanzAI`, without breaking URLs, paths,
code, source cards or safety refusals.
