# M2.19G — README Sweep

**Eleven READMEs realigned to the three-layer / L2 / read-only-reference model**

**Status:** COMPLETE · Supporting report to `M2_19G_PUBLIC_SURFACE_RECONSTRUCTION_REPORT.md`

The reconstruction extended past the rendered website into the repository's READMEs — the first thing a
maintainer, contributor or operator reads. Eleven were realigned so they speak the current architecture
rather than the retired framings.

| README | Change summary |
|---|---|
| `README.md` (root) | Conformance framing corrected — L0–L4 named as conformance **scope** ("scoped by conformance levels L0–L4"), a new **"conformance & interoperability certification (per-implementation and evidence-based — ADR-064)"** bullet added; a new **"The three institutional layers"** section (L1 Protocol / L2 Certification / L3 Banzami Operational Scheme with **Banzami — Tecnologia e Serviços, Lda.** as designated operator, `REGULATORY_AUTHORIZATION_IN_PROGRESS`, real money off; **BANZA ≠ Banzami**; BanzAI transversal, not a 4th layer; Rust decides, Qwen explains); the status table's `/certificates`-route row replaced by a **Certification (L2)** row (per-implementation, published to the Technical Registry, currently empty; no central issuing body, no per-operator credential, no `/certificates` route). |
| `examples/operators/zero/README.md` | Reframed from the executing-simulator model to the ADR-067 read-only reference (see `M2_19G_OPERATOR_ZERO_READ_ONLY.md`); the largest README change (+107/−…). |
| `examples/operators/zero/e2e-root/README.md` | One-line realignment to the read-only reference. |
| `conformance/README.md` | Conformance framed as scope; certification (L2) as the per-implementation evidence-based determination that consumes conformance suites. |
| `contracts/production/README.md` | Certification-contract framing aligned to ADR-064/065/066 (profile / record / registry). |
| `decisions/adr/README.md` | ADR index realigned — three-layer ADRs (059–063), L2 certification ADRs (064–066), read-only Operador Zero (067) referenced in the current-only set. |
| `docs/governance/ceremony-records/README.md` | Trust-root ceremony framing aligned (independent of any operator; no BANZA CA). |
| `infra/banza-network/README.md` | Deployment/bundle framing aligned to the current public surface. |
| `spec/README.md` | Spec index realigned to the three-layer / L2 / read-only vocabulary. |
| `tools/root-ceremony/README.md` | One-line realignment. |
| `website/README.md` | Website README aligned — BanzAI single interface, three-layer public surface, read-only Operador Zero surface; `BANZA CA` referenced only as a removed/negated concept. |

## Invariants preserved

No README weakens a financial invariant, introduces product logic into the protocol spec, or makes the
protocol depend on a single operator. Where Banzami is named (root README's L3 section, ADR index), it is
the **designated scheme operator** attribution basis established in M2.19C/ADR-059/060 — L1 (protocol) and
L2 (certification) stay operator-neutral, and no README claims BNA authorisation. This is the same
institutional-attribution allowance the Rust `banza-repo-guards` identity guard already grants the
governance/licence pages (see `M2_19G_GUARD_CONVERGENCE.md`).

## Verdict

The eleven READMEs now present the three-layer architecture, the per-implementation L2 certification model
(no central authority, no per-operator credential, no `/certificates` route) and the read-only Operador Zero
reference, consistent with the rendered public surface and the ADRs.
