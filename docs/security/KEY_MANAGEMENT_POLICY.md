# BANZA — Key Management Policy (BX2.2)

> **BX2.1–BX2.4 é aprofundamento de assurance.** Não é produção, não é auditoria externa concluída, não é
> certificação, não é licença, não cria operador, não activa integração externa, não activa federação, não
> move fundos e não transforma BANZA em prestador de serviços de pagamento.
>
> **BANZA é um protocolo aberto.** O BANZA não é prestador de serviços de pagamento (PSP), não processa
> transacções, não liquida valores e não movimenta fundos. Qualquer licença/autorização pertence ao
> operador autorizado que presta serviços financeiros reais, não ao protocolo.

This is the documented **key lifecycle** for the BANZA trust anchor and one of the three inputs the
TRUST_AND_CRYPTO_CEREMONY track (BX2.2) requires. It is **planned / pre-production**: no production key
material exists yet (the root ceremony is milestone **M2**, not executed —
`production_trust_ceremony_not_executed = true`). See
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md) and
[`TRUST_TEST_ONLY_BOUNDARY.md`](TRUST_TEST_ONLY_BOUNDARY.md).

## 1. Key types (domain-separated, ADR-025)

| Key | Algorithm | Purpose | Domain |
|---|---|---|---|
| Root | ed25519 | Signs the Key Manifest only | root |
| Metadata-signing | ed25519 | Signs signed protocol metadata | delegated / protocol-metadata |
| BRL-issuing | ed25519 | Signs the BANZA Revocation List | issuing / revocation |
| Conformance | ed25519 | Signs conformance evidence packages | issuing / conformance |

Domain separation is an invariant: no key signs outside its domain (INV-ROOT-004). The root key never
signs operators, payments, or licences.

## 2. Generation

- **All keypairs are generated offline**, on an air-gapped machine, under
  [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md).
- **Root key generation is distributed**: each of the three root authorities generates its own key on
  its own machine — no participant generates more than one — with an independent witness observing and
  BCJ/1 canonical signing per ADR-025. Delegated keys are generated once and endorsed by the Key
  Manifest the root signs.
- `issuer_key_id` follows the frozen convention: `banza-root-YYYY`, `banza-meta-YYYYMM`,
  `banza-brl-YYYYMM`, `banza-evidence-YYYYMM`. Test material uses `test-banza-key-YYYY-MM`.
- **INV-ROOT-001:** any `issuer_key_id` beginning with `test-` MUST be rejected by production verification.
  Today only `test-` material exists.

## 3. Storage (offline root — ADR-027)

**ADR-027: keys never on serving infrastructure.**

- The **root private key never touches serving infra** — not the website container, not the BanzAI API,
  not the reverse proxy, not any host reachable from the network. It lives only on offline / air-gapped
  media and (planned) an HSM.
- Issuing private keys are also held offline; **only their public halves** are published, inside the
  root-signed Key Manifest.
- Private keys are encrypted at rest (GPG / AES-256); the encryption passphrase is stored separately from
  the key media.
- Serving infrastructure holds **public artifacts only**: the Key Manifest and the BRL.

## 4. Rotation schedule

| Key | Max validity | Routine rotation | Rotation authority |
|---|---|---|---|
| Root | 24 months | Every 24 months | Root ceremony, two of the three authorities |
| Metadata-signing | 6 months | Every 6 months | Root re-signs a new manifest |
| BRL-issuing | 6 months | Every 6 months | Root re-signs a new manifest |
| Conformance | 6 months | Every 6 months | Root re-signs a new manifest |

Routine issuing-key rotation updates the Key Manifest (root-signed) and republishes it at
`/.well-known/banza/key-manifest.json` with a 24 h cache TTL. **INV-ROOT-006:** issuing keys ≤ 6 months,
root ≤ 24 months. **INV-ROOT-003:** a stale manifest (`expires_at < now()`) MUST NOT be used.

## 5. Revocation and compromise response

| Scenario | Response path | Federation impact |
|---|---|---|
| Conformance key compromise | Rotate key; invalidate affected evidence; re-run conformance | None (evidence only) |
| BRL-issuing key compromise | Rotate key; publish **emergency BRL** (`expires_at` = 1 h) with the new key | 1–6 h |
| Metadata-signing key compromise | Rotate key; suspend affected operators pending re-verification | Days |
| Root key compromise | Full trust reset: new root, new issuing keys, new manifest, SDK update, all L3+ re-certify | Days–weeks |
| Operator revocation (not a BANZA-key event) | Add to BRL, sign with BRL-issuing key, publish; BRL is fail-closed | Immediate on fetch |

Operator revocation is detailed in [`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md). Full
compromise procedures are frozen in ADR-025.

## 6. Separation of duties

- The person who **generates** key material (Officer) is **witnessed** by a second person who never
  touches the key material (Witness).
- The **root** domain is separated from all **issuing** domains; a compromise of one issuing key does not
  expose the root or the other issuing keys.
- **Signing** authority (offline root/issuing keys) is separated from **serving** infrastructure (public
  artifacts only, ADR-027).
- BanzAI may **verify** trust but may **never grant** it and may **never hold** a production private key
  (ADR-001 / ADR-001).

## 7. Key → domain → rotation → revocation map

| Key | Domain | Signs | Rotation | Revocation path |
|---|---|---|---|---|
| `banza-root-YYYY` | root | Key Manifest | 24 months | Full trust reset; new root ceremony; SDK re-pin |
| `banza-meta-YYYYMM` | protocol-metadata | Signed protocol metadata | 6 months | Rotate key; new manifest; suspend affected operators |
| `banza-brl-YYYYMM` | revocation | BRL | 6 months | Rotate key; emergency BRL (`expires_at` = 1 h); new manifest |
| `banza-evidence-YYYYMM` | conformance | Evidence packages | 6 months | Rotate key; invalidate affected evidence; re-run conformance |

## 8. Assurance-track contribution

This document is the **key lifecycle** input to the TRUST_AND_CRYPTO_CEREMONY track. Deep-assurance status
is computed **in Rust** (`validate_deep_assurance`), never in TypeScript. Because no ceremony has run, the
trust track resolves to `DEEP_ASSURANCE_BLOCKED_BY_TRUST_GAP` until M2 — the expected pre-M2 state.

## 9. Non-claims

- No production key material exists; this is a policy, not evidence of key possession.
- Fixtures are not real signed protocol metadata; `test-` keys are rejected by production verification.
- Publishing this policy does not certify, license, or activate anything, and does not make BANZA a PSP.

See: [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`BRL_REVOCATION_PLAYBOOK.md`](BRL_REVOCATION_PLAYBOOK.md),
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md).
