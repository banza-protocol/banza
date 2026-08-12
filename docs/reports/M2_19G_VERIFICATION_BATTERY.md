# M2.19G — Verification Battery

**tsc · vitest · next build · guard scripts · make targets · Rust engine tests**

**Status:** COMPLETE (offline battery) · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`

This report records the pre-deploy verification battery run at the reconstruction commit `7fbfa8f`, and
reconciles the recorded figures against the independently-observed static repo state.

---

## 1. Recorded battery (reconstruction commit `7fbfa8f`)

| Gate | Result |
|---|---|
| TypeScript `tsc` | **clean** |
| Website `vitest` | **365 / 365** (incl. the updated home / public-consistency / reference-IA / public-surface / zeroSubdomain / native-agent suites) |
| `next build` | **122 routes** |
| Guard scripts (battery) | **99 / 99** |
| Make guard targets (battery) | **35 / 35** |
| `identity-check` (Rust) | **green** |
| contamination / `public-surface-clean` | **green** |
| `rust-rule-check` | **green** |
| SVG visual system + quality | **green** |
| operator-zero family (Rust + node) | **green** |

These are the figures recorded in the reconstruction commit message and are consistent with the offline
verification performed before the branch was finalised.

---

## 2. Observed static repo facts (independent count at `7fbfa8f`)

| Fact | Observed |
|---|---|
| `tools/check-*.sh` scripts present | **102** |
| `*-check` targets in `Makefile` | **116** |
| Website `*.test.ts` / `*.test.tsx` files | **31** |
| Current-only ADRs (`decisions/adr/ADR-*.md`) | **62** |
| Website ADR mirror (`website/content/decisions/adr/`) | **61** |
| Vocabulary sources (`artifacts/m2-18b7/canonical-protocol-vocabulary.json`) | **445** |

### Reconciliation

- **99/99 scripts + 35/35 make targets vs 102 scripts / 116 targets.** The "99/99" and "35/35" are the
  milestone author's **recorded battery run** — a curated canonical subset of guard scripts and make
  targets exercised for M2.19G — not the full inventory of every `check-*.sh` file or every `-check` target
  in the Makefile. The battery is a subset by design (not every script is wired into the M2.19G-relevant
  make targets, and some scripts are helpers or belong to other subsystems). Both numbers are reported here
  so the record is unambiguous; the full battery (`make` targets + CI) is the authoritative gate at merge.
- **vitest 365/365 across 31 test files** — 31 files, 365 cases; consistent.
- **62 current-only ADRs** — the M2.19A clean-slate 52 + ADR-058 (M2.19B) + ADR-059..063 (M2.19C) +
  ADR-064..066 (M2.19D) + ADR-067 (M2.19E/F) = 62. The website mirror carries 61 (one ADR is repo-only).
  No ADR was added in M2.19G, so the Rust repo-guards ADR-range check was not bumped.
- **445 vocabulary sources** — the regenerated grounding vocabulary artifacts after the knowledge.js
  reframe and the new pages.
- **Guard-script count.** The 102 figure is the tracked state at `7fbfa8f`. The 4 new M2.19G standalone
  guards (`check-certification-page`, `check-technical-registry-page`, `check-glossary-page`,
  `check-m2-19g-public-surface-canonical`) are present in the working tree and bring the total to **106**
  when committed and wired into the Makefile/CI as the final M2.19G guard additions.

---

## 3. What the battery verified for M2.19G specifically

- **`tsc` / `next build`** — the three new/rebuilt owner pages (`/certificacao`, `/registo-tecnico`,
  `/glossario`), the 9 rebuilt editorial pages, the updated `site.ts` footer, `sitemap.ts`, `reference.ts`,
  `decisions.ts` and `operadorZeroArtifacts.generated.ts` all compile and build into the route set.
- **`vitest`** — the home / public-consistency / reference-IA / public-surface / zeroSubdomain / native-agent
  suites pass against the reworded copy, the qualified hero and the read-only Operador Zero labels.
- **Guard self-tests** — every retargeted guard (`check-public-surface-clean`,
  `check-website-public-copy-current`, `check-reference-information-architecture`,
  `check-reference-chapter-order`, `check-operator-zero-public-hardening`,
  `check-operator-zero-realistic-journey`, home + banzai guards) passes its own `must_allow`/`must_report`
  and `must_flag`/`must_pass` assertions, proving both directions (current copy passes, forbidden form
  still fails).
- **Rust `identity-check` / `rust-rule-check`** — the extended `banza-repo-guards` identity allowlist
  (audit dir + Banzami-naming editorial pages) compiles and passes; no non-Rust engine was introduced.
- **SVG guards** — the 12 rewrites, the 2 new diagrams and the 8 deletions pass the SVG visual-system and
  quality checks; the registry is consistent.
- **operator-zero family** — the read-only reframe (status JSON, boundary, journey/policy tests) passes the
  Rust + node operator-zero checks.

---

## 4. Not covered by the offline battery — deferred to production validation

`next build` route count and `vitest`/guards confirm the surface is correct **in the build**; they do not
confirm the **live edge**. The following are part of the **PENDING DEPLOY** production validation in the
primary report and are not asserted here:

- HTTP status / canonical URL / sitemap presence of the live new pages.
- Live SVG serving (rewrites 200, deletions 404).
- Live `zero.banza.network` read-only reference reads.
- Live BanzAI `/banzai/ask` grounding (`grounded=true`, `external_model_called=false`, 0 degraded) on the
  reframed answers.
- Deployed image digests (website + banzai-api) and deploy timestamp.

---

## Verdict

The offline verification battery is green: `tsc` clean, vitest 365/365, `next build` 122 routes, the
recorded guard battery 99/99 scripts + 35/35 make targets, and the identity / rust-rule / SVG /
operator-zero Rust tests green. The static repo counts (102 scripts, 116 make targets, 31 test files, 62
ADRs, 445 vocabulary sources) are recorded here for an unambiguous baseline. Live-edge verification is
pending deploy.
