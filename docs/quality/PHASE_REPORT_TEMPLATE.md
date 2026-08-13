# Phase report template

Copy this into `docs/governance/PHASE_<MILESTONE>_<SLUG>_<YYYY_MM>.md` when a phase ends.

The first five sections follow the convention already used across the ~77 existing reports. The last
three are **mandatory as of M2.11C** and are what `make banzai-release-qa-check` looks for when a
phase touches BanzAI.

Delete the guidance in *italics* as you fill each section in.

---

```markdown
# <Milestone> — <Title>

**Date:** <YYYY-MM> · **Branch:** `<branch>` · **PR:** #<n>
**Scope:** <paths touched> — <what class of change; note explicitly if no protocol contract changed>

## 1. Root cause / objective

*Why this phase existed. If it fixed something, what actually broke and why — not what was changed.*

## 2. What shipped

*The change itself, by area.*

## 3. Files changed

## 4. Verification

*Test counts, build, guards. Real numbers.*

## 5. Boundaries preserved

*What was deliberately NOT touched: model, tokens, timeout, providers, DNS/Cloudflare/TLS, Postgres
data, secrets, trust keys, operators, federation state.*

## 6. Manual Browser Validation

*MANDATORY when the phase touches BanzAI (see docs/quality/BANZAI_RELEASE_QA_GATE.md §1).*

- **Build observed:** <commit sha or index_version seen during QA — deploy happens after merge, so
  name which build was actually in front of you>
- **Origin:** <https://banza.network/banzai | local dev | other>
- **Date/time:**

*Then the observed values. Quote what was on screen — numbers, chip labels, button text — not "looks
correct". A reviewer must be able to tell from this section whether the journey actually scored.*

| Checkpoint | Expected | Observed |
|---|---|---|
| C0 initial | `1/7` · `0/6` · `0/100` · Guia `visitado`, no tick | |
| C1 manifest VALID | `2/7` · `1/6` · `20/100` · chip `evidência pronta` | |
| C2 conformidade PASS | `3/7` · `2/6` · `45/100` | |
| C3 trust VALID | `4/7` · `3/6` · `60/100` | |
| C4 federação PASS | `5/7` · `4/6` · `75/100` | |
| C5 evidence bundle | `6/7` · `5/6` · `95/100` | |
| C6 traces | `7/7` · `6/6` · `100/100` | |
| C7 reload | back to C0; storage empty | |
| C8 negative path | invalid manifest → `0/100`, next step re-blocked | |

*Agent questions — for each, the question asked and what came back:*

| Question | Expected | Observed |
|---|---|---|
| `Explica o ADR-002` | resolved, `document_explain`, sources ≥ 1 | |
| `Explica o ADR-X999` | `document_not_found`, `local_model_called: false` | |
| prompt injection | `safety_refusal`, no model call | |
| `BanzAI certifica operadores?` | `Não.`, deterministic, `can_certify: false` | |

**If manual QA was NOT performed:** say so here, plainly, and do not describe the phase as complete.
State what remains unverified. "Shipped, browser QA pending" is an acceptable outcome; a false
"complete" is not.

## 7. Known QA gaps

*Defects and uncertainties found but deliberately NOT fixed in this phase, and anything the QA did
not cover. One row each. An empty section means "I looked and found nothing" — say that explicitly
rather than deleting the heading.*

| # | Surface | What is wrong / unverified | Why not fixed here |
|---|---|---|---|

## 8. CI status and merge policy

- **Checks:** <n>/<n> SUCCESS — or name every non-green check and what was done about it.
- **Merge:** <squash / squash --admin>. If `--admin` was used, state that every check was green
  first and that the only obstacle was `REVIEW_REQUIRED`.
- **Deploy:** <which services, or "none — documentation only">. Past tense only if it happened.
```

---

## Notes on the three mandatory sections

**Manual Browser Validation** must contain observed values. A heading with no numbers under it is
the failure mode this section exists to prevent, and the guard treats an empty one as a fail.

**Known QA gaps** is for honest disclosure, not absolution. Recording a defect here does not make it
acceptable to ship — it makes it visible. A gap with no owner and no intent to fix is a decision to
live with the defect, and should be named as such.

**CI status and merge policy** exists because "CI green" was once asserted in a phase where a check
was red. Give the count.
