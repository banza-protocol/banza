//! Entity + artifact + scope resolution (BZC-1). Deterministic, data-driven, extensible — no model,
//! and NO hard-coded exception for any single question. The engine must SYSTEMATICALLY understand:
//!   - which ENTITY the question is about — the protocol itself, or a specific operator/implementation;
//!   - which ARTIFACT is requested — the Protocol Manifesto vs an implementation's manifest vs the key
//!     manifest vs discovery / signed metadata / revocation / receipt / evidence bundle …;
//!   - whether the ENTITY SCOPE dominates the generic protocol document (→ a live-tool route).
//!
//! Root cause this fixes (diagnosed live): "manifesto do operador zero" matched the bare token
//! "manifesto" → docs/reference/manifesto.md (the Protocol Manifesto) and ignored the operator-zero
//! entity, because concept.rs owns a single ambiguous alias and no layer resolved the entity scope.
//! Here, when an operator/implementation entity co-occurs with an implementation-scoped artifact word,
//! the entity scope wins and `requires_live_tool` is set — the answer is about THAT implementation's
//! artifact (fetched live in BZC-2), never the generic protocol doc.
//!
//! Extensibility: new operators/implementations are added to `ENTITIES`, new artifact words to the
//! `resolve_artifact` matchers — no new per-question `if` in the routers. All aliases are accent-free
//! and lowercase to match [`crate::normalize`], and brand-free (repo-guards forbid operator brands in
//! engine source; only the generic "operador zero"/"operator zero" phrasing is allowed).

use crate::normalize;
use serde::{Deserialize, Serialize};

/// Ontology entity classes. `Operator`/`Implementation` are the entities that PUBLISH live artifacts
/// at a canonical origin; the protocol and the ecosystem brands do not.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntityClass {
    Protocol,
    Operator,
    Implementation,
    Organization,
    Engine,
}

impl EntityClass {
    pub fn as_str(&self) -> &'static str {
        match self {
            EntityClass::Protocol => "protocol",
            EntityClass::Operator => "operator",
            EntityClass::Implementation => "implementation",
            EntityClass::Organization => "organization",
            EntityClass::Engine => "engine",
        }
    }
    /// An operator or implementation publishes its own artifacts (manifest, keys, discovery, …) at a
    /// canonical origin, so a question about one of its artifacts is a LIVE, entity-scoped request.
    pub fn publishes_artifacts(&self) -> bool {
        matches!(self, EntityClass::Operator | EntityClass::Implementation)
    }
}

/// A resolved ecosystem entity: canonical id + display + class. Data-driven from [`ENTITIES`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedEntity {
    pub id: String,
    pub display: String,
    pub class: EntityClass,
}

/// Extensible entity table: (canonical_id, display, class, accent-free brand-free aliases). Add operators
/// and implementations here — the routers need no new code. `operator-zero` is the read-only reference
/// implementation (demo, KZ_DEMO, NOT_CERTIFIED, no real money) — ZERO privileged path; resolved exactly
/// like any other implementation would be. New public operators become new rows (data, not code).
const ENTITIES: &[(&str, &str, EntityClass, &[&str])] = &[(
    "operator-zero",
    "Operador Zero",
    EntityClass::Implementation,
    &[
        "operador zero",
        "operator zero",
        "operator-zero",
        "operador-zero",
        "operadorzero",
        "operatorzero",
    ],
)];

/// Resolve an ecosystem entity from a question (longest-alias-wins). `None` when no operator/implementation
/// entity is named — the protocol itself is the implicit subject and existing concept/doc resolution applies.
pub fn resolve_entity(query: &str) -> Option<ResolvedEntity> {
    let nq = normalize(query);
    if nq.is_empty() {
        return None;
    }
    let mut best: Option<(&'static str, &'static str, EntityClass, usize)> = None;
    for (id, display, class, aliases) in ENTITIES {
        for a in *aliases {
            if nq.contains(a) && best.map(|(_, _, _, len)| a.len() > len).unwrap_or(true) {
                best = Some((id, display, *class, a.len()));
            }
        }
    }
    best.map(|(id, display, class, _)| ResolvedEntity {
        id: id.to_string(),
        display: display.to_string(),
        class,
    })
}

/// The canonical, brand-free primary alias for an entity id (e.g. "operator-zero" → "operador zero"), used
/// by conversational-reference resolution ([`crate::context`]) to rebuild a self-contained, scope-resolvable
/// query from a prior turn's entity id. `None` when the id is not a known ecosystem entity.
pub fn primary_alias(entity_id: &str) -> Option<String> {
    ENTITIES
        .iter()
        .find(|(id, ..)| *id == entity_id)
        .and_then(|(_, _, _, aliases)| aliases.first().map(|a| a.to_string()))
}

/// The artifact the question is asking for. `None` = no specific artifact named.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArtifactIntent {
    None,
    ProtocolManifest,
    ImplementationManifest,
    KeyManifest,
    Discovery,
    SignedMetadata,
    RevocationList,
    Receipt,
    EvidenceBundle,
    ConformanceProfileDeclared,
}

impl ArtifactIntent {
    pub fn as_str(&self) -> &'static str {
        match self {
            ArtifactIntent::None => "none",
            ArtifactIntent::ProtocolManifest => "protocol_manifest",
            ArtifactIntent::ImplementationManifest => "implementation_manifest",
            ArtifactIntent::KeyManifest => "key_manifest",
            ArtifactIntent::Discovery => "discovery",
            ArtifactIntent::SignedMetadata => "signed_metadata",
            ArtifactIntent::RevocationList => "revocation_list",
            ArtifactIntent::Receipt => "receipt",
            ArtifactIntent::EvidenceBundle => "evidence_bundle",
            ArtifactIntent::ConformanceProfileDeclared => "conformance_profile_declared",
        }
    }
    /// Human, PT label for the artifact — used in the honest live-required answer.
    pub fn label_pt(&self) -> &'static str {
        match self {
            ArtifactIntent::None => "artefacto",
            ArtifactIntent::ProtocolManifest => "Manifesto do Protocolo",
            ArtifactIntent::ImplementationManifest => "Manifesto da implementação",
            ArtifactIntent::KeyManifest => "Manifesto de Chaves",
            ArtifactIntent::Discovery => "documento de descoberta (discovery)",
            ArtifactIntent::SignedMetadata => "metadata assinada",
            ArtifactIntent::RevocationList => "lista de revogação",
            ArtifactIntent::Receipt => "recibo",
            ArtifactIntent::EvidenceBundle => "Evidence Bundle",
            ArtifactIntent::ConformanceProfileDeclared => "perfil de conformidade declarado",
        }
    }
    /// Artifacts an operator/implementation PUBLISHES at its canonical origin — i.e. LIVE, per-entity
    /// artifacts. When one of these co-occurs with an operator/implementation entity, the answer must
    /// come from that implementation's live artifact, not a generic protocol document.
    pub fn is_implementation_scoped(&self) -> bool {
        matches!(
            self,
            ArtifactIntent::ImplementationManifest
                | ArtifactIntent::KeyManifest
                | ArtifactIntent::Discovery
                | ArtifactIntent::SignedMetadata
                | ArtifactIntent::RevocationList
                | ArtifactIntent::Receipt
                | ArtifactIntent::EvidenceBundle
                | ArtifactIntent::ConformanceProfileDeclared
        )
    }
    fn from_str(s: &str) -> ArtifactIntent {
        match s {
            "protocol_manifest" => ArtifactIntent::ProtocolManifest,
            "implementation_manifest" => ArtifactIntent::ImplementationManifest,
            "key_manifest" => ArtifactIntent::KeyManifest,
            "discovery" => ArtifactIntent::Discovery,
            "signed_metadata" => ArtifactIntent::SignedMetadata,
            "revocation_list" => ArtifactIntent::RevocationList,
            "receipt" => ArtifactIntent::Receipt,
            "evidence_bundle" => ArtifactIntent::EvidenceBundle,
            "conformance_profile_declared" => ArtifactIntent::ConformanceProfileDeclared,
            _ => ArtifactIntent::None,
        }
    }
}

fn has(nq: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| nq.contains(n))
}

/// Resolve the artifact intent from a question. `entity_publishes` = an operator/implementation entity was
/// resolved (so a bare "manifesto" means THAT implementation's manifest, not the Protocol Manifesto).
/// Most-specific qualifier wins; only when nothing more specific matches does the bare manifest token
/// fall back to Protocol vs Implementation by entity presence.
pub fn resolve_artifact(query: &str, entity_publishes: bool) -> ArtifactIntent {
    let nq = normalize(query);
    if has(
        &nq,
        &[
            "manifesto de chaves",
            "manifesto das chaves",
            "manifesto de chave",
            "key manifest",
            "keymanifest",
            "manifesto de keys",
        ],
    ) {
        return ArtifactIntent::KeyManifest;
    }
    if has(
        &nq,
        &[
            "evidence bundle",
            "pacote de evidencia",
            "pacote de evidencias",
            "bundle de evidencia",
        ],
    ) {
        return ArtifactIntent::EvidenceBundle;
    }
    if has(
        &nq,
        &[
            "lista de revogacao",
            "revocation list",
            "lista de revogacoes",
        ],
    ) {
        return ArtifactIntent::RevocationList;
    }
    if has(
        &nq,
        &[
            "metadata assinada",
            "metadados assinados",
            "signed metadata",
            "signed protocol metadata",
            "metadata do protocolo assinada",
        ],
    ) {
        return ArtifactIntent::SignedMetadata;
    }
    if has(
        &nq,
        &[
            "operationreceipt",
            "journeyreceipt",
            "recibo de operacao",
            "recibo da operacao",
            "recibo de jornada",
            "recibo da jornada",
        ],
    ) {
        return ArtifactIntent::Receipt;
    }
    if has(
        &nq,
        &[
            "perfil declarado",
            "declared profile",
            "perfil da implementacao",
            "perfil do operador",
        ],
    ) {
        return ArtifactIntent::ConformanceProfileDeclared;
    }
    // Discovery document. "discovery" is unambiguous; the bare PT concept "descoberta" is only an
    // ARTIFACT request when an implementation entity is present (otherwise it is the discovery concept,
    // left to concept resolution).
    if has(
        &nq,
        &["documento de discovery", "discovery document", "discovery"],
    ) || (entity_publishes && has(&nq, &["descoberta", "documento de descoberta"]))
    {
        return ArtifactIntent::Discovery;
    }
    // Explicit protocol-manifest phrasing pins the Protocol Manifesto even if an entity is present.
    if has(
        &nq,
        &[
            "manifesto do protocolo",
            "manifesto do banza",
            "manifesto banza",
            "protocol manifest",
            "manifesto de protocolo",
        ],
    ) {
        return ArtifactIntent::ProtocolManifest;
    }
    // Bare manifest token: entity scope decides. An operator/implementation entity → that implementation's
    // manifest; otherwise the Protocol Manifesto (the protocol's own manifesto).
    if has(&nq, &["manifesto", "manifest"]) {
        return if entity_publishes {
            ArtifactIntent::ImplementationManifest
        } else {
            ArtifactIntent::ProtocolManifest
        };
    }
    ArtifactIntent::None
}

/// The combined entity+artifact+scope decision — serialized to the TS layer (Rust decides, TS transports).
/// `requires_live_tool` is the sovereign signal that the answer must come from a specific implementation's
/// LIVE artifact (fetched via the secure pipeline in BZC-2), NOT the generic protocol document — this is
/// what stops "manifesto do operador zero" resolving to the Protocol Manifesto.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScopeDecision {
    pub entity_id: String,
    pub entity_display: String,
    pub entity_type: String,
    /// protocol | operator | implementation
    pub protocol_scope: String,
    pub artifact_type: String,
    pub requires_live_tool: bool,
    /// none | live_tool  — the class of authority the answer requires.
    pub authority_requirement: String,
    pub resolution_method: String,
}

pub fn resolve_scope(query: &str) -> ScopeDecision {
    let entity = resolve_entity(query);
    let entity_publishes = entity
        .as_ref()
        .map(|e| e.class.publishes_artifacts())
        .unwrap_or(false);
    let artifact = resolve_artifact(query, entity_publishes);
    let requires_live_tool = entity_publishes && artifact.is_implementation_scoped();
    let (entity_id, entity_display, entity_type, protocol_scope) = match &entity {
        Some(e) => (
            e.id.clone(),
            e.display.clone(),
            e.class.as_str().to_string(),
            e.class.as_str().to_string(),
        ),
        None => (
            String::new(),
            String::new(),
            String::new(),
            "protocol".to_string(),
        ),
    };
    ScopeDecision {
        entity_id,
        entity_display,
        entity_type,
        protocol_scope,
        artifact_type: artifact.as_str().to_string(),
        requires_live_tool,
        authority_requirement: if requires_live_tool {
            "live_tool"
        } else {
            "none"
        }
        .to_string(),
        resolution_method: "rust_entity_artifact_scope".to_string(),
    }
}

/// Deterministic, honest answer (PT markdown) for a live-required artifact request while the live tool is
/// not yet deployed (BZC-1, pre-BZC-2). NAMES the entity + implementation artifact, DISTINGUISHES it from
/// the Protocol Manifesto, and states the live tool is not yet available — it NEVER substitutes the
/// Protocol Manifesto and NEVER simulates the artifact's content. 0 model calls. Once BZC-2 lands, the
/// pipeline fetches and shows the artifact instead of this fallback.
pub fn live_required_answer(scope: &ScopeDecision) -> String {
    let artifact = ArtifactIntent::from_str(&scope.artifact_type);
    let alabel = artifact.label_pt();
    let entity = if scope.entity_display.is_empty() {
        "a implementação".to_string()
    } else {
        scope.entity_display.clone()
    };
    format!(
        "Identifiquei o pedido do **{alabel} do {entity}** — um artefacto **da implementação**, publicado \
por essa implementação na sua origem canónica. É distinto do **Manifesto do Protocolo** (o documento do \
próprio protocolo BANZA).\n\n\
Esta versão do BanzAI ainda **não tem a ferramenta live disponível** para obter esse artefacto na origem \
canónica, por isso **não mostro o seu conteúdo** nem o substituo por qualquer documento do protocolo. \
Pode consultá-lo ao vivo na **jornada de validação** do BanzAI e no **Registo Técnico** da implementação.\n\n\
_Os motores verificam; a evidência prova; a governação decide — o BanzAI orienta e não inventa o conteúdo de \
um artefacto que não obteve._"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn acceptance_manifesto_do_operador_zero_is_implementation_scoped_live() {
        for q in [
            "me mostre o manifesto do operador zero",
            "mostre o manifesto do Operator Zero",
            "manifesto do operator-zero",
            "qual e o manifesto da implementação de referência do operador zero",
        ] {
            let d = resolve_scope(q);
            assert_eq!(d.entity_id, "operator-zero", "{q}");
            assert_eq!(d.entity_display, "Operador Zero", "{q}");
            assert_eq!(d.artifact_type, "implementation_manifest", "{q}");
            assert!(d.requires_live_tool, "{q}");
            assert_eq!(d.authority_requirement, "live_tool", "{q}");
            // honest answer names the implementation manifest + Operador Zero, and does NOT cite the protocol doc
            let a = live_required_answer(&d);
            assert!(a.contains("Manifesto da implementação"), "{q}");
            assert!(a.contains("Operador Zero"), "{q}");
            assert!(a.contains("Manifesto do Protocolo"), "{q}"); // to DISTINGUISH, not as the answer
            assert!(!a.contains("simul"), "{q}"); // never simulate
        }
    }

    #[test]
    fn protocol_manifest_stays_documental() {
        for q in [
            "o que é o manifesto do protocolo",
            "manifesto do protocolo BANZA",
            "manifesto",
            "explica o manifesto",
        ] {
            let d = resolve_scope(q);
            assert_eq!(d.artifact_type, "protocol_manifest", "{q}");
            assert!(!d.requires_live_tool, "{q}");
            assert_eq!(d.entity_id, "", "{q}");
            assert_eq!(d.protocol_scope, "protocol", "{q}");
        }
    }

    #[test]
    fn key_manifest_and_other_impl_artifacts_scope_to_the_entity() {
        for (q, want) in [
            (
                "mostra o manifesto de chaves do operador zero",
                "key_manifest",
            ),
            ("qual é o discovery do operador zero", "discovery"),
            (
                "mostra o evidence bundle do operador zero",
                "evidence_bundle",
            ),
            (
                "qual a lista de revogação do operador zero",
                "revocation_list",
            ),
            (
                "mostra a metadata assinada do operador zero",
                "signed_metadata",
            ),
            ("mostra o recibo de operação do operador zero", "receipt"),
        ] {
            let d = resolve_scope(q);
            assert_eq!(d.entity_id, "operator-zero", "{q}");
            assert_eq!(d.artifact_type, want, "{q}");
            assert!(d.requires_live_tool, "{q}");
        }
    }

    #[test]
    fn explicit_protocol_manifest_wins_even_with_entity_absent() {
        let d = resolve_scope(
            "qual a diferença entre o manifesto do protocolo e o manifesto de uma implementação",
        );
        assert_eq!(d.artifact_type, "protocol_manifest");
        assert!(!d.requires_live_tool);
    }

    #[test]
    fn bare_key_manifest_without_entity_is_not_live() {
        let d = resolve_scope("o que é um manifesto de chaves");
        assert_eq!(d.artifact_type, "key_manifest");
        assert!(!d.requires_live_tool, "no entity ⇒ conceptual, not live");
        assert_eq!(d.entity_id, "");
    }

    #[test]
    fn no_artifact_no_entity_is_inert() {
        let d = resolve_scope("como funciona a federação entre operadores");
        assert_eq!(d.artifact_type, "none");
        assert!(!d.requires_live_tool);
        assert_eq!(d.entity_id, "");
    }

    #[test]
    fn descoberta_concept_without_entity_is_not_an_artifact() {
        let d = resolve_scope("o que é a descoberta no protocolo");
        assert!(!d.requires_live_tool);
    }

    #[test]
    fn english_variants_resolve_the_entity_and_artifact() {
        let d = resolve_scope("show the key manifest of operator zero");
        assert_eq!(d.entity_id, "operator-zero");
        assert_eq!(d.artifact_type, "key_manifest");
        assert!(d.requires_live_tool);
    }

    #[test]
    fn adversarial_protocol_manifest_used_by_entity_stays_documental() {
        // "manifesto do protocolo usado pelo Operator Zero" — the artifact asked for is the PROTOCOL
        // manifesto (explicit qualifier), not an implementation artifact → documental, not live.
        let d = resolve_scope("manifesto do protocolo usado pelo Operator Zero");
        assert_eq!(d.artifact_type, "protocol_manifest");
        assert!(!d.requires_live_tool);
    }

    #[test]
    fn scope_json_serializes() {
        let d = resolve_scope("manifesto do operador zero");
        let j = serde_json::to_string(&d).unwrap();
        assert!(j.contains("\"requires_live_tool\":true"));
        assert!(j.contains("\"entity_id\":\"operator-zero\""));
        assert!(j.contains("\"artifact_type\":\"implementation_manifest\""));
    }
}
