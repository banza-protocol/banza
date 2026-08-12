# BANZA Protocol Glossary — controlled vocabulary (protocol + fintech domain)

> **Purpose.** A controlled glossary the BanzAI agent uses to understand short questions and core
> terminology of the BANZA protocol and the surrounding payments/fintech domain. It has **three
> layers**, and each answer must keep them apart:
>
> - **A — Protocol-normative vocabulary.** Terms defined by the protocol (manifest, federation, trust,
>   conformance, PASS, evidence, ledger invariants). Source of truth: the reference, specs, contracts,
>   schemas, ADRs/RFCs, conformance and federation docs.
> - **B — Fintech/payment-domain vocabulary (explanatory).** General industry terms (settlement,
>   clearing, wallet, PSP, KYC, AML). These are **general explanations**, never BANZA rules. A general
>   explanation is *not* a BANZA rule; a fintech term is *not* a financial licence; a demo simulation is
>   *not* production.
> - **C — Safety / regulatory boundary.** Authorisation, licensing, PSP/bank status, real money,
>   certification, production, compliance (AML/KYC/KYB). Explained with caution; the agent never gives a
>   definitive legal opinion and never invents a regulatory obligation.
>
> **BANZA is an operator-neutral open protocol.** It is not a bank, PSP, wallet, or licensed financial
> operator; it does not move real money and does not certify, approve or license operators. This
> glossary never names specific commercial operators or payment brands (operator-neutrality invariant).

## Layer A — protocol-normative terms

| Term | Short definition | Primary source |
|---|---|---|
| **BANZA** | Open, operator-neutral financial **protocol**: rules, contracts, invariants, conformance and federation criteria. Not a company, product, bank or operator. | `spec/overview.md`, `README.md` |
| **operator** | An independent party that *implements* the protocol. Operators are separate from the protocol; the protocol never runs an operator's product. | `decisions/adr/ADR-003-*.md` |
| **manifest / operator manifest** | Metadata document describing a candidate operator — identity, environment, capabilities and the endpoints the protocol expects. Validating one produces **local technical evidence**; it does not create a real operator or certify. | `contracts/production/operator-manifest.production.schema.json` |
| **key manifest** | Document that declares an operator's signing keys for trust evaluation. | `contracts/federation/key-manifest.json` |
| **trust** | Machine-verifiable evaluation over signed protocol metadata / key manifest / revocation, **fail-closed**. Not central approval or certification. | `spec/federation/FEDERATION_TRUST_MODEL.md` |
| **Trust Root** | The protocol's own root of trust (established by the root ceremony), independent of any operator. The Operador Zero **Demo Operator Root** is a demo root and is *not* the protocol Trust Root. | `spec/federation/FEDERATION_TRUST_MODEL.md`, `decisions/adr/ADR-038-*.md` |
| **revocation / revocation list (BRL)** | Mechanism to mark a key as no longer trusted; a revoked key blocks trust (fail-closed). | `contracts/federation/revocation-list.json` |
| **federation / to federate** | Demonstrating **technical compatibility between independent operators** so they can interoperate under the protocol — via federation metadata, manifest, trust/key manifest, revocation and verifiable evidence. Federating is **not** central approval, certification, a financial licence, or automatic entry into production. | `spec/federation/FEDERATION_OPERATOR_QUICKSTART.md`, `spec/federation/FEDERATION_PROTOCOL_FLOW.md` |
| **interoperability** | The ability of independent operators to work together under the same protocol rules. | `spec/overview.md` |
| **conformance** | Demonstrating protocol compatibility by **verifiable evidence** (deterministic checks producing PASS/WARN/FAIL). | `conformance/README.md` |
| **PASS** | A passing conformance result: **local technical evidence**, not a certificate, approval or licence. | `conformance/README.md` |
| **evidence / evidence bundle / trace / session summary** | Verifiable artefacts (a bundle of results, an end-to-end trace, a session summary) that document what actually happened. Evidence is not certification. | `spec/federation/FEDERATION_CONFORMANCE_EVIDENCE_MODEL.md` |
| **invariant** | A non-negotiable integrity rule the protocol enforces (INV-LEDGER/WALLET/SETTLE/IDEM/RECON/QR). | `contracts/invariants.json` |
| **KZ_DEMO / demo_only / production_allowed / monetary_value** | Markers of the Operador Zero simulator: fictitious currency, demo-only, no production, no monetary value. | `decisions/adr/ADR-052-*.md` |

## Layer B — fintech / payment-domain terms (general explanation, not a BANZA rule)

| Term | General explanation | Relation to BANZA |
|---|---|---|
| **ledger** | A record of financial movements. | BANZA defines double-entry ledger **invariants** (INV-LEDGER); it keeps no real accounts. |
| **double-entry** | Each debit has a corresponding credit; value is conserved. | A BANZA invariant. |
| **balance / available / reserved** | Total funds; the part usable now; the part temporarily held for a pending operation. | Appear as **behavioural invariants**; BANZA holds no real balances. |
| **wallet** | A digital account holding a balance. | A concept an operator implements; BANZA is not a wallet. |
| **payment / QR / payment link / idempotency / webhook** | Ways to request/confirm payments; an idempotency key makes a repeated request produce the same result; a webhook delivers events. | Defined as contracts/invariants (e.g. INV-QR, INV-IDEM); BANZA does not move real money. |
| **refund / reversal / estorno** | Returning value linked to an original transaction. | Modelled in the ledger invariants; no real funds move. |
| **reconciliation** | Re-deriving balances from movements to confirm no discrepancies. | A BANZA invariant (INV-RECON). |
| **settlement / liquidação** | The process by which a payment obligation is finalised between parties. | BANZA may define evidence, invariants and interoperability, but **does not settle real money or move funds** — real settlement belongs to the applicable operators/financial infrastructure. |
| **clearing / compensação** | Netting and exchanging payment instructions before settlement. | A domain concept; BANZA does not clear or settle real funds. |
| **fee / comissão** | A charge on an operation. | A concept; the protocol creates no money. |
| **PSP** | Payment service provider — a licensed operator that provides payment services. | **BANZA is not a PSP**; it is a protocol. |
| **bank** | A licensed banking institution. | **BANZA is not a bank.** |
| **fintech** | A technology company/solution in finance. | BANZA is a protocol, not a fintech company. |
| **payment rails / national payment systems** | Shared infrastructure that moves payments between institutions (interbank switches, national systems, real-time systems). | BANZA is a **protocol/interoperability layer**; it does not replace or integrate with national systems or regulators, and it names no specific commercial system. |

## Layer C — regulatory / compliance terms (explained with caution)

| Term | General explanation | Boundary |
|---|---|---|
| **KYC** | Know Your Customer — identifying a customer. | BANZA defines no KYC rule; obligations belong to operators and the competent authorities. |
| **KYB** | Know Your Business — identifying a business/merchant. | Same boundary as KYC. |
| **AML / CFT** | Anti-money-laundering / countering the financing of terrorism. | A regulatory domain outside the protocol; BanzAI does not give a legal opinion. |
| **BNA** | Banco Nacional de Angola — the central bank / financial supervisor of Angola (a regulator). | BANZA does **not** replace the regulator and asserts no integration or decision on its behalf without a source. |
| **sandbox** | A test/pilot environment, not production. | Demo/sandbox is not production. |
| **financial licence / authorisation** | Authorisation from a competent authority to provide financial services. | External to the protocol; **BANZA does not license, approve or certify operators** — see `docs/reference/getting-started.md`, `decisions/adr/ADR-001-*.md`. |

---

*The BanzAI agent uses this glossary to answer short questions with cited sources and clear boundaries.
It never treats a general fintech explanation as a BANZA rule, never turns a fintech term into a
financial licence, and never presents a demo simulation as production.*
