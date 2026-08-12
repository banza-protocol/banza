# Fase M2.4 — Migração do Trust Engine para signed protocol metadata (2026-07)

Relatório da fase que migra o **trust engine** do protocolo (`engines/banza-trust`) para o modelo activo:
o trust é avaliado por signed protocol metadata, delegated signing keys, operator manifest, conformance
evidence, public protocol registry e revocation/fail-closed, com o `trust_status` calculado em Rust.

- **Normativo:** [`M2_4_TRUST_ENGINE_SIGNED_METADATA.md`](M2_4_TRUST_ENGINE_SIGNED_METADATA.md)
- **Diagrama:** SVG-P-066 `docs/reference/diagrams/protocol/trust-engine-active-model.svg`

---

## 1. Decisão

> **BANZA é um protocolo financeiro aberto. Operadores independentes implementam o protocolo, publicam
> manifests e demonstram compatibilidade por evidência verificável de conformidade. O trust do protocolo é
> avaliado por signed protocol metadata, delegated signing keys, public protocol registry e
> revocation/fail-closed.**

O `banza-trust` calcula um `trust_status` **em Rust**. Não existe certificado de operador, assinatura de
autoridade certificadora, aprovação humana nem «verificação tripla». Nada autoriza, certifica, aceita ou
aprova um operador. É a maquinaria que exprime, em código, o modelo de trust aberto fixado nas ADR-038,
ADR-039 e ADR-040.

## 2. Âmbito

- **Engine `engines/banza-trust`** — `evaluate_trust` calcula o estado em Rust: ed25519 sobre a forma
  canónica ADR-026, âncora à Trust Root, ligações por hash a manifest/evidence/registry, revogação, tudo
  fail-closed. Sete tipos de entrada, treze estados, doze campos de verificação (ver normativo §2–§4).
- **WASM** — `website/lib/wasm/banza_trust*` construído com `wasm-pack --target web`.
- **Adapter** — `website/lib/banzaTrust.ts` (RUST_WRAPPER_ONLY): carrega o WASM, faz marshalling e
  renderiza; nunca verifica assinatura, estado, revogação, fail-closed ou fronteira.
- **Golden vectors** — `engines/banza-trust/golden/vectors.json`.
- **Evidence Bundle** — campo `trust_engine_report`.
- **Assistente** — intents do modelo activo de trust/federação.
- **Schemas de produção** — `contracts/production/`.
- **Diagrama + registo** — SVG-P-066 e a sua linha em `BANZA_SVG_REGISTRY.md`.
- **Docs** — este relatório e o normativo.

## 3. Fora de âmbito (por desenho)

- **Sem narrativa de transição.** Todas as superfícies apresentam apenas o modelo activo; nenhuma descreve
  um modelo prévio ou uma mudança de modelo.
- **Nenhum nome público** contém «certificate».
- Não se toca em `engines/banza-trust` nem em `website/lib/wasm` neste passo de ripple documental (o engine
  e o WASM já estavam concluídos); o TypeScript continua a ser apenas wrapper.
- `/operators` e `production_certificates` **não** mudam.

## 4. Migração do engine

`engines/banza-trust` (crate `banza_trust`, `VERIFIER_VERSION = 0.2.0`):

- `src/evaluate.rs` — `evaluate_trust(input) -> Value`. Calcula por campo (fronteira, root, metadata,
  chave delegada, assinatura, frescura, versão, manifest, evidence, registry, revogação) e aplica a
  **precedência fail-closed** (normativo §4). `report(...)` sela `report_hash` = SHA-256 da forma canónica.
- `src/lib.rs` — canonicalização ADR-026, `verify_ed25519`, verificação de docs assinados; sem geração de
  chave de produção, sem assinatura de artefacto de produção, sem chave real.
- `src/tool.rs` — camada Workbench: `trust_evaluate_tool`, `demo_fixtures`, `schema`, `tool_version`.
- `src/wasm.rs` — exports WASM (`trust_evaluate_signed_metadata_json`, `trust_demo_fixtures_json`,
  `trust_schema_json`, `trust_tool_version_json`).

Fronteira ao nível do engine: `boundary_violated` rejeita qualquer input que afirme certificado,
certificação, licença, PSP ou aprovação humana (flags booleanas OU frase afirmativa, com guarda de
negação) — precedência acima dos ramos de conteúdo → `TRUST_INVALID_BOUNDARY`.

## 5. Golden vectors

`engines/banza-trust/golden/vectors.json` — **12 casos** TEST-ONLY, material assinado pelo signer de teste
em Rust com derivação fixa; **só material de chave pública** (o teste falha se surgir `private_key`,
`secret_key`, `mnemonic` ou `passphrase`). Cada caso mapeia a um estado esperado:

| key | expected |
|---|---|
| `valid_signed_protocol_metadata` | `TRUST_VALID` |
| `invalid_metadata_signature` | `TRUST_INVALID_SIGNATURE` |
| `wrong_delegated_key_usage` | `TRUST_INVALID_DELEGATED_KEY` |
| `revoked_delegated_key` | `TRUST_INVALID_DELEGATED_KEY` |
| `missing_conformance_evidence` | `TRUST_MISSING_CONFORMANCE_EVIDENCE` |
| `missing_operator_manifest` | `TRUST_MISSING_OPERATOR_MANIFEST` |
| `missing_registry_entry` | `TRUST_MISSING_REGISTRY_ENTRY` |
| `operator_revoked` | `TRUST_REVOKED` |
| `expired_metadata` | `TRUST_EXPIRED_METADATA` |
| `incompatible_protocol_version` | `TRUST_INCOMPATIBLE_PROTOCOL_VERSION` |
| `boundary_fail` | `TRUST_INVALID_BOUNDARY` |
| `malformed_input` | `TRUST_FAIL_CLOSED` |

As mesmas 12 são as fixtures do Workbench (`loadTrustFixtures()`).

## 6. Conformance

O `protocol_version` da signed protocol metadata tem de ser compatível (mesma major) com
`evaluator_protocol_version` — caso contrário `TRUST_INCOMPATIBLE_PROTOCOL_VERSION`. A conformance evidence
é ligada por `evidence_hash` à metadata assinada; ausência ou hash divergente →
`TRUST_MISSING_CONFORMANCE_EVIDENCE`. Schemas de produção em `contracts/production/`
(`federation-trust-evaluation.production.schema.json`, `trust-root-metadata.production.schema.json`).

## 7. Evidence Bundle

`engines/banza-evidence-bundle` aceita o relatório do trust engine no campo **`trust_engine_report`**
(aceita `trust` ou `trust_engine_report` como entrada). O bundle regista a versão da ferramenta
(`banza-trust`) e `trust_report_hash`; a ausência do relatório é listada em `missing_recommended`. Espelho
TypeScript: `website/lib/banzaEvidenceBundle.ts`.

## 8. Workbench

Consome o adapter `website/lib/banzaTrust.ts` (`evaluateTrust`, `loadTrustFixtures`, `trustSchema`,
`trustToolVersion`, `trustStatusTone`). O estado, os checks e o hash vêm do Rust; o TypeScript só marshala
e renderiza. As 12 fixtures são carregadas do engine.

## 9. Assistente

O Assistente (`engines/banzai-evidence`) responde sobre o modelo activo: compatibilidade demonstrada por
conformance evidence, operator manifest, signed protocol metadata e public protocol registry; a federação
avalia localmente manifest, versão, metadata assinada, evidência, assinatura, revogação, capabilities,
endpoint e frescura — fail-closed. Nenhuma resposta afirma licença, aprovação humana, certificado ou
autorização de operador.

## 10. Guards

- `make trust-rs-check` — golden ed25519 parity + fmt/clippy/test do crate.
- `make crypto-check` — integridade criptográfica (golden ed25519, INV-FEDEVAL-005).
- `make trust-rs-signing-check` / `trust-rs-ceremony-sim-check` — round-trips e simulação TEST-ONLY.
- `tools/check-open-governance.sh` — bloqueia narrativa de transição e vocabulário de certificado nas
  superfícies de produto; a regra `legacy` não pode narrar um trust model que a BANZA não tem.

## 11. Testes

- **Rust** (`engines/banza-trust/tests/trust.rs`): cada um dos 12 cenários atinge o estado esperado; caso
  válido → `TRUST_VALID`; assinatura adulterada → `TRUST_INVALID_SIGNATURE`; usage errado e chave revogada
  → `TRUST_INVALID_DELEGATED_KEY`; evidence/manifest/registry em falta → estados `MISSING`; operador
  revogado → `TRUST_REVOKED`; expirada → `TRUST_EXPIRED_METADATA`; versão incompatível →
  `TRUST_INCOMPATIBLE_PROTOCOL_VERSION`; fronteira rejeitada primeiro → `TRUST_INVALID_BOUNDARY`; input
  malformado → `TRUST_FAIL_CLOSED`; material de revogação ausente → `TRUST_REVOKED` (fail-closed);
  determinismo do `report_hash` (64 hex); flags do modelo activo; golden = 12 casos, sem vocabulário de
  certificado no relatório válido.
- **SVG** SVG-P-066 — XML bem-formado (verificado); segue a house style (viewBox, gradiente bordô
  #6E0F1A→#8E1326 sobre #F4F1EA, `role="img"` + `<title>`/`<desc>`, id SVG-P-066 no cabeçalho); não mostra
  certificado, CA, aprovação, badge de certificado nem operador certificado.
- **Website** — vitest / tsc / `next build`: _placeholder — a correr no ripple do Workbench._

## 12. Pendências (placeholders)

Marcadas por preencher quando as verificações correrem:

- [ ] **Browser E2E** — Workbench: correr as 12 fixtures e confirmar que estado/checks/hash vêm do WASM e
  batem com o Rust; confirmar que nenhuma decisão é tomada em TypeScript.
- [ ] **Deploy** — website-only; sem `.env`/DNS/Cloudflare/TLS/Postgres/secrets; imagens com tag fixa.
- [ ] **Validação pública** — confirmar em `banza.network` que nenhuma superfície publica «certificate»
  nem narrativa de transição, e que a banda de fronteira aparece no diagrama.
- [ ] **Confirmações negativas** — não criou/aceitou/aprovou/certificou operador; não emitiu
  certificado/licença; não activou federação nem integração externa; não processou/liquidou/deteve/moveu
  fundos; `/operators = []`; `production_certificates = false`; sem chave privada real; `llm_calls = 0`,
  `external_model_called = false`; provider mock.

## 13. Fronteira (permanente)

A validação do trust não é autorização, certificação, licença nem serviço financeiro. BANZA permanece um
protocolo financeiro aberto: não autoriza, certifica, aceita ou aprova operadores, não emite licença, não
presta serviços financeiros e não movimenta fundos. Qualquer autorização vem do regulador competente —
nunca da BANZA.

## Adversarial review (Part 14) — findings fixed with regressions

A focused adversarial review of the crypto engine found three confirmed findings, all fixed and pinned by
regression tests in `engines/banza-trust/tests/trust.rs`:

- **F1 — no cryptographic root anchor (highest).** The delegated-key→root binding was a plaintext boolean;
  `active_root_public_keys` / `threshold_policy` were inert, so an attacker-chosen root reached `TRUST_VALID`.
  **Fix:** `root_threshold_signatures_ok` now verifies a threshold of Ed25519 root signatures over the
  trust-root metadata, anchored to the evaluator's out-of-band `trusted_root_public_keys`. Regression:
  `f1_root_without_a_valid_threshold_signature_is_rejected` (missing/garbage sigs and non-pinned keys →
  `TRUST_INVALID_ROOT_METADATA`).
- **F2 — boundary negation bypass.** A stray `no`/`não` anywhere in a string suppressed the whole affirmative
  scan. **Fix:** clause-scoped `negated_before` (negation must precede the phrase in its clause). Regression:
  `f2_a_stray_negation_does_not_clear_an_affirmative_boundary_claim`.
- **F3 — non-boolean truthy claim flag.** `{"is_operator_certificate": 1}` evaded the flag scan. **Fix:**
  `flag_asserted` treats any meaningful value as an assertion. Regression:
  `f3_a_non_boolean_truthy_claim_flag_is_rejected`.

## Verification

Green: `crypto-check`, `trust-rs-check`, `trust-rs-signing-check`, `trust-rs-ceremony-sim-check`,
`conformance-rs-check`, `rust-final-closure-check`, `rust-engine-check`, `simb-rs-check`, and the guards
(`rust-rule-check`, `open-governance-check`, `regulatory-check`, `identity-check`, `purity-check`,
`invariant-check`, `private-key-leak-check`, `reference-svg-check`). banza-trust: 26 tests + golden parity.
Website: `tsc` clean, 151 vitest, production build. Browser E2E (local dev server): the M2.4 · Trust Engine
panel loads the Rust/WASM engine, the valid fixture → `TRUST_VALID` (all checks VALID), the invalid-signature
fixture → `TRUST_INVALID_SIGNATURE`, zero console errors.

## Negative confirmations

`/operators` = `[]` and `production_certificates` = `false` unchanged. No operator created, accepted,
approved, certified or licensed. No certificate issued. No funds held/moved/settled. No real private key,
seed, mnemonic or passphrase generated or committed. `llm_calls = 0`, `external_model_called = false`.
Provider mock. No DNS/TLS/Cloudflare/Postgres/secrets touched.
