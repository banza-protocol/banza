# Canonical subject & vocabulary review (M2.18B.7 DFN — semantic audit)

Registry-first vocabulary: subjects/aliases/relations/attributes/document-types/artifact-types are derived
from the engine's own registries + closed protocol sets; corpus terms are Phase-1 candidates (noise
rejected before the vocabulary). Deterministic, no model.

## Counts
- subjects: 21
- document_types: 12
- document_instances: 86
- artifact_types: 18
- aliases: 262
- relation_kinds: 11
- relation_aliases: 24
- relation_edges: 135
- attributes: 11
- task_terms: 20
- historical_terms: 6
- out_of_scope: 7
- unresolved: 0

## Candidate pipeline (Phase 1 — noise separated from vocabulary)
- total candidates: 6114
- accepted (terminology): 1007
- rejected (lexical noise / non-terminological): 5107
  - NON_TERMINOLOGICAL: 3414
  - GENERIC_PROSE: 1110
  - PATH_FRAGMENT: 342
  - MARKUP_FRAGMENT: 45
  - BROKEN_TOKEN: 189
  - STOPWORD: 7

## Coverage gates
- unresolved: 0
- orphaned: 0
- conflicted: 0
- vocabulary_subjects_missing_from_truth_table: []
- truth_table_concept_subjects_missing_from_vocabulary: []
- truth_table_doc_rows_missing_from_vocabulary: []
- engine_alias_without_mapping: 0
- relation_alias_without_kind: 0
- lexical_noise_in_vocabulary: 0
- out_of_scope_is_curated_not_fallback: true

## Subjects (the derived authority — each a possible main subject of a supported question)
- **operador** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example] — sources [ADR-001, operator-manifest-schema]
- **federacao** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, procedure] — sources [ADR-038, ADR-040, operator-manifest-schema]
- **manifest** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure, template] — sources [operator-manifest-schema]
- **revogacao** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, procedure] — sources [revocation-entry-schema, ADR-040]
- **trust** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, template] — sources [ADR-038, ADR-040, federation-trust-evaluation-schema]
- **evidencia** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, template] — sources [evidence-bundle-schema, conformance-evidence-schema, ADR-039]
- **conformidade** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, procedure, template] — sources [ADR-021, ADR-039, conformance-evidence-schema]
- **participacao** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure] — sources [ADR-039, operator-manifest-schema, ADR-040]
- **chave** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure, template] — sources [key-manifest-schema, revocation-entry-schema]
- **root** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure, template] — sources [trust-root-metadata-schema, root-metadata-schema, root-key-schema, ADR-028, ADR-038]
- **interoperabilidade** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, template] — sources [federation-manifest-schema, ADR-040]
- **banza** (entity) — entity coverage (coverage.rs) + attribute terminal + trunk — deliverables [] — sources [ADR-001, ADR-002]
- **banzai** (entity) — entity coverage + trunk — deliverables [] — sources [ADR-041, ADR-054]
- **banzami** (entity) — entity coverage + attribution (GOVERNANCE) — deliverables [] — sources [ADR-002, GOVERNANCE]
- **governanca** (concept) — trunk synthesis (documented process; no deterministic terminal) — deliverables [] — sources [GOVERNANCE]
- **endpoint** (artefact) — trunk synthesis over OpenAPI (no deterministic terminal) — deliverables [] — sources [openapi]
- **ledger** (concept) — trunk synthesis grounded in ADR-006 (double-entry ledger + monetary precision) — deliverables [] — sources [ADR-006]
- **wallet** (concept) — trunk synthesis grounded in ADR-010 (wallet-native identity) / account model — deliverables [] — sources [ADR-010]
- **liquidacao** (concept) — trunk synthesis grounded in the settlement invariants (INV-SETTLE) — deliverables [] — sources [ADR-006]
- **qr** (artefact) — trunk synthesis grounded in ADR-012 (QR payment system) / ADR-015 (payment session) — deliverables [] — sources [ADR-012]
- **webhook** (artefact) — trunk synthesis grounded in the webhook/event contracts — deliverables [] — sources [webhooks]

## Why the numbers differ (reconciliation)
- The vocabulary has 21 SUBJECTS (concepts/entities/artefacts) — the things that can be the main subject of a question. Document instances (86 ADR/RFC) are DOCUMENT_INSTANCE, not subjects.
- 11 of the subjects carry a catalogue SubjectProfile (deterministic deliverable terminals); the rest resolve via entity coverage or trunk synthesis.
- The 262 engine aliases map to 34 canonical targets (mostly document instances + concepts) — aliases are ALIAS, not subjects.
- Relations: 11 RELATION_KIND (closed) + 24 RELATION_ALIAS + 135 graph edges — not "135 relation types".

## Review policy
- A subject is a concept/entity/artefact/document that can be the MAIN semantic subject of a supported question — never promoted by frequency/heading/substring alone.
- OUT_OF_SCOPE is curated (semantically-real, non-protocol) with a reason — never the fallback for an unmapped term (those are UNRESOLVED, gated to 0).
- HISTORICAL terms are retained as history only.
