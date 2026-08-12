# ADR-054 — BanzAI as the Primary Human-Operator Interface for the BANZA protocol

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.14I
- **Supersedes:** none
- **Related:** ADR-041 (BanzAI native protocol agent), ADR-049 (BanzAI operational protocol agent),
  ADR-050 (BanzAI unified same-origin public interface), ADR-051 (BanzAI per-answer execution-path
  metadata), ADR-001 (open protocol), ADR-003 (operator separation), ADR-037 (Rust-first engines),
  ADR-052 (Operador Zero simulator), ADR-053 (Operator Zero Only demo policy)

---

## Context

ADR-041 established BanzAI as the **native, non-authoritative AI agent** of the BANZA protocol; ADR-049
made it an operational protocol agent; ADR-050 unified it into a single same-origin public interface
served from `banza.network/banzai`. M2.14H then moved the interactive **"Perguntar ao BanzAI"** tab to be
the first item of the `/banzai` menu, above the optional step-by-step journey, and added deterministic
technical-tool routing so a pasted artefact is analysed structurally instead of returning a generic
entity description.

What had not yet been raised to an **architecture-level decision** is the role this establishes: several
documents, diagrams and answers could still frame BanzAI as merely *an assistant*, *a question tab*, *an
optional complement to the journey*, or *a side workbench*. The correct framing is stronger and needs to
be stated once, normatively, so documents, reference, diagrams, engine behaviour and public copy all
agree.

## Problem

Humans and operators need one clear place to start when they want to understand, adopt, implement,
validate, prepare evidence for, or navigate the BANZA protocol. Without a stated decision, that entry
point is ambiguous and the interactive experience reads as optional decoration rather than the primary
working surface. At the same time, an over-correction is dangerous: making BanzAI *mandatory* or
*authoritative* would break the protocol's openness — BANZA must remain verifiable by engines, schemas,
manifests and endpoints **independently of any AI**.

## Decision

**BanzAI is the primary human-operator working interface for interacting with the BANZA protocol.**

BanzAI interprets requests, consults the reference, guides implementation, routes to verifiable engines,
explains results and helps prepare technical evidence. Humans and operators should begin with BanzAI when
they want to understand, adopt, implement, validate, prepare evidence for, or navigate the protocol.
BanzAI knows where the Guia, Manifest, Conformidade, Trust, Federação, Evidence Bundle, Traces,
Referência, Programadores and Repositório capabilities live, interprets the request, and routes to the
correct step, document, engine or evidence.

**BanzAI is not a normative source of the protocol.** It does not create rules, does not certify, does
not approve, does not license, does not publish operators, does not move funds, and does not replace
verifiable engines, technical evidence or open governance.

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

## Boundaries

**This decision applies to the interactive, human/operator-facing experience of the workbench.** It does
**not** make BanzAI mandatory for machine-to-machine integration, public endpoints, manifests, schemas,
conformance engines, trust engines or evidence endpoints.

Concretely:

- Humans/operators use BanzAI as the **primary** interactive interface.
- Technical systems continue to verify the protocol through engines, schemas, manifests and endpoints,
  **without depending on BanzAI**.
- BanzAI is **not** a central gatekeeper for integrations.
- BANZA remains an **open, verifiable** protocol.

BanzAI must never become: a normative source, a central authority, a certifier, an approver, a licenser,
a financial operator, a PSP/bank/wallet/payment processor, or a mandatory gate for machine-to-machine
integration. Forbidden actions (publishing operators, adding operators to `/operators`, issuing any
operator certificate, turning a PASS into a certificate, turning Operador Zero into a real operator, moving
funds) are refused deterministically **before** any orchestration.

## Consequences

- **Positive.** One unambiguous entry point for humans and operators; the interactive experience is the
  first-class surface, not decoration; the reference, engines, evidence and governance keep their
  separate, verifiable roles; the protocol stays open because machine surfaces remain independent of the
  AI.
- **Neutral.** Documents, the reference chapter on BanzAI, the protocol-architecture and protocol-boundary
  diagrams (SVG-P-071, SVG-P-051), the UI subtitle and the canonical phrase move from a 3-clause form
  (`BanzAI guia; os motores verificam; a evidência prova.`) to the 4-clause form above.
- **Guardrail.** A guard (`banzai-primary-interface-architecture-check`) fails if this ADR is missing, if
  it makes BanzAI normative/certifying, if docs claim technical APIs or machine-to-machine integration
  depend mandatorily on BanzAI, if the menu regresses, if a pasted manifest returns only an entity
  description, if a forbidden request reaches the model/queue, or if the architecture diagrams stop
  showing BanzAI as the primary human-operator interface with the boundary preserved.

## Relationship with BanzAI

BanzAI is the interactive agent through which humans and operators reach the protocol. It orients,
consults the reference, explains, routes to engines and helps prepare evidence. It never decides,
certifies, approves, licenses, publishes or moves funds. Its output is never a protocol rule
(ADR-041, ADR-051 per-answer execution-path metadata).

## Relationship with verifiable engines

The deterministic **Rust/WASM** engines (conformance, trust, invariant checking, evidence-bundle
generation, semantic validation) compute and verify technical results. BanzAI guides, routes, invokes
when supported, and explains the results; it does not replace the engines. When a full engine is not
exposed on the interactive surface, BanzAI says so honestly rather than faking execution.

## Relationship with operators

Operators are not approved by a central entity; they demonstrate compatibility through verifiable
evidence (ADR-001, ADR-003). BanzAI helps an operator prepare and read that evidence; it does not admit,
approve, certify or publish the operator. Operators remain responsible for their own legal, regulatory,
financial and operational framing.

## Relationship with governance

Protocol rules and their evolution are decided through the **open governance process** (RFCs, ADRs,
specs, releases) — not by BanzAI. BanzAI may consult and explain governance artefacts and, at most,
help draft a proposal; the governance process decides.

## Relationship with Operador Zero

Operador Zero is the reference payment-operator **simulator** and the single official demo/example
(ADR-052, ADR-053). BanzAI uses it for demonstration and guidance only; it stays demo-only
(`simulated: true`, `production_allowed: false`) and is never turned into a real operator.

## Relationship with `/operators`

`/operators` returns `[]`. This decision does not let BanzAI add operators to `/operators`, publish
operators, or present a demo operator as a real registered operator.

## Relationship with `production_certificates=false`

`production_certificates` stays `false`. A conformance PASS is a local technical verification result, not
a certificate. This decision does not let BanzAI issue any operator certificate (a concept the open trust model removed).

## Relationship with UI / workbench

The interactive `/banzai` page opens on **"Perguntar ao BanzAI"** (the primary interactive interface),
above the **optional** step-by-step journey and the reference links (M2.14H). No redundant "BanzAI" nav
item or section is created — the page already *is* the agent. The step-by-step journey is optional
orientation; the primary interactive interface is Perguntar ao BanzAI.

## Relationship with technical APIs

The public APIs, manifests, schemas and endpoints continue to be available as technical surfaces of the
protocol, independent of the AI. They are verifiable on their own; nothing about this decision routes or
gates them through BanzAI.

## Relationship with machine-to-machine integrations

Machine-to-machine integrations remain possible through APIs, manifests, schemas, endpoints and
verifiable engines, **without depending mandatorily on BanzAI**. BanzAI is the primary *human/operator*
interface, not a machine-to-machine requirement. This preserves the protocol's neutrality and openness.

## Acceptance criteria

1. This ADR exists and states that BanzAI is the primary human-operator interface.
2. It states that BanzAI is not a normative source and does not certify/approve/license/publish operators
   or move funds.
3. It carries the boundary phrase `BanzAI guia; os motores verificam; a evidência prova; a governança
   decide.`
4. It states that the decision does not make BanzAI mandatory for machine-to-machine integration, public
   endpoints, manifests, schemas or engines.
5. The reference, README/GOVERNANCE and BanzAI docs present BanzAI as the primary human-operator
   interface while preserving the boundaries above.
6. The protocol-architecture (SVG-P-071) and protocol-boundary (SVG-P-051) diagrams show the flow
   Humans/Operators → BanzAI → verifiable engines + evidence → verifiable result, with governance/ADR/
   RFC/reference as the normative base and machine-to-machine preserved as possible without BanzAI.
7. BanzAI answers role/architecture questions deterministically and on-message; forbidden requests are
   refused before orchestration; the action, financial and operator-publication boundaries are unchanged.
8. `make banzai-primary-interface-architecture-check` and the full guard/test battery are green.
