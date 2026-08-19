# Website Phase 2 — Block E2 execution state

An engineering ledger, not protocol documentation. It exists so E2 can be executed across sessions
without re-deriving the plan each time: the queue below is fixed, and each unit records what was
actually committed and proven rather than what was intended.

Seven earlier attempts at E2 each ended in a corrected measurement rather than shipped work — the file
count went 28 → 17, the item count 754 → 630, the `.ts` modules were assumed machine-only and turned
out to be the two largest reader surfaces. That discovery is finished and frozen below. This file is
what stops it from being repeated.

## Baseline

| | |
|---|---|
| branch | `feat/website-phase2-bilingual-parity` |
| E1 frozen at | `4e13af6` (COMPLETE AND FROZEN) |
| BanzAI backend frozen at | `f336bfa` (COMPLETE AND FROZEN) |
| registry at E2 start | implemented_en 17 · missing_en 5 · intentional_pt_only 1 |
| registry target | implemented_en 22 · missing_en 0 · intentional_pt_only 1 |
| canonical inventory | `docs/website/e2-presentation-inventory.json` (generated) |
| inventory generator | `tools/gen-e2-presentation-inventory.py` |

Website locale vocabulary is `pt | en` from `website/lib/i18n.ts`. The BanzAI runtime's `pt-PT` tag is a
different vocabulary and must not enter Website presentation code.

## Frozen discovery

19 production source files · 659 raw occurrences · 658 reader-facing · 1 machine-only.

| owner class | files | note |
|---|---|---|
| reader-component | 13 | React presentation owners |
| reader-data-module | 2 | `banzai-agent.ts` (121), `suggestions.ts` (73) — no React context reaches them |
| transparent | 2 | `BanzaiWorkspaceProvider`, `BanzaiRouteBinder` — zero reader items; this is the locale boundary |
| mixed | 1 | `traceVerifier.ts` — a reader status plus canonical JSON literals |
| machine | 1 | `safeLinks.ts` — hostnames only |

`FORBIDDEN_PHRASES` in `banzai-agent.ts` is **machine-only**: it is guard input asserted by
`banzai-agent.test.ts` and deliberately excluded from `lib/publicSurface.test.ts`. It is not reader copy
and stays out of the localization catalogue.

## Standing rules

- **Localize once.** When an owner enters the semantic presentation architecture, its PT is preserved
  *and* its EN is authored in the same unit. Do not plan a second pass over the same 658 items.
- **Public EN routes stay disabled** until closed-world EN coverage is complete (Q6). An EN shell around
  a Portuguese application is the exact defect mutation C caught in E1.
- **No silent PT default** below the route boundary — no `locale ?? "pt"`, no global locale, no pathname
  or browser inference.
- **Semantic facts stay single-source.** Mixed records keep `mode` / `icon` / `key` / `group` / `href`;
  only the reader label is localized.
- A unit is `GREEN_COMMITTED` only when implementation is committed, the relevant suite is green and the
  tree is clean. A mutation is `MUTATION_PROVEN` only after a green baseline, a real changed-state
  mutation, RED for the intended reason, exact restore and a green rerun.

## Queue

| # | unit | state | commit | notes |
|---|---|---|---|---|
| Q1 | `banzai-agent.ts` — semantic ids, PT parity, EN authoring, `getAgentPresentation(locale)`, E2-C2 | **MUTATION_PROVEN** | `4311d0b` | 60 semantic ids · PT byte-parity vs live module · EN complete · `components/banzai/agentPresentation.ts` + 9-assertion property |
| Q2 | `suggestions.ts` — one selection algorithm, `contextualSuggestions(ctx, locale)`, PT+EN, selection parity | **MUTATION_PROVEN** | `a7ef509` | 67 semantic ids · `selectSuggestions` locale-free · 47-context PT fixture reproduced byte for byte · `suggestionsLocale.test.ts` (15 assertions) |
| Q3 | `traceVerifier.ts` + locale into `BanzaiRouteBinder → BanzaiWorkspaceProvider`, controlled EN harness, E2-C1 | **MUTATION_PROVEN** | `5623052` | `BanzaiLocaleBoundary` + `useBanzaiLocale` (no default, throws) · 7 trace copy ids · `SURFACE_LOCALE` retired · `localePropagation.test.tsx` (8 assertions) |
| Q4 | DECISIONS + DECISION — one semantic decision model, PT+EN, E2-F | **MUTATION_PROVEN** | `c155ae4` | 28 copy ids · `DecisionsExplorer` bilingual · cards expose id/type/status/slug as data · `decisionsLocale.test.tsx` (9 assertions) |
| Q5 | remaining React reader owners, by descending weight | **IN_PROGRESS** | `a0a17db`, `ea785fc` | see the Q5 owner table below — complete when every row is DONE |
| Q6 | five public EN routes + dynamic identity, E2-D, E2-E | NOT_STARTED | — | only after Q5 |
| Q7 | EN backlink closure + full mutation campaign A–G | NOT_STARTED | — | |
| Q8 | final closure: registry 22/0/1, rendered matrix, all regressions, assurance | NOT_STARTED | — | only Q8 may declare Block E complete |

## Q5 — owner by owner

Q5 is executed one owner at a time, each committed green on its own. The table is the resume point: a
session picks the next NOT_STARTED row by descending weight and does not re-derive anything.

| owner | items | state | commit |
|---|---|---|---|
| `app/(pt)/decisoes/page.tsx` + `[slug]/page.tsx` (route surfaces) | — | **DONE** | `a0a17db` |
| `components/banzai/BanzaiProgress.tsx` + `lib/banzaiProgress.ts` line ids | 6 | **DONE** | `ea785fc` |
| `components/banzai/SafeMarkdown.tsx` | 3 | **TRANSPARENT** — a markdown renderer with no reader copy of its own; nothing to localize | — |
| `components/banzai/BanzaiValidationMode.tsx` | 151 | NOT_STARTED | — |
| `components/banzai/BanzaiAgent.tsx` (beyond the Q1/Q3 wiring) | 89 | NOT_STARTED | — |
| `components/banzai/BanzaiOnboardingMode.tsx` | 69 | NOT_STARTED | — |
| `components/banzai/validationJourney.tsx` | 29 | NOT_STARTED | — |
| `components/banzai/DraftValidationTool.tsx` (beyond the Q3 `traceStatus` thread) | 26 | NOT_STARTED | — |
| `components/banzai/SourceBlock.tsx` | 19 | NOT_STARTED | — |
| `components/banzai/banzaiUi.tsx` | 19 | NOT_STARTED | — |
| `components/banzai/TransparencyPanel.tsx` | 10 | NOT_STARTED | — |
| `components/banzai/ProgramadoresTools.tsx` | 2 | NOT_STARTED | — |

Every one of these is rendered inside the BanzAI workspace, so each reads `useBanzaiLocale()` rather than
taking a locale prop. The boundary has no default: a component that reads it outside a boundary throws,
which is how the Q5 progress work surfaced three render tests that had never declared an edition.

**A durable lesson from the progress owner.** `progressLineFor` assembled a Portuguese SENTENCE inside
`lib/banzaiProgress` — a presentation decision hiding in a lib module — and the metrics readout hard-coded
a Portuguese decimal comma for every reader. Both were invisible to a component-level sweep. When taking
the next owner, follow what it CALLS, not only what it renders.

## Mutations

| id | target | state |
|---|---|---|
| E2-A | EN workspace selects PT catalogue | **KILLED** — realized from `entry.pt` regardless of locale; 4 RED incl. "never serves a Portuguese sentence to an English reader"; exact restore (`f9fc84a`), green |
| E2-B | remove one EN realization in use | **KILLED** — emptied the English `entity.keys_and_trust`; 10 RED. Fails CLOSED: a missing realization breaks both editions rather than quietly degrading one |
| E2-C1 | React locale propagation broken at a nested boundary | **KILLED** — `GuiaPanel` forced to `getAgentPresentation("pt")` while the boundary above it stayed `en` (hook still called, tree still valid, state unchanged); RED on "the nested guide panel is not in English"; exact restore (`0d4d7e1`), green |
| E2-C2 | non-React owner ignores explicit locale | **KILLED** — forced `getAgentPresentation` to `"pt"`; RED on "returns the requested locale, never the other one"; exact restore, green |
| E2-D | operator locale switch changes `operatorId` | NOT_STARTED |
| E2-E | implementation locale switch changes `implementationId` | NOT_STARTED |
| E2-F | EN decision carries a different semantic payload | **KILLED** — the English edition promoted `rascunho` to `activo`; exactly ONE assertion went red ("the English library claims something different about the records") while every string on the page stayed correct English; exact restore (`05340fc`), green |
| E2-Q2b | a branch condition is dropped so the editions diverge in WHAT they offer | **KILLED** — removed the profile narrowing in `entitySuggestions`; 4 RED incl. the PT fixture and "branch conditions are the same in both editions" |
| E2-G | EN reader link points back at the PT route | NOT_STARTED |

A mutation that survives is a finding, not a failure of the campaign: build the missing owner, commit it
green, rerun. Both surviving mutations in E1 (glossary semantic swap, EN glossary rendering PT) forced
owners that did not exist and would not otherwise have been written.

## Debt

| | count |
|---|---|
| semantic presentation ids assigned | 250 (Q1 60 · Q2 67 · Q3 7 · Q4 77 · Q5 39) |
| PT realizations complete | 250 / 250 |
| EN realizations complete | 250 / 250 |
| unclassified reader occurrences | ~414 (the NOT_STARTED rows above) |

Q1 evidence: Website 746/746 across 51 files · tsc 0 · production build 0 · registry unchanged 17/5/1.

Q2 evidence: Website 761/761 across 52 files · tsc 0 · production build 0 · registry unchanged 17/5/1.
`components/banzai/suggestions.ptBaseline.json` is the frozen pre-refactor Portuguese output for 47
contexts; it is a parity fixture, not a snapshot to be refreshed — regenerating it to make a test pass
would destroy the only evidence that Portuguese behaviour survived the refactor.

Q3 evidence: Website 769/769 across 53 files · tsc 0 · production build 0 (139 static pages) · registry
unchanged 17/5/1. The `SURFACE_LOCALE` seam Q2 left is retired: `BanzaiAgent` and the nested `GuiaPanel`
both read `useBanzaiLocale()`, and `DraftValidationTool` threads it into `traceStatus`.

The locale boundary lives in `BanzaiWorkspaceProvider` and is exported as `BanzaiLocaleBoundary` so the
provider and the harness exercise the SAME code path — a test that declared its own context would prove
nothing about production. It holds no default: `useBanzaiLocale` throws outside a boundary rather than
answering `pt`. Every remaining queue item consumes it; none may re-derive a locale of its own.

Q5 evidence so far: Website 787/787 across 54 files · tsc 0 · production build 0 (139 pages) · registry
unchanged 17/5/1. The decision routes now hold only their edition declaration; the surfaces live in
`DecisionsIndexView` / `DecisionDetailView`, one tree for both editions, ready for Q6 to add the EN route.

Q4 evidence: Website 778/778 across 54 files · tsc 0 · production build 0 · registry unchanged 17/5/1.
Q4 delivered the semantic decision model and the explorer; the two decision ROUTE pages still carry
Portuguese-only chrome and are named explicitly in Q5 above rather than left to be rediscovered.
`DecisionMarkdown` is classified TRANSPARENT: it renders each document body in its original language and
owns no reader copy of its own — there is nothing in it to localize.

`traceVerifier` is the mixed owner the ledger predicted. Localized: the status label, the four fixture
names. NOT localized and asserted so: `tone` (the engine's verdict), the fixture `key`s, the INV-*
identifiers, and every literal inside the demo trace payloads.

`FORBIDDEN_PHRASES` classified **machine-only** — guard input, not reader copy, stays out of the
catalogue.

## Final gates (Q8)

Registry 22 / 0 / 1 · Website suite green · TypeScript exit 0 · production build exit 0 · rendered PT/EN
matrix for all five route classes · E1 frozen regression · Blocks A–D · BanzAI critical battery exit 0 ·
live required-context inventory · `make assurance-check` exit 0 with AG-0…AG-9 PASS and AG-10 NOT_RUN ·
tree clean.

No PR, no merge, no deploy until Block E is complete and explicitly approved.
