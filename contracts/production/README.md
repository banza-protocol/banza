# BANZA — Production Contract Baseline

> **Esta baseline implementa o protocolo BANZA para produção enquanto protocolo aberto. Ela não activa prestação de serviços de pagamento pelo BANZA.**
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Os serviços financeiros são prestados por operadores autorizados que implementam o protocolo.

This directory holds the **production contract baseline** for the BANZA open
protocol at state `M2_PROTOCOL_IMPLEMENTATION`. "Production" here means
**production of the protocol** — its governance, contracts, trust path, release
process, and operator self-publication — as an open specification. It does
**not** mean financial production. **No schema in this baseline implies that
BANZA processes payments, settles value, or moves funds**, because BANZA does
none of these.

## Scope and boundary

These are **protocol-production** schemas, not **financial-production**
artifacts. They describe how the protocol is versioned, how the trust path is
published, how candidate operators are reviewed, and how protocol releases are
governed. Every schema carries the `_boundary` string:

> *Production of the BANZA protocol, not financial production. BANZA is an open
> protocol; it does not process payments, settle value, or move funds.
> Licence/authorisation belongs to the operator, not to BANZA.*

All **licence/regulatory fields are operator-owned and declarative/evidential**.
BANZA records an operator's regulatory declaration as evidence; it never grants,
verifies, or substitutes a payment-service authorisation. Regulatory
authorisation belongs to the operator and its own authority — never to BANZA.

At this baseline the following remain fixed and gated:

- `/operators` stays `[]`; `production_certificates` stays `false`.
- No real operator is created or activated.
- No real production certificate is emitted.
- No real production keys, federation, or external integration are activated.
- All production/ceremony/operator activities are **planned / prepared-but-gated**.

The M2 protocol-gate status is computed by the Rust engine
`engines/banza-m2-protocol-gate :: validate_m2_protocol_gate` — never in
TypeScript. Its states are `M2_PROTOCOL_IMPLEMENTATION_READY`,
`M2_BLOCKED_BY_MISSING_CONTRACTS`, `M2_BLOCKED_BY_GOVERNANCE_GAP`,
`M2_BLOCKED_BY_TRUST_PATH_GAP`, `M2_BLOCKED_BY_OPERATOR_ADMISSION_GAP`,
`M2_BLOCKED_BY_ASSURANCE_GAP`, `M2_INVALID_FORBIDDEN_ACTIVATION`, and
`M2_INVALID_REGULATORY_BOUNDARY`.

## Protocol production state model

```
PRE_PRODUCTION
  → M2_PROTOCOL_IMPLEMENTATION   (this baseline)
  → M2_PROTOCOL_REVIEW
  → M2_PROTOCOL_CANDIDATE
  → M3_OPERATOR_CANDIDATE
  → M4_PRODUCTION_NETWORK        (future-only; not activated)
```

## Index

| File | What it is |
|---|---|
| [`protocol-version.json`](./protocol-version.json) | Concrete production protocol version descriptor (`protocol_version` 1.0.0, `state` M2_PROTOCOL_IMPLEMENTATION, `operators` `[]`, `production_certificates` `false`). |
| [`operator-manifest.production.schema.json`](./operator-manifest.production.schema.json) | Candidate-operator manifest. `production_allowed` is validated by the operator's own regulator, not by BANZA; BANZA records the declaration. |
| [`key-manifest.production.schema.json`](./key-manifest.production.schema.json) | Production key manifest (public keys only; root/issuing/revocation domains; content hash). Private keys never appear. |
| [`conformance-evidence.production.schema.json`](./conformance-evidence.production.schema.json) | Machine-verifiable conformance evidence an operator self-publishes. Reproducible by any third party; **not** a certificate, approval or payment-service authorisation. |
| [`brl.production.schema.json`](./brl.production.schema.json) | Production BANZA Revocation List. Fail-closed semantics: an unverifiable or stale BRL denies trust. |
| [`evidence-bundle.production.schema.json`](./evidence-bundle.production.schema.json) | Production evidence bundle reference with boundary flags `not_a_certificate` and `requires_conformance_evidence_review`. |
| [`conformance-report.production.schema.json`](./conformance-report.production.schema.json) | Production-grade conformance report (L0–L4, invariants). `ready_for_operator_external_review` is **not** certification. |
| [`operator-self-publication.production.schema.json`](./operator-self-publication.production.schema.json) | What an operator self-publishes (manifest, signed protocol metadata, conformance evidence). No application, no review step; sets neither `/operators` nor `production_certificates`. |
| [`protocol-release.production.schema.json`](./protocol-release.production.schema.json) | Protocol release record (DRAFT → … → PUBLISHED). No payment/operation approval states. |

## Root trust (offline root-key ceremony)

These nine schemas are the protocol **root-trust artifacts** produced by the
offline root-key ceremony under a **2-of-3** custody threshold with three
independent custodians (A, B, C — one root private key each). They carry
**public material only**: public keys, delegations, signatures, hashes,
declarations and evidence. **No private key, seed, mnemonic or passphrase field
exists in any of them** — the real ceremony happens OFFLINE on the custodians'
own computers and the repo/CI/website/server/BanzAI never contain real
private keys. The root signs root metadata, delegations, rotation, delegated-key revocation
(recorded in root metadata — the BRL itself is signed by the revocation-domain
delegated key, INV-ROOT-005) and trust policy only — it does **not** sign
payments, does **not** authorise operators, does **not** issue licences and
does **not** move funds. Status is
computed in Rust by `engines/banza-root-ceremony :: validate_root_ceremony`,
never in TypeScript.

> **A raiz de confiança do BANZA estabelece confiança do protocolo financeiro aberto
> BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite
> licença, não processa transacções, não liquida valores, não movimenta fundos
> e não substitui autorização regulatória dos operadores que implementam o
> protocolo.**
>
> **BANZA é um protocolo financeiro aberto.** PSPs, bancos ou operadores
> autorizados são entidades separadas que podem implementar o protocolo para
> prestar serviços financeiros reais.

| File | What it is |
|---|---|
| [`root-metadata.production.schema.json`](./root-metadata.production.schema.json) | Root trust metadata: three public root keys, delegations, policy, 2-of-3 signatures, scope, and the positive-framed `boundary` object. |
| [`root-key.production.schema.json`](./root-key.production.schema.json) | A single root **public** key entry held offline by one custodian. Public key only. |
| [`root-signature.production.schema.json`](./root-signature.production.schema.json) | A single custodian signature over a root-scope hash. Public material only. |
| [`root-delegation.production.schema.json`](./root-delegation.production.schema.json) | Delegation from the root to a purpose-specific signing key (release/BRL/artifact/evidence). Never payments/operators/funds. |
| [`root-ceremony-evidence.production.schema.json`](./root-ceremony-evidence.production.schema.json) | Public evidence of the offline ceremony: custodians present, public keys, signatures, hashes, recovery-test result, witnesses. No secrets. |
| [`root-custody-declaration.production.schema.json`](./root-custody-declaration.production.schema.json) | Custody declaration: single root key, no device holds more than one, offline-only. Declaration without any secret. |
| [`root-backup-declaration.production.schema.json`](./root-backup-declaration.production.schema.json) | Backup declaration: encrypted backup, passphrase off-device, USB medium, no plaintext private key. No secret content. |
| [`root-recovery-test.production.schema.json`](./root-recovery-test.production.schema.json) | Recovery-test result: public key matches after restore. TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS. |
| [`root-revocation.production.schema.json`](./root-revocation.production.schema.json) | 2-of-3-signed root-key revocation record. Revoking one key does not destroy the root. |

## Related

- Canonical primitive style reference: [`../payment-intents/payment-intent.schema.json`](../payment-intents/payment-intent.schema.json)
- Contracts index: [`../README.md`](../README.md)
- Financial invariants: [`../invariants.json`](../invariants.json)
- M2 readiness handoff: [`../../docs/governance/M2_READINESS_HANDOFF_2026_07.md`](../../docs/governance/M2_READINESS_HANDOFF_2026_07.md)

## Reminder

Conformance evidence and an evidence bundle are **verifiable technical
artifacts** an operator self-publishes. Neither is a payment-service
authorisation or licence, and neither lets BANZA process payments, hold or move
funds, or activate a real operator. Real financial operation remains behind the
offline root-key ceremony, the first published production conformance evidence,
and the legal/regulatory clearance owned by the operator — never conferred by BANZA.
