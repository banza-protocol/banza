# Canonical subject & vocabulary review (M2.18B.7 DFN — semantic audit)

Registry-first vocabulary: subjects/aliases/relations/attributes/document-types/artifact-types are derived
from the engine's own registries + closed protocol sets; corpus terms are Phase-1 candidates (noise
rejected before the vocabulary). Deterministic, no model.

## Counts
- subjects: 21
- document_types: 12
- document_instances: 45
- artifact_types: 18
- aliases: 248
- relation_kinds: 11
- relation_aliases: 24
- relation_edges: 8
- attributes: 11
- task_terms: 20
- historical_terms: 6
- out_of_scope: 7
- unresolved: 0

## Candidate pipeline (Phase 1 — noise separated from vocabulary)
- total candidates: 3114
- accepted (terminology): 674
- rejected (lexical noise / non-terminological): 2440
  - NON_TERMINOLOGICAL: 1703
  - GENERIC_PROSE: 542
  - PATH_FRAGMENT: 89
  - BROKEN_TOKEN: 80
  - STOPWORD: 7
  - MARKUP_FRAGMENT: 19

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
- **federacao** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, procedure] — sources [ADR-025, ADR-025, operator-manifest-schema]
- **manifest** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure, template] — sources [operator-manifest-schema]
- **revogacao** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, procedure] — sources [revocation-entry-schema, ADR-025]
- **trust** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, template] — sources [ADR-025, ADR-025, federation-trust-evaluation-schema]
- **evidencia** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, template] — sources [evidence-bundle-schema, conformance-evidence-schema, ADR-031]
- **conformidade** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, procedure, template] — sources [ADR-030, ADR-031, conformance-evidence-schema]
- **participacao** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure] — sources [ADR-031, operator-manifest-schema, ADR-025]
- **chave** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure, template] — sources [key-manifest-schema, revocation-entry-schema]
- **root** (artefact) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [procedure, template] — sources [trust-root-metadata-schema, root-metadata-schema, root-key-schema, ADR-027, ADR-025]
- **interoperabilidade** (concept) — deterministic-terminal (catalogue SubjectProfile) + trunk synthesis — deliverables [example, template] — sources [federation-manifest-schema, ADR-025]
- **banza** (entity) — entity coverage (coverage.rs) + attribute terminal + trunk — deliverables [] — sources [ADR-001, ADR-001]
- **banzai** (entity) — entity coverage + trunk — deliverables [] — sources [ADR-036, ADR-036]
- **banzami** (entity) — entity coverage + attribution (GOVERNANCE) — deliverables [] — sources [ADR-001, GOVERNANCE]
- **governanca** (concept) — trunk synthesis (documented process; no deterministic terminal) — deliverables [] — sources [GOVERNANCE]
- **endpoint** (artefact) — trunk synthesis over OpenAPI (no deterministic terminal) — deliverables [] — sources [openapi]
- **ledger** (concept) — trunk synthesis grounded in ADR-012 (double-entry ledger + monetary precision) — deliverables [] — sources [ADR-012]
- **wallet** (concept) — trunk synthesis grounded in ADR-014 (wallet-native identity) / account model — deliverables [] — sources [ADR-014]
- **liquidacao** (concept) — trunk synthesis grounded in the settlement invariants (INV-SETTLE) — deliverables [] — sources [ADR-012]
- **qr** (artefact) — trunk synthesis grounded in ADR-015 (QR payment system) / ADR-015 (payment session) — deliverables [] — sources [ADR-015]
- **webhook** (artefact) — trunk synthesis grounded in the webhook/event contracts — deliverables [] — sources [webhooks]

## Why the numbers differ (reconciliation)
- The vocabulary has 21 SUBJECTS (concepts/entities/artefacts) — the things that can be the main subject of a question. Document instances (45 ADR/RFC) are DOCUMENT_INSTANCE, not subjects.
- 11 of the subjects carry a catalogue SubjectProfile (deterministic deliverable terminals); the rest resolve via entity coverage or trunk synthesis.
- The 248 engine aliases map to 25 canonical targets (mostly document instances + concepts) — aliases are ALIAS, not subjects.
- Relations: 11 RELATION_KIND (closed) + 24 RELATION_ALIAS + 8 graph edges — not "8 relation types".

## Review policy
- A subject is a concept/entity/artefact/document that can be the MAIN semantic subject of a supported question — never promoted by frequency/heading/substring alone.
- OUT_OF_SCOPE is curated (semantically-real, non-protocol) with a reason — never the fallback for an unmapped term (those are UNRESOLVED, gated to 0).
- HISTORICAL terms are retained as history only.
