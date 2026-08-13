# BANZA — Trust Test-Only Boundary (BX2.2)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This is the guardrail document for the TRUST_AND_CRYPTO_CEREMONY track (BX2.2). Its single job is to make
it **impossible to mistake the trust track for a real ceremony**. Everything in the track —
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md), [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md) — is **planned / test-only / pre-production**.

## Status marker

```
production_trust_ceremony_not_executed = true
```

The production root-key ceremony is **milestone M2** and has **not** been executed.

## TEST-ONLY vs what production would require

| Aspect | Now (TEST-ONLY) | Would be required before production |
|---|---|---|
| Root key | **Does not exist** | Generated in an air-gapped M2 ceremony under dual control |
| Issuing keys (protocol-metadata/BRL/conformance) | Do not exist | Generated in the same ceremony, endorsed in a root-signed manifest |
| Protocol-metadata signing | **No real signed protocol metadata produced** | The protocol-metadata key signs real signed protocol metadata post-M2 |
| Fixtures | **Not real signed protocol metadata** — `test-banza-key-YYYY-MM` material | Replaced by production `banza-*-YYYYMM` material |
| Key Manifest endpoint | Not published from a real ceremony | Published + root-signed at `/.well-known/banza/key-manifest.json` |
| BRL | No production BRL-issuing key; fail-closed documented only | Signed by a real BRL-issuing key, published, fetched ≤ 6 h |
| External audit | **Not performed** | Independent external audit before any production claim |
| Milestone M2 | **Pending** | Executed and recorded under governance |

## What is explicitly NOT true today

- ❌ There is **no** real BANZA root key.
- ❌ There is **no** real signing of protocol metadata; **fixtures are not real signed protocol metadata**.
- ❌ The ceremony has **not** been performed; the runbook is a dry-run wrapper.
- ❌ No BRL has been signed by a production revocation key.
- ❌ Nothing here certifies, licenses, or authorises any operator.
- ❌ None of this makes BANZA a payment service provider, moves funds, or activates federation.

## What IS true today

- ✅ The trust architecture is frozen (ADR-038) and keys-never-on-serving-infra is documented (ADR-028).
- ✅ The ceremony **plan**, **key lifecycle**, **runbook**, and **revocation playbook** are documented.
- ✅ Test-only material uses the `test-banza-key-*` convention and is rejected by production verification
  (INV-ROOT-001).
- ✅ The fail-closed BRL behaviour is documented (`fail_closed_documented = true`).

## Enforcement flags carried by the trust track

Every trust-track document carries, in spirit, the same negation set as the assurance baseline:
`not_production`, `not_a_certificate`, `not_an_approval`, `not_a_licence`, `not_a_psp`,
`does_not_move_funds`, `does_not_create_operator`, `does_not_activate_federation`,
`does_not_make_banza_a_payment_service_provider`,
`requires_external_audit_before_production_claims`,
`requires_operator_regulatory_authorisation_if_used_for_real_services`,
`production_trust_ceremony_not_executed: true`, `test_only: true`.

## How the Rust engine treats this boundary

Deep-assurance status is computed **in Rust** by
`engines/banza-security-assurance :: validate_deep_assurance`, never in TypeScript.

| Condition | Deep-assurance state |
|---|---|
| Trust plan + lifecycle + boundary present, ceremony not executed (**current**) | `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP` |
| A required trust input absent | `DEEP_ASSURANCE_INCOMPLETE` |
| Any doc claims the ceremony ran / production / certified / licensed | `DEEP_ASSURANCE_INVALID` |

The correct, expected state for the trust track today is `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP`. This block
is a feature, not a defect: it prevents the pack from ever reading as "trust established". The block clears
only when M2 is executed under governance and an independent external audit is commissioned — both out of
scope for BX2.1–BX2.4.

See: [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
