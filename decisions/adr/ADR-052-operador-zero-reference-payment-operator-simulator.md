# ADR-052 — Operador Zero: reference payment-operator simulator

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.12A
- **Supersedes:** none
- **Related:** ADR-001 (open protocol), ADR-003 (operator separation), ADR-037 (Rust-first engines),
  ADR-041 (BanzAI native protocol agent), ADR-053 (Operator-Zero-only demo/example policy)

---

## Context

BANZA specifies a protocol but has never exercised it end to end against a *whole operator*. The
conformance suite validates artifacts in isolation; the BanzAI journey walks an operator through
seven steps using per-step examples that do not add up to one coherent operator. Nothing in the
repository answers the question an implementer actually asks: **what does a complete, conforming
operator look like, and can I watch one work?**

Two things follow from that gap. Implementers have no reference to copy. And the protocol's own
claims — that the invariants hold, that trust fails closed, that federation rejects an incompatible
peer, that an evidence bundle is assemblable — are asserted rather than demonstrated.

The obvious way to close it is a reference implementation. The obvious risk is that a reference
implementation of a *payment operator* starts to look like a payment operator: a thing with
balances, transactions, QR codes and settlement, published on the protocol's own domain. That
resemblance is a legal and reputational hazard, and it is the reason this decision is an ADR rather
than a task.

## Decision

BANZA will maintain a canonical simulator, **Operador Zero**, as the protocol's end-to-end proof.

1. **It exists.** `operator-zero` is the canonical reference payment-operator simulator.
2. **It is `demo_only`.** Every artifact it publishes carries `demo_only: true`,
   `monetary_value: false` and `production_allowed: false`.
3. **It simulates PSP-like behaviour and is not a PSP.** It models accounts, balances, QR payments,
   refunds, reconciliation, trust and federation. It is not a bank, a PSP, a wallet, a licensed
   financial operator, and it moves no real money.
4. **Its currency is fictional.** `KZ_DEMO` — never `AOA`, never any real currency code.
5. **It moves no real funds and provides no financial service.**
6. **It never appears in `/operators` as a real operator.** The public registry stays empty of it.
7. **It represents no authorisation, certification, approval or licence.** A PASS from it is local
   technical evidence, exactly as a PASS from the conformance suite is.
8. **Its canonical artifacts live in `examples/operators/zero/`.**
9. **Its engine is Rust** — `engines/operator-zero-core/` — per ADR-037. Ledger arithmetic,
   validation, simulation, reconciliation, trust, federation, evidence and traces are computed
   there, never in TypeScript.
10. **A demonstrative service may exist** at `services/operator-zero/` if a runtime is ever needed;
    static artifacts are preferred while they suffice.
11. **Its intended public home is `zero.banza.network`.**
12. **Only `zero.banza.network` represents it being live.** A page served at any other path is not
    the subdomain being live, and must never be described as such.
13. **It has its own `Demo Operator Root`** — an operator-local signing root that signs demo material
    and nothing else.
14. **No private key of that root is ever committed.** Public key, key manifest, signatures, hashes
    and evidence are committed; seeds, mnemonics, private PEM, tokens and passwords are not.
15. **BanzAI may clone the template into browser session memory.** Each visitor gets an isolated
    copy. Changes never reach the canonical template, another visitor, Git, PostgreSQL or production.
16. **It passes the whole journey** — Manifest, Conformidade, Trust, Federação, Evidence Bundle,
    Traces — and a negative counterpart that produces real blockers.
17. **It proves the protocol; it does not replace the protocol.** Where the simulator and the
    specification disagree, the specification wins and the simulator is the thing that is wrong.

## The boundary, stated once

> O Operador Zero não é banco, não é PSP, não é carteira, não é operador financeiro licenciado e não
> movimenta dinheiro real. É um simulador técnico usado para demonstrar, testar e validar o protocolo
> BANZA de ponta a ponta.

And its relationship to the future real operator:

> **Operador Zero prova a arquitectura; Banzami prova o mundo real.**

Banzami remains separate: a future real reference operator with its own legal framing, its own
licensing question, and its own risk. Nothing about Operador Zero anticipates or substitutes for
that. Conflating the two would be the single most damaging misreading of this decision.

## Consequences

**What this buys.** An implementer gets a complete worked example instead of scattered fixtures. The
protocol's claims become executable: the invariants are checked against a ledger that actually
balances, fail-closed trust is demonstrated by a revoked key that actually blocks, and the evidence
bundle is assembled from results that were actually produced. The BanzAI journey gains a subject —
a visitor can walk all seven steps against something coherent rather than seven unrelated samples.
And defects in BanzAI itself surface faster, because the simulator exercises paths that isolated
fixtures never reach.

**What it costs.** A simulator that resembles a payment operator must be *aggressively* and
*repeatedly* marked as one that is not. Every artifact carries the demo fields; every public surface
carries the boundary; a guard (`make operator-zero-check`) fails the build if any of that erodes.
That is deliberate friction, and it is the price of publishing this at all.

**The failure mode to watch.** The danger is not that someone mistakes the simulator for a bank
today — the labelling is heavy. It is drift: a future phase adds a convenience, the demo marking
lapses on one surface, and the thing quietly stops looking like a simulator. The guard exists for
that, and it fails closed.

**What this does not decide.** Whether `zero.banza.network` is activated (DNS, Cloudflare and TLS
are the maintainer's call, unchanged by this ADR); whether a runtime service is ever built; and
anything at all about Banzami's legal position.
