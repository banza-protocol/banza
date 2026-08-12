# M2.13D — BanzAI Answer Formatting, Citation UX & Source Presentation Polish

**Phase:** M2.13D (sub-phase of M2.13 — BanzAI repository-wide knowledge).
**Scope:** BanzAI chat rendering (`website/components/banzai/*`, `website/components/home/banzaiKb.ts`).
**Nature:** presentation only. No model, tokens, timeout, reasoning, provider, retrieval, indexer,
routing, action-boundary, Trust Root, operators or `/operators` change.

---

## 1. Objective
Improve the READABILITY of BanzAI answers: highlight key terms, separate the answer from its sources,
make sources clickable and visually distinct, keep metadata discreet, and never let references read as
part of the answer — all with sanitized Markdown so nothing dangerous can render.

## 2. Problem observed
For `falo de licença do software banza`, the answer was correct but the UX mixed everything: the
`Fonte: LICENSE, NOTICE.` citation sat inside the answer paragraph, sources were low-hierarchy pills all
linking to `/referencia`, `**Apache License 2.0**` showed its literal Markdown markers (the body was
rendered as plain text), and quick-prompt suggestions looked like the citations.

## 3. Rendering changes
- **Markdown answers.** The AI answer body now renders through `SafeMarkdown` (react-markdown) instead
  of plain text — bold, italic, inline code and short lists format correctly. The user's own message
  stays plain text.
- **Dedicated source block.** A new `SourceBlock` ("FONTES USADAS · N") renders citations in their own
  block below the answer, each a card with a category LABEL, title and `repo · path`, clickable to the
  file on GitHub.
- **Trailing citation removed.** When the source block renders, the adapter strips a trailing
  `Fonte:/Fontes:/Sources:` line from the body (the backend text keeps it for text-mode/export).
- **Quick prompts separated.** Follow-up suggestions render LAST, under a `CONTINUAR` label, as plain
  pills with no category/path/icon — structurally distinct from the source cards.
- **Discreet metadata.** The per-answer execution line stays mono + muted, below the sources.
- **Refusal badge.** A deterministic refusal keeps a `RECUSA SEGURA` badge.

## 4. Markdown rules (allowlist)
`SafeMarkdown` allows only `p, br, strong, em, code, a, ul, ol, li`. Everything else (`img`, headings,
tables, `pre`, blockquote, **raw HTML**) is dropped (`unwrapDisallowed` keeps the text). No `rehype-raw`
→ raw HTML is never parsed, so `<script>`, `<img onerror>`, iframes and inline handlers are inert.

## 5. Sanitization
- Links pass a protocol/host allowlist (`safeLinks.safeHref`): internal same-origin paths, or `https`
  to `github.com/banza-protocol/*`, `banza.network`, `*.banza.network`. `javascript:`, `data:`,
  `mailto:`, `http:` and arbitrary hosts are refused → rendered as plain text (react-markdown
  `urlTransform` + a custom `a` renderer, defence-in-depth).
- Applied to BOTH model and deterministic answers for consistency.

## 6. Source block
`safeSourceHref(path, repo)` builds a stable GitHub link (`blob/main/<path>`, or `tree/main/<dir>` for
globbed registry paths), respecting each source's own repo. It returns `null` (non-clickable) for
sensitive/excluded paths (`.env`, private keys, `.pem/.key`, secrets, dumps, build output/WASM) and for
the retired `/operador-zero` route — never a live source. Categories map to distinct labels + tones
(LICENÇA/gold, CÓDIGO/gray, RELATÓRIO/green, SEGURANÇA/wine, …); labels distinguish classes without
relying on colour.

## 7. Quick prompts
Rendered after the sources under `CONTINUAR`; plain pills, no source affordances — never confused with
citations.

## 8. Metadata
`Resposta determinística · sem chamada ao modelo · N fontes` stays visible but secondary (mono, muted),
below the sources — never mixed into the answer.

## 9. Before / after (`falo de licença do software banza`)
- **Before:** one grey block; `**Apache License 2.0**` shown literally; `Fonte: LICENSE, NOTICE.` inside
  the paragraph; sources = pills → `/referencia`; suggestions look like citations.
- **After:** **Apache License 2.0** and **não é licença financeira** bold; body ends at the sentence; a
  `FONTES USADAS · 3` block with `[REFERÊNCIA] Apache-2.0 licence — banza · LICENSE`,
  `[REFERÊNCIA] NOTICE — banza · NOTICE`, `[CÓDIGO] Cargo.toml — banza · engines/operator-zero-core/…`,
  each linking to `github.com/banza-protocol/banza/blob/main/<path>`; discreet metadata; `CONTINUAR`
  pills below.

## 10. Tests
- `website/components/banzai/safeLinks.test.ts` (5) — the link allowlist (internal / GitHub-org / BANZA
  hosts allowed; `javascript:`/`data:`/`http:`/external refused).
- `website/components/home/banzaiKb.test.ts` (+5) — trailing `Fonte:` stripped only when a source block
  exists; rich sources with category/repo/safe href; sensitive & `/operador-zero` paths never linked;
  globbed paths → tree link; cross-repo respected. **262 website tests pass.**

## 11. Guards
- **New:** `make banzai-answer-rendering-ux-check` (`tools/check-banzai-answer-rendering-ux.sh`) — 15
  static invariants (Part 13) + the link-safety/adapter unit tests. Wired into
  `.github/workflows/identity-guard.yml`.

## 12. CI
`identity-guard.yml` validates the website through STATIC guards (the repo runs no npm/vitest/next in
CI); the new guard's static invariants run there, and its unit-test run is gated on the local test
runner. Local battery: tsc, 262 vitest, `next build`, and guards (rendering-ux, identity, purity,
rust-rule, private-key-leak, answer-quality-eval, intent-source-ranking) all green.

## 13. Deploy
Merged to `main` as `cf2227f` (PR #137); **website container only** rebuilt + restarted on the VPS
(`docker compose build website` → `up -d --no-deps website`). banzai-api, llama-local, verification-api,
Postgres, nginx, Trust Root, operators and DNS/TLS untouched.

## 14. Live QA
**Local browser QA** (dev server, stubbed `/banzai/ask`):
- `falo de licença do software banza` → bold key terms; body has no `Fonte:`; `FONTES USADAS · 3` with
  clickable GitHub blob links; discreet metadata; `CONTINUAR` pills distinct.
- Markdown injection (`<script>`, `<img onerror>`, `[x](javascript:…)`, `[y](data:…)`): `xssFired=false`,
  0 script tags, 0 img tags, 0 `javascript:`/`data:` anchors — dangerous content is inert.

**Prod browser QA** (`https://banza.network/banzai`, deploy `cf2227f`, real backend, 0 console errors):
- **Flagship** `falo de licença do software banza` → deterministic answer with **marcas** bold /
  *financeira* italic, body ends at "…O BANZA não licencia, aprova nem certifica operadores." (**no
  `Fonte:`**); `FONTES USADAS · 2` → `[REFERÊNCIA] Apache-2.0 licence — banza · LICENSE` and
  `[REFERÊNCIA] NOTICE — banza · NOTICE`, both linking to `github.com/banza-protocol/banza/blob/main/…`;
  metadata "Resposta determinística · sem chamada ao modelo · 2 fontes"; `CONTINUAR` pills distinct.
- **Grounded** (a live Qwen answer, 7 sources, external calls 0, 39.3s) → `FONTES USADAS` with mixed
  `[REFERÊNCIA]`/`[NORMA]` category cards, each `repo · path` + link arrow; the globbed
  `decisions/adr/ADR-031-*.md` correctly links to `tree/main/decisions/adr`; file sources link to
  `blob/main/…`; metadata "Gerado por Qwen local · chamadas externas: 0 · 7 fontes"; quick prompts
  separate.

## 15. Accessibility
The source block is a `<section aria-label="Fontes usadas">` with a `<ul>`/`<li>` structure; titles and
paths `truncate` (no overlap on small screens); links open in a new tab with `rel="noopener noreferrer
nofollow"`; quick prompts are `<button>`s with focus rings. Answer, sources and suggestions are three
distinct regions for keyboard/screen-reader users.

## 16. Limits
- Raw HTML in a model answer renders as inert escaped TEXT (visible but never executed); deterministic
  answers never contain it and the backend disables reasoning, so this is an edge case only.
- Source links use branch `main` (the API carries no per-source commit yet); if commit metadata is added
  later, `safeSourceHref` can pin it.

## 17. Rollback
Presentation-only and website-only. Revert the PR (or redeploy the previous website image) to restore the
plain-text render; the backend, retrieval and safety are untouched.

## 18. Verdict
**M2.13D complete** — BanzAI answer rendering and citation UX are polished: key terms are highlighted,
sources are visually separate and clickable, metadata is secondary, quick prompts are distinct from
references, Markdown is safely sanitized, and live browser QA (local + prod) confirms the chat is clearer
without weakening retrieval, security or action-boundary guarantees.
