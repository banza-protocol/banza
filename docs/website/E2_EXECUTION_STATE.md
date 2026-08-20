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
| Q5 | remaining React reader owners, by descending weight | **COMPLETE — every owner migrated or classified** | see the owner table | 11 owners · 12 mutations executed, 12 killed · 3 required a missing owner to be built first |
| Q6 | five public EN routes + dynamic identity, E2-D, E2-E | **COMPLETE — mutation-proven** | `7e32384`, `8cef643` | registry **17/5/1 → 22/0/1** |
| Q7 | EN backlink closure + full mutation campaign A–G | **COMPLETE — E2-G proven** | `fc1384f` | 208/208 English navigation edges stay in the English edition |
| Q8 | final closure: registry 22/0/1, rendered matrix, all regressions, assurance | **FINAL_VERIFIED** | `50c1fee`, `485cc81` | one material finding fixed; see below |

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
| `components/banzai/banzaiUi.tsx` | 19 | **MACHINE + STYLING — classified, falsifiably** | `e104c4d` |
| `components/banzai/TransparencyPanel.tsx` | 10 | **DONE — mutation-owned** | `e02ec33`, `129f7d8` |
| `components/banzai/ProgramadoresTools.tsx` | 2 | **DONE — mutation-owned** | `c1dfb2f` |

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
| E2-D | operator locale switch changes `operatorId` | **KILLED** — the EN side resolved to `operator-a` while PT stayed `operator-zero`; RED on the identity assertion in both directions and on the language control's own switch; exact restore (`6a3e53f`), green |
| E2-E | implementation locale switch changes `implementationId` | **KILLED** — operator preserved, EN implementation changed to `oz-impl-2`; RED for the implementation alone, which is the point: a mutation that also moved the operator would not have proven the second parameter is owned |
| E2-DECISION-ROUTE | EN decision route resolves to a different valid record | **KILLED** — PT `adr-001` paired with EN `adr-002`; RED on the per-record walk. Distinct from E2-F, which changed the payload INSIDE one route; this changes which route the reader lands on |
| E2-F | EN decision carries a different semantic payload | **KILLED** — the English edition promoted `rascunho` to `activo`; exactly ONE assertion went red ("the English library claims something different about the records") while every string on the page stayed correct English; exact restore (`05340fc`), green |
| E2-Q2b | a branch condition is dropped so the editions diverge in WHAT they offer | **KILLED** — removed the profile narrowing in `entitySuggestions`; 4 RED incl. the PT fixture and "branch conditions are the same in both editions" |
| E2-G | EN reader link points back at the PT route | **KILLED** — `/en/status` linked to `routeHref("BANZAI", "pt")`: a valid page, no 404, fluent English, and the reader leaves the edition. RED with `"/en/status → /banzai (BANZAI has /en/banzai)"`; exact restore (`3f4659d`), green |
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
| Q5-K | `banzaiUi` acquires Portuguese accessibility copy | **KILLED** — replaced the decorative `aria-hidden` with a Portuguese `aria-label`; RED; exact restore (`e1870af`), green |
| Q5-L | an icon-only control appears with no accessible name | **KILLED** — added an icon-only button in `BanzaiAgent`; RED on the consumer-side invariant; exact restore, green |
| Q5-M | the validator verdict ignores the boundary | **KILLED FIRST TIME** — forced to `"pt"` under an `en` boundary; exact restore (`4a3ecea`), green |
| Q5-N | the EN edition reports a rejected answer as passed | **KILLED FIRST TIME** — render owner built before localizing; RED on "rejected: wrong verdict"; exact restore, green |
| Q5-O | default absorption in the last owner | **KILLED FIRST TIME** — `agentCopy(id, "pt")` inside the panel while the boundary said `en`; RED on "dev.title is not in English"; exact restore (`75663e1`), green |

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
| unclassified reader occurrences | **0** |

**Q5 IS COMPLETE.** Every React reader owner in the committed inventory is migrated or explicitly
classified, and every owner was verified closed-world: a sweep for Portuguese literals over each file
returns 0, or returns only literals proven to be an engine enum, source-language content, a bilingual
catalogue's PT column, or a code comment.

Twelve mutations were executed across Q5 and all twelve were killed. Three needed a missing owner built
first (`AnswerBadge`, `JourneyProgress`, the persistence verdict); after the component-first rule was
adopted, the remaining six died on the first attempt.

Six enum→label maps were found and retired: publication status, reproduction outcome, three onboarding
state maps, the step verdict, and the answer validator. Every one of them named backend state in
Portuguese only, and none was visible to a sweep of what a component renders.

`SourceBlock`'s remaining Portuguese literals are the PT column of its own `{pt, en}` kind table —
classified as owned bilingual copy, not unowned presentation.

`TransparencyPanel` is the surface where BanzAI states what it actually did — which sources, which engine,
whether the model was called, whether the validator accepted the answer. Its 31 field names and two model
states were Portuguese-only, so an English reader would have received that account in Portuguese. 36 new
ids in the Q1 catalogue. The validator verdict is the **sixth** enum→label map found in Q5; it is now
normalized once with no locale in scope and rendered by `AnswerValidationValue`, which exposes the verdict
as data. Both its mutations died first time — the render owner was built before localizing.

**`banzaiUi` is not a reader owner at all.** Its 19 inventory occurrences are icon keys and SVG path
geometry, not copy: the module holds an icon-key enum (machine identity), the geometry each key maps to
(styling), a decorative `Ico` renderer and a CSS class string. Nothing in it is a sentence, a label, an
aria string or a state→wording decision, so there was nothing to localize and no semantic mutation to
fabricate.

The classification is written as PROPERTIES rather than as a note, so it can be falsified: the module
fails the suite if it acquires prose (Q5-K), and — because the classification depends on consumers, not
only on the module — it fails if any icon-only control appears anywhere without an accessible name
(Q5-L). An icon that carried meaning alone would need a name, and that name would be reader copy under
the full locale contract. Both mutations were executed and killed.

Inspected for the SourceBlock failure class and found clean: no optional locale parameter, no `= "pt"`
default, no bilingual map, no module-scope Portuguese constant.

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

## Assurance correction — production-build evidence, `5abab9c` … `7e32384`

**Status of the historical claim: PREVIOUSLY_MISREPORTED.**

Every "production build 0" recorded for a checkpoint in the range `5abab9c` … `7e32384` (30 commits,
covering the `BanzaiValidationMode`, `BanzaiOnboardingMode`, `BanzaiAgent`, `validationJourney`,
`DraftValidationTool`, `SourceBlock`, `banzaiUi`, `TransparencyPanel` and `ProgramadoresTools` owners) is
**not valid evidence and is withdrawn**. It is left in place above rather than edited away, with this
section as its correction.

What actually happened:

1. `next build` ran its compile stage and printed `✓ Compiled successfully`.
2. It then ran `Linting and checking validity of types` and **failed** — a test file added in `5abab9c`
   carried `// eslint-disable-next-line @typescript-eslint/no-explicit-any`, and that rule is not
   configured in this repository, so ESLint errored on the disable directive itself.
3. The process **exit code was non-zero**. `Failed to compile.` appeared in the log.
4. The verification step grepped the log for the substring `Compiled successfully` — which Next.js prints
   BEFORE it lints — and reported the build green.

The defect was in the check, not only in the code: **a log substring was treated as a substitute for
process exit status.** A build that prints a success line and then fails is exactly the case that
distinction exists to catch, and the check was blind to it by construction.

What is proven, at `a6a739a`, by reading the exit code:

| evidence | value |
|---|---|
| `npm run build` process exit code | **0** |
| pages emitted | 188 |
| `/en/banzai` | emitted |
| `/en/banzai/operator/[operatorId]` | emitted |
| `/en/banzai/operator/[operatorId]/[implementationId]` | emitted |
| `/en/decisions` | emitted |
| `/en/decisions/[slug]` | emitted |

The affected checkpoints' OTHER evidence — Website suite, `tsc`, registry checker, mutation results — was
gathered by exit code or by reading actual assertion output and is unaffected. Only the build claim is
withdrawn.

**Standing rule, permanent:** build and check success is the process exit code. A log line is never
evidence of success, however conclusive it reads. The final assurance report must carry this correction.

## Q6 — the five English routes

| route | PT | EN | evidence |
|---|---|---|---|
| BANZAI | `/banzai` | `/en/banzai` | same workspace provider, `locale="en"` |
| BANZAI_OPERATOR | `/banzai/operador/[operatorId]` | `/en/banzai/operator/[operatorId]` | same binder; `operatorId` unchanged |
| BANZAI_OPERATOR_IMPLEMENTATION | `/banzai/operador/[operatorId]/[implementationId]` | `/en/banzai/operator/[operatorId]/[implementationId]` | both ids unchanged |
| DECISIONS | `/decisoes` | `/en/decisions` | same `DecisionsIndexView` |
| DECISION | `/decisoes/[slug]` | `/en/decisions/[slug]` | same `DecisionDetailView`; slug is the record |

The routes are thin — they declare their edition and render the Q1–Q5 components. There is no English
application tree, because a second tree is the thing that drifts.

**What made dynamic pairing possible.** A counterpart used to be an exact pathname match, so
`/banzai/operador/operator-zero` had none. `matchRoute` now resolves patterns, extracts parameters BY NAME
and places them into the counterpart's own pattern — but only when the route is `DYNAMIC_BILINGUAL` AND
both patterns declare the same parameter names. The reference chapter declares `[capitulo]` against
`[chapter]` because its slug is a translated word; carrying a Portuguese slug into an English URL would
invent a 404, so that pairing stays owned by `chapterCounterpart()`. Literal routes also win over patterns
now, so `/referencia/completa` is its own page rather than a chapter named "completa".

**What registering the EN paths exposed.** Three English pages and the shared decision views linked to
Portuguese routes that now have English editions — caught by a property that already existed. Fixed at the
source: the shared views resolve hrefs through `routeHref(id, locale, params)`, so a component cannot be
right in one edition and wrong in the other. The two "no English edition" example assertions moved to
`OPERATOR_ZERO`, whose Portuguese-only status is a decision rather than a backlog.

**Decision parity properties updated, not weakened.** They compared literal hrefs, which was correct while
English had no route. They now compare the record's SLUG across editions and additionally assert each
edition addresses its own path — a strictly stronger claim.

Evidence: Website 834/834 across 57 files · tsc 0 · production build exit 0 (188 pages, all five EN routes
emitted) · registry checker exit 0 at **22 / 0 / 1**.

**A verification correction.** See the assurance-correction section above: the production build had been
failing since `5abab9c`, and the checkpoint claims in that range are formally withdrawn.

## Q7 — English navigation closure

The property renders every English page and reads the hrefs out of the real markup. That matters more
than it sounds: a source scan resolves literals, and the defects here were built from data tables, map
callbacks and a helper function. Reading what the reader receives has no computed bucket to escape into.

**Edges, from the rendered surfaces (`fc1384f`):**

| class | count |
|---|---|
| total hrefs rendered | 248 |
| WEBSITE_NAVIGATION | 208 |
| — resolving to the English edition | **208** |
| — resolving to the Portuguese edition | **0** |
| — unclassified (no route owns them) | **0** |
| PROTOCOL_ENDPOINT | 16 |
| LANGUAGE_SPECIFIC_DOCUMENT | 8 |
| EXTERNAL | 16 |

**Three defects found, two of them already shipped.**

1. **The English glossary was doing literal locale prefixing** — `"/en" + the Portuguese path` — which is
   the exact rule the route registry's own header says it exists to stop. It emitted `/en/certificacao`,
   `/en/estado`, `/en/operadores`, `/en/registo-tecnico` and four `/en/referencia/*` chapter paths: **eight
   404s on a published page**. It now asks the registry, which knows the real English path including the
   Reference chapters whose slugs are translated words, and carries the query of the term that links into
   a specific BanzAI mode.
2. **The decisions library** linked the governance process to the Portuguese chapter; that pairing belongs
   to the chapter counterpart resolver for the same reason.
3. **The English status page** linked to `/banzai#perguntar` — the Portuguese route, and a fragment
   matching no anchor anywhere.

**Exception classes are typed, never suppression strings.** `PROTOCOL_ENDPOINT` covers the published paths
that return JSON (`/operators`, `/conformance/evidence`, `/federation/revocation-list.json`,
`/banzai/runtime`) and the `.well-known` discovery surface (ADR-080) — machine-addressed, no editions.
`LANGUAGE_SPECIFIC_DOCUMENT` covers the whitepaper PDFs and the `/whitepaper/pt|en` reading surfaces, where
the language IS the document's identity: Portuguese is the canonical edition and English its official
translation, so an English page offering both is correct and must stay legal. An edge fitting no class is
UNCLASSIFIED and red.

**The Reference exception is preserved.** `[capitulo]` against `[chapter]` is not same-parameter pairing;
`chapterCounterpart()` still owns it, literal routes still win over patterns, and `/referencia/completa`
is still its own page.

Evidence, by exit code: Website 841/841 across 58 files · tsc 0 · production build **exit 0** (188 pages)
· registry checker **exit 0** at 22 / 0 / 1.

## PR #32 — THE Q8 CLOSURE WAS FALSIFIED

**The Q8 section below claimed Block E complete and frozen. That claim is suspended.** It is left standing
rather than edited away, with this correction above it.

**What happened.** PR #32 ran the repository's guard battery against this branch for the first time. Every
block in Website Phase 2 — A, B, C, D, E1 and E2 — was declared complete against the same self-selected
subset: Website suite, TypeScript, production build, route registry, BanzAI critical battery,
`make assurance-check`. That subset excludes the ~190 guards the workflows invoke, which are the
repository's largest assurance surface and gate the pull request.

**The measurement.** Running every workflow-invoked guard against the branch and against `origin/main`, in
clean trees:

| | PASS | FAIL |
|---|---|---|
| `origin/main` | 187 | 2 |
| branch @ `9151bfc` | 144 | 45 |

**43 failures are branch-introduced.** All 43 are confirmed CI-invoked, with no argument differences. The
two shared with main are not ours: `check-openapi-compatibility.sh` needs an input CI generates in an
earlier step, and `check-open-governance.sh` fails identically on main.

**The first analysis was wrong about the shape.** It framed this as primarily stale E2 guards. The
complete comparison shows 14 of the 43 are outside E2, on surfaces owned by Blocks A–D and E1.

**The dominant class is STALE_GUARD_AFTER_AUTHORIZED_CHANGE, not lost content.** Three of the fourteen
were triaged in depth and all three carry the same shape — the semantics survive, often strengthened into
both editions, while the literal the guard greps has moved:

| guard | what it greps | where the property now lives |
|---|---|---|
| `check-reference-chapter-order.sh` | a literal `{ num: N, slug: "x" }` array in `website/lib/reference.ts` | `website/lib/referenceSlugs.ts` — `CHAPTER_DEFS` derives from it. The guard reports *zero* chapters, not a wrong order, and its own later assertions still confirm Operador Zero at 09 |
| `check-glossary-page.sh` | the bare term inside the Portuguese glossary page | `website/lib/glossaryTerms.ts` — `name: { pt: "Operador", en: "Operator" }`, present in both editions |
| `check-standalone-roadmap-surface.sh` | slug `roteiro` in `reference.ts` | `referenceSlugs.ts` — `{ num: 14, pt: "roteiro", en: "protocol-evolution" }` |

**Global Website Phase 2 assurance is therefore REOPENED.** Blocks A–D, E1 and E2 completion claims are
suspended until the branch passes the required guard surface on PR #32 itself.

The committed inventory of all 43, with each guard's assertion, owning block, classification and
disposition, is `docs/website/phase2-pr32-guard-regressions.json`. The workflow-faithful runner is
`tools/ci-guards-local-check.sh` / `make ci-guards-local-check`.

**Remediation status: IN PROGRESS — 17 guards remediated and mutation-proven; 162 PASS · 29 FAIL · 1
NOT_RUN_LOCALLY of 192.**

**The BanzAI copy guards share the chrome guards' root, and get the same treatment.** They asserted
Portuguese literals inside the modules that rendered them; Block E2 moved those sentences into bilingual
catalogues, so the modules no longer contain them. The catalogues are realized once
(`make website-copy-resolved`) into `lib/copyResolved.json`, kept current by `copyResolved.test.ts`, and
read through `tools/_banzai-copy.sh`.

This is not only a repair. The old design could not see English **by construction** — a guard grepping a
Portuguese literal has no way to express an English clause, so once the English edition existed it was
ungoverned. Changing only the English validation-mode label now turns a guard red; before, that mutation
was invisible.

**The chrome guards had a common root, so they were given a common surface.** Several guards read a
pathname straight out of `lib/site.ts`. The chrome stopped writing pathnames when it became locale-aware —
an entry declares a semantic route target and the path is derived per edition — so those greps matched a
form that no longer exists, and they only ever saw the Portuguese edition. Teaching each guard to
re-implement the derivation would have produced copies that drift from the real one and fail silently, so
the derivation is run once (`make website-chrome-resolved`) and published as `lib/chromeResolved.json`,
with `chromeResolved.test.ts` re-deriving it and failing if the committed artifact is stale — proven in
both directions: changing the chrome without regenerating, and hand-editing the artifact.

**And the runner was reporting a clean count over a build that could not parse.** Adding a target exposed
that `7e630d9` had overwritten a doc-comment line and orphaned its recipe: `make` has been broken on this
branch since, including the three assurance gates CI runs through it. The runner never noticed because it
extracted only `bash tools/check-*.sh` from the workflows and ignored `run: make`. Both are fixed, and the
invocation total moves 189 → 192 — the three steps that were never being modelled.

**Triage found one real gap, and it was not the one the failure named.** `check-technical-registry-page.sh`
reported that the footer does not link `/registo-tecnico`, which reads like a navigation regression. It is
not: the Portuguese footer still resolves that path, and an executed assertion pins the derived href. The
guard was grepping for a literal href that the locale-aware chrome no longer writes — it had quietly
stopped testing reachability. It now checks the property through the mechanism that produces the link, and
each of its three clauses fails under its own mutation.

What the triage did surface is that **nothing ever executed the English chrome derivation**. Both editions
come from one configuration, but the module exports the Portuguese realization, so every assertion read
Portuguese and the English half ran nowhere. A withdrawn English route would have silently fallen back to
the Portuguese path and still looked like a working link. `lib/chromeLocaleDerivation.test.ts` closes that:
both editions, no silent fallback, pathnames from the registry rather than from prefixing a Portuguese
slug. Three of its five assertions turn red under mutation; the other two hold by construction today and
say so in the file instead of borrowing credit.

`make ci-guards-local-check` → **146 PASS · 42 FAIL · 1 NOT_RUN_LOCALLY = 189**, measured from committed
HEAD. The count moved from 43 to 42 only after the contamination fix was verified from a clean tree: the
first measurement was taken while that fix was still in the working tree AND while the artifacts written to
document it had themselves tripped the guard — an engineering record is not an attribution surface, so they
now describe the claim instead of quoting the name.

**Remediated and mutation-proven**

- `check-open-governance.sh` (`e08cd68`) — its negation vocabulary had `não`, `never` and `not` but not
  English's determiner **no**, and the English edition states these boundaries as *"there is no certificate
  authority"*, *"NO CERTIFICATE AUTHORITY"*, *"and no human approval"*. A bare `\bno\b` could not join the
  shared vocabulary — Portuguese "no" is "em o" and would clear real violations — so the English form is
  scoped to English paths. Two narrower defects came with it: the architecture scans read code comments, so
  a comment quoting the term *in order to rule it out* counted as asserting it; and the token scan read
  binaries, matching "KB" inside woff2 font data (that one affected origin/main too). Verified green on
  origin/main unchanged; asserting *"BANZA operates a certificate authority"* on the English trust page
  turns it red.
- `check-operator-contamination.sh` — three path-scoped admissions on the established
  `licenca`/`architecture` basis. See the inventory for each claim.

**An open finding the mutation exposed.** `NORMATIVE_BRANDS` (a payment-operator brand, unitel money, africell money,
e-kwanza) is declared in `banza-repo-guards` and asserted by three comments to be "blocked everywhere" — but
the constant is never read. `contamination()` checks only the the designated-scheme stem stem, so inserting *a payment-operator brand* into
an admitted English page did **not** fail the guard. The admissions are therefore correctly scoped; what
the survival revealed is a pre-existing gap in the gate itself. Recorded in the inventory under
`open_findings`; it needs its own change, because wiring it in may surface violations outside this PR.

**Next unresolved record:** the 43 remaining guards in
`docs/website/phase2-pr32-guard-regressions.json`. Eleven non-E2 guards still need individual triage — do
not assume they match the three already classified. Do not read the Q8 section below as current.

## Q8 — FINAL CLOSURE (SUPERSEDED — see the correction above)

### The finding Q8 existed to catch

The closed-world sweep, re-run from FINAL source rather than repeated from the ledger, found **81
Portuguese literals still in `banzai-agent.ts`** and **eight of its constants still reaching readers**:
mode names, tab names, the starter questions, the who-does-what table, the ADR cards, the protocol map,
the draft header and the validation header. An English reader received all of it in Portuguese.

Q1 built the catalogue and mirrored the module, but several consumers were never switched. **Q1's own
property could not see it, because it compared the catalogue TO the module** — the two agreeing was the
symptom, not the proof. The per-owner Q5 sweeps missed it too: they scanned each owner's own file, and
these strings arrived by import. The ledger's own lesson — follow what an owner CALLS — applied at the
wrong scope.

Fixed at `50c1fee`. The module now holds identity only (keys, modes, icons, groups, hrefs, ADR ids), each
record carrying the id of its name. Three guards that scanned the module's Portuguese now scan the
catalogue in BOTH editions, which is strictly stronger: the boundary deny-list is now checked in English,
and never had been. Two constants (`TRUST_CARDS`, `EVIDENCE_CONTENT`) had no consumer at all — dead
Portuguese that a guard was scanning, so that guard was proving nothing about what is published; it now
reads the pages where the vocabulary really appears. The replacement property is the one that would have
caught this on the day: **the data module must hold no sentence, because a sentence there has only one
language.**

### Final closed-world state (regenerated from final source)

| | |
|---|---|
| inventory source files | 26 |
| raw occurrences | 1041 |
| bilingual catalogues | 8 |
| semantic presentation ids | **715** |
| PT realizations | **715 / 715** |
| EN realizations | **715 / 715** |
| owners scanned (non-catalogue) | 18 |
| **unclassified reader presentation** | **0** |
| unknown semantic id | 0 (every id resolves; `agentCopy`/`validationCopy`/… throw on an unknown one) |
| silent EN→PT fallback | 0 (no default anywhere below the route boundary; `useBanzaiLocale` throws) |

The only literals the scanner still reports in production owners are two TypeScript expressions
(`BanzaiValidationMode.tsx:805`, `validationJourney.tsx:96`) captured by the `>…<` heuristic. Verified by
reading them: neither is copy.

### Registry — `node tools/check-website-route-registry.mjs`, exit 0

implemented_en **22** · missing_en **0** · intentional_pt_only **1**. Not hardcoded — the checker derives
them from the records.

### Rendered matrix — `lib/e2FinalMatrix.test.tsx` (31 assertions)

Ten surfaces across the five route classes, both editions, plus **21 interactive states** each asserted to
reach the same semantic witness and to differ in wording: five answer badges, four persistence verdicts,
two draft verdicts, three validator verdicts, two source chips, five journey-progress outcomes, the live
progress block, the results area and the nine-step journey. Not a happy path — the refusal, the
service-unavailable, the failed-persistence and the one-blocker outcomes are the ones a reader most needs
told truthfully.

### Mutation reconciliation

| id | class | result | evidence |
|---|---|---|---|
| E2-A | EN realizes from the PT column | KILLED | Q2 · forced `entry.pt`; 4 RED; restore `f9fc84a` |
| E2-B | an EN realization in use is emptied | KILLED | Q2 · 10 RED, fails closed for both editions |
| E2-C1 | React propagation broken at a nested boundary | KILLED | Q3 · `GuiaPanel` → `"pt"` under `en`; restore `b2bcf14` |
| E2-C2 | non-React owner ignores explicit locale | KILLED | Q1 · `getAgentPresentation` → `"pt"`; restore green |
| E2-D | operator switch changes `operatorId` | KILLED | Q6 · EN → `operator-a`; restore `6a3e53f` |
| E2-E | implementation switch changes `implementationId` | KILLED | Q6 · operator preserved, EN → `oz-impl-2` |
| E2-F | EN decision carries a different payload | KILLED | Q4 · `rascunho`→`activo` in EN only; ONE assertion red |
| E2-G | EN edge points back at the PT route | KILLED | Q7 · `/en/status → /banzai`; restore `3f4659d` |
| E2-DECISION-ROUTE | EN decision route resolves to another record | KILLED | Q6 · PT `adr-001` ↔ EN `adr-002` |
| Q5-A…Q5-O | fifteen owner-level mutations | ALL KILLED | see the Q5 table |

### Mutations that SURVIVED first, and the owners they forced

These are the block's most valuable results and are preserved, not summarised away:

1. **Q5-B — persistence verdict.** The English edition presented a PENDING run as durably archived. It
   passed every property: correct English, untouched status attribute, different wording from Portuguese.
   **Forced:** `persistenceVerdict()` decided once with no locale in scope, rendered as
   `data-persistence-verdict`. Reran → RED. (`1b7c6c9`)
2. **Q5-D — answer badge.** The English RENDER SITE reached a different badge verdict while
   `answerBadgeVerdict` stayed correct. Testing the decision function is not testing the decision the
   reader receives. **Forced:** the `AnswerBadge` component — no call site left to diverge. (`6b776fc`)
3. **Q5-F — journey progress.** Same shape, plus a new failure in the fix itself: the witness existed but
   read the ORIGINAL value while the words came from the substituted one. **A witness not asserted against
   the words it accompanies is decorative.** **Forced:** `JourneyProgress`, and the property now requires
   witness AND text. (`cc39923`)

After the component-first rule was adopted, the remaining six owner mutations died on the first attempt.

### Required-CI reachability — LIVE branch protection

Read with `gh api repos/:owner/:repo/branches/main/protection`. Seven required contexts, strict mode on.
All seven are jobs of `.github/workflows/identity-guard.yml`.

| # | exact context name | locally reproducible | final local state |
|---|---|---|---|
| 1 | `Public technical claims — executable evidence gate` | yes | **exit 0** — owns `npm run build`, `npm test`, `node tools/check-website-route-registry.mjs`, `bash tools/banzai-critical-battery.sh` |
| 2 | `Whitepaper canonical build is reproducible (hermetic verify)` | **NO** | **NOT_RUN_LOCALLY** — the job is `runs-on: ubuntu-latest` and installs `poppler-utils` via `sudo apt-get`; this host is Darwin, which has no apt and no poppler from that path. No substitute PDF check was run in its place |
| 3 | `Layer/profile naming split is canonical (Camada 1/2/3 vs L0–L4)` | yes | exit 0 |
| 4 | `Git authorship identity guard (no Claude attribution)` | yes | exit 0 |
| 5 | `BANZA three-layer architecture` | yes | exit 0 |
| 6 | `Certification ≠ admission ≠ authorisation` | yes | exit 0 |
| 7 | `License, Notice, Trademark and Open Governance` | yes | exit 0 |

**Every E2 property is reached by required context #1**, because that job runs `npm test` and
`npm run build` in `website/`. Proven empirically rather than inferred from filenames — five
representative classes, each mutated from the committed green baseline, each producing a non-zero exit
from the job's own command:

| class | mutation | owning property RED | `npm test` exit |
|---|---|---|---|
| A wrong locale | `GuiaPanel` → `getAgentPresentation("pt")` | "renders the English workspace in English, several levels down" | **1** |
| B missing EN realization | emptied `entity.keys_and_trust` EN | 17 tests | **1** |
| C non-React locale ownership | `agentCopy(id, "pt")` inside the presentation builder | 3 tests | **1** |
| D dynamic route identity | counterpart resolves `operatorId` → `operator-a` | "BANZAI_OPERATOR: the operatorId crosses the switch unchanged" | **1** |
| E EN backlink closure | `/en/status` → `routeHref("BANZAI","pt")` | "never links to the Portuguese edition of a route that HAS an English one" | **1** |

Each was restored by blob hash and the tree reverified clean.

### Regressions, all from the final committed tree, all by exit code

| gate | result |
|---|---|
| E1 frozen (`4e13af6`) — 8 rendered surfaces, glossary semantics, 25 terms, related-link closure | PASS |
| Blocks A–D — route registry, shell/nav parity, reference switch parity, core EN pages | PASS |
| Q7 EN link closure — 208/208 English edges, 0 defective, 0 unclassified | PASS |
| BanzAI critical battery (`f336bfa`) — `bash tools/banzai-critical-battery.sh` | **exit 0** |
| Website suite — `npm test` | **exit 0** · 59 files · **872 tests** |
| TypeScript — `npx tsc --noEmit` | **exit 0** |
| Production build — `npm run build` | **exit 0** · 188 pages · all five EN routes emitted |
| `make assurance-check` | **exit 0** · AG-0…AG-9 **PASS** · AG-10 **NOT_RUN** |

AG-10 is NOT_RUN by design: `assurance/release-readiness.json` has not been produced, and the gate treats
absence as NOT_RUN rather than PASS. No freeze or release-readiness claim is made beyond that.

### Historical build-evidence correction (preserved)

See the assurance-correction section above. Thirty checkpoints in `5abab9c … 7e32384` were previously
recorded as production-build green; those claims are **withdrawn**. `next build` compiled, printed
`Compiled successfully`, then failed linting, and the process exit code was non-zero — while the check
read the log substring. Git history was not rewritten. Builds are now verified by exit code only.

No PR, no merge, no deploy until explicitly approved.
