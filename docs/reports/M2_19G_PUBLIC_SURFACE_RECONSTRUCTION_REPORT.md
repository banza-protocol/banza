# M2.19G — Public Surface Reconstruction Report

**Full semantic, editorial and architectural reconstruction of the entire public BANZA surface to the current three-layer architecture**

**Status:** COMPLETE + LIVE — 2026-07-29

**Branch:** `release/m2-19g-public-surface-reference-canonicalization`
**Reconstruction commit:** `7fbfa8f` (`feat(m2.19g): public-surface reconstruction to three-layer architecture`)
**Fork point (rollback base):** `6891ddc` (M2.19E/F.2 reports commit on `main`)
**Milestone position:** M2.19G of M2.19-FINAL (BANZA v1.0 launch 2026-08-01). Precedes M2.19H (scheme & regulatory readiness) and M2.19I (launch).

---

## 1. Scope

M2.19G is the public-facing convergence of everything M2.19A–F decided internally. The protocol, its
trust model, its three institutional layers, its L2 certification model and its read-only reference
implementation were all specified, engined and grounded in earlier submilestones — but the **public
website, the canonical Reference, the SVGs, the READMEs and the BanzAI grounding still spoke the retired
vocabulary**: a two-layer protocol/operator picture, L0–L4 as public certification *levels*, BanzAI as a
"layer", and Operador Zero as an *executing simulator* with a `KZ_DEMO` ledger and a `100/100` score.

M2.19G rebuilds that surface so that what a reader sees matches what the protocol actually is, end to
end, with no product logic and no operator brand entering the L1/L2 specifications.

The work spanned three commits on the branch (`2d697b3` reconstruction, `3dc0c44` report-scan exemption,
`7fbfa8f` final reconstruction), touching **89 files (+7,012 / −1,457 lines)**: 5 Gate-0 audit artifacts,
the Reference markdown + chapter metadata, 9 editorial pages, 3 owner pages, 14 SVGs changed and 8 deleted,
the SVG registry, 11 READMEs, the Operador Zero example artifacts + BanzAI grounding, 10 guard scripts,
the Rust repo-guards allowlist, the decisions/state explorer data, and the regenerated vocabulary artifacts.

---

## 2. The canonical three-layer model (the target every surface now speaks)

Grounded in ADR-059..067 and `artifacts/m2-19g/canonical-concept-matrix.json`:

| Layer | What it is | Normative source |
|---|---|---|
| **L1 — BANZA Protocol** | The open, neutral, verifiable rules, contracts and invariants. Holds no funds, is no PSP, runs no certificate authority. This repository. | ADR-059 D-059-01 |
| **L2 — Conformance & Interoperability Certification** | A **per-implementation**, **evidence-based**, **Rust-decided**, reproducible, hash-bound, scoped and time-limited determination against a public, versioned profile. Certifies an *implementation* (a build, by content hash), never an entity or brand. Not a licence, not scheme admission, not regulatory authorisation. Records publish to the Technical Registry. | ADR-059 D-059-02, ADR-064/065/066 |
| **L3 — Esquema Operacional (Banzami)** | The first operational scheme built on BANZA, with **Banzami — Tecnologia e Serviços, Lda.** as the *designated operator*, in regulatory preparation (`REGULATORY_AUTHORIZATION_IN_PROGRESS`), real payments OFF. **BANZA ≠ Banzami**; certification is never exclusive to this scheme. | ADR-059 D-059-03, ADR-060, ADR-062 |

Two invariants sit across the three layers:

- **BanzAI is the single transversal human-operator interface** at `/banzai` — *not* a fourth layer and
  *not* an authority (ADR-059 D-059-04, ADR-054, ADR-067). Two modes (ask + validation) of one shell.
- **Rust decides / Qwen explains** — the Rust engines understand, route, execute, validate and *decide*;
  the local Qwen model explains once and never decides, certifies, approves, admits, publishes or
  activates (ADR-059 D-059-05, ADR-037).

Two separations are stated explicitly and everywhere: **Technical Certification (L2) ≠ Scheme Admission
(L3) ≠ Regulatory Authorisation** (ADR-061); and the **Technical Registry ≠ scheme participant directory**
(ADR-065/060). **Operador Zero is the read-only canonical reference implementation** (ADR-067) — it
*exposes* artifacts and executes nothing; it is not a simulator, not a real operator, `NOT_CERTIFIED`, no
score, and never appears in `/operators`.

`L0–L4` survive as **conformance scope levels** inside the L2 model (ADR-021; `scope_levels` enum) — what
is now forbidden is presenting them as public certification *levels/tiers*.

---

## 3. What was reconstructed

### 3.1 Gate-0 audit (5 artifacts under `artifacts/m2-19g/`)

Before touching a single page, the whole public surface was inventoried and classified against the
canonical model. See `M2_19G_GATE0_AUDIT.md`.

- `public-surface-inventory.json` — 26 surfaces (24 `page.tsx` routes, 12 redirect aliases, 2 dynamic, 3
  machine routes) + the 15 reference chapters, each with a reconstruction treatment.
- `svg-inventory.json` — 42 SVGs, each with embedding page, concept, ADR, forbidden visible text and treatment.
- `canonical-concept-matrix.json` — 32 canonical concepts, each grounded in the real ADR/schema, with the
  page that should OWN it, the chapters that may repeat it, and its forbidden terms.
- `public-content-semantic-audit.json` — 25 public content blocks classified (8 CANONICAL, 17 needing
  remediation).
- `public-edge-crawl.json` — 43 live pages crawled from `banza.network` + `zero.banza.network` (Gate-0
  "before" state), robots/sitemap, orphan routes, canonical-URL issues.

### 3.2 Reference (`website/content/BANZA_REFERENCIA.md` + `website/lib/reference.ts`)

15 chapters realigned to three layers. Chapter 7 renamed **"Conformidade e Certificação"** (was
"Conformidade e Evidência") and now presents the L2 model (Profile → CertifiedImplementation →
CertificationRecord, states, reason codes, Technical Registry) instead of L0–L4 as levels; ch.8 rebuilt
as the operator/implementation/participant taxonomy; ch.9 Operador Zero rebuilt to the ADR-067 read-only
reference; ch.12 BanzAI rebuilt as the single transversal interface (not a layer). Full chapter-by-chapter
record in `M2_19G_REFERENCE_RECONSTRUCTION.md`.

### 3.3 New owner pages

- **`/certificacao`** — the real L2 certification page (was a redirect). ADR-064/065/066.
- **`/registo-tecnico`** — the BANZA Technical Registry, distinct from the L3 participant directory. ADR-065.
- **`/glossario`** — the canonical current-only glossary. §26.

Footer (`website/lib/site.ts`) and sitemap (`website/app/sitemap.ts`) wired to all three, and the footer
"ADRs e RFCs" link repointed from the `/governacao` redirect to `/decisoes`. See `M2_19G_NEW_PAGES.md`.

### 3.4 Home + editorial pages

Home (`page.tsx`) and `o-que-e`, `arquitectura`, `operadores`, `confianca`, `federacao`, `porque-existe`,
`estado`, `roteiro` rebuilt to three-layer, operator-neutral copy. The hero was **qualified**: the
absolute "sem acordos bilaterais" is replaced by **"sem reconstruir integrações técnicas bilaterais entre
cada par"** (accurate: the protocol removes bilateral *technical integration*, not every commercial
agreement). `/decisoes` explorer data (`website/lib/decisions.ts`) updated — ADR-055/056/058 surfaced,
ADR-052 reframed — over the 62 current-only ADRs.

### 3.5 SVGs

12 rewritten, 2 new (**SVG-P-092** emission→registry + state machine, **SVG-P-093** cert≠admission≠
authorisation), 8 retired simulator diagrams deleted; registry updated; flagship **SVG-P-057** is now the
operator-neutral three-layer institutional overview. See `M2_19G_SVG_REBUILD.md`.

### 3.6 Operador Zero + BanzAI grounding

Operador Zero status JSON, `ZERO_OPERATOR_BOUNDARY.md` and README reframed from the retired simulator
model to the ADR-067 read-only reference; score / PASS-demo / 7-step retired; validation is the 9-step
BanzAI journey at `/banzai?mode=validation`. BanzAI grounding (`services/banzai-api/src/knowledge.js`) —
15 answer entries reframed. See `M2_19G_OPERATOR_ZERO_READ_ONLY.md` and `M2_19G_BANZAI_GROUNDING_REFRAME.md`.

### 3.7 READMEs, guards, vocabulary

11 READMEs realigned (`M2_19G_README_SWEEP.md`). 10 guard scripts reworded/retargeted to the current
canonical vocabulary with the underlying invariant preserved, **4 new standalone guards** added (owner-page
guards `check-certification-page`, `check-technical-registry-page`, `check-glossary-page` + the capstone
`check-m2-19g-public-surface-canonical`, each self-tested), plus the Rust `banza-repo-guards` identity
allowlist extended for the `artifacts/m2-19g/` audit dir and the editorial pages that now name Banzami as
the L3 designated operator (`M2_19G_GUARD_CONVERGENCE.md`). Vocabulary artifacts regenerated (445 sources).

---

## 4. Verification battery (recorded at the reconstruction commit)

| Gate | Result (recorded) |
|---|---|
| `tsc` | clean |
| `vitest` (website) | 365 / 365 |
| `next build` | 122 routes |
| Guard scripts | 99 / 99 |
| Make guard targets | 35 / 35 |
| `identity-check` (Rust) | green |
| contamination / public-surface-clean | green |
| `rust-rule-check` | green |
| SVG visual system + quality | green |
| operator-zero family (Rust + node) | green |

Independently observed static repo facts at reconstruction commit: 102 `tools/check-*.sh` scripts, 116
`*-check` Makefile targets, 31 website `*.test.*` files. The "99/99 scripts + 35/35 make targets" figures
are the milestone author's recorded battery run (a curated canonical subset), not the full script/target
inventory. Detail and reconciliation in `M2_19G_VERIFICATION_BATTERY.md`.

---

## 5. Forbidden-terms compliance (public surface)

Every retired term is gone from the live website source/content; the only survivals are in
`docs/reports/**` and governance history that document the removals, plus ADR files that name a retired
concept as a superseded record. Full list with the enforcing guard for each in
`M2_19G_FORBIDDEN_TERMS_COMPLIANCE.md`. Summary:

| Forbidden framing | Enforcing guard | Live public status |
|---|---|---|
| `BanzAI Web` / standalone `Validation Workbench` | `check-website-public-copy-current.sh`, `check-banzai-single-interface.sh` | absent |
| `/banzai/validar` route | `check-banzai-single-interface.sh` | absent (404) |
| L0–L4 as public certification **levels/tiers** | `check-public-surface-clean.sh`, SVG guards | absent (kept only as conformance scope) |
| Operador Zero as **simulador** / mutable ledger / `100/100` / `PASS demo` / 7-step | `check-operator-zero-public-hardening.sh`, `check-operator-zero-realistic-journey.sh`, `check-public-surface-clean.sh` | absent |
| BanzAI **as a layer** | `check-public-surface-clean.sh` (reference), reference IA guard | absent |
| entity/operator **certificate** as active claim | `check-website-public-copy-current.sh`, `check-public-surface-clean.sh` | absent (only negated/absence/guillemet mentions) |
| central **certificate authority** (`BANZA CA`) | `check-website-public-copy-current.sh` | absent (only negations) |
| `/certificates` route | `check-public-surface-clean.sh` | absent (replaced by Technical Registry) |
| absolute "sem acordos bilaterais" hero | home guards, `check-website-public-copy-current.sh` | qualified to "sem reconstruir integrações técnicas bilaterais entre cada par" |
| 4/5 layers (canonical is 3) | SVG guards, `check-public-surface-clean.sh` | absent |

---

## 6. Rollback

- **Revert the reconstruction:** `git revert 7fbfa8f 3dc0c44 2d697b3` (in that order), then rebuild +
  redeploy website + banzai-api.
- **Or reset to the pre-milestone base:** `git checkout 6891ddc` (the M2.19E/F.2 reports commit — the
  fork point of this branch), rebuild + redeploy.
- The reconstruction is confined to the public surface, the audit artifacts, the guard scripts and the
  BanzAI grounding. It touches **no financial engine, no contract in `contracts/`, no conformance vector,
  and no invariant** — so a rollback carries no ledger, settlement or trust-model risk. The three deleted
  categories (52 M2.19A ADRs, the removed BANZA CA, the retired simulator diagrams) stay as they were;
  M2.19G removed only the retired *public presentation* of already-retired concepts.

---

## 7. Production validation — **PASS** (public edge, banza.network)

**Deployed** from main `768697b` (PR [#226](https://github.com/banza-protocol/banza/pull/226), CI **177/177 SUCCESS**) on 2026-07-29. Image digests: website `sha256:9ab40223…333f39bc`, banzai-api `sha256:d1f5d3fa…c33a4359`; reverse-proxy restarted; website + banzai-api + llama-local all healthy. Rollback tag `rollback-pre-m2-19g` → `6891ddc`.

| Gate | Result |
|---|---|
| `/certificacao`, `/registo-tecnico`, `/glossario` | **200** (all three; footer + sitemap linked) |
| Home + editorial (`/`, `/o-que-e`, `/arquitectura`, `/operadores`, `/confianca`, `/federacao`, `/porque-existe`) | **200** (7/7) |
| `/decisoes`, `/estado`, `/roteiro`, `/banzai`, `/referencia`, `/referencia/completa` | **200** (6/6) |
| Three-layer vocabulary on home | present: "Esquema Operacional", "Conformidade e Interoperabilidade", "transversal", "sem reconstruir integrações" |
| Absolute "sem acordos bilaterais" (positive) on live edge | **0** |
| SVG-P-057 (three-layer overview), SVG-P-092, SVG-P-093, operador-zero-validation-target-v2 | **200** (serve) |
| Forbidden-term sweep across 9 key pages (`BANZA CA`, `certificado de operador`, `operador certificado`, `BanzAI Web`, `banzai/validar`, `certificate authority`, `100/100`) | **0 each** |
| `autoridade certificadora` | present only as negation/absence/contrast ("Não existe…", "SEM…", "Ausência de…", "face a um modelo de…") — the open-trust framing; negation-aware `open-governance` guard confirms |
| `PASS demo` | **0** (the 4 raw matches were the substring of "PASS **demo**nstra") |
| `GET /banzai/ask` | **405** |
| BanzAI "estado do Operador Zero" / "o que é o Operador Zero" | `external_model_called=false` (local Qwen); **0** `simulador`/`PASS demo`/`score 100`/`7/7`; described as "implementação de referência" |

All gates pass. The 8 retired simulator SVGs were removed from the repo and their embeds repointed; no live page references them.

---

## 8. Verdict

The public BANZA surface — home, editorial pages, the 15-chapter Reference, the SVGs, the READMEs, the
Operador Zero surface and the BanzAI grounding — now speaks the current three-layer architecture with one
transversal BanzAI interface, a per-implementation evidence-based L2 certification model, and a read-only
Operador Zero reference. Rust decides; Qwen explains. The reconstruction is complete, fully verified in
the offline battery (tsc · vitest 380/380 · next build 122 routes · full guard battery + CI 177/177), and
**COMPLETE + LIVE** on banza.network with a clean public-edge QA pass.
