# M2.19A — Calibration findings (independent read of the trust/certification cluster)

> These are conclusions from reading the decision-critical ADRs directly (004, 021, 022, 026-via-refs,
> 027, 028, 032, 038, 039, 040). They anchor the contradiction matrix + treatment map + the required
> M2.19A governance ADR. The parallel audit workflow supplies the full 57-ADR inventory + reference scan;
> this file is the human-verified spine that reconciles with it.

## The CURRENT canonical trust/certification cluster (coherent, KEEP)

- **ADR-038 — Open Protocol Trust Model Without CA** (Accepted). Canonical trust authority. Open Trust
  Evaluation (6 steps). Trust Root signs *protocol metadata/releases/delegated keys/revocations only* —
  never operators. INV-OTE-001..010. Explicitly RETAINS the offline threshold root + delegated keys +
  signed key manifest + INV-ROOT-* (re-scoped) and CITES ADR-028 as the live rule for "no private keys on
  serving infra" (line 292).
- **ADR-039 — Operator Self-Publication + Machine-Verifiable Conformance** (Accepted). The self-publication
  path (8 steps), machine-verifiability definition, registry-is-an-index, absence≠prohibition.
- **ADR-040 — Federation Trust Evaluation Without Certificates** (Accepted). The 10-check federation
  evaluation, INV-FEDEVAL-001..010, removed-architecture mapping table.
- **ADR-021 — Conformance level capability alignment** (Accepted). Authoritative L0–L4 *names + capability
  mapping* (survivor of ADR-022). References `docs/governance/certification-boundary.md` as authoritative.

These four form the coherent core. **M2.19's Technical Interoperability Certification (ADR-057 draft) must
sit cleanly on top of this cluster** — never reintroducing a CA, an issued certificate, or a human/
discretionary gate.

## The REMOVED / superseded cluster (clean-slate targets)

| ADR | Frontmatter status | Reality | Treatment |
|---|---|---|---|
| **ADR-004** Reference Operator | Accepted (+2026-07 "Historical note") | Describes the removed `reference/sandbox-operator/` tree that no longer exists in the protocol-only repo; the demo/example role is now Operador Zero (ADR-052/053) + `examples/`. | **DELETE** (removed architecture; role re-homed) |
| **ADR-022** Certification Level Architecture | "Superseded in part" | CA-contaminated ("BANZA CA issues certification", root-key evidence signing, human-gated). Survivors already re-homed: names/capabilities→ADR-021; level-as-descriptive-grouping→ADR-038 §Migration; certification-boundary.md. | **DELETE** (survivors re-homed) |
| **ADR-026** Federation Trust Model | superseded | Superseded IN FULL by ADR-038 (D-038-02); evaluation by ADR-040. Pure tombstone. | **DELETE** |
| **ADR-027** Production Root Architecture | "Superseded in part" | CA apparatus (issuance domain, key-manifest lifecycle, HSM ceremonies). Surviving key architecture re-expressed in ADR-038 §"Legacy compatibility". | **DELETE** (survivors re-homed in ADR-038) — verify key-manifest technical detail is captured in ADR-038 or a contract before deleting |
| **ADR-028** Keys never on serving infra | **Proposed** (never Accepted) | Framed on the removed root/issuing-key hierarchy, BUT carries a LIVE rule ADR-038:292 cites and does not fully restate ("VM holds no private keys, performs no signing"). | **REWRITE** → re-accept, re-frame around the open trust model (serving VM serves signed public artifacts only; signing is offline). NOT delete. |
| **ADR-032** BanzAI subordinate knowledge system | "Superseded by ADR-041" | Pure tombstone. Current BanzAI framing: ADR-041/049/050/054. | **DELETE** |

## THE CRITICAL META-CONTRADICTION (must be resolved first)

ADR-038 / ADR-039 / ADR-040 / ADR-021 each contain an explicit **meta-policy** that superseded ADRs are
*kept as marked tombstones and never deleted*, and each **references specific sections** of the
to-be-deleted ADRs to explain removed architecture:

- ADR-038:302-307 — "Superseded ADRs are marked superseded; they are **never silently edited or deleted**."
- ADR-040 "Removed architecture — mapping" — points to *ADR-026 §Phase 4/5, ADR-027 §Phase 2/3*.
- ADR-039:44,199-205 — points to *ADR-026 §Certificate Lifecycle, ADR-027 §Phase 2, ADR-022 §Phase 7*.
- ADR-021:83 — "ADR-022's historical analysis text is **retained as a record and is not rewritten**."

M2.19A's clean-slate directive ("no tombstones; delete operator/CA-era ADRs from the current tree; Git
keeps history") **directly contradicts** this meta-policy, and **deleting** 022/026/027/032 would leave
**broken section references** in 038/039/040/021.

### Resolution (mandatory, this is why the audit precedes the deletion)

1. **Author a new M2.19A governance ADR** — "Current-Only Canonical ADR Tree (Clean-Slate Policy)" — that
   explicitly **amends** the "never deleted / retained as history" clause of ADR-038/039/040/021: the
   *current tree is current-only*; the *Git history is the permanent historical record*; fully-superseded
   ADRs whose live content is re-homed are removed from the tree (NOT the git history). Without this ADR the
   deletions themselves create a new contradiction → fails `unresolved_contradictions=0`.
2. **REWRITE** the current ADRs (038/039/040/021) that reference deleted-ADR sections so their
   removed-architecture descriptions are **self-contained** (they already describe the removed mechanism
   inline — only the `ADR-0XX §Phase-Y` provenance pointer must go, replaced by a plain description or a
   pointer to the git-history note in the new policy ADR).
3. **Repo-wide reference migration**: every other reference to a deleted ADR (docs, website, BanzAI vocab,
   tests, SVGs, contracts, guards, repo-guards range) is updated or removed → `broken_references=0`,
   `deleted_adr_references=0`.

## Deletion surface — every place an ADR is enumerated (must all be handled per removed ADR)

1. **`decisions/adr/ADR-XXX-*.md`** — canonical source of truth.
2. **`website/content/decisions/adr/ADR-XXX-*.md`** — website snapshot mirror ("copied unmodified from
   decisions/adr/", per `website/lib/decisions-content.ts:7`). **PRE-EXISTING DRIFT: mirror has 54, canonical
   57 — missing ADR-055/056/057.** M2.19A should re-sync the mirror as part of the reconstruction.
3. **`website/lib/decisions.ts`** — hand-maintained static per-ADR metadata (path, canonicalUrl, title) that
   drives the `/governacao` index + counters. Must delete the entry for each removed ADR.
4. **`engines/banza-repo-guards/src/lib.rs:184`** — `(1..=56).contains(&num)` is a **range** check (gaps
   tolerated, NOT contiguity). Bump to `1..=57` for ADR-057; fix stale `// 1..=54` comment at :172.
5. **Other current ADRs** referencing removed ADRs by number/section — 038/039/040/021 (See-also, Supersedes,
   removed-architecture mapping tables). REWRITE to be self-contained.
6. **BanzAI generated indexes** — `tools/gen-banzai-vocabulary.mjs`, `gen-banzai-truth-table.mjs`,
   `gen-banzai-golden-dataset.mjs`, the repo doc-index — ingest the ADR corpus; regenerate + rebuild WASM.
7. **docs / SVGs / other guards / conformance / contracts** referencing removed ADRs — from refscan.

Because gaps are tolerated by the range guard, **renumbering is optional** — the low-churn, low-risk path is
to DELETE removed ADRs (leaving gaps 004/022/026/027/032) and NOT renumber the survivors. Renumbering would
touch canonicalUrl in decisions.ts + every cross-ref + git blame for marginal aesthetic gain. **Decision
(pending final synthesis): delete-with-gaps, no mass renumber**, unless the audit surfaces a strong reason.

## ADR-057 (M2.19 draft) status within M2.19A

ADR-057 (Technical Interoperability Certification) is the certification domain's canonical decision. Under
M2.19A's renumbering it may keep 057 (it is the newest, highest number, no gap-fill needed) OR be
integrated at its domain position. Simplest coherent choice: **keep numbers stable (no mass renumber)** and
only *delete* the removed ADRs, leaving gaps — UNLESS the audit shows renumbering adds real value. Decide in
synthesis (renumbering churn vs. clean contiguous sequence). ADR-057 must be re-reviewed for coherence with
the cleaned cluster (it must not lean on any deleted ADR).
