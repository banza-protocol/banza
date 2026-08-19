// What the tasked terminal tells a reader, as facts with names — and one realization per locale.
//
// The tasked terminal answers "give me an example", "how do I do X", "show me the structure". Its
// content lived in Rust as typed section structs whose ELEMENTS were Portuguese sentences, and the
// assembled Markdown was served directly. So an explicit `locale: "en"` request got Portuguese, and
// there was no way to stamp provenance without lying about it.
//
// The fix is not a translated copy of that Markdown. Two independently-maintained procedure trees drift,
// and the way they drift is invisible: the English one loses a validation step and still reads fluently.
// So each reader-visible fact gets a NAME, Rust decides which names appear and in what order, and this
// file decides only how each name is worded in each locale. PT and EN therefore cannot disagree about
// WHICH facts a procedure contains — only about how they are phrased.
//
// TWO IDENTIFIERS, ON PURPOSE.
//   `source_locator` — `subject.task.section[.index]`, mechanical, derived from where the item sits in
//     the Rust tables. Good for traceability and parity; NOT an identity, because inserting a step
//     renumbers everything after it and silently changes what `…steps.3` means.
//   `item_id`        — what the fact IS (`federation.publish_required_artifacts`). Stable across
//     reordering, which is the whole point.
//
// TRANSLATION RULE. The Portuguese is the semantic baseline and the English must preserve it exactly:
// mandatory vs optional, conditions, negations, actor and artifact identities, ordering, state
// semantics, the `simulated` / `production_allowed` distinction, and the trust-model qualifications
// (no certificate authority, no certificates, ADR-025). Translating is not an opportunity to tidy the
// protocol up. Where BANZA already has official English wording — Reference, whitepaper, ADR titles,
// schema field names — that wording is used rather than a fresh invention.

/**
 * Every reader-visible tasked fact: its semantic identity, where it comes from, and its realizations.
 *
 * Keyed by `item_id`. `locator` is the Rust source position it currently occupies, kept so parity with
 * the Rust tables is checkable rather than asserted.
 */
export const TASKED_ITEMS = {
  // ── operador / example ──────────────────────────────────────────────────────────────────────────
  "operator.is_organization_implementing_protocol": {
    locator: "operador.example.framing",
    "pt-PT": "Um operador é uma organização (por exemplo, uma empresa de pagamentos independente) que implementa o protocolo aberto BANZA.",
    en: "An operator is an organisation (for example, an independent payments company) that implements the BANZA open protocol.",
  },
  "operator.decides_to_implement_protocol": {
    locator: "operador.example.precondition",
    "pt-PT": "a organização decide implementar o protocolo aberto",
    en: "the organisation decides to implement the open protocol",
  },
  "operator.becomes_verifiable_participant_protocol_neutral": {
    locator: "operador.example.result",
    "pt-PT": "torna-se um participante verificável; o BANZA define as regras, não opera nem certifica a organização (operator-neutral)",
    en: "it becomes a verifiable participant; BANZA defines the rules — it neither operates nor certifies the organisation (operator-neutral)",
  },
  "operator.actor_candidate_operator": {
    locator: "operador.example.actors.0",
    "pt-PT": "um operador candidato (uma organização de pagamentos)",
    en: "a candidate operator (a payments organisation)",
  },
  "operator.implements_protocol_surfaces": {
    locator: "operador.example.sequence.0",
    "pt-PT": "implementa as superfícies do protocolo (carteiras/contas, QR, liquidação)",
    en: "implements the protocol surfaces (wallets/accounts, QR, settlement)",
  },
  "operator.publishes_identity_and_manifest": {
    locator: "operador.example.sequence.1",
    "pt-PT": "publica a sua identidade e o seu **manifest** de operador (mais o key manifest)",
    en: "publishes its identity and its operator **manifest** (plus the key manifest)",
  },
  "operator.presents_verifiable_conformance_evidence": {
    locator: "operador.example.sequence.2",
    "pt-PT": "apresenta **evidência de conformidade** verificável",
    en: "presents verifiable **conformance evidence**",
  },
  "operator.participates_in_federation_under_current_trust_rules": {
    locator: "operador.example.sequence.3",
    "pt-PT": "participa na **federação** segundo as regras de confiança vigentes",
    en: "participates in the **federation** under the trust rules in force",
  },

  // ── federacao / example ─────────────────────────────────────────────────────────────────────────
  "federation.links_operators_by_trust_without_ca": {
    locator: "federacao.example.framing",
    "pt-PT": "A federação liga operadores por avaliação de confiança, sem autoridade certificadora (ADR-025) e sem certificados (ADR-025).",
    en: "Federation links operators through trust evaluation, with no certificate authority (ADR-025) and no certificates (ADR-025).",
  },
  "federation.both_operators_published_artifacts": {
    locator: "federacao.example.precondition",
    "pt-PT": "ambos os operadores publicam os seus artefactos verificáveis",
    en: "both operators publish their verifiable artifacts",
  },
  "federation.valid_only_when_requirements_met_revocation_changes_state": {
    locator: "federacao.example.result",
    "pt-PT": "a relação de federação só é válida quando os requisitos documentados são satisfeitos; uma revogação posterior altera o estado verificável",
    en: "the federation relationship is valid only when the documented requirements are met; a later revocation changes the verifiable state",
  },
  "federation.actor_operator_a": {
    locator: "federacao.example.actors.0",
    "pt-PT": "o operador A",
    en: "operator A",
  },
  "federation.actor_operator_b": {
    locator: "federacao.example.actors.1",
    "pt-PT": "o operador B",
    en: "operator B",
  },
  "federation.operator_a_publishes_required_artifacts": {
    locator: "federacao.example.sequence.0",
    "pt-PT": "o **operador A** publica os artefactos exigidos (manifest, identidade, evidência de conformidade)",
    en: "**operator A** publishes the required artifacts (manifest, identity, conformance evidence)",
  },
  "federation.operator_b_fetches_and_verifies": {
    locator: "federacao.example.sequence.1",
    "pt-PT": "o **operador B** obtém-nos por uma fonte autorizada e verifica integridade, estado e relações",
    en: "**operator B** fetches them from an authorised source and verifies integrity, state and relationships",
  },
  "federation.trust_evaluation_applies_current_rules_no_ca": {
    locator: "federacao.example.sequence.2",
    "pt-PT": "a **avaliação de confiança** aplica as regras vigentes (ADR-025), sem CA (ADR-025)",
    en: "**trust evaluation** applies the rules in force (ADR-025), with no CA (ADR-025)",
  },

  // ── federacao / procedure ───────────────────────────────────────────────────────────────────────
  "federation.result_verifiable_relationship": {
    locator: "federacao.procedure.result",
    "pt-PT": "uma relação de federação verificável entre operadores",
    en: "a verifiable federation relationship between operators",
  },
  "federation.gap_requirements_documented_no_full_runbook": {
    locator: "federacao.procedure.gap_note",
    "pt-PT": "as fontes públicas descrevem os requisitos e o modelo de confiança, mas **não publicam** um procedimento operacional completo, passo a passo",
    en: "the public sources describe the requirements and the trust model, but **do not publish** a complete step-by-step operational procedure",
  },
  "federation.prerequisite_publish_operator_manifest": {
    locator: "federacao.procedure.prerequisites.0",
    "pt-PT": "publicar o **manifest** de operador (identidade, capacidades, endpoints)",
    en: "publish the operator **manifest** (identity, capabilities, endpoints)",
  },
  "federation.prerequisite_key_manifest_and_verifiable_identity": {
    locator: "federacao.procedure.prerequisites.1",
    "pt-PT": "disponibilizar o key manifest e a identidade verificável",
    en: "make the key manifest and the verifiable identity available",
  },
  "federation.prerequisite_present_conformance_evidence": {
    locator: "federacao.procedure.prerequisites.2",
    "pt-PT": "apresentar **evidência de conformidade**",
    en: "present **conformance evidence**",
  },
  "federation.step_prepare_and_publish_manifest": {
    locator: "federacao.procedure.steps.0",
    "pt-PT": "preparar e publicar o manifest do operador",
    en: "prepare and publish the operator manifest",
  },
  "federation.step_make_artifacts_fetchable_from_authorised_source": {
    locator: "federacao.procedure.steps.1",
    "pt-PT": "tornar a identidade e os artefactos obtíveis por uma fonte autorizada",
    en: "make the identity and the artifacts fetchable from an authorised source",
  },
  "federation.step_counterparty_verifies_integrity_and_state": {
    locator: "federacao.procedure.steps.2",
    "pt-PT": "a contraparte verifica integridade e estado",
    en: "the counterparty verifies integrity and state",
  },
  "federation.step_trust_evaluation_applies_current_rules": {
    locator: "federacao.procedure.steps.3",
    "pt-PT": "a avaliação de confiança aplica as regras vigentes",
    en: "trust evaluation applies the rules in force",
  },
  "federation.validation_artifact_integrity_and_state_verified": {
    locator: "federacao.procedure.validations.0",
    "pt-PT": "integridade e estado dos artefactos verificados",
    en: "artifact integrity and state verified",
  },
  "federation.validation_trust_evaluated_without_ca_or_certificates": {
    locator: "federacao.procedure.validations.1",
    "pt-PT": "avaliação de confiança sem CA e sem certificados (ADR-025, ADR-025)",
    en: "trust evaluated with no CA and no certificates (ADR-025, ADR-025)",
  },

  // ── manifest / procedure + template ─────────────────────────────────────────────────────────────
  "manifest.result_published_and_verifiable": {
    locator: "manifest.procedure.result",
    "pt-PT": "um manifest de operador publicado e verificável",
    en: "a published and verifiable operator manifest",
  },
  "manifest.gap_schema_published_no_full_runbook": {
    locator: "manifest.procedure.gap_note",
    "pt-PT": "as fontes publicam o schema e os requisitos; um runbook operacional completo de publicação não é publicado",
    en: "the sources publish the schema and the requirements; a complete operational publication runbook is not published",
  },
  "manifest.prerequisite_operator_identity_and_endpoints": {
    locator: "manifest.procedure.prerequisites.0",
    "pt-PT": "ter uma identidade de operador e endpoints",
    en: "have an operator identity and endpoints",
  },
  "manifest.prerequisite_prepare_key_manifest": {
    locator: "manifest.procedure.prerequisites.1",
    "pt-PT": "preparar o key manifest",
    en: "prepare the key manifest",
  },
  "manifest.step_fill_required_schema_fields": {
    locator: "manifest.procedure.steps.0",
    "pt-PT": "preencher os campos obrigatórios do schema `operator-manifest.production.schema.json`",
    en: "fill in the required fields of the `operator-manifest.production.schema.json` schema",
  },
  "manifest.step_publish_at_authorised_source": {
    locator: "manifest.procedure.steps.1",
    "pt-PT": "publicar o manifest numa fonte autorizada (`base_url`/well-known)",
    en: "publish the manifest at an authorised source (`base_url`/well-known)",
  },
  "manifest.step_reference_key_manifest_url": {
    locator: "manifest.procedure.steps.2",
    "pt-PT": "referenciar o `key_manifest_url`",
    en: "reference the `key_manifest_url`",
  },
  "manifest.validation_validates_against_canonical_schema": {
    locator: "manifest.procedure.validations.0",
    "pt-PT": "o manifest valida contra o schema canónico",
    en: "the manifest validates against the canonical schema",
  },
  "manifest.validation_simulated_and_production_allowed_are_operator_declarations": {
    locator: "manifest.procedure.validations.1",
    "pt-PT": "`simulated` = true e `production_allowed` é uma declaração do próprio operador no baseline actual",
    en: "`simulated` = true, and `production_allowed` is the operator's own declaration in the current baseline",
  },
  "manifest.template_from_operator_manifest_schema": {
    locator: "manifest.template.schema_note",
    "pt-PT": "baseada no schema canónico `operator-manifest.production.schema.json`. Os valores são ilustrativos; os **campos** são os reais do schema.",
    en: "based on the canonical `operator-manifest.production.schema.json` schema. The values are illustrative; the **fields** are the schema's real ones.",
  },

  // ── revogacao / example + procedure ─────────────────────────────────────────────────────────────
  "revocation.withdraws_validity_and_changes_verifiable_state": {
    locator: "revogacao.example.framing",
    "pt-PT": "A revogação retira a validade a uma chave ou artefacto previamente confiável, alterando o estado verificável.",
    en: "Revocation withdraws the validity of a previously trusted key or artifact, changing the verifiable state.",
  },
  "revocation.precondition_key_must_stop_being_trusted": {
    locator: "revogacao.example.precondition",
    "pt-PT": "uma chave/artefacto precisa de deixar de ser confiável (comprometimento ou rotação)",
    en: "a key/artifact must stop being trusted (compromise or rotation)",
  },
  "revocation.result_signed_artifacts_no_longer_trusted": {
    locator: "revogacao.example.result",
    "pt-PT": "o estado verificável muda; artefactos assinados pela chave revogada deixam de ser confiáveis",
    en: "the verifiable state changes; artifacts signed by the revoked key are no longer trusted",
  },
  "revocation.actor_signing_key_holder": {
    locator: "revogacao.example.actors.0",
    "pt-PT": "o detentor de uma chave de assinatura",
    en: "the holder of a signing key",
  },
  "revocation.entry_published_against_schema": {
    locator: "revogacao.example.sequence.0",
    "pt-PT": "é publicada uma entrada de revogação (schema `revocation-entry.production.schema.json`)",
    en: "a revocation entry is published (`revocation-entry.production.schema.json` schema)",
  },
  "revocation.list_includes_affected_identifier": {
    locator: "revogacao.example.sequence.1",
    "pt-PT": "a lista de revogação passa a incluir o identificador afectado",
    en: "the revocation list now includes the affected identifier",
  },
  "revocation.counterparties_stop_accepting_revoked_artifact": {
    locator: "revogacao.example.sequence.2",
    "pt-PT": "a avaliação de confiança das contrapartes deixa de aceitar o artefacto revogado (ADR-025)",
    en: "counterparties' trust evaluation stops accepting the revoked artifact (ADR-025)",
  },
  "revocation.result_artifact_loses_verifiable_standing": {
    locator: "revogacao.procedure.result",
    "pt-PT": "o artefacto revogado deixa de ter estatuto verificável",
    en: "the revoked artifact no longer has verifiable standing",
  },
  "revocation.gap_schema_and_effect_documented_no_full_runbook": {
    locator: "revogacao.procedure.gap_note",
    "pt-PT": "o schema e o efeito estão documentados; um runbook operacional completo passo-a-passo não é publicado",
    en: "the schema and the effect are documented; a complete step-by-step operational runbook is not published",
  },
  "revocation.prerequisite_identify_key_or_artifact": {
    locator: "revogacao.procedure.prerequisites.0",
    "pt-PT": "identificar a chave/artefacto a revogar",
    en: "identify the key/artifact to revoke",
  },
  "revocation.prerequisite_access_to_revocation_list_publication": {
    locator: "revogacao.procedure.prerequisites.1",
    "pt-PT": "acesso à publicação da lista de revogação",
    en: "access to publishing the revocation list",
  },
  "revocation.step_create_entry_per_schema": {
    locator: "revogacao.procedure.steps.0",
    "pt-PT": "criar a entrada de revogação segundo o schema",
    en: "create the revocation entry according to the schema",
  },
  "revocation.step_publish_entry_in_list": {
    locator: "revogacao.procedure.steps.1",
    "pt-PT": "publicar a entrada na lista de revogação",
    en: "publish the entry in the revocation list",
  },
  "revocation.step_counterparty_reevaluates_and_rejects": {
    locator: "revogacao.procedure.steps.2",
    "pt-PT": "a contraparte reavalia a confiança e rejeita o artefacto revogado",
    en: "the counterparty re-evaluates trust and rejects the revoked artifact",
  },
  "revocation.validation_entry_validates_against_schema": {
    locator: "revogacao.procedure.validations.0",
    "pt-PT": "a entrada valida contra `revocation-entry.production.schema.json`",
    en: "the entry validates against `revocation-entry.production.schema.json`",
  },
  "revocation.validation_trust_reevaluation_reflects_revocation": {
    locator: "revogacao.procedure.validations.1",
    "pt-PT": "a reavaliação de confiança reflecte a revogação",
    en: "the trust re-evaluation reflects the revocation",
  },

  // ── trust / example + template ──────────────────────────────────────────────────────────────────
  "trust.evaluated_openly_without_ca_or_certificates": {
    locator: "trust.example.framing",
    "pt-PT": "A confiança no BANZA é avaliada abertamente, sem uma autoridade certificadora (ADR-025) e sem certificados (ADR-025).",
    en: "Trust in BANZA is evaluated openly, with no certificate authority (ADR-025) and no certificates (ADR-025).",
  },
  "trust.precondition_evaluated_operator_published_artifacts": {
    locator: "trust.example.precondition",
    "pt-PT": "o operador avaliado publicou os seus artefactos verificáveis",
    en: "the evaluated operator has published its verifiable artifacts",
  },
  "trust.result_verifiable_revocable_decision": {
    locator: "trust.example.result",
    "pt-PT": "uma decisão de confiança verificável, revogável se o estado mudar",
    en: "a verifiable trust decision, revocable if the state changes",
  },
  "trust.actor_evaluating_operator": {
    locator: "trust.example.actors.0",
    "pt-PT": "um operador avaliador",
    en: "an evaluating operator",
  },
  "trust.actor_evaluated_operator": {
    locator: "trust.example.actors.1",
    "pt-PT": "um operador avaliado",
    en: "an evaluated operator",
  },
  "trust.evaluator_fetches_manifest_identity_evidence": {
    locator: "trust.example.sequence.0",
    "pt-PT": "o avaliador obtém o manifest, a identidade e a evidência do avaliado",
    en: "the evaluator fetches the evaluated operator's manifest, identity and evidence",
  },
  "trust.verifies_integrity_state_relationships": {
    locator: "trust.example.sequence.1",
    "pt-PT": "verifica integridade, estado e relações",
    en: "verifies integrity, state and relationships",
  },
  "trust.applies_evaluation_rules_no_ca_no_certificates": {
    locator: "trust.example.sequence.2",
    "pt-PT": "aplica as regras de avaliação de confiança (ADR-025/ADR-025) — sem CA, sem certificados",
    en: "applies the trust-evaluation rules (ADR-025/ADR-025) — no CA, no certificates",
  },
  "trust.template_from_federation_trust_evaluation_schema": {
    locator: "trust.template.schema_note",
    "pt-PT": "baseada no schema canónico `federation-trust-evaluation.production.schema.json`. Valores ilustrativos; campos reais do schema.",
    en: "based on the canonical `federation-trust-evaluation.production.schema.json` schema. Illustrative values; the schema's real fields.",
  },

  // ── evidencia / example + template ──────────────────────────────────────────────────────────────
  "evidence.is_machine_verifiable_conformance_package": {
    locator: "evidencia.example.framing",
    "pt-PT": "A evidência é um pacote verificável por máquina que demonstra a conformidade de um operador (ADR-031).",
    en: "Evidence is a machine-verifiable package that demonstrates an operator's conformance (ADR-031).",
  },
  "evidence.precondition_operator_ran_verification": {
    locator: "evidencia.example.precondition",
    "pt-PT": "o operador correu a verificação e recolheu os resultados",
    en: "the operator ran the verification and collected the results",
  },
  "evidence.result_any_party_verifies_without_blind_trust": {
    locator: "evidencia.example.result",
    "pt-PT": "qualquer parte pode verificar a conformidade por máquina, sem confiar cegamente no operador",
    en: "any party can verify conformance by machine, without blindly trusting the operator",
  },
  "evidence.actor_operator_demonstrating_conformance": {
    locator: "evidencia.example.actors.0",
    "pt-PT": "um operador que demonstra conformidade",
    en: "an operator demonstrating conformance",
  },
  "evidence.generates_evidence_bundle_per_schema": {
    locator: "evidencia.example.sequence.0",
    "pt-PT": "o operador gera um evidence bundle (schema `evidence-bundle.production.schema.json`)",
    en: "the operator generates an evidence bundle (`evidence-bundle.production.schema.json` schema)",
  },
  "evidence.includes_conformance_evidence": {
    locator: "evidencia.example.sequence.1",
    "pt-PT": "inclui a evidência de conformidade (`conformance-evidence`)",
    en: "includes the conformance evidence (`conformance-evidence`)",
  },
  "evidence.publishes_for_independent_verification": {
    locator: "evidencia.example.sequence.2",
    "pt-PT": "publica-o para verificação independente (ADR-031)",
    en: "publishes it for independent verification (ADR-031)",
  },
  "evidence.template_from_evidence_bundle_schema": {
    locator: "evidencia.template.schema_note",
    "pt-PT": "baseada no schema canónico `evidence-bundle.production.schema.json`. Valores ilustrativos; campos reais do schema.",
    en: "based on the canonical `evidence-bundle.production.schema.json` schema. Illustrative values; the schema's real fields.",
  },

  // ── conformidade / example + procedure + template ───────────────────────────────────────────────
  "conformance.demonstrated_by_self_published_verifiable_evidence": {
    locator: "conformidade.example.framing",
    "pt-PT": "A conformidade é demonstrada por evidência verificável alinhada com níveis/capacidades (ADR-030), publicada pelo próprio operador (ADR-031).",
    en: "Conformance is demonstrated by verifiable evidence aligned with levels/capabilities (ADR-030), published by the operator itself (ADR-031).",
  },
  "conformance.precondition_operator_implemented_level_capabilities": {
    locator: "conformidade.example.precondition",
    "pt-PT": "o operador implementou as capacidades de um nível",
    en: "the operator has implemented a level's capabilities",
  },
  "conformance.result_verifiable_by_any_party_without_central_certification": {
    locator: "conformidade.example.result",
    "pt-PT": "a conformidade do operador é verificável por qualquer parte, sem certificação central",
    en: "the operator's conformance is verifiable by any party, with no central certification",
  },
  "conformance.actor_candidate_operator": {
    locator: "conformidade.example.actors.0",
    "pt-PT": "um operador candidato",
    en: "a candidate operator",
  },
  "conformance.runs_suite_for_target_level": {
    locator: "conformidade.example.sequence.0",
    "pt-PT": "corre a suite de conformidade para o nível pretendido (ADR-030)",
    en: "runs the conformance suite for the intended level (ADR-030)",
  },
  "conformance.generates_conformance_evidence": {
    locator: "conformidade.example.sequence.1",
    "pt-PT": "gera a evidência de conformidade (`conformance-evidence`)",
    en: "generates the conformance evidence (`conformance-evidence`)",
  },
  "conformance.publishes_machine_verifiably": {
    locator: "conformidade.example.sequence.2",
    "pt-PT": "publica-a de forma verificável por máquina (ADR-031)",
    en: "publishes it in a machine-verifiable form (ADR-031)",
  },
  "conformance.result_demonstrated_and_machine_verifiable": {
    locator: "conformidade.procedure.result",
    "pt-PT": "conformidade demonstrada e verificável por máquina",
    en: "conformance demonstrated and machine-verifiable",
  },
  "conformance.gap_levels_documented_no_full_runbook": {
    locator: "conformidade.procedure.gap_note",
    "pt-PT": "os níveis, a evidência e a auto-publicação estão documentados; um runbook operacional completo não é publicado",
    en: "the levels, the evidence and self-publication are documented; a complete operational runbook is not published",
  },
  "conformance.prerequisite_implement_target_level_capabilities": {
    locator: "conformidade.procedure.prerequisites.0",
    "pt-PT": "implementar as capacidades do nível pretendido",
    en: "implement the intended level's capabilities",
  },
  "conformance.prerequisite_access_to_suite": {
    locator: "conformidade.procedure.prerequisites.1",
    "pt-PT": "acesso à suite de conformidade",
    en: "access to the conformance suite",
  },
  "conformance.step_run_suite_for_level": {
    locator: "conformidade.procedure.steps.0",
    "pt-PT": "correr a suite de conformidade para o nível (ADR-030)",
    en: "run the conformance suite for the level (ADR-030)",
  },
  "conformance.step_collect_evidence": {
    locator: "conformidade.procedure.steps.1",
    "pt-PT": "recolher a evidência de conformidade",
    en: "collect the conformance evidence",
  },
  "conformance.step_publish_evidence_verifiably": {
    locator: "conformidade.procedure.steps.2",
    "pt-PT": "publicar a evidência de forma verificável (ADR-031)",
    en: "publish the evidence in a verifiable form (ADR-031)",
  },
  "conformance.validation_evidence_validates_against_schema": {
    locator: "conformidade.procedure.validations.0",
    "pt-PT": "a evidência valida contra `conformance-evidence.production.schema.json`",
    en: "the evidence validates against `conformance-evidence.production.schema.json`",
  },
  "conformance.validation_capabilities_match_declared_level": {
    locator: "conformidade.procedure.validations.1",
    "pt-PT": "as capacidades correspondem ao nível declarado",
    en: "the capabilities match the declared level",
  },
  "conformance.template_from_conformance_evidence_schema": {
    locator: "conformidade.template.schema_note",
    "pt-PT": "baseada no schema canónico `conformance-evidence.production.schema.json`. Valores ilustrativos; campos reais do schema.",
    en: "based on the canonical `conformance-evidence.production.schema.json` schema. Illustrative values; the schema's real fields.",
  },

  // ── participacao / procedure ────────────────────────────────────────────────────────────────────
  "participation.result_operator_participates_as_verifiable_participant": {
    locator: "participacao.procedure.result",
    "pt-PT": "o operador participa como participante verificável da federação",
    en: "the operator participates as a verifiable participant in the federation",
  },
  "participation.gap_requirements_documented_no_full_procedure": {
    locator: "participacao.procedure.gap_note",
    "pt-PT": "os requisitos de participação estão documentados; um procedimento operacional completo passo-a-passo não é publicado",
    en: "the participation requirements are documented; a complete step-by-step operational procedure is not published",
  },
  "participation.prerequisite_implement_protocol_and_capabilities": {
    locator: "participacao.procedure.prerequisites.0",
    "pt-PT": "implementar o protocolo e as capacidades pretendidas",
    en: "implement the protocol and the intended capabilities",
  },
  "participation.prerequisite_operator_identity_and_key_manifest": {
    locator: "participacao.procedure.prerequisites.1",
    "pt-PT": "ter identidade de operador e key manifest",
    en: "have an operator identity and a key manifest",
  },
  "participation.prerequisite_conformance_evidence": {
    locator: "participacao.procedure.prerequisites.2",
    "pt-PT": "ter evidência de conformidade",
    en: "have conformance evidence",
  },
  "participation.step_publish_manifest_and_identity": {
    locator: "participacao.procedure.steps.0",
    "pt-PT": "publicar o **manifest** de operador e a identidade",
    en: "publish the operator **manifest** and the identity",
  },
  "participation.step_publish_conformance_evidence": {
    locator: "participacao.procedure.steps.1",
    "pt-PT": "publicar a **evidência de conformidade** (ADR-031)",
    en: "publish the **conformance evidence** (ADR-031)",
  },
  "participation.step_make_artifacts_fetchable_from_authorised_sources": {
    locator: "participacao.procedure.steps.2",
    "pt-PT": "tornar os artefactos obtíveis por fontes autorizadas",
    en: "make the artifacts fetchable from authorised sources",
  },
  "participation.step_counterparties_evaluate_trust": {
    locator: "participacao.procedure.steps.3",
    "pt-PT": "as contrapartes avaliam a confiança (ADR-025)",
    en: "counterparties evaluate trust (ADR-025)",
  },
  "participation.validation_manifest_valid_against_schema": {
    locator: "participacao.procedure.validations.0",
    "pt-PT": "manifest válido contra o schema",
    en: "manifest valid against the schema",
  },
  "participation.validation_conformance_evidence_verifiable": {
    locator: "participacao.procedure.validations.1",
    "pt-PT": "evidência de conformidade verificável",
    en: "conformance evidence verifiable",
  },
  "participation.validation_trust_evaluation_satisfied": {
    locator: "participacao.procedure.validations.2",
    "pt-PT": "avaliação de confiança satisfeita",
    en: "trust evaluation satisfied",
  },

  // ── chave / procedure + template ────────────────────────────────────────────────────────────────
  "key.result_rotated_with_verifiable_state": {
    locator: "chave.procedure.result",
    "pt-PT": "a chave é rodada com estado verificável (nova activa, anterior revogada)",
    en: "the key is rotated with verifiable state (new one active, previous one revoked)",
  },
  "key.gap_schemas_documented_no_rotation_runbook": {
    locator: "chave.procedure.gap_note",
    "pt-PT": "os schemas de key manifest e revogação e o efeito estão documentados; um runbook operacional completo de rotação não é publicado",
    en: "the key-manifest and revocation schemas and their effect are documented; a complete operational rotation runbook is not published",
  },
  "key.prerequisite_generate_new_key": {
    locator: "chave.procedure.prerequisites.0",
    "pt-PT": "gerar a nova chave",
    en: "generate the new key",
  },
  "key.prerequisite_access_to_key_manifest_and_revocation_publication": {
    locator: "chave.procedure.prerequisites.1",
    "pt-PT": "acesso à publicação do key manifest e da lista de revogação",
    en: "access to publishing the key manifest and the revocation list",
  },
  "key.step_publish_new_key_in_key_manifest": {
    locator: "chave.procedure.steps.0",
    "pt-PT": "publicar a nova chave no key manifest (schema `key-manifest.production.schema.json`)",
    en: "publish the new key in the key manifest (`key-manifest.production.schema.json` schema)",
  },
  "key.step_revoke_previous_key": {
    locator: "chave.procedure.steps.1",
    "pt-PT": "revogar a chave anterior (entrada de revogação)",
    en: "revoke the previous key (revocation entry)",
  },
  "key.step_counterparties_reevaluate_with_new_key": {
    locator: "chave.procedure.steps.2",
    "pt-PT": "as contrapartes reavaliam a confiança com a nova chave",
    en: "counterparties re-evaluate trust with the new key",
  },
  "key.validation_key_manifest_validates_against_schema": {
    locator: "chave.procedure.validations.0",
    "pt-PT": "o key manifest valida contra o schema",
    en: "the key manifest validates against the schema",
  },
  "key.validation_previous_key_revocation_entry_published": {
    locator: "chave.procedure.validations.1",
    "pt-PT": "a entrada de revogação da chave anterior está publicada",
    en: "the revocation entry for the previous key is published",
  },
  "key.template_from_key_manifest_schema": {
    locator: "chave.template.schema_note",
    "pt-PT": "baseada no schema canónico `key-manifest.production.schema.json`. Valores ilustrativos; campos reais do schema.",
    en: "based on the canonical `key-manifest.production.schema.json` schema. Illustrative values; the schema's real fields.",
  },

  // ── root / procedure + template ─────────────────────────────────────────────────────────────────
  "root.result_published_trust_root_with_delegations": {
    locator: "root.procedure.result",
    "pt-PT": "uma raiz de confiança publicada e verificável, com delegações para chaves operacionais",
    en: "a published and verifiable trust root, with delegations to operational keys",
  },
  "root.gap_schemas_documented_no_ceremony_runbook": {
    locator: "root.procedure.gap_note",
    "pt-PT": "os schemas de raiz, a arquitectura de custódia e o efeito estão documentados; um runbook operacional completo da cerimónia não é publicado no protocolo",
    en: "the root schemas, the custody architecture and their effect are documented; a complete operational ceremony runbook is not published in the protocol",
  },
  "root.prerequisite_distinct_offline_custodians": {
    locator: "root.procedure.prerequisites.0",
    "pt-PT": "custódios offline distintos (chaves nunca na infraestrutura de serviço — ADR-027)",
    en: "distinct offline custodians (keys never on the service infrastructure — ADR-027)",
  },
  "root.prerequisite_access_to_root_metadata_and_revocation_publication": {
    locator: "root.procedure.prerequisites.1",
    "pt-PT": "acesso à publicação dos metadados de raiz e da lista de revogação",
    en: "access to publishing the root metadata and the revocation list",
  },
  "root.step_generate_offline_root_keys_one_per_custodian": {
    locator: "root.procedure.steps.0",
    "pt-PT": "gerar as chaves de raiz offline, uma por custódio (ADR-027)",
    en: "generate the root keys offline, one per custodian (ADR-027)",
  },
  "root.step_run_ceremony_and_record_evidence": {
    locator: "root.procedure.steps.1",
    "pt-PT": "realizar a cerimónia de raiz e registar a evidência (`root-ceremony-evidence.production.schema.json`)",
    en: "run the root ceremony and record the evidence (`root-ceremony-evidence.production.schema.json`)",
  },
  "root.step_publish_trust_root_metadata": {
    locator: "root.procedure.steps.2",
    "pt-PT": "publicar os metadados de raiz de confiança (`trust-root-metadata.production.schema.json`)",
    en: "publish the trust-root metadata (`trust-root-metadata.production.schema.json`)",
  },
  "root.step_delegate_operational_keys_from_root": {
    locator: "root.procedure.steps.3",
    "pt-PT": "delegar chaves operacionais a partir da raiz (`root-delegation.production.schema.json`)",
    en: "delegate operational keys from the root (`root-delegation.production.schema.json`)",
  },
  "root.validation_metadata_validates_and_threshold_satisfied": {
    locator: "root.procedure.validations.0",
    "pt-PT": "os metadados de raiz validam contra o schema canónico e o threshold é satisfeito",
    en: "the root metadata validates against the canonical schema and the threshold is satisfied",
  },
  "root.validation_root_keys_remain_offline": {
    locator: "root.procedure.validations.1",
    "pt-PT": "as chaves de raiz permanecem offline (ADR-027)",
    en: "the root keys remain offline (ADR-027)",
  },
  "root.template_from_trust_root_metadata_schema": {
    locator: "root.template.schema_note",
    "pt-PT": "baseada no schema canónico `trust-root-metadata.production.schema.json`. Valores ilustrativos; campos reais do schema.",
    en: "based on the canonical `trust-root-metadata.production.schema.json` schema. Illustrative values; the schema's real fields.",
  },

  // ── interoperabilidade / example + template ─────────────────────────────────────────────────────
  "interop.links_two_federated_operators": {
    locator: "interoperabilidade.example.framing",
    "pt-PT": "A interoperabilidade liga dois operadores federados: um roteia/liquida com o outro segundo o manifest de federação e a avaliação de confiança.",
    en: "Interoperability links two federated operators: one routes/settles with the other according to the federation manifest and the trust evaluation.",
  },
  "interop.precondition_both_published_manifest_and_evidence": {
    locator: "interoperabilidade.example.precondition",
    "pt-PT": "ambos publicaram o manifest de federação e a evidência de conformidade",
    en: "both have published the federation manifest and the conformance evidence",
  },
  "interop.result_verifiable_interaction_without_central_authority": {
    locator: "interoperabilidade.example.result",
    "pt-PT": "uma interacção verificável entre operadores, sem uma autoridade central",
    en: "a verifiable interaction between operators, with no central authority",
  },
  "interop.actor_operator_a": {
    locator: "interoperabilidade.example.actors.0",
    "pt-PT": "o operador A",
    en: "operator A",
  },
  "interop.actor_operator_b": {
    locator: "interoperabilidade.example.actors.1",
    "pt-PT": "o operador B",
    en: "operator B",
  },
  "interop.both_publish_federation_manifest": {
    locator: "interoperabilidade.example.sequence.0",
    "pt-PT": "o **operador A** e o **operador B** publicam o manifest de federação (endpoint de interop, capacidades)",
    en: "**operator A** and **operator B** publish the federation manifest (interop endpoint, capabilities)",
  },
  "interop.operator_a_resolves_b_and_checks_trust": {
    locator: "interoperabilidade.example.sequence.1",
    "pt-PT": "o operador A resolve o operador B e verifica a avaliação de confiança",
    en: "operator A resolves operator B and checks the trust evaluation",
  },
  "interop.operator_a_routes_operation_and_records_settlement_obligation": {
    locator: "interoperabilidade.example.sequence.2",
    "pt-PT": "o operador A roteia uma operação para o operador B e regista a obrigação de liquidação",
    en: "operator A routes an operation to operator B and records the settlement obligation",
  },
  "interop.template_from_federation_manifest_contract": {
    locator: "interoperabilidade.template.schema_note",
    "pt-PT": "baseada no contrato canónico `federation-manifest.json`. Valores ilustrativos; campos reais do contrato.",
    en: "based on the canonical `federation-manifest.json` contract. Illustrative values; the contract's real fields.",
  },
};

/** Section headings and task framings, per locale. Section identity is semantic, not a Portuguese label. */
export const TASKED_SECTION_LABELS = {
  "pt-PT": {
    actors: "Actores",
    precondition: "Pré-condição",
    sequence: "Sequência",
    result: "Resultado",
    prerequisites: "Pré-requisitos",
    steps: "Passos",
    validations: "Validações",
    expected: "Resultado esperado",
  },
  en: {
    actors: "Actors",
    precondition: "Precondition",
    sequence: "Sequence",
    result: "Result",
    prerequisites: "Prerequisites",
    steps: "Steps",
    validations: "Validations",
    expected: "Expected result",
  },
};

/** The realization of one semantic item in one locale, or null when the locale does not cover it. */
export function taskedItem(itemId, locale) {
  const entry = TASKED_ITEMS[itemId];
  if (!entry) return null;
  const text = entry[locale];
  return typeof text === "string" && text.length ? text : null;
}

/** Every semantic item id this catalogue realizes. */
export function taskedItemIds() {
  return Object.keys(TASKED_ITEMS);
}

/** The Rust source position an item currently occupies — traceability, never identity. */
export function taskedLocator(itemId) {
  return (TASKED_ITEMS[itemId] || {}).locator || null;
}
