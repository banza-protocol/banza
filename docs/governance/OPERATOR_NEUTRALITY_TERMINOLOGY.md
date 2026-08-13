# Operator Neutrality Terminology Guide

**Authority:** ADR-002, docs/governance/README.md  
**Applies to:** ~/banza (this monorepo, including the consolidated BanzAI runtime — services/banzai-api + engines/banzai-*, ADR-042)  
**Enforcement:** `make identity-check`, `identity-guard` CI job

---

## The Principle

BANZA and BanzAI are operator-neutral systems. The dependency graph is:

```
Operators  →  BanzAI  →  BANZA
```

Arrows show dependency direction. Operators depend on BanzAI and BANZA. Neither BanzAI nor BANZA depends on any operator.

This is an **architectural invariant**, not a style guideline. Violations are bugs.

---

## Approved Terms

Use these terms when referring to entities that implement the BANZA protocol:

| Term | When to use |
|------|-------------|
| **conformant operator** | An operator with published, verifiable conformance evidence at L0–L4 |
| **reference operator** | The canonical example implementation of the full protocol |
| **operator implementation** | A specific deployment of the BANZA protocol |
| **protocol participant** | Any entity operating within the BANZA network |
| **federation member** | A conformant operator participating in cross-operator settlement |
| **Operator A / Operator B / Operator C** | Placeholders in examples and documentation |

---

## Forbidden Terms in Protocol Repositories

The following terms are forbidden anywhere in `~/banza` (this monorepo, including the consolidated BanzAI runtime — services/banzai-api + engines/banzai-*, ADR-042):

| Category | Examples |
|----------|---------|
| Specific operator brand names | *(see denylist in check script)* |
| Specific fintech company names | Any real commercial fintech name |
| Specific bank names | Any real bank or financial institution name |
| Specific wallet product names | Any named consumer wallet product |
| Operator-branded certification | `[Brand] Certified`, `[Brand] Compliant` |
| Operator protocol authority | `[Brand] defines the protocol`, `[Brand] governs BANZA` |

---

## Governance Authority Claims

The following patterns indicate an operator is being given protocol authority. They are forbidden:

| Forbidden pattern | Correct framing |
|-------------------|-----------------|
| `[Brand] governs BANZA` | `The BANZA ADR process governs the protocol` |
| `[Brand] defines the protocol` | `BANZA defines the protocol` |
| `[Brand] certifies operators` | `BANZA certification is operator-agnostic` |
| `[Brand] owns the protocol` | `BANZA is an open protocol with no single owner` |
| `[Brand] is required to use BANZA` | `Any conformant operator may implement BANZA` |
| `[Brand]-specific extension` | `Operator-specific extensions belong in operator repos` |

---

## How to Write Examples

### ❌ Wrong
```
Banzami scans the QR code and completes the payment.
```

### ✓ Correct
```
Operator A scans the QR code and completes the payment.
```

---

### ❌ Wrong
```
Banzami is the reference implementation. Other operators follow Banzami's model.
```

### ✓ Correct
```
The reference operator provides a canonical implementation. Conformant operators 
implement the same protocol specification.
```

---

### ❌ Wrong
```
Install the Banzami SDK to integrate with BANZA.
```

### ✓ Correct
```
Integrate with the BANZA protocol using the published contracts and conformance vectors.
```

---

### ❌ Wrong
```
Banzami governs which operators can join the federation.
```

### ✓ Correct
```
BANZA certification (L3+) governs federation eligibility. Any operator 
certified at L3 or above may participate in the federation.
```

---

## Federation-Specific Terminology

The BANZA federation model must be completely operator-neutral:

| Approved | Avoid |
|----------|-------|
| federation member | *(specific operator brand)*-network |
| cross-operator settlement | *(specific operator brand)* settlement |
| operator-to-operator routing | *(specific operator brand)* routing |
| certified federation participant | *(specific operator brand)* partner |

---

## Automated Enforcement

The `identity-guard` CI job and `make identity-check` enforce Level 1 (explicit denylist).

See `tools/check-operator-contamination.sh` for the current denylist and exclusions.

Any PR that introduces operator-specific brand names will fail CI.
