# Architecture decision records

These records answer one question: **why is BANZA designed this way?**

They answer no other. What an implementation must do is defined by the normative surface indexed in
[`contracts/production/normative-manifest.json`](../../contracts/production/normative-manifest.json) —
specifications, contracts, schemas, registries and vectors. Nothing here binds an implementation, and no
rule is discoverable only from this tree: an engineer can implement BANZA v1.0.0 completely from the
normative surface without opening a single record.

Every record in this tree is current. There are no superseded, deprecated or historical records — when a
decision changes, its record is rewritten or removed, and version control keeps the past (ADR-010).

---

## I. Protocol identity — what BANZA is, and where it ends

| ADR | Decision |
|---|---|
| [001](ADR-001-open-financial-protocol-what-banza-is-and-is-not.md) | BANZA is an open financial protocol — a specification, not an operator, a bank or a licence |
| [002](ADR-002-protocol-implementation-and-operator-separation.md) | The protocol defines interfaces and invariants; operators implement them; the protocol contains no operator |
| [003](ADR-003-protocol-first-origination.md) | A new financial concept originates in the protocol and flows down to operators, SDKs and applications — never upward |
| [004](ADR-004-three-institutional-layers.md) | Protocol, certification and operational scheme are separated by responsibility, infrastructure and keys |
| [005](ADR-005-certification-admission-and-authorisation-do-not-propagate.md) | Technical certification, scheme admission and regulatory authorisation are distinct, and none implies another |
| [006](ADR-006-the-designated-operator-and-its-conflict-of-interest.md) | The designated operator of the first scheme receives no privilege; the conflict is controlled structurally |
| [007](ADR-007-regulatory-state-and-the-real-money-activation-gate.md) | Real money stays off behind a single fail-closed activation gate with no bypass |

## II. Authority — what defines BANZA, and how it is versioned

| ADR | Decision |
|---|---|
| [008](ADR-008-normative-authority-and-versioning.md) | Normative authority is an enumerated, digest-bound manifest; the version changes only on wire incompatibility |
| [009](ADR-009-licence-trademark-and-open-governance.md) | Licence, attribution, trademark and governance are four separate artifacts that never contaminate each other |
| [010](ADR-010-the-decision-record-tree-holds-current-architecture-only.md) | This tree holds current decisions only, binds nothing, and must survive the delete-the-records test |

## III. Determinism and data — how independent implementations get the same result

| ADR | Decision |
|---|---|
| [011](ADR-011-banza-canonical-json-bcj-1.md) | BCJ/1 — RFC 8785 restricted by a subtractive profile, so two implementations produce identical bytes |
| [012](ADR-012-double-entry-ledger-and-monetary-precision.md) | Double-entry, append-only, ledger-derived balances, integer minor units |
| [013](ADR-013-the-protocol-state-store-is-not-a-ledger.md) | The protocol's own store holds protocol state — never funds, balances or personal data |

## IV. Execution — how financial behaviour is modelled

| ADR | Decision |
|---|---|
| [014](ADR-014-account-and-participant-identity.md) | The canonical operation is a transfer between accounts, addressed by QR and by handle — not a card transaction |
| [015](ADR-015-payment-initiation-one-intent-several-surfaces.md) | One payment intent, presented through link, static QR, dynamic QR and deep link; surfaces hold no money |
| [016](ADR-016-collections-a-composite-obligation-never-money.md) | A collection is a composite obligation; each share settles independently and the collection holds no balance |
| [017](ADR-017-wallet-accounts-segregation-inside-a-wallet.md) | Segregated accounts inside a wallet, one owner, with a mandatory primary account |
| [018](ADR-018-wallet-payments-and-the-refund-source-model.md) | A wallet payment is first-class; a refund references a typed source, capped and idempotent against it |
| [019](ADR-019-fees-and-application-settlement.md) | The protocol carries fee references, never rates; the fee is one leg of the same balanced posting |
| [020](ADR-020-transaction-proof-and-public-verification.md) | A proof is checked live against the ledger by anyone, with no account and no data in the URL |
| [021](ADR-021-reason-codes.md) | A status decides, a reason code explains; decisional enums closed, explanatory codes open and namespaced |
| [022](ADR-022-idempotency.md) | Caller-supplied idempotency keys are a protocol invariant; rate limiting is an operator concern |
| [023](ADR-023-test-material-can-never-be-production-valid.md) | Environment and demonstration status are carried by the artifact, not by its deployment |
| [024](ADR-024-identity-verification-stays-operator-policy.md) | Identity verification is operator policy; only assertions federate, never evidence |

## V. Trust and security — how cryptographic authority works

| ADR | Decision |
|---|---|
| [025](ADR-025-trust-without-a-certificate-authority.md) | No certificate authority over operators: a verifier re-derives a fail-closed verdict from public material |
| [026](ADR-026-root-authorization-three-authorities-threshold-two.md) | Three independent root authorities, any two of which authorise, counted as distinct signers |
| [027](ADR-027-signing-keys-never-on-serving-infrastructure.md) | Signing is offline; serving publishes already-signed bytes and holds no private key |
| [028](ADR-028-anti-rollback-for-versioned-trust-material.md) | Monotonic anti-rollback with digest-at-equal-marker; no certificate transparency, no mirrors |
| [029](ADR-029-canonical-discovery-surface.md) | One well-known path per discovery artifact, on the implementation's own origin |

## VI. Profiles and capabilities — how conformance is scoped

| ADR | Decision |
|---|---|
| [030](ADR-030-conformance-profiles-and-the-capability-vocabulary.md) | Cumulative profiles L0–L4 describe scope, not rank; capabilities match exactly from one registry |

## VII. Conformance and evidence — how behaviour is demonstrated

| ADR | Decision |
|---|---|
| [031](ADR-031-operator-self-publication-and-machine-verifiable-conformance.md) | Implementations publish their own manifest and evidence; automation verifies, nobody approves |
| [032](ADR-032-certification-records-and-their-lifecycle.md) | A record binds an implementation hash to a profile; standing is a closed enum with a fixed transition table |
| [033](ADR-033-the-banza-technical-registry.md) | A public, append-mostly index of certification facts that vouches for nobody |
| [034](ADR-034-endpoint-originated-validation.md) | Every artifact in an official validation is fetched from the implementation's own endpoints |

## VIII. Reference and auxiliary boundaries

| ADR | Decision |
|---|---|
| [035](ADR-035-operator-zero-the-read-only-reference-implementation.md) | A public demonstration implementation with fictional currency, subordinate to the specification |
| [036](ADR-036-banzai-a-non-authoritative-interface-to-the-protocol.md) | A human interface where engines decide and the model only explains; removable without affecting the protocol |
| [037](ADR-037-operator-onboarding.md) | Passwordless onboarding protects shared resources and closes nothing; no conformance path routes through it |
| [038](ADR-038-rust-first-official-engines.md) | Every official engine is Rust — one implementation per decision; operators remain free to use any technology |
| [039](ADR-039-root-authority-set-and-succession.md) | Root authority is a lineage: each set authorised by the threshold of its predecessor, genesis pinned, self-signed sets rejected |
