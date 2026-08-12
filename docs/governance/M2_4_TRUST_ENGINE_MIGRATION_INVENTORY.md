# M2.4 — Trust Engine Migration Inventory

Registo técnico da pendência deixada por M2.3: o motor cripto `banza-trust` e os seus consumidores ainda
validam artefactos do tipo *certificate* internamente. Esta fase migra a implementação para o modelo activo.

> **Regra central.** O trust do protocolo financeiro aberto BANZA é verificado por signed protocol metadata,
> delegated signing keys, operator manifests, conformance evidence, public protocol registry e
> revocation/fail-closed. Não existe certificado de operador, aprovação humana central ou autoridade humana
> que aceite operadores no modelo activo. Ver [ADR-038](../../decisions/adr/ADR-038-open-protocol-trust-model-without-ca.md),
> [ADR-040](../../decisions/adr/ADR-040-federation-trust-evaluation-without-certificates.md) e
> [M2_4_TRUST_ENGINE_SIGNED_METADATA.md](M2_4_TRUST_ENGINE_SIGNED_METADATA.md).

## Classificação
1. **Engine logic** — migrar. 2. **Test/vector** — regenerar/renomear. 3. **Public copy** — remover.
4. **Internal negative test/guard** — pode ficar se claramente negativo. 5. **Historical phase report** —
não tocar salvo se ligado a produto. 6. **Legacy route/state var** — só se estritamente necessário e
claramente não activo (`/certificates` + `production_certificates=false`).

## Inventário

| Ficheiro | Resíduo | Tipo | Decisão | Novo conceito | Risco se deixado | Status |
|---|---|---|---|---|---|---|
| `engines/banza-trust/src/lib.rs` | `verify_certificate`, `check_chain` (triple verification), doc "certificates/BRLs" | 1 | substituir | `verify_signed_protocol_metadata` + `evaluate::evaluate_trust`; manter primitivas (`canonical_bytes`, `verify_ed25519`, `verify_signed_doc`) + `verify_key_manifest`/`verify_brl` (modelo-neutro) | motor valida certificados como modelo activo | ✅ migrado |
| `engines/banza-trust/src/evaluate.rs` | (novo) | 1 | criar | avaliação completa: trust_status + sub-status + flags + hash | — | ✅ criado |
| `engines/banza-trust/src/sign.rs` | `sign_test_certificate`, `ceremony_simulate` assina certificados | 1/2 | substituir | builders test-only de trust root metadata / delegated key / signed protocol metadata / manifest / evidence / registry / revocation | fixtures baseadas em certificado | ✅ migrado |
| `engines/banza-trust/src/tool.rs` | `verify_certificate_tool`, `check_chain_tool`, status certificate | 1 | substituir | `trust_evaluate_tool` + `demo_fixtures` (12 cenários) + `schema` | UI mostra certificate | ✅ migrado |
| `engines/banza-trust/src/wasm.rs` | `verify_certificate_json`, `check_chain_json` | 1 | substituir | `trust_evaluate_signed_metadata_json` + `trust_demo_fixtures_json` + `trust_schema_json` + `trust_tool_version_json` | export público com `certificate` | ✅ migrado |
| `engines/banza-trust/src/bin/cli.rs` | `verify-certificate`, `check-chain`, `sign-test-certificate` | 1 | substituir | `evaluate`, `sign-test-metadata` | — | ✅ migrado |
| `engines/banza-trust/golden/vectors.json` | vectors certificate/BRL/CA-signature | 2 | regenerar | 12 vectors signed-metadata (Part 4) | golden certificate-based | ✅ regenerado |
| `engines/banza-trust/tests/trust.rs` | `check_chain_triple_verification`, cert golden parity | 2 | reescrever | 12 status tests do modelo activo | testes falam em certificado | ✅ reescrito |
| `engines/banza-trust/tests/tool.rs` | cert tool tests | 2 | reescrever | evaluate tool tests | — | ✅ reescrito |
| `engines/banza-conformance/src/live.rs` | `verify_certificate`/`check_chain`/`FED-CERT`/`FED-TRUST-PEER`; sign cert | 1 | migrar | `evaluate_trust` sobre signed metadata + evidence + registry + revocation; sub-suite `FED-TRUST` | conformance valida certificado | ✅ migrado |
| `engines/banza-conformance/src/lib.rs` | strings `certificate`/`FED-CERT` | 1/3 | renomear | signed-metadata/FED-TRUST | — | ✅ migrado |
| `engines/banza-evidence-bundle/src/lib.rs` | `verify_certificate_tool` no demo; `trust_brl_verification` | 1 | migrar | `trust_engine_report` (evaluate) | bundle report certificate-based | ✅ migrado |
| `website/lib/banzaTrust.ts` + `.test.ts` | adapter `verify_certificate_json`/`check_chain_json` | 1/2 | migrar | `trustEvaluate` + `trustStatusTone` (render-only) | TS decide/mostra certificate | ✅ migrado |
| `website/components/banzai/BanzaiChat.tsx` (TrustPanel) | fixtures/labels certificate | 1/3 | migrar | secção `M2.4 · Trust Engine` | UI mostra certificate | ✅ migrado |
| `website/lib/wasm/banza_trust*` | WASM exports antigos | 2 | rebuild | novos exports (siblings byte-idênticos) | — | ✅ rebuild |
| `engines/banzai-evidence/src/*` | intents trust | 1/3 | migrar/adicionar | intents do trust engine activo (Part 10) | Assistente narra certificado | ✅ migrado |
| `tools/check-open-governance.sh` + `check-regulatory-claims.sh` + `banza-repo-guards` | detecção | 4 | alargar detecção + self-tests | denylist `operator_certificate`/`ca_signature`/`FED-CERT`/`certificate_url` activos | resíduo passa | ✅ guard alargado |
| `engines/rust-rule-guard/src/lib.rs` L67/96-98 | strings `verify_certificate`/`verify_brl`/`check_chain` na denylist de MARCADORES | 4 | ajustar | remover marcadores obsoletos do denylist do guard (já não existem no engine) | guard aponta para fn inexistente | ✅ ajustado |
| `docs/reference/diagrams/protocol/trust-engine-active-model.svg` | (novo) | 3 | criar | diagrama do modelo activo | — | ✅ criado |
| `engines/banza-trust/golden` Python-parity note | 3 | reescrever | golden = fixtures determinísticas Rust test-only | narrativa legacy | ✅ reescrito |

**Fora de âmbito (permanece):** `banza-root-ceremony` (motor M2.1 próprio, 2-de-3, não usa banza-trust);
rota legacy `/certificates` (+ `production_certificates=false`); relatórios de fase históricos; denylists e
negative tests dos guards. `/operators=[]` e `production_certificates=false` inalterados.

**Critério de aceitação:** zero certificate/CA semantics activos no motor de trust, golden vectors,
conformance suite, WASM, Workbench, Evidence Bundle e Assistente; toda a decisão de trust em Rust;
fail-closed em cada ramo; `llm_calls=0`, `external_model_called=false`; nenhuma private key real.
