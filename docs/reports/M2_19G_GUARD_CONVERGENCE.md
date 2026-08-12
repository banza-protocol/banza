# M2.19G — Guard Convergence

**Content reworded to avoid retired literals · guards retargeted to the current canonical vocabulary with the underlying invariant preserved · identity allowlist extended**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`

M2.19G moved the public vocabulary forward (three layers, L2 certification, read-only Operador Zero,
BanzAI-not-a-layer, qualified bilateral claim). The guards had to move with it: some literals they pinned
as *forbidden* became *current* canonical copy (e.g. bare "certificação" is now the L2 term), and some
invariants they enforced are now expressed with new phrasing (e.g. Operador Zero's boundary in the
read-only model). The rule throughout: **content is reworded to avoid retired literals, and each guard is
retargeted so the underlying invariant it protects is preserved, never weakened** — verified by each
guard's own self-test (`must_allow` / `must_report`, `must_flag` / `must_pass`).

---

## 1. Scope of guard changes

M2.19G added **4 new standalone guards** (the three new owner pages + an aggregate capstone) and modified
**10 existing guard scripts**, plus the Rust `banza-repo-guards` identity allowlist. The existing
public-surface guards were also extended so the reworded vocabulary, the qualified hero and the new-page
copy pass without weakening any invariant.

Static repo state at the reconstruction commit: 102 `tools/check-*.sh` scripts, 116 `*-check` Makefile
targets.

> Snapshot note: the reconstruction commit `7fbfa8f` carries the 10 modified guards + the Rust allowlist.
> The 4 new standalone guard scripts (`tools/check-certification-page.sh`,
> `check-technical-registry-page.sh`, `check-glossary-page.sh`, `check-m2-19g-public-surface-canonical.sh`)
> are present in the working tree with their self-tests; they are the final M2.19G guard additions being
> committed and wired into the Makefile/CI as part of closing the milestone.

## 1a. Four new standalone guards

Each is negation-aware (a term inside `não …` / `nunca …` / `sem …` / `«…»` / a question is a mention, not
a claim), has its own self-test (exit 2 if the self-test is broken, exit 1 on a violation), and asserts the
new page is linked from the footer (`website/lib/site.ts`) and the sitemap (`website/app/sitemap.ts`).

| Guard | Locks |
|---|---|
| `check-certification-page.sh` (108 lines) | `/certificacao` (L2, ADR-064/065/066): both mandatory canonical sentences ("É" / "NÃO É") verbatim; the certificação técnica ≠ admissão a esquema ≠ autorização regulatória three-way separation; the ADR references; the closed fail-closed lifecycle states (NOT_CERTIFIED/CERTIFIED/EXPIRED/SUSPENDED/REVOKED/SUPERSEDED); footer + sitemap linkage; and that **no** retired framing (BANZA CA, operator certificate, `/certificates`, BanzAI Web, Validation Workbench, `/banzai/validar`, four/five layers, BanzAI-as-layer, L0–L4 as tiers, Operador-Zero-as-simulador, BNA authorisation) appears as a positive claim. |
| `check-technical-registry-page.sh` (100 lines) | `/registo-tecnico` (Technical Registry, ADR-065): the canonical root-verifiable-index definition; the closed certification states; the explicit boundary that it is **not** a scheme-participant directory (listed ≠ admission ≠ authorisation); the honest empty/pre-production state (`/operators` → `[]`); footer + sitemap linkage; no retired framing as a positive claim. |
| `check-glossary-page.sh` (100 lines) | `/glossario`: the required **current** terms are defined (conformance, interoperability, certification, admission, authorisation, evidence, registry, operator, implementation, profile, capability, revocation, federation, scheme — by canonical PT headword); **no** retired term is defined as a current concept; footer + sitemap linkage. |
| `check-m2-19g-public-surface-canonical.sh` (119 lines) | **Capstone aggregate sweep** over `website/app/**/page.tsx` + `components/**` + `BANZA_REFERENCIA.md` + `lib/{site,reference,decisions}.ts` (excluding `banzai-agent.ts` config and tests): [A] zero retired-framing positive claims (negation-aware; `/certificates` ignores the operator well-known endpoint; "simulador" forbidden only when it frames Operador Zero); [B] the three-layer vocabulary is present (L1/L2/L3 + "Esquema Operacional" + BanzAI "transversal"/"interface humana única"); [C] the qualified hero ("sem reconstruir integrações") is present and the absolute "sem acordos bilaterais" over-claim is never made. |

---

## 2. Content-vs-vocabulary guards retargeted

### `check-public-surface-clean.sh` (+29 lines)

- **Bare "certificação" is now current L2 vocabulary.** The forbidden label was narrowed from
  `(certificação|certificacao)` to the **entity form** `certifica(ção|cao) de (operador|operadores|entidade|entidades)`
  — because "perfil de certificação", "certificação (L2)", "modelo de certificação", "sujeito da
  certificação" are current copy. `must_allow` self-tests now clear the L2 uses (from `decisions.ts`,
  `estado/page.tsx`); `must_report` self-tests still flag `certificação de operador`.
- **Guillemet mention clearing (`GUILLEMET_MENTION`).** `«…»` are prose quotation marks (never code string
  delimiters), so a term inside guillemets is being *named*, not claimed. This lets a `.tsx` sentence such
  as "impede o registo de ser lido como uma lista de «operadores certificados»" pass, while a bare
  `<h2>Operadores certificados</h2>` or a footer badge "SEM OPERADOR CERTIFICADO" still reports.
- Self-tests added for the new owner-page copy (the `/certificacao` redirect-component identifier, the
  guillemet mention on `/operadores`).

### `check-website-public-copy-current.sh` (+28 lines)

- `Workbench` and `operador certificado` handling split. `BanzAI Web` / `Validation Workbench` /
  `Workbench` stay retired. **Operator/entity certification** moved to a dedicated `OPERATOR_CERT` scan with
  an `OPERATOR_CERT_OK` clearing set (negation / `nem` / `sem` / removed / superseded / guillemet mention),
  so the current copy passes ("sem operador certificado em produção"; the registry-is-NOT-this sentence;
  "não existe «certificado de operador»") while an **active claim** ("um operador certificado consta do
  registo") still flags. New `must_flag_oc` / `must_pass_oc` self-tests cover all four cases.

### `check-reference-information-architecture.sh` (+2 lines)

- Chapter-7 expected title updated `Conformidade e Evidência` → **`Conformidade e Certificação`**. The 15
  slugs and all other titles/positions are unchanged (the M2.7L whole-order contract is preserved).

### `check-reference-chapter-order.sh` (+7 lines)

- The ch.9 required-phrases set retargeted to the read-only boundary. Was `"não é banco" / "não é PSP" /
  "KZ_DEMO" / "dinheiro fictício"`; now `"não é banco, PSP, carteira" / "não movimenta dinheiro real" /
  "KZ_DEMO"`. **Invariant preserved:** the chapter must still state the not-a-financial-institution
  boundary AND that it moves no real money, in the demo currency; the retired "dinheiro fictício"/"simulador"
  literal is dropped.

### `check-operator-zero-public-hardening.sh` (+15 lines)

- The chapter-content `NEED` pairs retargeted from the simulator model to the read-only model, boundary
  intact: `clone em memória` → `só de leitura|apenas de leitura`; `fluxo negativo` → `405` (read-only
  refusal path: write → 405); `ledger fictício` → `exemplo de ledger` (read-only, non-mutable);
  `PASS ≠ certificação` (`evidência técnica local`) → `prontidão de certificação não é certifica…`. KZ_DEMO,
  Demo Operator Root, "não é banco / não é PSP" and the `zero.banza.network` link are still required.

### `check-operator-zero-realistic-journey.sh` (+4 lines)

- Journey expectations retargeted to the 9-step read-only validation journey (from the retired 7-step),
  consistent with the reframed status JSON and BanzAI answers.

### `check-banzai-single-interface.sh` (+2) · `check-banzai-public-surface-final-consistency.sh` (+2)

- Minor retargets to keep the single-`/banzai`-interface contract and the public-surface consistency check
  green against the reworded editorial copy.

### `check-homepage-final-public-release.sh` (+2) · `check-homepage-final-validation.sh` (+4)

- Home guards retargeted to the qualified hero ("sem reconstruir integrações técnicas bilaterais entre cada
  par") and the three-layer home copy. The corresponding website vitest suites (`m2_16-home.test.ts`,
  `m2_17-homepage.test.ts`, `m2_14j-public-consistency.test.ts`, `publicSurface.test.ts`,
  `referenceIA.test.ts`, `zeroSubdomain.test.ts`, `nativeAgent.test.ts`) were updated to the same contract.

---

## 3. Rust `banza-repo-guards` identity allowlist (+19 lines, `engines/banza-repo-guards/src/lib.rs`)

Two allowlist extensions in `banzami_attribution_allowed()` — **attribution, not new content**:

1. **Editorial pages that now name Banzami as the L3 designated scheme operator** — `website/app/page.tsx`,
   `o-que-e`, `arquitectura`, `estado`, `roteiro` pages, and `website/lib/reference.ts`. Same
   M2.19C/ADR-059/060 institutional-attribution basis already granted to the `governanca`/`licenca` pages.
   L1 (protocol) and L2 (certification) stay operator-neutral; Banzami is never framed as a BANZA payment
   operator nor regulator-authorised without evidence; the `NORMATIVE_BRANDS` payment operators stay
   blocked everywhere.
2. **The M2.19G audit artifacts** — `artifacts/m2-19g/**`. These faithfully *record* the live/canonical
   public surface (which names Banzami as the L3 designated operator); they are evidence records of what is
   published, not authored protocol content — scrubbing the captured name would corrupt the audit. Payment-
   operator brands captured by a crawl are still blocked by the separate normative-brand list.

The ADR-range check in `lib.rs` was **not** bumped in M2.19G — no new ADR was introduced (ADR-067 was
added in M2.19E/F). The 62 current-only ADRs are unchanged.

---

## 4. Invariant-preservation principle

Every retarget in this milestone follows the same discipline used across the M2.19 guard realignments:

- The guard's **assertion of the invariant** is preserved (not-a-financial-institution, no real money,
  never-in-`/operators`, evidence ≠ certification, single BanzAI interface, chapter order, operator
  neutrality of L1/L2).
- Only the **literal string it pins** changes, to track vocabulary that moved from forbidden to canonical
  (bare "certificação", the read-only boundary phrasing, the 9-step journey, the qualified bilateral claim).
- Each change ships with an updated **self-test** proving both directions: the current copy passes, the
  genuinely-forbidden form still fails. No guard was disabled or made permissive-by-removal.

## Verdict

The guard battery converged to the current canonical vocabulary without weakening any invariant: **4 new
standalone guards** (three owner-page guards + one capstone aggregate sweep, each self-tested), **10 scripts
retargeted** (each self-test-verified), the new-page/hero enforcement also folded into the existing
public-surface guards, and the Rust identity allowlist extended for the audit dir and the Banzami-naming
editorial pages. No ADR-range bump was needed (no new ADR in M2.19G).
