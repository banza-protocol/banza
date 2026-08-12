# ADR-069 — Simple & Secure Operator Onboarding (BanzAI-hosted, passwordless, endpoint-verified)

- **Status:** Accepted
- **Date:** 2026-07
- **Milestone:** M2.19G.3
- **Related:** ADR-068 (endpoint-originated validation, operator≠implementation), ADR-067 (Operador
  Zero read-only reference), ADR-065 (Technical Registry), ADR-064/066 (L2 certification, closed
  state machine), ADR-054 (BanzAI as the single human-operator interface), ADR-042 (PostgreSQL as
  protocol-state store, not a financial DB), ADR-038 (open trust model, no central CA), ADR-037
  (Rust-first engines), ADR-036 (DNS & TLS), ADR-034 (dedicated PostgreSQL + backups)

---

## Context

ADR-068 established that BanzAI's official validation obtains every artifact from the public endpoints
of a selected **implementation**, resolved from the **closed** Technical Registry, and that Rust decides
every verdict. Until now the only resolvable target was Operador Zero (the reference implementation);
there was no way for a **new** operator to get *onto* that path. The protocol's public validation
resources (the secure fetcher, the Rust engines, the registry) are valuable and abusable, so they need a
gate; an operator that is not yet published needs somewhere to keep progress; and a BANZA-operated
publication needs proof that the person submitting actually controls the origin they name.

At the same time BANZA is an **open** protocol. Onboarding-by-email must not become a protocol rule or a
mandatory central dependency: any third party must remain able to implement BANZA, publish canonical
endpoints, run the Rust engines, validate artifacts and generate receipts **without** a BanzAI account,
an email code, Resend, the Candidate Registry, or prior authorisation from the BANZA team.

The problem is therefore narrow: let an unpublished operator **verify a technical email, create or
recover a candidacy, prove control of its canonical domain, validate its implementation, and track the
results** — with strong security but minimal machinery. It must not become an identity platform or a
business-management system. And it must not touch anything reserved for later milestones (scheme
admission, KYB, AML/CFT, real funds, regulatory authorisation — all M2.19H+).

## Decision

### Core rule

**Operator onboarding is a service hosted by BanzAI, not part of the BANZA protocol's mandatory rules.**
It exists only to (a) protect the public validation resources, (b) store private candidacies, (c) let a
candidate resume progress, and (d) request publication in the BANZA-operated Technical Registry.

Canonical decomposition (each concern has exactly one job):

> **The email authenticates the person. The domain confirms the origin. The endpoints supply the
> artifacts. Rust verifies. The receipts fix the results. The Technical Registry publishes the
> verifiable state — without closing the protocol.**

### 1. Passwordless authentication (email OTP only)

A person proves control of a **technical email address** with a single-use numeric OTP delivered by
email. No passwords, passkeys, magic links, social login, MFA, or API-key login. The verified email
authenticates *a contact person* — it does **not** verify the operator or the domain. OTP generation and
verification, hashing, sessions, authorisation and rate limiting are **Rust decisions**; the transport
provider (Resend) is a replaceable delivery detail that never authenticates the user or determines any
BANZA state.

Requirements: 6-digit CSPRNG code, 10-minute validity, single use, ≤5 attempts, ≥60s between requests,
prior code invalidated on reissue, bound to the normalised email + purpose, constant-time comparison,
**never stored in plaintext** (HMAC digest under a server-side pepper). Email-existence is never revealed
(neutral response to every request). Sessions are opaque, server-side-hashed, revocable, `__Host-`
cookies (HttpOnly/Secure/SameSite=Strict), rotated on login, with idle + absolute expiry; candidacy
progress lives on the server, never in the browser.

### 2. Private Candidate Registry vs public Technical Registry

The **Candidate Registry** is private, small, and holds unpublished candidacies (contact email, public
operator/implementation names, canonical domain, declared version/profile/environment, origin-proof
state, journey progress, blockers, receipts, timestamps, and an optional link to a published entry). It
has **no public listing** and no team/permissions/invitation model. A verified email owns its
candidacies. The **Technical Registry** stays public and read-only; a candidacy is published there only
when the existing technical policy deems it eligible. Publication is technical state only — **not** scheme
admission, licence, regulatory authorisation, or certification of an entity.

### 3. Proof of control of the canonical origin

Control of the canonical origin is proven by **one** method: a fixed BANZA `.well-known` ownership
challenge fetched by the existing SSRF-hardened Rust fetcher from
`https://<domain>/.well-known/banza/ownership-challenge.json` (domain-only input; no arbitrary URL, path,
port, IP, or DNS-TXT). Verification emits an `OriginVerificationReceipt`. Only after the origin is fixed
and the endpoints are resolvable does the implementation run the **same** nine-step endpoint-originated
journey of ADR-068 — there is no separate or privileged journey for candidates.

### 4. Rust authority, Postgres persistence, open-protocol boundary

All security logic (OTP, HMAC, sessions, rate limiting, authorisation, candidate state, origin challenge,
secure fetch, validation, receipts, registry synchronisation, public-metric derivation) remains in Rust.
TypeScript/JavaScript is UI and typed glue only; nothing security-bearing runs in the browser.
Persistence uses the existing dedicated PostgreSQL protocol-state store (ADR-042) with hash-only,
secret-free columns. The BANZA-operated Technical Registry is the canonical source for the public
surfaces BANZA maintains (Home, BanzAI, Estado, Technical Registry, Operador Zero) — it is **not**
declared the sole possibility for the whole ecosystem.

### 5. Operador Zero re-enrolment

Operador Zero passes once through the same real flow (a real OTP to `contact@banza.network`, proof of
control of `zero.banza.network`, the nine steps), reconciled with its existing published entry — no second
Operador Zero, no fixtures, no direct-DB verification, no bypass. It remains a published sandbox reference
implementation with real funds disabled and no active technical certification.

## Consequences

- New crate `engines/banzai-onboarding` (Rust→WASM) for OTP/session/candidate/origin decisions;
  `banzai-api` gains a `pg` data layer, a `ResendEmailDeliveryProvider` (HTTPS transport), the onboarding
  endpoints, and cookie sessions — all calling Rust for decisions.
- New private onboarding tables in PostgreSQL (hash-named, within the ADR-042 boundary) via
  `init/001_schema.sql` + an idempotent deploy migration.
- Public surfaces are wired to one canonical registry source; hardcoded counts are removed.
- Explicitly **out of scope** (unchanged by this ADR): M2.19H, Banzami Operational Scheme workflows,
  KYB, AML/CFT, scheme admission, real funds, passkeys, passwords, magic links, advanced team
  management, multi-level permissions, operator API keys, Resend webhooks, a second (DNS-TXT) origin
  method, a federated registry, a release candidate, and M2.19I.
- The open protocol is unchanged: implementing BANZA, publishing endpoints, running the engines,
  validating and generating receipts require no BanzAI account, no email code, and no BANZA-team
  authorisation.
