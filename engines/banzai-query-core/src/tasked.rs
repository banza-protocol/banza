//! M2.18B.7 (Semantic Task Fulfilment — generalized) — the registry/catalogue-driven tasked engine.
//!
//! This is NOT a collection of question-specific answers. It is a deterministic engine over a typed
//! `KnowledgeCatalogue`: a `SubjectProfile` per supported subject (operator, federation, revocation, trust,
//! evidence, conformance, participation, key-rotation, manifest) carrying the DATA a fulfilling answer
//! needs — an example (actors/precondition/sequence/result), a procedure (prerequisites/steps/validations/
//! result/gaps/completeness), and/or a template (schema + fields) — each grounded in REAL canonical
//! sources. Generic builders render the [`crate::obligations::RequestedTask`]'s shape from the profile; a
//! deterministic answer is produced ONLY when the catalogue holds the data for that (subject, task) — else
//! `None`, and the grounded trunk handles it. Content is illustrative + CLEARLY MARKED + operator-neutral;
//! structures use REAL schema fields (never invented); procedures state completeness honestly. No model.

use crate::answerplan::plan_answer;
use crate::normalize;
use crate::obligations::{resolve_task, RequestedTask};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TaskedSource {
    pub id: String,
    pub path: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TaskedAnswer {
    pub matched: bool,
    pub subject: String,
    pub task: String,
    /// real_structure | illustrative_example | transparent_partial_procedure | procedure | requirements
    pub kind: String,
    pub answer_markdown: String,
    pub source_ids: Vec<String>,
    pub sources: Vec<TaskedSource>,
    pub reason_code: String,
}

// ─────────────────────────── the typed catalogue ───────────────────────────

struct Src {
    id: &'static str,
    path: &'static str,
    title: &'static str,
}

/// An illustrative example (a scenario), grounded in the subject's sources.
struct ExampleData {
    /// A one-line framing of what the subject is (so the example is self-contained).
    framing: &'static str,
    actors: &'static [&'static str],
    precondition: &'static str,
    sequence: &'static [&'static str],
    result: &'static str,
}

/// A documented procedure. `complete` = a full step-by-step is published; else transparent-partial.
struct ProcedureData {
    complete: bool,
    prerequisites: &'static [&'static str],
    steps: &'static [&'static str],
    validations: &'static [&'static str],
    result: &'static str,
    /// documented gaps when `complete == false`.
    gap_note: &'static str,
}

/// A structural template drawn from a real schema.
struct TemplateData {
    schema_note: &'static str,
    /// a real, minimal JSON body (illustrative values, real fields).
    body_json: &'static str,
    required_fields: &'static [&'static str],
}

struct SubjectProfile {
    subject: &'static str,
    /// accent-free substrings (matched against normalize()d text) that identify the subject.
    aliases: &'static [&'static str],
    sources: &'static [Src],
    example: Option<ExampleData>,
    procedure: Option<ProcedureData>,
    template: Option<TemplateData>,
}

// Canonical sources (stable paths).
const S_ADR001: Src = Src {
    id: "ADR-001",
    path: "decisions/adr/ADR-001-open-financial-protocol.md",
    title: "ADR-001 — BANZA as Open Financial Protocol",
};
const S_ADR038: Src = Src {
    id: "ADR-027",
    path: "decisions/adr/ADR-027-open-protocol-trust-model-without-ca.md",
    title: "ADR-027 — Open Protocol Trust Model Without CA",
};
const S_ADR040: Src = Src {
    id: "ADR-031",
    path: "decisions/adr/ADR-031-federation-trust-evaluation-without-certificates.md",
    title: "ADR-031 — Federation Trust Evaluation Without Certificates",
};
const S_ADR039: Src = Src {
    id: "ADR-033",
    path: "decisions/adr/ADR-033-operator-self-publication-and-machine-verifiable-conformance.md",
    title: "ADR-033 — Operator Self-Publication & Machine-Verifiable Conformance",
};
const S_ADR021: Src = Src {
    id: "ADR-039",
    path: "decisions/adr/ADR-039-conformance-suite-level-capability-alignment.md",
    title: "ADR-039 — Conformance Suite / Level Capability Alignment",
};
const S_MANIFEST: Src = Src {
    id: "operator-manifest-schema",
    path: "contracts/production/operator-manifest.production.schema.json",
    title: "Operator Manifest — production schema",
};
const S_KEYMANIFEST: Src = Src {
    id: "key-manifest-schema",
    path: "contracts/production/key-manifest.production.schema.json",
    title: "Key Manifest — production schema",
};
const S_REVOCATION: Src = Src {
    id: "revocation-entry-schema",
    path: "contracts/production/revocation-entry.production.schema.json",
    title: "Revocation Entry — production schema",
};
const S_EVIDENCE: Src = Src {
    id: "evidence-bundle-schema",
    path: "contracts/production/evidence-bundle.production.schema.json",
    title: "Evidence Bundle — production schema",
};
const S_CONFEVID: Src = Src {
    id: "conformance-evidence-schema",
    path: "contracts/production/conformance-evidence.production.schema.json",
    title: "Conformance Evidence — production schema",
};
const S_TRUSTEVAL: Src = Src {
    id: "federation-trust-evaluation-schema",
    path: "contracts/production/federation-trust-evaluation.production.schema.json",
    title: "Federation Trust Evaluation — production schema",
};
const S_TRUSTROOT: Src = Src {
    id: "trust-root-metadata-schema",
    path: "contracts/production/trust-root-metadata.production.schema.json",
    title: "Trust Root Metadata — production schema",
};
const S_ROOTMETA: Src = Src {
    id: "root-metadata-schema",
    path: "contracts/production/root-metadata.production.schema.json",
    title: "Root Metadata — production schema",
};
const S_ROOTKEY: Src = Src {
    id: "root-key-schema",
    path: "contracts/production/root-key.production.schema.json",
    title: "Root Key — production schema",
};
const S_ADR028: Src = Src {
    id: "ADR-029",
    path: "decisions/adr/ADR-029-keys-never-on-serving-infrastructure.md",
    title: "ADR-029 — Keys Never on Serving Infrastructure",
};
const S_FEDMANIFEST: Src = Src {
    id: "federation-manifest-schema",
    path: "contracts/federation/federation-manifest.json",
    title: "Federation Manifest — contract",
};

const CATALOGUE: &[SubjectProfile] = &[
    SubjectProfile {
        subject: "operador",
        aliases: &["operador", "operator", "operadora"],
        sources: &[S_ADR001, S_MANIFEST],
        example: Some(ExampleData {
            framing: "Um operador é uma organização (por exemplo, uma empresa de pagamentos independente) que implementa o protocolo aberto BANZA.",
            actors: &["um operador candidato (uma organização de pagamentos)"],
            precondition: "a organização decide implementar o protocolo aberto",
            sequence: &[
                "implementa as superfícies do protocolo (carteiras/contas, QR, liquidação)",
                "publica a sua identidade e o seu **manifest** de operador (mais o key manifest)",
                "apresenta **evidência de conformidade** verificável",
                "participa na **federação** segundo as regras de confiança vigentes",
            ],
            result: "torna-se um participante verificável; o BANZA define as regras, não opera nem certifica a organização (operator-neutral)",
        }),
        procedure: None,
        template: None,
    },
    SubjectProfile {
        subject: "federacao",
        aliases: &["federac", "federation", "federar", "federa "],
        sources: &[S_ADR038, S_ADR040, S_MANIFEST],
        example: Some(ExampleData {
            framing: "A federação liga operadores por avaliação de confiança, sem autoridade certificadora (ADR-027) e sem certificados (ADR-031).",
            actors: &["o operador A", "o operador B"],
            precondition: "ambos os operadores publicam os seus artefactos verificáveis",
            sequence: &[
                "o **operador A** publica os artefactos exigidos (manifest, identidade, evidência de conformidade)",
                "o **operador B** obtém-nos por uma fonte autorizada e verifica integridade, estado e relações",
                "a **avaliação de confiança** aplica as regras vigentes (ADR-031), sem CA (ADR-027)",
            ],
            result: "a relação de federação só é válida quando os requisitos documentados são satisfeitos; uma revogação posterior altera o estado verificável",
        }),
        procedure: Some(ProcedureData {
            complete: false,
            prerequisites: &["publicar o **manifest** de operador (identidade, capacidades, endpoints)", "disponibilizar o key manifest e a identidade verificável", "apresentar **evidência de conformidade**"],
            steps: &["preparar e publicar o manifest do operador", "tornar a identidade e os artefactos obtíveis por uma fonte autorizada", "a contraparte verifica integridade e estado", "a avaliação de confiança aplica as regras vigentes"],
            validations: &["integridade e estado dos artefactos verificados", "avaliação de confiança sem CA e sem certificados (ADR-027, ADR-031)"],
            result: "uma relação de federação verificável entre operadores",
            gap_note: "as fontes públicas descrevem os requisitos e o modelo de confiança, mas **não publicam** um procedimento operacional completo, passo a passo",
        }),
        template: None,
    },
    SubjectProfile {
        subject: "manifest",
        aliases: &["manifest", "manifesto"],
        sources: &[S_MANIFEST],
        example: None,
        procedure: Some(ProcedureData {
            complete: false,
            prerequisites: &["ter uma identidade de operador e endpoints", "preparar o key manifest"],
            steps: &["preencher os campos obrigatórios do schema `operator-manifest.production.schema.json`", "publicar o manifest numa fonte autorizada (`base_url`/well-known)", "referenciar o `key_manifest_url`"],
            validations: &["o manifest valida contra o schema canónico", "`simulated` = true e `production_allowed` é uma declaração do próprio operador no baseline actual"],
            result: "um manifest de operador publicado e verificável",
            gap_note: "as fontes publicam o schema e os requisitos; um runbook operacional completo de publicação não é publicado",
        }),
        template: Some(TemplateData {
            schema_note: "baseada no schema canónico `operator-manifest.production.schema.json`. Os valores são ilustrativos; os **campos** são os reais do schema.",
            body_json: "{\n  \"operator_id\": \"operador-exemplo\",\n  \"environment\": \"sandbox\",\n  \"simulated\": true,\n  \"production_allowed\": false,\n  \"capabilities\": [\n    \"wallets\",\n    \"qr\",\n    \"settlement\"\n  ],\n  \"key_manifest_url\": \"https://exemplo.example/key_manifest_url\",\n  \"protocol_version\": \"1.0\",\n  \"base_url\": \"https://exemplo.example/base_url\",\n  \"supported_levels\": [\n    \"L0\",\n    \"L1\"\n  ],\n  \"operator_regulatory_declaration\": {\n    \"declared_by\": \"declared_by-exemplo\",\n    \"authority\": \"authority-exemplo\",\n    \"status\": \"not_declared\"\n  }\n}",
            required_fields: &["operator_id", "environment", "simulated", "production_allowed", "capabilities", "key_manifest_url", "protocol_version", "base_url", "supported_levels", "operator_regulatory_declaration"],
        }),
    },
    SubjectProfile {
        subject: "revogacao",
        aliases: &["revoga", "revocation", "revogar", "revogado"],
        sources: &[S_REVOCATION, S_ADR040],
        example: Some(ExampleData {
            framing: "A revogação retira a validade a uma chave ou artefacto previamente confiável, alterando o estado verificável.",
            actors: &["o detentor de uma chave de assinatura"],
            precondition: "uma chave/artefacto precisa de deixar de ser confiável (comprometimento ou rotação)",
            sequence: &[
                "é publicada uma entrada de revogação (schema `revocation-entry.production.schema.json`)",
                "a lista de revogação passa a incluir o identificador afectado",
                "a avaliação de confiança das contrapartes deixa de aceitar o artefacto revogado (ADR-031)",
            ],
            result: "o estado verificável muda; artefactos assinados pela chave revogada deixam de ser confiáveis",
        }),
        procedure: Some(ProcedureData {
            complete: false,
            prerequisites: &["identificar a chave/artefacto a revogar", "acesso à publicação da lista de revogação"],
            steps: &["criar a entrada de revogação segundo o schema", "publicar a entrada na lista de revogação", "a contraparte reavalia a confiança e rejeita o artefacto revogado"],
            validations: &["a entrada valida contra `revocation-entry.production.schema.json`", "a reavaliação de confiança reflecte a revogação"],
            result: "o artefacto revogado deixa de ter estatuto verificável",
            gap_note: "o schema e o efeito estão documentados; um runbook operacional completo passo-a-passo não é publicado",
        }),
        template: None,
    },
    SubjectProfile {
        subject: "trust",
        aliases: &["trust", "confianca", "avaliacao de confianca"],
        sources: &[S_ADR038, S_ADR040, S_TRUSTEVAL],
        example: Some(ExampleData {
            framing: "A confiança no BANZA é avaliada abertamente, sem uma autoridade certificadora (ADR-027) e sem certificados (ADR-031).",
            actors: &["um operador avaliador", "um operador avaliado"],
            precondition: "o operador avaliado publicou os seus artefactos verificáveis",
            sequence: &[
                "o avaliador obtém o manifest, a identidade e a evidência do avaliado",
                "verifica integridade, estado e relações",
                "aplica as regras de avaliação de confiança (ADR-027/ADR-031) — sem CA, sem certificados",
            ],
            result: "uma decisão de confiança verificável, revogável se o estado mudar",
        }),
        procedure: None,
        template: Some(TemplateData {
            schema_note: "baseada no schema canónico `federation-trust-evaluation.production.schema.json`. Valores ilustrativos; campos reais do schema.",
            body_json: "{\n  \"evaluated_operator_id\": \"evaluated-operator-id-exemplo\",\n  \"evaluator_operator_id\": \"evaluator-operator-id-exemplo\",\n  \"protocol_version\": \"1.0\",\n  \"checks\": {\n    \"valid_operator_manifest\": {\n      \"passed\": true\n    },\n    \"compatible_protocol_version\": {\n      \"passed\": true\n    },\n    \"signed_protocol_metadata\": {\n      \"passed\": true\n    },\n    \"conformance_evidence_valid\": {\n      \"passed\": true\n    },\n    \"trust_root_or_delegated_signature_valid\": {\n      \"passed\": true\n    },\n    \"not_revoked\": {\n      \"passed\": true\n    },\n    \"capabilities_compatible\": {\n      \"passed\": true\n    },\n    \"endpoint_contract_compatible\": {\n      \"passed\": true\n    },\n    \"evidence_freshness_within_policy\": {\n      \"passed\": true\n    },\n    \"fail_closed_on_missing_or_invalid\": {\n      \"passed\": true\n    }\n  },\n  \"outcome\": \"ROUTING_ALLOWED\",\n  \"evaluated_at\": \"2025-08-01T00:00:00Z\",\n  \"verified_by_tool_version\": \"1.0\",\n  \"trust_root_version\": \"1.0\",\n  \"boundary\": {\n    \"open_financial_protocol\": true,\n    \"central_operator_authority\": false,\n    \"human_operator_approval_required\": false,\n    \"operator_participation_permissionless\": true,\n    \"conformance_is_machine_verifiable\": true,\n    \"certificate_based_trust\": false,\n    \"not_operator_certificate\": true,\n    \"not_payment_service_authorisation\": true,\n    \"not_licence\": true,\n    \"not_regulatory_approval\": true\n  }\n}",
            required_fields: &[
                "evaluated_operator_id",
                "evaluator_operator_id",
                "protocol_version",
                "checks",
                "outcome",
                "failed_checks",
                "evaluated_at",
                "verified_by_tool_version",
                "trust_root_version",
            ],
        }),
    },
    SubjectProfile {
        subject: "evidencia",
        aliases: &["evidencia", "evidence", "evidence bundle", "pacote de evidencia"],
        sources: &[S_EVIDENCE, S_CONFEVID, S_ADR039],
        example: Some(ExampleData {
            framing: "A evidência é um pacote verificável por máquina que demonstra a conformidade de um operador (ADR-033).",
            actors: &["um operador que demonstra conformidade"],
            precondition: "o operador correu a verificação e recolheu os resultados",
            sequence: &[
                "o operador gera um evidence bundle (schema `evidence-bundle.production.schema.json`)",
                "inclui a evidência de conformidade (`conformance-evidence`)",
                "publica-o para verificação independente (ADR-033)",
            ],
            result: "qualquer parte pode verificar a conformidade por máquina, sem confiar cegamente no operador",
        }),
        procedure: None,
        template: Some(TemplateData {
            schema_note: "baseada no schema canónico `evidence-bundle.production.schema.json`. Valores ilustrativos; campos reais do schema.",
            body_json: "{\n  \"bundle_id\": \"bundle-id-exemplo\",\n  \"protocol_version\": \"1.0\",\n  \"hashes\": {\n    \"algorithm\": \"sha-256\",\n    \"bundle_digest\": \"sha-256:0000000000000000\"\n  },\n  \"artifacts\": [\n    {\n      \"name\": \"name-exemplo\",\n      \"digest\": \"sha-256:0000000000000000\"\n    }\n  ],\n  \"status_refs\": {\n    \"m2_gate_status\": \"M2_PROTOCOL_IMPLEMENTATION_READY\"\n  },\n  \"boundary_flags\": {\n    \"not_a_certificate\": true,\n    \"requires_conformance_evidence_review\": true\n  }\n}",
            required_fields: &[
                "bundle_id",
                "protocol_version",
                "hashes",
                "artifacts",
                "status_refs",
                "boundary_flags",
            ],
        }),
    },
    SubjectProfile {
        subject: "conformidade",
        aliases: &["conformidade", "conformance", "conforme"],
        sources: &[S_ADR021, S_ADR039, S_CONFEVID],
        example: Some(ExampleData {
            framing: "A conformidade é demonstrada por evidência verificável alinhada com níveis/capacidades (ADR-039), publicada pelo próprio operador (ADR-033).",
            actors: &["um operador candidato"],
            precondition: "o operador implementou as capacidades de um nível",
            sequence: &[
                "corre a suite de conformidade para o nível pretendido (ADR-039)",
                "gera a evidência de conformidade (`conformance-evidence`)",
                "publica-a de forma verificável por máquina (ADR-033)",
            ],
            result: "a conformidade do operador é verificável por qualquer parte, sem certificação central",
        }),
        procedure: Some(ProcedureData {
            complete: false,
            prerequisites: &["implementar as capacidades do nível pretendido", "acesso à suite de conformidade"],
            steps: &["correr a suite de conformidade para o nível (ADR-039)", "recolher a evidência de conformidade", "publicar a evidência de forma verificável (ADR-033)"],
            validations: &["a evidência valida contra `conformance-evidence.production.schema.json`", "as capacidades correspondem ao nível declarado"],
            result: "conformidade demonstrada e verificável por máquina",
            gap_note: "os níveis, a evidência e a auto-publicação estão documentados; um runbook operacional completo não é publicado",
        }),
        template: Some(TemplateData {
            schema_note: "baseada no schema canónico `conformance-evidence.production.schema.json`. Valores ilustrativos; campos reais do schema.",
            body_json: "{\n  \"operator_id\": \"operator-id-exemplo\",\n  \"protocol_version\": \"1.0\",\n  \"conformance_report_hash\": \"sha-256:0000000000000000\",\n  \"evidence_bundle_hash\": \"sha-256:0000000000000000\",\n  \"verified_by_tool_version\": \"1.0\",\n  \"trust_root_version\": \"1.0\",\n  \"conformance_status\": \"pass\",\n  \"signed_protocol_metadata\": \"exemplo\",\n  \"boundary\": {\n    \"not_operator_authorisation\": true,\n    \"not_certificate\": true,\n    \"not_operator_approval\": true,\n    \"not_payment_service_authorisation\": true,\n    \"open_financial_protocol\": true\n  }\n}",
            required_fields: &[
                "operator_id",
                "protocol_version",
                "conformance_report_hash",
                "evidence_bundle_hash",
                "verified_by_tool_version",
                "trust_root_version",
                "conformance_status",
                "revocation_status",
                "generated_at",
            ],
        }),
    },
    SubjectProfile {
        subject: "participacao",
        // M2.18B.7 (fallback fix) — "onboarding de um operador" IS operator participation/joining: alias it
        // here (participacao carries a real procedure) so "como fazer onboarding de um operador" resolves to
        // a deterministic procedure instead of a task-incomplete synthesis fallback.
        aliases: &[
            "participa",
            "participacao",
            "participar",
            "aderir",
            "aderi",
            "entrar na federacao",
            "onboarding",
            "integracao de operador",
        ],
        sources: &[S_ADR039, S_MANIFEST, S_ADR040],
        example: None,
        procedure: Some(ProcedureData {
            complete: false,
            prerequisites: &["implementar o protocolo e as capacidades pretendidas", "ter identidade de operador e key manifest", "ter evidência de conformidade"],
            steps: &["publicar o **manifest** de operador e a identidade", "publicar a **evidência de conformidade** (ADR-033)", "tornar os artefactos obtíveis por fontes autorizadas", "as contrapartes avaliam a confiança (ADR-031)"],
            validations: &["manifest válido contra o schema", "evidência de conformidade verificável", "avaliação de confiança satisfeita"],
            result: "o operador participa como participante verificável da federação",
            gap_note: "os requisitos de participação estão documentados; um procedimento operacional completo passo-a-passo não é publicado",
        }),
        template: None,
    },
    SubjectProfile {
        subject: "chave",
        aliases: &["chave", "key manifest", "key-manifest", "rotacao de chave", "rotacao", "rotation", "signing key"],
        sources: &[S_KEYMANIFEST, S_REVOCATION],
        example: None,
        procedure: Some(ProcedureData {
            complete: false,
            prerequisites: &["gerar a nova chave", "acesso à publicação do key manifest e da lista de revogação"],
            steps: &["publicar a nova chave no key manifest (schema `key-manifest.production.schema.json`)", "revogar a chave anterior (entrada de revogação)", "as contrapartes reavaliam a confiança com a nova chave"],
            validations: &["o key manifest valida contra o schema", "a entrada de revogação da chave anterior está publicada"],
            result: "a chave é rodada com estado verificável (nova activa, anterior revogada)",
            gap_note: "os schemas de key manifest e revogação e o efeito estão documentados; um runbook operacional completo de rotação não é publicado",
        }),
        template: Some(TemplateData {
            schema_note: "baseada no schema canónico `key-manifest.production.schema.json`. Valores ilustrativos; campos reais do schema.",
            body_json: "{\n  \"manifest_version\": \"1.0\",\n  \"protocol_version\": \"1.0\",\n  \"root\": {\n    \"kid\": \"kid-exemplo-1\",\n    \"fingerprint\": \"sha-256:0000000000000000\"\n  },\n  \"keys\": [\n    {\n      \"kid\": \"kid-exemplo-1\",\n      \"domain\": \"root\",\n      \"algorithm\": \"ed25519\",\n      \"public_key\": \"sha-256:0000000000000000\",\n      \"not_before\": \"2025-08-01T00:00:00Z\",\n      \"not_after\": \"2025-08-01T00:00:00Z\"\n    }\n  ],\n  \"hash\": {\n    \"algorithm\": \"sha-256\",\n    \"value\": \"sha-256:0000000000000000\"\n  },\n  \"not_before\": \"2025-08-01T00:00:00Z\",\n  \"not_after\": \"2025-08-01T00:00:00Z\"\n}",
            required_fields: &[
                "manifest_version",
                "protocol_version",
                "root",
                "keys",
                "hash",
                "not_before",
                "not_after",
            ],
        }),
    },
    // ── DFN-1 (definitive generalization) — public subjects added purely as DATA (registry-driven): the
    // root-of-trust family and interoperability. No new function/match/pipeline change — proof that the
    // engine generalizes by catalogue data, not per-subject code. Grounded in REAL production schemas.
    SubjectProfile {
        subject: "root",
        aliases: &[
            "root manifest",
            "trust root",
            "trust-root",
            "root-of-trust",
            "raiz de confianca",
            "root de confianca",
            "cerimonia de raiz",
            "cerimonia da raiz",
            "root ceremony",
            "metadados da raiz",
            "root metadata",
        ],
        sources: &[S_TRUSTROOT, S_ROOTMETA, S_ROOTKEY, S_ADR028, S_ADR038],
        example: None,
        procedure: Some(ProcedureData {
            complete: false,
            prerequisites: &[
                "custódios offline distintos (chaves nunca na infraestrutura de serviço — ADR-029)",
                "acesso à publicação dos metadados de raiz e da lista de revogação",
            ],
            steps: &[
                "gerar as chaves de raiz offline, uma por custódio (ADR-029)",
                "realizar a cerimónia de raiz e registar a evidência (`root-ceremony-evidence.production.schema.json`)",
                "publicar os metadados de raiz de confiança (`trust-root-metadata.production.schema.json`)",
                "delegar chaves operacionais a partir da raiz (`root-delegation.production.schema.json`)",
            ],
            validations: &[
                "os metadados de raiz validam contra o schema canónico e o threshold é satisfeito",
                "as chaves de raiz permanecem offline (ADR-029)",
            ],
            result: "uma raiz de confiança publicada e verificável, com delegações para chaves operacionais",
            gap_note: "os schemas de raiz, a arquitectura de custódia e o efeito estão documentados; um runbook operacional completo da cerimónia não é publicado no protocolo",
        }),
        template: Some(TemplateData {
            schema_note: "baseada no schema canónico `trust-root-metadata.production.schema.json`. Valores ilustrativos; campos reais do schema.",
            body_json: "{\n  \"trust_root_version\": \"1.0\",\n  \"protocol\": \"banza\",\n  \"environment\": \"production\",\n  \"threshold\": 2,\n  \"total_root_keys\": 3,\n  \"root_public_keys\": [\n    {\n      \"key_id\": \"kid-exemplo-1\",\n      \"custodian\": \"A\",\n      \"public_key\": \"sha-256:0000000000000000\",\n      \"fingerprint\": \"sha-256:0000000000000000\",\n      \"algorithm\": \"ed25519\"\n    }\n  ],\n  \"delegated_keys\": [\n    \"exemplo\"\n  ],\n  \"scope\": [\n    \"protocol_metadata\"\n  ],\n  \"valid_from\": \"2025-08-01T00:00:00Z\",\n  \"valid_until\": \"2025-08-01T00:00:00Z\",\n  \"boundary\": {\n    \"not_operator_authorisation\": true,\n    \"not_certificate\": true,\n    \"not_operator_approval\": true,\n    \"not_payment_service_authorisation\": true,\n    \"open_financial_protocol\": true\n  }\n}",
            required_fields: &[
                "trust_root_version",
                "protocol",
                "environment",
                "threshold",
                "total_root_keys",
                "root_public_keys",
                "scope",
                "valid_from",
                "valid_until",
                "revocation_list_ref",
            ],
        }),
    },
    SubjectProfile {
        subject: "interoperabilidade",
        aliases: &[
            "interoperabilidade",
            "interoperability",
            "interop",
            "cross-operator",
            "entre operadores",
            "roteamento entre operadores",
        ],
        sources: &[S_FEDMANIFEST, S_ADR040],
        example: Some(ExampleData {
            framing: "A interoperabilidade liga dois operadores federados: um roteia/liquida com o outro segundo o manifest de federação e a avaliação de confiança.",
            actors: &["o operador A", "o operador B"],
            precondition: "ambos publicaram o manifest de federação e a evidência de conformidade",
            sequence: &[
                "o **operador A** e o **operador B** publicam o manifest de federação (endpoint de interop, capacidades)",
                "o operador A resolve o operador B e verifica a avaliação de confiança",
                "o operador A roteia uma operação para o operador B e regista a obrigação de liquidação",
            ],
            result: "uma interacção verificável entre operadores, sem uma autoridade central",
        }),
        procedure: None,
        template: Some(TemplateData {
            schema_note: "baseada no contrato canónico `federation-manifest.json`. Valores ilustrativos; campos reais do contrato.",
            body_json: "{\n  \"federation_version\": \"1\",\n  \"protocol_metadata_url\": \"https://exemplo.example/protocol_metadata_url\",\n  \"interop_endpoint\": \"https://exemplo.example/interop_endpoint\",\n  \"supports_federation\": true,\n  \"cross_operator_routing\": true,\n  \"cross_operator_settlement\": true,\n  \"federation_capabilities\": {\n    \"routing_version\": \"1\",\n    \"settlement_version\": \"1\",\n    \"supported_currencies\": [\n      \"AOA\"\n    ],\n    \"netting_interval_hours\": 1\n  }\n}",
            required_fields: &[
                "federation_version",
                "protocol_metadata_url",
                "interop_endpoint",
                "supports_federation",
                "cross_operator_routing",
                "cross_operator_settlement",
                "federation_capabilities",
            ],
        }),
    },
];

fn to_source(s: &Src) -> TaskedSource {
    TaskedSource {
        id: s.id.to_string(),
        path: s.path.to_string(),
        title: s.title.to_string(),
    }
}

/// Does the catalogue hold the DATA a fulfilling answer for `task` needs from this subject?
fn task_data_available(p: &SubjectProfile, task: RequestedTask) -> bool {
    match task {
        RequestedTask::Template => p.template.is_some(),
        // "exemplo de X" is satisfied by a structure if X has one, else a scenario.
        RequestedTask::Example => p.template.is_some() || p.example.is_some(),
        RequestedTask::Procedure | RequestedTask::Requirements => p.procedure.is_some(),
        _ => false,
    }
}

/// The length of the longest alias of `p` that appears in `nq` (specificity), if any matches.
fn matched_alias_len(p: &SubjectProfile, nq: &str) -> Option<usize> {
    p.aliases
        .iter()
        .filter(|a| nq.contains(**a))
        .map(|a| a.len())
        .max()
}

/// Select the subject profile for `(question, task)`: among profiles whose alias matches AND that
/// actually hold data for `task`, pick the one with the most specific (longest) matching alias. This
/// makes selection TASK-AWARE — "como federar um operador?" (a procedure) routes to `federacao`
/// (which documents a procedure), not `operador` (which does not) even though "operador" also matches;
/// and "key manifest" routes to `chave` (longer alias) over the generic `manifest`. Ties resolve to
/// the earlier (more canonical) catalogue entry. Returns `None` when nothing can fulfil the task.
fn select_profile(nq: &str, task: RequestedTask) -> Option<&'static SubjectProfile> {
    let mut best: Option<(usize, &'static SubjectProfile)> = None;
    for p in CATALOGUE {
        if !task_data_available(p, task) {
            continue;
        }
        if let Some(len) = matched_alias_len(p, nq) {
            if best.is_none_or(|(b, _)| len > b) {
                best = Some((len, p));
            }
        }
    }
    best.map(|(_, p)| p)
}

/// A machine-readable summary of one catalogue subject (for the canonical-vocabulary pipeline + guards).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CatalogueSubject {
    pub subject: String,
    pub aliases: Vec<String>,
    pub deliverables: Vec<String>, // example | procedure | template
    pub source_ids: Vec<String>,
    pub source_paths: Vec<String>,
}

/// Enumerate the whole CATALOGUE as data. The canonical-protocol-vocabulary derivation and its guard read
/// this so the Subject Registry is provably a projection of the catalogue DATA — never a hand-maintained
/// list divorced from the engine.
pub fn catalogue_subjects() -> Vec<CatalogueSubject> {
    CATALOGUE
        .iter()
        .map(|p| {
            let mut deliverables = Vec::new();
            if p.example.is_some() {
                deliverables.push("example".to_string());
            }
            if p.procedure.is_some() {
                deliverables.push("procedure".to_string());
            }
            if p.template.is_some() {
                deliverables.push("template".to_string());
            }
            CatalogueSubject {
                subject: p.subject.to_string(),
                aliases: p.aliases.iter().map(|a| a.to_string()).collect(),
                deliverables,
                source_ids: p.sources.iter().map(|s| s.id.to_string()).collect(),
                source_paths: p.sources.iter().map(|s| s.path.to_string()).collect(),
            }
        })
        .collect()
}

/// M2.18B.7 DFN-7 — a catalogue TEMPLATE as data: the subject, the canonical schema path it is drawn from,
/// the exact JSON body the engine renders, and the required fields it claims. The schema-validation
/// test/guard reads this to prove each template validates against the REAL schema file (no invented fields).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CatalogueTemplate {
    pub subject: String,
    /// The canonical schema this template is drawn from (the schema source among the subject's sources).
    pub schema_id: String,
    pub schema_path: String,
    pub body_json: String,
    pub required_fields: Vec<String>,
}

/// Enumerate every catalogue subject that publishes a TEMPLATE, with its schema path + rendered body, so the
/// DFN-7 schema validator can prove the template against the real canonical schema. A template's schema is
/// the first `.schema.json` / contract source among the subject's sources.
pub fn catalogue_templates() -> Vec<CatalogueTemplate> {
    CATALOGUE
        .iter()
        .filter_map(|p| {
            let t = p.template.as_ref()?;
            let schema = p
                .sources
                .iter()
                .find(|s| s.path.contains("schema.json") || s.path.contains("contracts/"))?;
            Some(CatalogueTemplate {
                subject: p.subject.to_string(),
                schema_id: schema.id.to_string(),
                schema_path: schema.path.to_string(),
                body_json: t.body_json.to_string(),
                required_fields: t.required_fields.iter().map(|f| f.to_string()).collect(),
            })
        })
        .collect()
}

fn bullets(items: &[&str]) -> String {
    items.iter().map(|s| format!("- {s}\n")).collect()
}

fn render_example(p: &SubjectProfile, ex: &ExampleData) -> TaskedAnswer {
    let mut md = format!(
        "**Exemplo ilustrativo — {}** (um cenário, não um operador/procedimento real).\n\n{}\n\n",
        p.subject, ex.framing
    );
    md.push_str(&format!("**Actores:** {}\n\n", ex.actors.join("; ")));
    md.push_str(&format!(
        "**Pré-condição:** {}\n\n**Sequência:**\n{}\n**Resultado:** {}",
        ex.precondition,
        bullets(ex.sequence),
        ex.result
    ));
    tasked(
        p,
        RequestedTask::Example,
        "illustrative_example",
        md,
        "TASK_EXAMPLE_ILLUSTRATIVE",
    )
}

fn render_procedure(p: &SubjectProfile, pr: &ProcedureData) -> TaskedAnswer {
    let mut md = String::new();
    if pr.complete {
        md.push_str(&format!(
            "**Procedimento documentado — {}**.\n\n",
            p.subject
        ));
    } else {
        md.push_str(&format!(
            "**Procedimento parcial — {}.** {}.\n\n",
            p.subject, pr.gap_note
        ));
    }
    md.push_str(&format!(
        "**Pré-requisitos:**\n{}\n",
        bullets(pr.prerequisites)
    ));
    md.push_str("**Passos:**\n");
    for (i, s) in pr.steps.iter().enumerate() {
        md.push_str(&format!("{}. {}\n", i + 1, s));
    }
    md.push_str(&format!(
        "\n**Validações:**\n{}\n**Resultado esperado:** {}",
        bullets(pr.validations),
        pr.result
    ));
    let kind = if pr.complete {
        "procedure"
    } else {
        "transparent_partial_procedure"
    };
    let reason = if pr.complete {
        "TASK_PROCEDURE_COMPLETE"
    } else {
        "TASK_PROCEDURE_TRANSPARENT_PARTIAL"
    };
    tasked(p, RequestedTask::Procedure, kind, md, reason)
}

fn render_requirements(p: &SubjectProfile, pr: &ProcedureData) -> TaskedAnswer {
    let md = format!(
        "**Requisitos — {}** (das fontes públicas):\n{}\n{}",
        p.subject,
        bullets(pr.prerequisites),
        if pr.complete { "" } else { pr.gap_note }
    );
    tasked(
        p,
        RequestedTask::Requirements,
        "requirements",
        md,
        "TASK_REQUIREMENTS_FROM_SOURCES",
    )
}

fn render_template(p: &SubjectProfile, t: &TemplateData) -> TaskedAnswer {
    let md = format!(
        "**Estrutura ilustrativa — {}** — {}\n\n```json\n{}\n```\n\n**Campos obrigatórios** (do schema): {}.",
        p.subject,
        t.schema_note,
        t.body_json,
        t.required_fields.iter().map(|f| format!("`{f}`")).collect::<Vec<_>>().join(", ")
    );
    tasked(
        p,
        RequestedTask::Template,
        "real_structure",
        md,
        "TASK_TEMPLATE_FROM_SCHEMA",
    )
}

fn tasked(
    p: &SubjectProfile,
    task: RequestedTask,
    kind: &str,
    md: String,
    reason: &str,
) -> TaskedAnswer {
    let sources: Vec<TaskedSource> = p.sources.iter().map(to_source).collect();
    TaskedAnswer {
        matched: true,
        subject: p.subject.to_string(),
        task: task.as_str().to_string(),
        kind: kind.to_string(),
        answer_markdown: md.trim().to_string(),
        source_ids: sources.iter().map(|s| s.id.clone()).collect(),
        sources,
        reason_code: reason.to_string(),
    }
}

/// Resolve a deterministic tasked answer from the catalogue, if the (subject, task) has the data. Returns
/// `None` when the grounded trunk should handle the question (no catalogue data for that deliverable).
pub fn tasked_answer(question: &str, seeded_entity_id: &str) -> Option<TaskedAnswer> {
    let plan = plan_answer(question, seeded_entity_id);
    let task = resolve_task(question, &plan);
    let nq = normalize(question);
    let p = select_profile(&nq, task)?;
    match task {
        RequestedTask::Template => p.template.as_ref().map(|t| render_template(p, t)),
        // An explicit "exemplo de X" prefers the real illustrative SCENARIO when the subject has one; it
        // falls back to the STRUCTURE only for a structural subject with no scenario (e.g. a bare "exemplo
        // de chave"). A "template"-noun phrasing ("exemplo de um manifest válido") is already a Template
        // task (resolved above), so this never downgrades a structure request.
        RequestedTask::Example => p
            .example
            .as_ref()
            .map(|ex| render_example(p, ex))
            .or_else(|| p.template.as_ref().map(|t| render_template(p, t))),
        RequestedTask::Procedure => p.procedure.as_ref().map(|pr| render_procedure(p, pr)),
        RequestedTask::Requirements => p.procedure.as_ref().map(|pr| render_requirements(p, pr)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::obligations::obligations_for;
    use crate::taskcheck::check_completion;

    fn tasked_of(q: &str) -> TaskedAnswer {
        tasked_answer(q, "").unwrap_or_else(|| panic!("a tasked answer applies for {q:?}"))
    }
    fn assert_publishable(q: &str) {
        let a = tasked_of(q);
        let o = obligations_for(q, "");
        let v = check_completion(&o, &a.answer_markdown, &a.source_ids, a.sources.len(), true);
        assert!(
            v.publishable,
            "tasked for {q:?} must publish, got {} ({})",
            v.status, v.note
        );
    }

    #[test]
    fn the_original_six_and_the_new_subjects_fulfil_generically() {
        for q in [
            "me da um exemplo de operador",
            "me da um exemplo de federacao",
            "me da exemplo de um manifest valido",
            "como federar um operador?",
            // generalization beyond the original 6:
            "me da um exemplo de revogacao",
            "me da um exemplo de trust",
            "me da um exemplo de evidencia",
            "me da um exemplo de conformidade",
            "como publicar um manifest?",
            "como fazer a rotacao de chave?",
            "quais os requisitos para participacao?",
            "mostra a estrutura do key manifest",
        ] {
            assert_publishable(q);
        }
    }

    #[test]
    fn revocation_example_is_grounded_and_marked() {
        let a = tasked_of("me da um exemplo de revogacao");
        assert_eq!(a.subject, "revogacao");
        assert!(a.answer_markdown.to_lowercase().contains("ilustrativo"));
        assert!(a.source_ids.iter().any(|s| s.contains("revocation")));
    }

    #[test]
    fn key_rotation_is_a_procedure_with_steps() {
        let a = tasked_of("como fazer a rotacao de chave?");
        assert_eq!(a.subject, "chave");
        assert!(a.answer_markdown.contains("1."));
    }

    // M2.18B.7 (fallback fix) — key REVOCATION is a how-to procedure (was misclassified as a document
    // lookup because its subject resolves to the key-manifest doc), and operator ONBOARDING is operator
    // participation. Both must resolve to a DETERMINISTIC tasked procedure — never a task-incomplete /
    // rejected synthesis fallback.
    #[test]
    fn key_revocation_and_onboarding_are_deterministic_procedures() {
        let rev = tasked_answer("como revogar uma chave", "").expect("revocation is a procedure");
        assert!(
            matches!(rev.subject.as_str(), "revogacao" | "chave"),
            "unexpected subject {}",
            rev.subject
        );
        assert_eq!(rev.task, "procedure");
        assert!(!rev.answer_markdown.trim().is_empty());

        let onb = tasked_answer("como fazer onboarding de um operador", "")
            .expect("onboarding is operator participation");
        assert_eq!(onb.subject, "participacao");
        assert_eq!(onb.task, "procedure");
        assert!(!onb.answer_markdown.trim().is_empty());
    }

    #[test]
    fn a_plain_definition_or_unknown_subject_gets_no_tasked_terminal() {
        assert!(tasked_answer("o que e o BANZA?", "BANZA").is_none());
        assert!(tasked_answer("me explica o ADR 005", "ADR-001").is_none());
        assert!(tasked_answer("me da um exemplo de motor a jato", "").is_none());
    }
}
