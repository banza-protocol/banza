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
| `components/banzai/BanzaiValidationMode.tsx` | 151 | **DONE — mutation-owned** | `5abab9c`, `1b7c6c9` |
| `components/banzai/BanzaiAgent.tsx` (beyond the Q1/Q3 wiring) | 89 | **DONE — mutation-owned** | `62ac3df`, `4536358`, `6b776fc` |
| `components/banzai/BanzaiOnboardingMode.tsx` + `ONBOARDING_COPY` (migrated out of `banzai-agent.ts`) | 69 | **DONE** | `0e25d27` |
| `components/banzai/validationJourney.tsx` | 29 | **DONE — mutation-owned** | `12e3058`, `44aeea0`, `cc39923` |
| `components/banzai/DraftValidationTool.tsx` (beyond the Q3 `traceStatus` thread) | 26 | **DONE — mutation-owned** | `e896aa9`, `02623f3` |
| `components/banzai/SourceBlock.tsx` | 19 | **DONE — mutation-owned** | `4ca8d0b` |
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
| Q5-A | a validation owner ignores the boundary | **KILLED** — `PersistenceBadge` forced to `"pt"` under an `en` boundary; RED on "persisted is not in English"; exact restore (`2bca0c1`), green |
| Q5-B | the EN edition reports a different durability verdict | **SURVIVED FIRST, THEN KILLED** — see below |
| Q5-C | a nested agent panel ignores the boundary | **KILLED** — `RfcPanel` forced to `"pt"` under an `en` boundary; RED on the rendered reference panel; exact restore (`b2bcf14`), green |
| Q5-D | the EN edition reaches a different answer-badge verdict | **SURVIVED FIRST, THEN KILLED** — see below |
| Q5-E | step titles ignore the reader's edition | **KILLED** — `stepTitle` forced to `"pt"`; RED on "conformance title is untranslated"; exact restore (`c040674`), green |
| Q5-F | the EN edition reports a different journey outcome | **SURVIVED FIRST, THEN KILLED** — the third instance of the same shape; see below |
| Q5-G | the draft verdict badge ignores the boundary | **KILLED FIRST TIME** — forced to `"pt"` under an `en` boundary; RED on the rendered verdict; exact restore (`109ca22`), green |
| Q5-H | the EN edition reports an invalid draft as valid | **KILLED FIRST TIME** — the render owner was built BEFORE localizing, so the Q5-D/Q5-F class had nowhere to hide; RED on "ok=false: wrong witness"; exact restore, green |
| Q5-I | the source chip ignores the boundary | **KILLED FIRST TIME** — forced to `"pt"` under an `en` boundary; exact restore (`5354afe`), green |
| Q5-J | the EN edition resolves a source to a different chip | **KILLED FIRST TIME** — a `spec` source resolved to `reference` in English only; RED on "spec/normative: chips diverged"; exact restore, green |

**Q5-B is the most important result in this block so far.** Making the English edition present a PENDING
run as durably archived passed every property the surface had: it was correct English, the raw
`data-persistence` status attribute was untouched, and the two editions still differed in wording — which
was all the tests compared. An English reader would have been told a non-durable result was queryable,
comparable and reproducible.

The fix was not the wording. The verdict is now taken once from the archive's status alone, with no locale
in scope (`persistenceVerdict`), and rendered as `data-persistence-verdict` beside its words; the property
reads that verdict from both editions and requires it to match, and requires the four verdicts to stay
four so collapsing two of them cannot pass by agreeing everywhere. Rerun after the rebuild: RED on
"pending: the English badge reached a different durability verdict". Committed at `1b7c6c9`.

The general lesson, and the one to carry into every remaining owner: **comparing rendered wording proves
only that two editions differ. It cannot prove they agree.** Whatever a surface CLAIMS must be observable
as data — a verdict id, a status, a payload — or a mutation can change the claim and leave the prose
looking perfect.

**Q5-D sharpened that lesson.** Making the English render site badge a no-data outcome as an operational
measurement survived a property that asserted `answerBadgeVerdict` directly: the function was untouched,
because the divergence lived at the CALL SITE. Testing the decision function is not testing the decision
the reader receives.

The fix removed the call site rather than adding an assertion about it. The badge is now a component that
takes the answer's state and reads its edition from the boundary itself, so the verdict is computed once
and the words, the styling and the data witness all read that one value; the property reads the witness
out of the rendered badge in both editions across all five answer states and requires the five to stay
distinct. Rerun after the rebuild: RED on "the English badge reached a different verdict". Committed at
`6b776fc`.

**Scouted for the next session — `validationJourney.tsx`.** Three things are already located, so no
rediscovery is needed:

1. `STATUS_LABEL_PT` (line ~156) is the step-VERDICT map — `NOT_EVALUATED` / `PENDING` / `VERIFIED` /
   `FAILED` / `BLOCKED` / `NOT_APPLICABLE`. It is the most semantically loaded value on the whole
   validation surface and it is consumed in FOUR places by `BanzaiValidationMode`, which is already
   migrated; it was missed there because it is imported, not local. Apply the Q5-D rule: the verdict is
   already decided by the engine, so this only names it — `stepStatusLabel(status, locale)` — and the
   rendered witness must be the status itself.
2. `STEPS` carries a `title` and a `blurb` per step (9 × 2). `Discovery`, `Manifest`, `Keys` and
   `Evidence Bundle` are protocol terms and identical in both editions; the rest need English. `id`,
   `num` and `engine` are locale-neutral.
3. `progressPhrase` composes a Portuguese sentence with singular/plural agreement, exactly like the
   progress line fixed in the live-progress owner. Return locale-free segments plus counts and realize
   them per edition; do not translate the assembled sentence.

`lib/banzaiValidation.ts` is clean: the dead `PUBLICATION_STATUS_LABEL_PT` map that the validation owner
was meant to retire survived an earlier excision and has now been removed.

**The rule for the remaining owners: put the verdict inside the component that renders it, and read the
witness out of the render.** A pure function plus a render site is two places a locale can enter; one
component is one.

**Q5-F proved the rule holds and showed one more way to get it wrong.** Substituting a different progress
result at the English render site — a journey that finished with a blocker reported as having finished
clean — survived a property that checked `realizeProgress`. The `data-journey-progress` witness was
already present, but it read the ORIGINAL value while the words came from the substituted one, so the two
could disagree and nothing noticed. **A witness that is not asserted against the words it accompanies is
decorative.** The property now requires both: the witness equals the result's kind in each edition, AND
the rendered text is exactly that result's realization.

Three owners needed the same fix after the fact (`AnswerBadge`, `JourneyProgress`, the persistence
verdict). **The draft tool is the first owner where the rule was applied in advance** — `DraftVerdictBadge`
was extracted before any copy was localized — and both of its mutations died on the first attempt. Build
the component first; it is cheaper than discovering the survivor.

A mutation that survives is a finding, not a failure of the campaign: build the missing owner, commit it
green, rerun. Both surviving mutations in E1 (glossary semantic swap, EN glossary rendering PT) forced
owners that did not exist and would not otherwise have been written.

## Debt

| | count |
|---|---|
| semantic presentation ids assigned | 609 + the 10-kind source table (Q1 128 · Q2 67 · Q3 7 · Q4 77 · Q5 330) |
| PT realizations complete | all |
| EN realizations complete | all |
| unclassified reader occurrences | ~31 (the NOT_STARTED rows above) |

`SourceBlock`'s remaining Portuguese literals are the PT column of its own `{pt, en}` kind table —
classified as owned bilingual copy, not unowned presentation.

**`SourceBlock` is the most instructive owner in Q5 and the only one whose defect was already shipped.**
It HAD an English label for every source kind — a `{pt, en}` table written long before this block. It was
unreachable: `sourceKindLabel(kind, lang = "pt")` defaulted in the signature, and the one caller passed no
language at all. Every reader saw Portuguese, every test passed, and the English column sat unread. **A
bilingual table is not a bilingual surface until something requires the reader's edition.** The language
is now required (asserted by arity), the chip is a component that resolves once and reads its own edition,
and the category map's Portuguese labels — dead since the label moved years ago — are gone.

`DraftValidationTool` is closed-world verified (**0** Portuguese literals). It reused Q3's `traceVerifier`
rather than duplicating it, and fixed a real defect there on the way: the runner was storing the trace
verdict's realized SENTENCE in `status`, a field that holds an engine enum for every other artifact type,
and rendering it beside those enums as though it were one. The verdict is now decided by `traceTone` (no
locale in scope), the runner returns its copy id and takes no locale at all — it produces data — and the
render realizes it.

`validationJourney` is closed-world verified: a sweep for Portuguese literals over the whole file returns
**0**. The journey is ONE definition — `id`, `num` and `engine` on the step; title and blurb looked up by
step id, never by position — and `progressResultFor` decides what the counters MEAN with no locale in
scope, returning `running` / `notStarted` / `partial` / `doneOneBlocker` / `doneAllVerified` /
`doneWithCounts`. Each edition realizes that result and decides its own singular/plural from the same
numbers. `Discovery`, `Manifest`, `Keys` and `Evidence Bundle` are protocol terms declared identical
across editions; the other five titles and all nine blurbs are translated and asserted to differ.

`BanzaiAgent` reuses the Q1 catalogue rather than starting a second one: 66 new ids were added to
`agentPresentation.ts` and the existing `mode.*`, `tab.*`, `validation.*`, `authority.*` and `badge.*`
ids are consumed as they stand. The new answer-badge verdicts are namespaced `answerBadge.*` so Q1's
BADGES property keeps its meaning.

Locale-neutral classifications made in this owner: `measure_type` is a CLOSED ENUM emitted by the engine
whose values are Portuguese words (`observação` | `média` | `mediana` | `percentil`) — engine data in its
source language, compared against and never read out. It was being compared against a Portuguese literal
that a second edition would have broken, silently presenting a lone observation as an average; it is now
a named constant and classified. The same source-language classification the decision document body has.

**Three owners in a row hid a Portuguese-only enum map at module or lib scope** — publication status,
reproduction outcome, and the three onboarding state maps. Each named backend state, each was keyed by
that state, and each was invisible to a sweep of what a component renders. Expect one in every remaining
owner: look for `Record<string, string>` next to a backend enum.

`BanzaiValidationMode` is closed-world verified: a sweep for Portuguese text nodes and string literals
over the whole file returns **0**. Two labels were found living in the wrong place and moved to the
presentation module — the publication-status map (a Portuguese-only record inside `lib/banzaiValidation`)
and the reproduction outcomes (a Portuguese-only record at module scope). Both now pass an unknown enum
through verbatim rather than inventing it in one language.

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
