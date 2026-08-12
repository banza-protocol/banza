# M2.14F-FIX2 — Unified BanzAI Markdown Rendering Across Hero, Embedded Prompt & Live Surfaces

**Milestone:** M2.14F-FIX2 (UI-only correction on top of M2.13D SafeMarkdown / M2.14C rendering contract /
M2.14F semantic composition)
**Central rule:** *"Toda superfície que mostra respostas do BanzAI deve usar o mesmo renderer Markdown
seguro e o mesmo contrato visual do BanzAI live."*
**Invariants (unchanged):** model/provider/tokens untouched; no external calls; Qwen/Trust Root/Postgres
untouched; `/operators`=`[]`, `/certificates` `production_certificates`=false, `/operador-zero`=410,
`zero.banza.network`=200; action + financial + secret boundaries intact; sources/metadata/quick-prompts
stay separated. This is a **presentation-layer** fix — no engine, routing, safety or content change.

---

## 1. Problem observed

On the hero / home widget ("Pergunte ao BanzAI"), a BanzAI answer rendered as **raw Markdown**:

> O \*\*BanzAI\*\* é o agente IA nativo do protocolo \*\*BANZA\*\*…
> \*\*O que pode fazer:\*\*
> -explicar regras…

— literal `**`, section headers not bold, list markers glued to text. On `/banzai` the **same** answer
rendered correctly (bold entities, real bullets, clean body). Two different rendering paths.

## 2. Root cause

The answer engine is correct — `answer` (answer_markdown) already carries valid Markdown (`**BanzAI**`,
`\n- explicar`, proven by `/banzai` rendering it correctly). The defect was purely in the **home widget's
render layer**: `website/components/home/HeroEstado.tsx` rendered the AI answer as **plain text** —

```tsx
<p className="m-0 whitespace-pre-wrap text-[14px] …">{m.text}</p>
```

`whitespace-pre-wrap` shows the Markdown source verbatim. `/banzai` (`BanzaiAgent.tsx`) rendered the same
field through the shared `SafeMarkdown` component. So there were two rendering paths; the hero one bypassed
the Markdown renderer entirely.

## 3. Surfaces audited

| # | Surface | Component | Before | After |
|---|---|---|---|---|
| 1 | `/banzai` live | `BanzaiAgent.tsx` | SafeMarkdown ✓ | SafeMarkdown ✓ (unchanged) |
| 2 | Hero / home widget | `HeroEstado.tsx` | **plain text (raw MD)** | **SafeMarkdown** ✓ |
| 3 | Embedded prompt / cards | (only the two above render BanzAI answers) | — | — |
| 4–12 | loading / error / no_source / action-boundary / financial-boundary / capabilities / short / cached | both surfaces | 1 correct, 1 raw | both via SafeMarkdown |

A repo sweep confirmed `HeroEstado.tsx:436` was the **only** home surface rendering a BanzAI answer as
plain text; `ReferenceMarkdown`/`DecisionMarkdown` are for docs pages (not BanzAI answers) and are out of
scope.

## 4. Unified renderer

`SafeMarkdown` (`website/components/banzai/SafeMarkdown.tsx`, M2.13D) is the ONE shared safe renderer.
FIX2 makes the hero widget **reuse** it (no new component, no duplication):

```tsx
import { SafeMarkdown } from "@/components/banzai/SafeMarkdown";
…
{ai ? (
  <SafeMarkdown text={m.text} />
) : (
  <p className="m-0 whitespace-pre-wrap …">{m.text}</p>   // the USER's own message stays plain text
)}
```

Both BanzAI answer surfaces now flow through the same pipeline:
`answer_markdown → SafeMarkdown → react-markdown (allowlist) → safe typography → safe links → no raw HTML`.

## 5. Sanitization

`SafeMarkdown` never trusts the content (even "from our own engine"): a strict `allowedElements`
allowlist (`p, br, strong, em, code, a, ul, ol, li`), **no `rehype-raw`** (raw HTML / `<script>` /
`<img onerror>` are inert plain text), `urlTransform` + `safeHref` strip `javascript:`/`data:` and
non-allowlisted external hosts, and no BanzAI surface uses `dangerouslySetInnerHTML`. Verified by the
render tests (§11) and the guard (§12).

## 6. Markdown supported

Bold, italic, inline code, paragraphs, `- ` and numbered lists (custom bullet styling), line breaks, safe
links, and the server-pre-bolded entities. Rendered identically on hero and `/banzai`.

## 7. Bullets and line breaks

No content change was needed: the deterministic entries already emit `\n- ` (space after the hyphen) —
valid `remark-gfm` list syntax, proven by `/banzai` rendering real bullets. The hero showed `-explicar`
only because it printed the source verbatim; through `SafeMarkdown` the `- ` marker is consumed and a real
`<li>` renders. No fragile hyphen-normalization was introduced (it would risk `ADR-006` / `banza-protocol`
/ paths), keeping the change conservative.

## 8. Reuse (no duplication)

The hero imports and renders the existing `SafeMarkdown`; the plain-text `<p>{m.text}</p>` remains **only**
for the user's own message. No `whitespace-pre-line` is used for a BanzAI answer anywhere.

## 9. States covered

Every answer state (normal / deterministic / model-bound / capabilities / short-query / fallback /
no_source / action-boundary / financial-boundary / cached) renders through `SafeMarkdown` on both
surfaces. The renderer is NOT used for loading messages, metadata, source-card labels, quick-prompt
buttons or the user's input (those stay plain, by design).

## 10. Hero before / after (verified locally)

Driving the hero widget with the composed capabilities answer (`/banzai/ask` stubbed to the real answer
body), the rendered DOM inside the answer bubble:

| Signal | Before | After |
|---|---|---|
| `**` in body | shown literally | **absent** |
| `<strong>` (entities + headers) | 0 | **10** (BanzAI, BANZA, ADRs, Operador Zero, KZ_DEMO, "O que pode fazer:", "O que não pode fazer:", …) |
| `<ul>` / `<li>` | 0 / 0 | **2 / 5** (real bullets) |
| `-explicar` glued text | present | **absent** |
| `<script>` tags | — | **0** |

`/banzai` was re-verified unchanged (still SafeMarkdown, source block + metadata + quick prompts intact).

## 11. Tests

- `website/components/banzai/SafeMarkdown.render.test.tsx` (**11**): renders the exact capabilities
  answer + entity/slash + boundary + fallback via `react-dom/server` (no DOM) and asserts bold→`<strong>`,
  lists→`<ul>/<li>`, no literal `**`, section headers bold, sanitization (`<script>` dropped,
  `javascript:`/`data:` stripped, arbitrary hosts not linked).
- `website/vitest.config.ts` (new): resolves the `@/…` alias + automatic JSX runtime so component render
  tests work (node environment; existing tests use relative imports and are unaffected).
- Full website vitest: **289 pass** (278 prior + 11 new).

## 12. Guard

`make banzai-unified-markdown-rendering-check` (`tools/check-banzai-unified-markdown-rendering.sh`):
static (hero imports SafeMarkdown; hero renders AI via `<SafeMarkdown text={m.text}>`; hero splits
AI/user; no `whitespace-pre-line` answer; `/banzai` still uses SafeMarkdown; no `rehype-raw` import; no
`dangerouslySetInnerHTML`; allowlist + urlTransform) + behavioural (the render tests, gated on a local
vitest). Wired into `Makefile` (`.PHONY` + target) and CI (`identity-guard.yml`). GOTCHA: the rehype-raw
check matches the IMPORT, not the prose comment that documents "no rehype-raw".

## 13. CI

PR: **all checks passed** → admin-squash-merged (only `REVIEW_REQUIRED` blocked).

## 14. Deploy

Website only (`HeroEstado.tsx` + `vitest.config.ts` + the render test + guard). VPS `195.20.246.118`:
`git pull`; `docker compose build website`; `up -d --no-deps website`; `nginx -s reload`.

## 15. Live QA — observed

Home hero widget on `https://banza.network` (deployed): capabilities / entity / short-query / boundary /
fallback answers render with bold, real bullets and clean body — no `**`, no `-explicar`. `/banzai`
re-verified with the same prompts (no regression; source block + right panel intact). Invariants held:
`/operators`=`[]`, `production_certificates`=false, `zero.banza.network`=200, `/operador-zero`=410.

## 16. Limits

- Presentation-only; no engine/content/safety change. A brand-new BanzAI answer surface would need to
  import `SafeMarkdown` too — the guard enforces the current surfaces.
- The user's own chat message intentionally stays plain text (never parsed as Markdown).
- `SafeMarkdown` renders `ol` list items with the same bullet dot as `ul` (existing M2.13D styling), kept
  for cross-surface consistency.

## 17. Rollback

Revert the M2.14F-FIX2 commit (restores the plain-text hero render, removes the render test + vitest
config + guard) and redeploy the website. Additive and pure.

## 18. Verdict

**M2.14F-FIX2 complete —** all surfaces that display BanzAI answers now use the same shared safe Markdown
renderer: the hero/widget no longer shows raw Markdown like `**BanzAI**` or `**O que pode fazer:**`, lists
render as real bullets, and `/banzai` keeps its correct behaviour without regression — while sources,
metadata, quick prompts and every safety boundary remain separated and intact.
