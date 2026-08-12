# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Banza, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **security@banza.network**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fix (optional)

We will acknowledge your report within 48 hours and provide a timeline for a fix.

---

## Scope

This security policy covers:

- `contracts/` — protocol specifications and schemas (OpenAPI, webhooks, QR, events)
- `conformance/` — certification test vectors and conformance suite
- `tools/banza-conformance/` — conformance runner
- `apps/` — protocol website and BanzAI backend

## Out of scope

- Any operator's commercial product (separate private repositories)
- Third-party implementations built on Banza
- Infrastructure or deployment issues (report to Banza directly at security@banza.network)

---

## Financial invariant vulnerabilities

Security issues in the financial core are our highest-priority category. This includes:

- Any code path that allows a ledger posting to be non-zero-sum
- Any code path that allows a wallet balance to go negative
- Any bypass of HMAC signature validation in the acquiring callback path
- Any way to credit a wallet without a corresponding debit
- Any way to process a duplicate callback as a unique event
- Any way to break idempotency guarantees

If you discover any of these, treat them as critical security issues and report via email, not a public issue.

---

## Forbidden disclosures

When interacting with this repository (issues, PRs, discussions), do not post:

- Private API keys or secrets
- Production database credentials
- Firebase or cloud service credentials
- Server IP addresses or private infrastructure details
- Operator-specific configurations that could reveal production system topology

---

## Webhook signature security

The conformance suite (`conformance/`) includes webhook signature vectors. If you discover that an implementation fails to correctly validate HMAC-SHA256 signatures:

1. Report it via email to security@banza.network
2. Do not publish a proof-of-concept that could be used to forge legitimate webhooks
3. We will coordinate a fix and notify all known SDK implementors

---

## Security review for core financial logic

All pull requests that touch the following protocol artifacts require explicit security review:

- `contracts/` — payload, signature and webhook contract changes
- `conformance/` — certification vectors and invariant tests
- `decisions/adr/` — decisions affecting financial invariants or the trust model

Operator implementation code (ledger, wallets, acquiring, transactions) lives in each
operator's own repositories, outside this protocol repository, and is reviewed there.

---

## Privacy and personal data

BANZA is a payment **protocol**, not a compliance product. Its privacy posture is
defined by a clear boundary between the protocol and the operators that implement it.

- **Data minimization at the protocol layer.** BANZA core contracts carry only the
  identifiers and fields needed to move and reconcile value (e.g. wallet ids,
  operator ids, payment/transfer ids, amounts, trace ids). Protocol identifiers
  SHOULD be pseudonymous or implementation-defined; the protocol does not require
  raw personal data (names, document numbers, biometrics) to flow over its wire
  contracts.
- **KYC / KYB / AML are operator responsibilities.** Identity verification,
  sanctions/PEP screening, transaction monitoring, and regulatory reporting are
  **operator-local** obligations. BANZA may define hooks or conformance
  expectations, but it does **not** prescribe a vendor, jurisdiction, or
  operator-specific compliance flow. (See the protocol-vs-operator boundary in
  `docs/governance/`.)
- **Sensitive document data is out of protocol scope.** KYC documents, identity
  artifacts, and similar sensitive records are held and protected by operators,
  not carried by BANZA core contracts.
- **Retention and deletion are operator obligations.** Data-protection compliance
  (including any applicable local data-protection law) — lawful basis, retention,
  erasure, and subject-access handling — is the operator's responsibility, unless a
  future BANZA protocol profile explicitly specifies otherwise.

**BANZA does not, by itself, make an operator compliant with any data-protection or
financial regulation.** It defines what data the protocol carries and what it
deliberately leaves to operators; regulatory compliance is determined at the
operator layer.

---

## Responsible disclosure

We follow a 90-day responsible disclosure timeline. We ask that you:

1. Give us reasonable time to fix the issue before public disclosure
2. Do not access, modify, or delete data belonging to others
3. Do not perform denial-of-service attacks

We will credit security researchers who responsibly disclose issues (unless you prefer to remain anonymous).
