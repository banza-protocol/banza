# ADR-002 — Ecosystem Naming Inversion

**Status:** Accepted  
**Date:** 2026-05-29  
**Author:** BANZA Protocol  
**Deciders:** Fidel Monteiro (Founder)  
**Supersedes:** the previous brand-architecture decision (archived)

---

## Context

The ecosystem has three durable layers:

- the **open financial protocol** — the specification and shared infrastructure that every operator implements;
- the **AI / knowledge layer** — the native protocol agent that explains and orchestrates the protocol;
- **operator implementations** — the products that operators build on the protocol and offer to their own users.

An earlier brand-architecture decision assigned the ecosystem name to a consumer product while giving the shared open infrastructure a separate name. That inverted the durable relationship: the protocol and ecosystem — the layer common to all operators — should carry the ecosystem name, while each operator's product carries that operator's own name. This ADR corrects the assignment.

---

## Decision

**Fix the canonical ecosystem names to match the durable roles.**

### BANZA — protocol and ecosystem

**BANZA** (wordmark *Banza*) is the name of the open programmable financial protocol and ecosystem. It refers to:

- the open protocol specification (RFCs, ADRs, invariants);
- the protocol's reference implementations and engines;
- the operator conformance framework;
- the open infrastructure available to all operators.

### BanzAI — AI / knowledge layer

**BanzAI** is the name of the ecosystem's AI / knowledge layer — the native protocol agent (see ADR-041). It is the official guidance and orchestration layer: part of the architecture, non-normative. The "AI" suffix is internationally unambiguous and carries no etymological link to any operator product.

### Operator products — named by their operators

Products built on BANZA are named by the operators that build them, not by the protocol. The protocol never assigns or depends on any operator product name. See ADR-003 (Protocol/Operator Separation).

### Identity namespace — `@banza`

The ecosystem identity handle namespace is permanently `@banza`, and is not affected by any naming change. Every person, merchant, operator, and entity on the network has a handle of the form `@banza:name`. The namespace belongs to the network identity layer and is independent of what the protocol or the AI layer are called. Users say "send it to my banza" and "what's your banza?" It is classified as `IDENTITY_NAMESPACE` and is permanent.

---

## Protected Names — DO NOT RENAME

The following names are stable ecosystem resources and must remain unchanged:

| Name | Class | Reason |
|------|-------|--------|
| `@banza` | IDENTITY_NAMESPACE | Network identity handle namespace. Permanent — see the Identity namespace section above. |
| `banza.network` | DOMAIN | Canonical protocol domain, with established links and SEO equity. |
| `contact@banza.network` | EMAIL | Public contact address on all communications. |
| `security@banza.network` | EMAIL | Security disclosure address. |
| GitHub organization `github.com/banza` | REPO | Public repository URLs; renaming would break existing clone URLs and links. |

The `@banza` identity namespace is permanent and exempt from any future naming change.

---

## Rationale

- **Ecosystem name on the shared layer:** the protocol and ecosystem are the layer common to all operators, so they carry the ecosystem name. "Built on BANZA" is a clear, operator-neutral developer statement; an operator's product carries that operator's own name.
- **BanzAI for the AI layer:** the "AI" suffix is universally understood, unlike a language-specific abbreviation, and it keeps the AI layer associated with the protocol rather than with any operator product.
- **Permanent `@banza` namespace:** network identity must be stable indefinitely, independent of any future brand change to the protocol or the AI layer.

---

## Consequences

**Positive:**
- The shared open layer carries the ecosystem name; operator products stay operator-named.
- The AI layer is internationally clear and unambiguous.
- Network identity (`@banza`) is stable and permanent.

**Neutral:**
- `github.com/banza` and `banza.network` are the stable canonical resources for the protocol.

---

## Related ADRs

- **ADR-001** — BANZA as Open Financial Protocol
- **ADR-003** — Protocol/Operator Separation
- **ADR-041** — BanzAI as native protocol agent
