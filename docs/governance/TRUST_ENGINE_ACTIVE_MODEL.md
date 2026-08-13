# BANZA — Trust Engine, Active Model (Signed Protocol Metadata)

**Document ID:** BANZA-TRUST-ENGINE-ACTIVE-MODEL-001
**Date:** 2026-07-17
**Status:** Describes the active model. Authority is `engines/banza-trust` and the trust contracts;
every input type and `trust_status` value below is defined there, and this document is the prose account of them
**Engine:** `engines/banza-trust` (ADR-037, R5) · WASM em `website/lib/wasm/banza_trust*`
**Adapter:** `website/lib/banzaTrust.ts` (RUST_WRAPPER_ONLY)
**Diagram:** SVG-P-066 `docs/reference/diagrams/protocol/trust-engine-active-model.svg`

---

> **BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam
> manifests e demonstram compatibilidade por evidência verificável de conformidade. O trust do protocolo é
> avaliado por signed protocol metadata, delegated signing keys, public protocol registry e
> revocation/fail-closed.**

Este documento é a especificação normativa do **trust engine** do protocolo. Define o modelo activo, os
sete tipos de entrada, os treze estados, a precedência fail-closed e a fronteira. Descreve o protocolo tal
como ele é.

---

## 1. Modelo activo

O trust do protocolo é estabelecido a partir de **material publicado e verificável**, avaliado
deterministicamente e offline. A avaliação é feita pelo engine Rust `banza-trust`, que:

- verifica assinaturas **ed25519** sobre a forma canónica **BCJ/1** (`spec/canonicalization.md`) — todos
  os campos excepto o membro de assinatura declarado pelo contrato, chaves ordenadas, JSON compacto,
  base64url sem padding;
- ancora a chave de assinatura delegada à **Trust Root** (metadados de raiz activos, política de threshold);
- liga a metadata assinada ao **operator manifest**, à **conformance evidence** e à **public protocol
  registry** por hash;
- lê a **revocation status** em cada avaliação;
- calcula o `trust_status` **em Rust** — nunca em TypeScript.

Cada ramo é **fail-closed**: material ausente, malformado, inválido, expirado, revogado ou incompatível
rejeita. O TypeScript apenas carrega o WASM, faz o marshalling do input e renderiza o output; não verifica
assinaturas, não decide o estado, não decide revogação nem fronteira.

Não existe certificado de operador, assinatura de autoridade certificadora, aprovação humana nem
«verificação tripla». Nada autoriza, certifica, aceita ou aprova um operador.

---

## 2. Os sete tipos de entrada

O input da avaliação é um objecto JSON com um campo por tipo, mais dois campos de contexto no topo:

| Campo de topo | Descrição |
|---|---|
| `evaluated_at` | Instante da avaliação (ISO-8601 UTC). Base das janelas de validade e frescura. |
| `evaluator_protocol_version` | Versão de protocolo do avaliador (default `1.0.0`). Base da compatibilidade. |

Os sete tipos de entrada (`snake_case` = chave do input; nome = tipo):

### 2.1 `trust_root_metadata` — TrustRootMetadata
A âncora de confiança. Requer:
- `active_root_public_keys` — lista não vazia de chaves públicas de raiz activas;
- `threshold_policy` — objecto (p.ex. `{ "min_signatures": 2, "total_keyholders": 3 }`);
- `trust_root_version` — string não vazia;
- `delegated_signing_keys` — lista das chaves delegadas que a raiz reconhece (cada uma com
  `delegated_key_id` e `public_key`).

A Trust Root assina apenas o Manifesto de Chaves, que endossa as chaves delegadas; são estas que assinam metadata de protocolo, releases e revocation lists (ADR-079). **Não autoriza
operadores, não emite licença e não autoriza pagamentos.**

### 2.2 `delegated_signing_key` — DelegatedSigningKey
A chave que assina a metadata de protocolo. Requer:
- `delegated_key_id` e `public_key` (não vazios);
- estar **listada pela Trust Root** com `delegated_key_id` **e** `public_key` coincidentes;
- `revoked = false`;
- `signed_by_root_threshold = true`;
- `allowed_usages` contendo `"signed_protocol_metadata"`;
- estar dentro da janela `valid_from`..`valid_until` face a `evaluated_at`.

### 2.3 `signed_protocol_metadata` — SignedProtocolMetadata
O material de protocolo autenticado. Requer:
- `signature` não vazia — cobre a forma canónica de todos os campos excepto `signature`;
- `protocol_version` — base da compatibilidade (mesma major que o avaliador);
- `valid_from`..`valid_until` — janela de frescura face a `evaluated_at`;
- `operator_manifest_hash` — liga ao operator manifest;
- `conformance_evidence_hash` — liga à conformance evidence.

Autentica **material de protocolo** — nunca autoriza, certifica ou aprova o operador.

### 2.4 `operator_manifest` — OperatorManifestReference
O que o operador declara implementar. Requer:
- `operator_id` não vazio;
- `manifest_hash` não vazio e **igual** a `signed_protocol_metadata.operator_manifest_hash`.

Auto-publicado pelo operador; não é emitido nem aprovado pela BANZA.

### 2.5 `conformance_evidence` — ConformanceEvidenceReference
A evidência verificável por máquina dos resultados de conformidade. Requer:
- `evidence_hash` não vazio e **igual** a `signed_protocol_metadata.conformance_evidence_hash`.

### 2.6 `public_registry_entry` — PublicProtocolRegistryEntry
A entrada de índice público. Requer:
- `operator_id` não vazio e **igual** a `operator_manifest.operator_id`.

É um índice verificável de metadata e evidência — **não** uma lista de operadores licenciados, aprovados ou
certificados pela BANZA. A ausência do índice não é proibição.

### 2.7 `revocation_status` — RevocationStatus
O sinal de segurança activo. Requer:
- `revoked` (bool);
- `revocation_list_version` não vazio;
- `signed_by_revocation_key` não vazio.

Fail-closed: material de revogação **ausente ou não verificável** é tratado como não confiável (INV-FEDEVAL-005).
A Revocation List é um mecanismo de segurança e trust do protocolo — não uma licença, sanção regulatória ou
autorização financeira.

---

## 3. Os treze estados (`trust_status`)

Computados em Rust. `trustStatusTone` (render-only) mapeia cada estado a um tom de apresentação.

| # | `trust_status` | Significado |
|---|---|---|
| 1 | `TRUST_VALID` | metadata verifica sob chave delegada listada pela raiz; manifest, evidence e registry ligados; não revogado; fresco; compatível |
| 2 | `TRUST_INVALID_SIGNATURE` | a assinatura da signed protocol metadata não verifica sob a chave delegada |
| 3 | `TRUST_INVALID_DELEGATED_KEY` | chave delegada não listada pela raiz, revogada, expirada, sem assinatura de threshold ou sem o usage de assinatura de metadata |
| 4 | `TRUST_INVALID_ROOT_METADATA` | metadata de Trust Root ausente ou malformada |
| 5 | `TRUST_INVALID_SIGNED_METADATA` | signed protocol metadata ausente ou sem assinatura |
| 6 | `TRUST_MISSING_CONFORMANCE_EVIDENCE` | conformance evidence ausente ou hash não coincide com a metadata |
| 7 | `TRUST_MISSING_OPERATOR_MANIFEST` | operator manifest ausente ou hash não coincide com a metadata |
| 8 | `TRUST_MISSING_REGISTRY_ENTRY` | public registry entry ausente ou não ligada ao operador |
| 9 | `TRUST_REVOKED` | operador ou material revogado, ou material de revogação não verificável |
| 10 | `TRUST_EXPIRED_METADATA` | signed protocol metadata fora da janela de validade |
| 11 | `TRUST_INCOMPATIBLE_PROTOCOL_VERSION` | `protocol_version` incompatível com o avaliador |
| 12 | `TRUST_FAIL_CLOSED` | input não é objecto / material ausente ou inválido |
| 13 | `TRUST_INVALID_BOUNDARY` | alguma entrada afirma certificado, certificação, licença, PSP ou aprovação humana |

### 3.1 Campos de verificação (`checks`)

O relatório inclui doze campos de verificação, todos calculados em Rust:

`boundary_status` · `root_metadata_status` · `signed_metadata_status` · `delegated_key_status` ·
`signature_status` · `metadata_freshness_status` · `protocol_compatibility_status` · `manifest_status` ·
`conformance_evidence_status` · `registry_status` · `revocation_status` · `fail_closed_required`.

`delegated_key_status` distingue os modos de falha da chave: `MISSING`, `INVALID`, `NOT_LISTED_BY_ROOT`,
`REVOKED`, `NOT_ROOT_SIGNED`, `WRONG_USAGE`, `EXPIRED`, `VALID`. `revocation_status` é `CLEAR`, `REVOKED`
ou `UNVERIFIABLE`.

---

## 4. Precedência fail-closed

A avaliação é **conjuntiva**: todos os gates têm de verificar positivamente para produzir `TRUST_VALID`.
Na primeira falha, a precedência abaixo fixa o estado. **Não há override.**

```
0.  input não é um objecto                                  → TRUST_FAIL_CLOSED
1.  fronteira violada (certificado/aprovação/licença/PSP)   → TRUST_INVALID_BOUNDARY
2.  trust_root_metadata ausente/malformada                  → TRUST_INVALID_ROOT_METADATA
3.  signed_protocol_metadata ausente/sem assinatura         → TRUST_INVALID_SIGNED_METADATA
4.  delegated_signing_key com estado ≠ VALID                → TRUST_INVALID_DELEGATED_KEY
5.  assinatura não verifica                                 → TRUST_INVALID_SIGNATURE
6.  metadata fora da janela de frescura                     → TRUST_EXPIRED_METADATA
7.  protocol_version incompatível (major diferente)         → TRUST_INCOMPATIBLE_PROTOCOL_VERSION
8.  operator_manifest ausente / hash não liga               → TRUST_MISSING_OPERATOR_MANIFEST
9.  conformance_evidence ausente / hash não liga            → TRUST_MISSING_CONFORMANCE_EVIDENCE
10. public_registry_entry ausente / não ligada              → TRUST_MISSING_REGISTRY_ENTRY
11. revogado OU material de revogação não verificável       → TRUST_REVOKED
12. caso contrário                                          → TRUST_VALID
```

A fronteira é avaliada **primeiro** entre os ramos de conteúdo: uma metadata cuja assinatura é válida mas
que afirma ser um certificado de operador é rejeitada com `TRUST_INVALID_BOUNDARY`. `fail_closed_required`
é `true` para qualquer estado que não seja `TRUST_VALID`.

A **frescura da evidência** faz, sem emissor, o que a expiração de credenciais faria: uma metadata fora da
janela é `TRUST_EXPIRED_METADATA` mesmo com assinatura válida.

---

## 5. Relatório

`evaluateTrust(input)` devolve um `TrustReport` determinístico:

- `trust_status`, `detail`, `checks` (§3.1);
- `flags` — invariantes de fronteira do modelo activo:
  `open_financial_protocol=true`, `central_operator_authority=false`,
  `human_operator_approval_required=false`, `operator_participation_permissionless=true`,
  `conformance_is_machine_verifiable=true`, `certificate_based_trust=false`,
  `signed_metadata_based_trust=true`, `not_a_psp=true`, `does_not_authorise_operators=true`,
  `does_not_certify_operators=true`, `does_not_issue_payment_licence=true`, `does_not_move_funds=true`;
- `report_hash` — SHA-256 da forma canónica do corpo (excluindo `report_hash`); determinístico;
- `tool="banza-trust"`, `tool_version`, `test_only=true`, `llm_calls=0`, `external_model_called=false`.

O engine expõe também `loadTrustFixtures()` (doze fixtures TEST-ONLY, assinadas em Rust), `trustSchema()` e
`trustToolVersion()`.

---

## 6. Fronteira (permanente)

A validação do trust é verificação **técnica e TEST-ONLY**. **Não é** autorização de operador,
certificação, licença nem prestação de serviços financeiros pela BANZA.

- Nada autoriza, certifica, aceita ou aprova um operador.
- Nenhum certificado, assinatura de CA ou aprovação humana participa na cadeia.
- Nenhum nome público contém «certificate».
- `/operators` permanece `[]`; `production_certificates` permanece `false`.
- O engine não gera chaves de produção, não assina artefactos de produção e não detém chave real.
- Não movimenta, detém, liquida nem converte fundos; não emite licença; não é PSP.

Qualquer autorização para prestar serviços financeiros vem do regulador competente — nunca da BANZA. Os
operadores são independentes e carregam a sua própria responsabilidade legal, regulatória e financeira.
