# ADR-062 — Regulatory-State Boundary and the RealMoneyActivationGate

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19C
- **Related:** ADR-059 (three-layer architecture), ADR-060 (Banzami Operational Scheme), ADR-061
  (certification ≠ admission ≠ authorisation), ADR-038 (open trust model without CA); companion: ADR-063
  (conflict-of-interest + infrastructure/key separation)

---

## Context

ADR-060 records that Banzami's internal state is `REGULATORY_AUTHORIZATION_IN_PROGRESS` and that every
real-money path is fail-closed until formal evidence exists. This ADR makes that boundary precise and
enforceable: it fixes exactly what the in-progress state does **and does not** mean, the prudent public
phrasing that may be used while no applicable formal evidence exists, the narrow conditions under which any
regulator-specific claim (e.g. BNA) could ever be published, and the hard gate — the
**RealMoneyActivationGate** — that stands between the entire system and any activation of real funds.

The risk is twofold. First, a **presentation** risk: any public surface that reads as "Banzami is already
authorised / approved by the BNA / licensed / operating" would be false today and legally hazardous.
Second, an **activation** risk: a config change, a feature flag, an admin action, a direct API/CLI call, or
a natural-language instruction to BanzAI could flip real money on before the operator is lawfully and
operationally ready. Both risks must be closed structurally, not by policy prose alone. Consistent with
ADR-059 D-059-05, Rust decides and Qwen never decides — so the gate is Rust and fail-closed, and no
explanation layer can open it.

## Decision

**While no applicable formal evidence exists, Banzami is `REGULATORY_AUTHORIZATION_IN_PROGRESS`; this state
grants nothing, no regulator-specific authorisation language may be published, and real money stays OFF. A
single hard, fail-closed `RealMoneyActivationGate`, decided by Rust, is the only path to real-money
activation, and it cannot be bypassed by any means.**

| ID | Decision |
|----|----------|
| **D-062-01** | **Regulatory state = `REGULATORY_AUTHORIZATION_IN_PROGRESS`.** This is Banzami's internal, non-public-by-default state. It **does NOT mean**: authorisation granted; BNA approval; licence complete; regulatory recognition; active financial operation; permission to move funds; real settlement occurring; or active production participants. It is a preparation state and confers **no** operational permission whatsoever. |
| **D-062-02** | **Real money OFF (the hard default).** While no applicable formal evidence exists: real funds **OFF**, real wallets **OFF**, real settlement **OFF**, real participants **NOT active**, real financial clients **OFF**. Banzami is **NOT** presented as already authorised, and **NO** language or symbol implying regulator (e.g. BNA) approval is used anywhere. |
| **D-062-03** | **Prudent public phrasing.** The only sanctioned public description of the operational layer's status is: *"A camada operacional encontra-se em preparação regulatória. Os pagamentos reais permanecem desactivados."* Surfaces MUST NOT elaborate this into any claim of authorisation, approval, licensing or active operation. |
| **D-062-04** | **BNA-claim conditions (all required; today none hold → no BNA language).** A public statement such as *"em processo de autorização junto do BNA"* is permitted **only** when **all** of the following hold simultaneously: (1) documentary applicable evidence exists; (2) the founders authorise the specific statement; (3) the exact wording has been reviewed; (4) it contains no confidential information; and (5) it cannot be read as "authorisation granted". Because none of these conditions is met at this milestone, **no BNA-specific language may be published.** |
| **D-062-05** | **RealMoneyActivationGate — a single, hard, fail-closed gate.** Any activation of real-money operation is blocked unless **ALL** of the following are simultaneously satisfied: regulatory authorisation; compatible scope; authorised environment; legal entity; eligible participants; contracts; AML/CFT; safeguarding; settlement; reconciliation; fraud controls; complaints handling; business continuity; security; incident response; audit log; rollback capability; and formal launch approval. The gate is **decided by Rust** and is **fail-closed**: any missing, unverified or unparsable condition keeps real money OFF. |
| **D-062-06** | **The gate cannot be bypassed.** The `RealMoneyActivationGate` MUST NOT be bypassable via configuration, feature flag, admin action, direct API call, CLI, natural-language instruction, or the Qwen explanation layer. Qwen never decides, activates or changes state (ADR-059 D-059-05); there is no back door, override endpoint, "test mode" or emergency flag that turns real money on outside the gate. Activation state changes are Rust-validated and logged. |
| **D-062-07** | **State ≠ status claim.** The internal `REGULATORY_AUTHORIZATION_IN_PROGRESS` state is machinery for the gate, not a public status. Nothing in this ADR may be quoted or rendered to suggest that being "in progress" is itself an authorisation, an admission (ADR-061) or a certification (L2); the three status determinations remain separate and none is implied by this state. |

## Canonical phrasing

- **Estado operacional (público):** *"A camada operacional encontra-se em preparação regulatória. Os
  pagamentos reais permanecem desactivados."*
- **O que o estado NÃO significa:** *"`REGULATORY_AUTHORIZATION_IN_PROGRESS` não significa autorização
  concedida, aprovação do BNA, licença concluída, reconhecimento regulatório, operação financeira activa,
  permissão para mover fundos, liquidação real, nem participantes de produção activos."*
- **Porta de activação:** *"A activação de dinheiro real depende de uma única porta fail-closed decidida
  pelo Rust; nenhuma configuração, flag, acção de administração, API, CLI, linguagem natural ou o Qwen a
  pode contornar."*

## Consequences

**Positive.** The regulatory boundary becomes structural. Public surfaces have exactly one sanctioned
status sentence and a closed list of what the in-progress state does not mean, so no surface can drift into
an authorisation claim. Real-money activation has a single auditable chokepoint whose default is OFF and
whose owner is Rust — regulators and auditors can inspect one gate instead of trusting scattered promises.

**Negative (accepted).** The exhaustive condition list and the no-back-door rule make real-money activation
deliberately slow and undramatic — no quick demo of "live" payments, no admin toggle. This friction is the
point: it converts a legal/operational hazard into a mechanical precondition and is enforced by the M2.19C
regulatory-state-claim guard and the gate itself.

**Untouched.** No financial invariant is weakened — the gate only *adds* preconditions ahead of any
real-money path. BANZA's operator neutrality and no-financial-operator boundary (ADR-001/003/059),
Rust-sole-authority (ADR-037), the open trust model (ADR-038/040), and the certification ≠ admission ≠
authorisation separation (ADR-061) all stand. This ADR fixes the boundary on Banzami's regulatory-state
claims and the real-money gate; it does not change what BANZA (L1) or certification (L2) are.

## References

- ADR-059 (three-layer architecture), ADR-060 (Banzami Operational Scheme), ADR-061 (certification ≠
  admission ≠ authorisation), ADR-063 (conflict-of-interest + infrastructure/key separation)
- ADR-038 (open trust model without CA)
- `docs/governance/BANZAMI_OPERATIONAL_SCHEME.md`, `contracts/**/regulatory-state.production.schema.json`
