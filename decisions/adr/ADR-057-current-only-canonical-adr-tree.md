# ADR-057 — Current-Only Canonical ADR Tree (Clean-Slate Governance Policy)

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19A
- **Amends:** the "superseded ADRs are kept and never deleted / not rewritten" clauses of **ADR-038**
  (§ *Legacy compatibility* — "Superseded ADRs are marked superseded; they are never silently edited or
  deleted"), **ADR-039** (§ *Consequences* / historical-artifact framing), **ADR-040** (§ *Removed
  architecture — mapping* — "not rewritten"), and **ADR-021** ("ADR-022's historical analysis text is
  retained as a record and is not rewritten"). Those clauses are replaced by the retention rule decided
  here. No **decision** of ADR-038/039/040/021 is reversed — only their ADR-tree *retention* clause.
- **Related:** ADR-001 (open protocol), ADR-002 (ecosystem naming), ADR-005 (protocol-first),
  ADR-037 (Rust-first engines), ADR-043 (licence & open governance), ADR-038/039/040 (open trust model)

---

## Context

The `decisions/adr/` tree is the canonical, machine- and human-consumed record of BANZA's architecture
decisions. It is read by people, mirrored by the website (`/governacao`), and ingested by BanzAI's
grounding (`engines/banzai-query-core` indexes, glossary, vocabulary contracts) to answer `/ask`.

Over M1–M2 the set accumulated decisions from a superseded world: the phase when BANZA was written as if it
were an operator ("Banza needs a payment mechanism"), and the phase when protocol trust depended on a
central **Certificate Authority**, a **production root-key ceremony**, and **discretionary human approval**
of operators. Those models were removed from the *active* architecture (ADR-038/039/040 — Open Trust Model
without CA), but the ADRs that defined them were kept in the tree as **tombstones**, marked "superseded"
and, by the explicit clauses amended above, promised to be "never deleted" and "not rewritten".

A full audit (M2.19A — `artifacts/m2-19a/adr-audit-working.json`, `adr-contradiction-matrix.json`,
`adr-treatment-map.json`) found the consequences of that promise:

- **Removed-architecture tombstones** still present as canonical decisions — ADR-004 (a runnable
  sandbox-operator tree that no longer exists), ADR-022 (CA-issued certification levels), ADR-026
  (CA/certificate federation trust), ADR-027 (production root-key CA architecture), ADR-032 (BanzAI as a
  "subordinate knowledge system") — each fully superseded, each contradicting current policy, each read by
  BanzAI as if it were current.
- **Contradictions** between the tombstones and the current trust model that a reader (or BanzAI) cannot
  resolve from the tree alone.
- **Operator-era contamination** — operator-as-subject prose, an operator author byline, and
  operator-specific product names — in otherwise-current decisions.

The next milestone (M2.19) introduces the **Technical Interoperability Certification** architecture. Adding
a new architecture on top of a contradictory, tombstone-laden set would build on sand. The ADR set must be
coherent first. That requires deleting the fully-superseded removed-architecture ADRs from the current
tree — which the amended clauses forbade. This ADR resolves that governance conflict, so the clean-slate
reconstruction does not itself create a contradiction.

## Decision

**The `decisions/adr/` tree is current-only. Git history is the permanent, authoritative historical
record. A fully-superseded ADR whose every live rule is re-homed in a current ADR is removed from the
tree; it is not kept as a tombstone.**

| ID | Rule |
|----|------|
| **D-057-01** | **Current-only tree.** `decisions/adr/` contains only decisions that describe the current architecture. It carries no "this was superseded" tombstone whose sole remaining value is historical, and no "antes o BANZA era um operador / tinha uma CA" narrative. |
| **D-057-02** | **Git history is the record.** Every removed ADR remains fully readable in Git history at the commit before its removal. Removal from the tree is not erasure — it is the opposite of a tombstone: the history lives in Git, the tree stays current. |
| **D-057-03** | **No Git-history rewrite.** Removals are ordinary forward commits. History is never rebased, filtered, or force-rewritten. The audit trail of what was decided and then removed is preserved intact. |
| **D-057-04** | **Amendment, not reversal.** This replaces only the *retention* clauses of ADR-038/039/040/021 (the promise to keep superseded ADRs as marked, unedited tombstones). Every substantive **decision** of those ADRs — the Open Trust Model, self-publication, federation evaluation without certificates, the conformance level model — stands unchanged. |
| **D-057-05** | **Stable identifiers — no renumbering.** ADR numbers are permanent identifiers (the RFC discipline: an obsoleted RFC keeps its number forever). Surviving ADRs are **never** renumbered. A deletion leaves an intentional **gap** in the sequence; a gap means "an ADR was removed here — see Git history", and is not a defect. |
| **D-057-06** | **Self-contained removed-architecture descriptions.** Where a current ADR must describe a removed mechanism (e.g. ADR-038/040's "what was removed" mapping), it describes that mechanism inline and does not depend on a pointer to a deleted file. Removing an ADR must never leave a dangling reference. |
| **D-057-07** | **Re-home before delete.** An ADR is removed only after every live rule it carried is confirmed present in a current ADR (the re-home target is recorded in the deletion table below and in `adr-treatment-map.json`). If a live rule is not covered elsewhere, the ADR is rewritten, not deleted. |

### ADRs removed under this policy (M2.19A)

| Removed | Was | Live content re-homed in |
|---|---|---|
| **ADR-004** Reference Operator | A runnable `reference/sandbox-operator/` tree (local ledger, mock routing, simulated settlement) that the protocol-only repo no longer contains | **ADR-052** (Operador Zero — canonical reference payment-operator simulator) + **ADR-053** (Operator-Zero-only demo/example policy) |
| **ADR-022** Certification Level Architecture | CA-issued certification levels, BANZA-signed operator certificates, "BANZA CA issues certification" | **ADR-021** (level names + capabilities) + **ADR-038** (level numbering as descriptive conformance scope) + `docs/governance/certification-boundary.md` |
| **ADR-026** Federation Trust Model | CA / certificate / human-approved federation trust (INV-TRUST-001…007) | **ADR-038** (Open Trust Model without CA) + **ADR-040** (federation trust evaluation without certificates, INV-FEDEVAL-001…010) |
| **ADR-027** Production Root Architecture | The `certification` issuing domain, certificate issuance/renewal lifecycle, human-gated review | **ADR-038** (§ *Legacy compatibility* — the surviving offline threshold root, delegated keys, key manifest, INV-ROOT-*) |
| **ADR-032** BanzAI subordinate knowledge system | BanzAI as "subordinate / auxiliary knowledge system"; "a BANZA CA certifica" | **ADR-041** (native protocol agent) + **ADR-049** (operational protocol agent) + **ADR-054** (primary human-operator interface) |

The gaps at 004, 022, 026, 027 and 032 are permanent and intentional.

## Consequences

**Positive.**

- **The set is coherent.** No canonical ADR describes a CA, a root-key ceremony, discretionary operator
  approval, or BANZA-as-operator as current architecture. A reader — and BanzAI — reaches the current
  model from the tree alone.
- **History is intact.** Nothing is lost: every removed decision is one `git show` away, at the commit
  before its removal, with full context.
- **Grounding improves.** BanzAI stops ingesting removed-architecture tombstones as if current; the
  contradiction between "no CA" and a CA-defining ADR in the same tree is gone.
- **The certification architecture (M2.19) builds on a clean base**, which is the reason this milestone
  precedes it.

**Negative (accepted).**

- **Gaps in the number sequence.** The sequence is no longer contiguous. This is deliberate (D-057-05) and
  is the honest signal of a removal; it is strictly better than renumbering, which would break every stable
  reference to every surviving ADR.
- **The record now lives in two places by kind:** current decisions in the tree, superseded decisions in
  Git history. This is the standard model for a living specification and is the point of the policy.

**Untouched.** No financial invariant (`INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*`,
`INV-RECON-*`, `INV-QR-*`) is changed. Operator neutrality, the no-CA / no-discretionary-approval trust
model, Rust as the sole decision authority, and the rule that BanzAI's model never sits in a decision path
are all preserved — this ADR governs how the *decision record* is maintained, not what any decision says.

## References

- `artifacts/m2-19a/adr-audit-working.json` — the full per-ADR audit
- `artifacts/m2-19a/adr-contradiction-matrix.json` — every genuine contradiction and its resolution
- `artifacts/m2-19a/adr-treatment-map.json` — KEEP / REWRITE / DELETE per ADR, with scope decisions
