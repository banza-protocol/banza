# BANZA — Root Ceremony Evidence Log Template (M2.1)

> **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS** (all values below are placeholders)
>
> **A raiz M2 do BANZA estabelece confiança do protocolo financeiro aberto BANZA. Ela não autoriza serviços de pagamento, não cria operador, não emite licença, não processa transacções, não liquida valores, não movimenta fundos e não substitui autorização regulatória dos operadores que implementam o protocolo.**
>
> **BANZA é um protocolo financeiro aberto. PSPs, bancos ou operadores autorizados são entidades separadas que podem implementar o protocolo para prestar serviços financeiros reais.**

This is a **fill-in template** for the evidence log produced by a 2-of-3 root ceremony
([`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md)). It is designed so that **every
recorded entry is publishable** — it captures only public keys, key IDs, fingerprints, signatures,
hashes, declarations and results, and **no secret**. Replace each `<placeholder>` during an actual
offline ceremony. BANZA permanece protocolo financeiro aberto; operadores autorizados são entidades
separadas que implementam o protocolo.

## 1. Ceremony header

- `ceremony_id`: `<M2-ROOT-CEREMONY-YYYYMMDD-NN, placeholder>`
- `ceremony_type`: `root-establishment | rotation | revocation`
- `threshold`: `2-of-3`
- `date`: `<YYYY-MM-DD, placeholder>`
- `location`: `<placeholder — non-secret description>`
- `production_ceremony_executed`: `false` (this template is TEST ONLY)

## 2. Custodians present

| Custodian | Present | Offline verified | Disk encryption | Public key ID |
|---|---|---|---|---|
| A | `<yes/no>` | `<yes>` | `<on/off>` | `<root-pub-A-id, placeholder>` |
| B | `<yes/no>` | `<yes>` | `<on/off>` | `<root-pub-B-id, placeholder>` |
| C | `<yes/no>` | `<yes>` | `<on/off>` | `<root-pub-C-id, placeholder>` |

(Offline verification references
[`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md) §F.)

## 3. Public keys and fingerprints (publishable)

| Custodian | Public key (public half only) | Fingerprint |
|---|---|---|
| A | `<PUBLIC-KEY-A, placeholder — public half only>` | `<FPR-A, placeholder>` |
| B | `<PUBLIC-KEY-B, placeholder — public half only>` | `<FPR-B, placeholder>` |
| C | `<PUBLIC-KEY-C, placeholder — public half only>` | `<FPR-C, placeholder>` |

> Only the **public** half is ever recorded. Private keys are **never** written here.

## 4. Root metadata

- `root_metadata_hash` (SHA-256): `<HASH, placeholder>`
- `root_set`: `{ pub-A, pub-B, pub-C }` · `threshold`: `2`
- `validity_from` / `validity_to`: `<YYYY-MM-DD>` / `<YYYY-MM-DD>` (placeholders)
- `scope`: `root_metadata, delegations, rotation, revocation, trust_policy`
- `scope_excludes`: `payments, operator_authorisation, licences, fund_movement, financial_services`

## 5. Signatures (2-of-3)

| Signer | Signed root metadata? | Signature (public artifact) |
|---|---|---|
| A | `<yes/no>` | `<SIGNATURE-A, placeholder>` |
| B | `<yes/no>` | `<SIGNATURE-B, placeholder>` |
| C | `<yes/no>` | `<SIGNATURE-C, placeholder>` |

- `signatures_collected`: `<2 or 3>` · `threshold_met`: `<yes/no>`

## 6. Hashes and evidence bundle

| Artifact | Hash field | Value |
|---|---|---|
| Root metadata | `root_metadata_sha256` | `<HASH, placeholder>` |
| Evidence log (this file) | `evidence_log_sha256` | `<HASH, placeholder>` |
| TEST-ONLY recovery document | `recovery_doc_sha256` | `<HASH, placeholder>` |

## 7. Recovery-test result (per custodian)

| Custodian | Fingerprint match | TEST-ONLY signature verify | Date |
|---|---|---|---|
| A | `<PASS/FAIL>` | `<PASS/FAIL>` | `<YYYY-MM-DD>` |
| B | `<PASS/FAIL>` | `<PASS/FAIL>` | `<YYYY-MM-DD>` |
| C | `<PASS/FAIL>` | `<PASS/FAIL>` | `<YYYY-MM-DD>` |

(References [`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md).)

## 8. Witnesses

| Witness | Role | Initials |
|---|---|---|
| `<name/placeholder>` | Observed offline conditions; touched no key material | `<____>` |

## 9. What must NOT be recorded here (forbidden)

The following must **never** appear in this log or any attachment. If any is present, the Rust validator
`engines/banza-root-ceremony :: validate_root_ceremony` resolves to
`M2_ROOT_CEREMONY_INVALID_FORBIDDEN_PRIVATE_KEY_MATERIAL`:

- Private keys (`root_key_A/B/C`) or any private-key bytes
- Seeds, mnemonics, passphrases
- Encrypted private-key backups or USB images
- Recovery material, raw entropy
- Secret logs, screenshots containing secrets
- Any material that would let someone sign as a custodian

## 10. Published vs forbidden

| PUBLISHABLE (everything in §§1–8) | FORBIDDEN (everything in §9) |
|---|---|
| Public keys, key IDs, fingerprints | Private keys, seeds, mnemonics, passphrases |
| Root metadata, threshold policy (2-of-3) | Encrypted private-key backups, USB images |
| Signatures, hashes, ceremony evidence hash | Recovery material, raw entropy, secret logs |
| Custody/backup/recovery declarations without secrets; recovery-test PASS/FAIL | Screenshots with secrets; any material that lets someone sign as a custodian |

## 11. Validator status

A complete, coherent log (3 custodians, 2-of-3 signatures, custody/backup/recovery evidence present,
scope + boundary intact, no forbidden material) supports `M2_ROOT_CEREMONY_VALID`. Missing fields yield
`M2_ROOT_CEREMONY_INCOMPLETE`; the specific gap states are listed in
[`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md) §5. Status is computed **in Rust**,
never in TypeScript.

## 12. Non-claims

- No real key exists in this repository, CI, the website, the server or the Workbench; all values above
  are **TEST ONLY — NOT PRODUCTION — NO REAL PRIVATE KEYS**.
- Completing this log does not create an operator, issue a licence, activate federation or move funds.
  BANZA permanece protocolo financeiro aberto.

See: [`ROOT_KEY_CEREMONY_REQUIREMENTS.md`](ROOT_KEY_CEREMONY_REQUIREMENTS.md),
[`ROOT_KEY_CUSTODY_MODEL.md`](ROOT_KEY_CUSTODY_MODEL.md),
[`ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md`](ROOT_KEY_ROTATION_AND_REVOCATION_POLICY.md).
