# BANZA — Trust Ceremony Plan (BX2.2)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This document is the **planned** end-to-end trust / root-key ceremony for the BANZA trust anchor. It is
part of the **TRUST_AND_CRYPTO_CEREMONY** track (BX2.2) of the Security Assurance Deepening Pack. It
operationalises, at the planning level, the existing
[`ROOT_KEY_CEREMONY_PROCEDURE.md`](ROOT_KEY_CEREMONY_PROCEDURE.md),
[`ROOT_KEY_CEREMONY_CHECKLIST.md`](ROOT_KEY_CEREMONY_CHECKLIST.md),
[`ROOT_KEY_CEREMONY_RECORD_TEMPLATE.md`](ROOT_KEY_CEREMONY_RECORD_TEMPLATE.md) and
[`PRODUCTION_ROOT_READINESS_REPORT.md`](PRODUCTION_ROOT_READINESS_REPORT.md).

## Status marker

```
production_trust_ceremony_not_executed = true
```

The production root-key ceremony is **milestone M2** and has **not** been executed. No production root key
exists; no production issuing key exists; no production signed protocol metadata has been produced. Everything below is a
**plan** and a **test-only / dry-run** rehearsal target. See
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md).

## 1. Ceremony roles (dual control)

| Role | Count | Responsibility | Handles private key? |
|---|---|---|---|
| Ceremony Officer | 1 | Executes every command on the air-gapped machine | Yes (offline only) |
| Ceremony Witness | 1 | Observes, initials each phase, verifies no deviation | **No** — never touches key material |
| Publication custodian | 1 (may be Officer) | Carries the public-only Publication USB out of the room | Public artifacts only |
| Governance approver | ≥1 | Authorises the ceremony date under governance | No |

**Dual control is mandatory.** No single person both generates and publishes without a witness present.
The Witness attests that the Officer performed all operations and that the Witness never handled the
ceremony machine or any private key (per the CLOSE DECLARATION in
[`ROOT_KEY_CEREMONY_CHECKLIST.md`](ROOT_KEY_CEREMONY_CHECKLIST.md)).

## 2. Ceremony phases (planned)

| Phase | Name | Environment | Output |
|---|---|---|---|
| P0 | Pre-flight & environment audit | Sealed room, air-gapped | Verified software hashes, offline confirmation |
| P1 | Offline key generation | Air-gapped machine | Root + 3 issuing keypairs (ed25519) |
| P2 | Key-manifest construction | Air-gapped machine | Unsigned key manifest body |
| P3 | Key-manifest signing (dual control) | Air-gapped machine | Root-signed key manifest + initial BRL |
| P4 | Verification | Air-gapped machine | Signature re-verify PASS, key-ID format PASS |
| P5 | Sealing & custody | Sealed room | Encrypted key USBs, paper backup, sealed record |
| P6 | Publication | Serving infra (public artifacts only) | Manifest + BRL at their public URLs |
| P7 | Record | Governance | Signed Ceremony Record, M2 marked complete |

The step-by-step operational form of these phases is in
[`ROOT_KEY_CEREMONY_RUNBOOK.md`](ROOT_KEY_CEREMONY_RUNBOOK.md) — every step there is marked TEST-ONLY.

## 3. Domain-separated keys (ADR-038 / ADR-028)

The trust anchor uses **domain separation**: no key signs across domains (INV-ROOT-004). The root key
signs only the key manifest; each issuing key signs exactly one artifact type.

| Key | Domain | Signs | Max validity | Storage |
|---|---|---|---|---|
| `banza-root-YYYY` | root | Key Manifest only | 24 months | Offline / air-gapped, **never on serving infra** (ADR-028) |
| `banza-meta-YYYYMM` | issuing (protocol-metadata) | Signed protocol metadata | 6 months | Offline; public half in manifest |
| `banza-brl-YYYYMM` | issuing (revocation) | BANZA Revocation List (BRL) | 6 months | Offline; public half in manifest |
| `banza-evidence-YYYYMM` | issuing (conformance) | Conformance evidence packages | 6 months | Offline; public half in manifest |

The root key **never** touches the runtime verification path: signed protocol metadata is verified against
the issuing public key published in the (root-signed) Key Manifest, so the root key appears only when the
manifest is rotated. This is frozen by ADR-038 and reaffirmed by ADR-028 (keys never on serving
infrastructure). See the domain → rotation → revocation mapping in
[`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md).

## 4. Publication surface (public artifacts only)

| Resource | URL | Cache TTL | Update trigger |
|---|---|---|---|
| Key Manifest | `/.well-known/banza/key-manifest.json` | 24 h | Issuing-key rotation |
| BRL | `/federation/revocation-list.json` | 6 h | Revocation / suspension |

Only **public** artifacts are published. No private key ever leaves the sealed room; the Publication USB
is grep-verified to contain zero `private` files before it exits (Phase P5 → P6).

## 5. How this feeds the assurance track

The deep-assurance status is computed **in Rust** by
`engines/banza-security-assurance :: validate_deep_assurance`, never in TypeScript. The
TRUST_AND_CRYPTO_CEREMONY track requires three things to be present:

1. a documented **key lifecycle** (see [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md));
2. documented **ceremony roles** with dual control (this document, §1);
3. an explicit **test-only boundary** (see [`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md)).

Because `production_trust_ceremony_not_executed = true`, this plan is **present but incomplete** by design:
the ceremony has not run. A present-but-incomplete trust plan resolves to
`DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP`. This is the correct and expected pre-M2 state — the block clears
only when M2 is executed under governance, which is out of scope for BX2.1–BX2.4.

| Deep-assurance state | Meaning for this track |
|---|---|
| `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP` | Trust/ceremony plan present but incomplete (**current state — M2 pending**) |
| `DEEP_ASSURANCE_INCOMPLETE` | A required trust input (lifecycle / roles / boundary) is absent |
| `DEEP_ASSURANCE_INVALID` | A doc claims the ceremony was executed / production / certified (boundary failure) |

## 6. Explicit non-claims

- The ceremony described here has **not** been performed.
- No production root or issuing key exists.
- No real signed protocol metadata has been produced; fixtures are not real signed protocol metadata.
- Publishing this plan does **not** activate federation, does **not** create an operator, and does **not**
  make BANZA a PSP. Any licence/authorisation belongs to the authorised operator.

See: [`KEY_MANAGEMENT_POLICY.md`](KEY_MANAGEMENT_POLICY.md),
[`ROOT_KEY_CEREMONY_RUNBOOK.md`](ROOT_KEY_CEREMONY_RUNBOOK.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md),
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md),
[`ASSURANCE_READINESS.md`](ASSURANCE_READINESS.md).
