.PHONY: assurance-meta-check r2s2-principles-check semantic-closure-check no-availability-bypass-check banzai-outside-critical-path-check assurance-check mutation-proofs protocol-version-consistency-check ci-workflow-contract-check website-decisions-parity-check root-threshold-model-check adr-canonical-clean-check identity-check regulatory-check private-key-leak-check open-governance-check public-surface-clean-check workbench-only-check governance-docs-clean-check homepage-final-public-release-check homepage-final-validation-check global-navigation-final-check home-minimal-check home-layout-copy-check website-public-copy-current-check postgres-data-boundary-check operator-onboarding-check operator-zero-origin-closure-check banzai-operator-experience-check banza-whitepaper-check whitepaper-canonical-source-boundary-check public-claims-evidence reference-information-architecture-check license-notice-governance-check banza-three-layer-architecture-check banza-banzami-scheme-role-check banza-regulatory-state-claim-check banza-real-money-activation-check banza-protocol-scheme-separation-check banza-conflict-of-interest-check banza-certification-admission-separation-check banza-certification-model-check certification-page-check technical-registry-page-check glossary-page-check public-surface-canonical-check home-canonical-check retired-page-removal-check home-readiness-check banzai-post-synthesis-validation-check banzai-runtime-ssot-check banzai-simb-active-surface-clean-check banzai-canonical-architecture-framing-check banzai-reference-canonical-check banzai-architecture-manifest-check banzai-monorepo-consolidation-check git-authorship-identity-check technical-registry-naming-parity-check banzai-mark-consistency-check banzai-degraded-mode-render-check banzai-local-inference-check banzai-public-interface-check banzai-qwen-routing-check banzai-action-boundary-check banzai-financial-action-boundary-check banzai-operational-telemetry-check banzai-contextual-fallback-check banzai-toolplanner-check banzai-progress-contract-check banzai-progress-endpoint-check banzai-progressive-ui-check banzai-factual-package-check banzai-question-families-check banzai-multiturn-context-check banzai-canonical-eval-check banzai-robustness-observability-check banzai-interface-transparency-check banzai-intent-first-grounded-reasoning-check banzai-grounded-synthesis-architecture-check banzai-old-architecture-clean-check banzai-single-synthesis-contract-check banzai-intent-engine-quality-check banzai-boundary-semantic-recovery-check banzai-entity-formatting-consistency-check banzai-inference-queue-readiness-check banzai-short-query-recovery-check banzai-semantic-answer-composition-check banzai-unified-markdown-rendering-check banzai-operator-publication-boundary-check banzai-workbench-navigation-orchestration-check banzai-primary-interface-architecture-check banzai-public-surface-final-consistency-check banzai-repo-knowledge-safety-check banzai-repository-wide-knowledge-check banzai-answer-quality-eval-check banzai-bzc-coverage-check banzai-canonical-corpus-integrity-check banzai-canonical-knowledge-coverage-check banzai-synthesis-latency-check banzai-single-production-pipeline-check banzai-typo-intent-recovery-check banzai-canonical-alias-integrity-check banzai-intent-source-ranking-check banzai-answer-rendering-ux-check banzai-protocol-origin-intent-check banzai-protocol-vocabulary-check banzai-global-answer-format-contract-check banzai-governance-developer-vocabulary-check banzai-knowledge-quality-check banzai-agent-quality-check banzai-operator-journey-check banzai-model-a-guidance-only-check banzai-upload-copy-check banzai-docs-current-state-check banzai-document-aware-agent-check banzai-document-explanation-quality-check banzai-session-context-robustness-check banzai-operator-journey-e2e-check banzai-release-qa-check banzai-vocabulary-contract-check operator-zero-check operator-zero-vocabulary-contract-check operator-zero-public-hardening-check zero-subdomain-design-check zero-subdomain-routing-check operator-zero-standalone-surface-check banzai-single-interface-check operator-zero-full-e2e-check operator-zero-realistic-journey-check operator-zero-only-architecture-check banzai-operator-zero-only-ui-check operator-zero-only-docs-examples-check reference-chapter-order-check reference-svg-check svg-visual-quality-check banzai-protocol-agent-check federation-relation-boundary-check governance-authority-boundary-check developer-resources-boundary-check reference-roadmap-durability-check reference-faq-semantic-consistency-check canonical-discovery-surface-check standalone-roadmap-surface-check related-work-boundary-check normative-discoverability-check implementation-sets clean-room-package clean-room-package-check purity-check invariant-check conformance-check crypto-check \
        rust-rule-check no-new-ts-engine-check rust-engine-check \
        conformance-rs-check conformance-rs-test conformance-rs-parity \
        trust-rs-check trust-rs-test trust-rs-signing-check trust-rs-ceremony-sim-check \
        simb-rs-check conformance-rs-live-check conformance-rs-fed-check conformance-fed-fixtures-check conformance-ab-check normative-surface-integrity-check rust-final-closure-check \
        repo-guards-rs-check repo-guards-rs-test \
        banzai-operator-validation-mode-check banzai-operator-implementation-model-check banzai-endpoint-originated-validation-check banzai-no-manual-input-official-flow-check banzai-draft-validation-isolation-check banzai-closed-target-registry-check banzai-no-arbitrary-url-check banzai-secure-fetcher-check banzai-fetch-receipt-binding-check banzai-nine-step-endpoint-input-check banzai-single-results-area-check banzai-no-duplicate-tabs-check banzai-no-orphan-tabs-check banzai-contextual-actions-check banzai-contextual-right-panel-check banzai-certification-readiness-language-check banzai-operator-zero-parity-check banzai-operator-zero-no-bypass-check banzai-operator-zero-public-e2e-check banzai-no-fixture-as-production-evidence-check banzai-receipt-origin-fields-check banzai-journey-receipt-origin-check banzai-no-qwen-decision-check banzai-rust-fetch-authority-check banzai-semantic-regression-check banzai-accessibility-check banzai-responsive-check banzai-endpoint-readiness-check \
        pre-commit help

RUST_GUARD := engines/rust-rule-guard
RUST_GUARD_BIN := $(RUST_GUARD)/target/release/rust-rule-guard
ALLOWLIST := docs/governance/rust-first-legacy-allowlist.json

REPO_GUARDS_RS := engines/banza-repo-guards

# ── Identity guard ────────────────────────────────────────────────────────────
# identity/purity/invariant/openapi gate LOGIC lives in the Rust crate engines/banza-repo-guards
# (R10). The tools/*.sh scripts below are thin RUST_WRAPPER_ONLY wrappers over that binary.

## identity-check: Verify no operator-specific brand contamination in BANZA (Rust gate)
identity-check:
	@tools/check-operator-contamination.sh

## regulatory-check: Verify BANZA is positioned as an open protocol, not a PSP/licensed operator (BX1.8A)
regulatory-check:
	@tools/check-regulatory-claims.sh

## private-key-leak-check: Ensure no real private-key material is committed (M2.1 root ceremony)
private-key-leak-check:
	@tools/check-private-key-leak.sh

## open-governance-check: Verify no central human authority over operators (M2.2 open protocol governance)
open-governance-check:
	@tools/check-open-governance.sh

## public-surface-clean-check: Verify no removed operator-certificate labels / BANZA CA / corpus / KB on public surfaces (M2.5)
public-surface-clean-check:
	@tools/check-public-surface-clean.sh

## workbench-only-check: Verify the operator verification path is the BanzAI Workbench, not pip/docker/CLI/GitHub-Action (M2.5 addendum)
workbench-only-check:
	@tools/check-workbench-only.sh

## governance-docs-clean-check: Verify governance docs present only the active open-protocol trust model — no BANZA CA / operator certificate / certified operator / human approval / Verificação Tripla / operator-facing pip/Docker/CI (M2.6)
governance-docs-clean-check:
	@bash tools/check-governance-docs-clean.sh

## homepage-final-public-release-check: Verify the final public-release homepage — canonical section order, one H1, Hero contract, ADR-036 architecture (BanzAI is the primary human-operator interface, not a mandatory layer), machine-to-machine independence, neutrality, metadata, footer dedup and links (M2.15A)
homepage-final-public-release-check:
	@bash tools/check-homepage-final-public-release.sh

## homepage-final-validation-check: Verify the M2.17 homepage audit — canonical copy (agente de IA, evidência verificável, no "a base"), three-tier header, real CTA routes, no ambiguous "Começar a implementar", hardened single-submit BanzAI field, reduced-motion + off-viewport animation, and no retired vocabulary on the directly-linked public surfaces (M2.17)
homepage-final-validation-check:
	@bash tools/check-homepage-final-validation.sh

## footer-banzai-zero-navigation-check: Verify the M2.17A footer navigation — two distinct BanzAI entry paths (Abrir o BanzAI → Perguntar; Analisar um artefacto → Guia via a server-read ?view=guia deep link) and a discoverable Operador Zero simulator external link (new tab, noopener noreferrer, "— simulador", demo-only, not in the header) (M2.17A)
footer-banzai-zero-navigation-check:
	@bash tools/check-footer-banzai-zero-navigation.sh

## global-navigation-final-check: Verify the global navigation is exactly three distinct public destinations (Operadores · BanzAI · Ler a referência) in order, with no Protocolo/Confiança/Programadores dropdowns, submenus or arrows, a single active state and neutral operator language (M2.15B)
global-navigation-final-check:
	@bash tools/check-global-navigation-final.sh

## home-minimal-check: Verify the homepage keeps the eight-section public-release shape in order, no removed documentation sections, no removed-model vocabulary, and BANZA not mis-positioned as bank/PSP/operator (M2.7B → M2.15A)
home-minimal-check:
	@bash tools/check-home-minimal.sh

## home-layout-copy-check: Verify the homepage keeps section headings left-aligned, the footer boundary line short (no long legal disclaimer), and no retired product/demo/certification vocabulary or milestone tags in public copy (M2.9E)
home-layout-copy-check:
	@bash tools/check-home-layout-copy.sh

## website-public-copy-current-check: Verify the CURRENT public copy matches the deployed protocol-agent architecture — no "BanzAI Agent"/"Assistente" identity, no retired CA/certificate or demonstration-mode wording, footer short, /estado states the live BanzAI posture (archival ADR bodies excluded) (M2.9F)
website-public-copy-current-check:
	@bash tools/check-website-public-copy-current.sh

## postgres-data-boundary-check: Verify the protocol PostgreSQL schema holds protocol state, not financial value — no funds/balances/transactions/IBAN/cards/KYC/PII/private-key/secret identifiers (M2.7K, ADR-013)
postgres-data-boundary-check:
	@bash tools/check-postgres-data-boundary.sh

## receipts-e2e: Durable validation-receipt E2E (ADR-036) against a THROWAWAY pgvector container — store + fail-safe facade + outbox + crash-recovery + DB-enforced append-only immutability + PG-DOWN fail-safe. Needs Docker; not part of the CI node battery (opt-in, like the schema validator).
receipts-e2e:
	@bash services/banzai-api/e2e/run-receipts-e2e.sh

## operator-onboarding-check: Verify the BanzAI-hosted operator onboarding contract — Rust decides, well-known path parity, secrets env-only (no key/pepper in Git), dark by default, schema stores digests only, same-origin route + pg, __Host- SameSite=Strict cookie (M2.19G.3, ADR-037)
operator-onboarding-check:
	@bash tools/check-operator-onboarding.sh

## operator-zero-origin-closure-check: Verify the Operador Zero origin-proof closure — independent OZ-origin static challenge (nginx alias, 405/no-store), read-only compose mount, verifier never serves its own challenge, single-use consume + replay refusal, secure-fetcher-only egress, reconcile binds to the closed registry (no operator creation / no /operators write / no OZ verdict bypass), no committed nonce (M2.19G.3A, ADR-037)
operator-zero-origin-closure-check:
	@bash tools/check-operator-zero-origin-closure.sh

## banzai-operator-experience-check: Verify the BanzAI operator-experience canonicalization — the Validar operador + Onboarding surfaces read the operator/implementation list and the protocol option sets (version/profile/environment) from the ONE Rust registry source (banza-target-registry) via /validate/registry + /validate/options; no hardcoded/drifted TS registry, no retired certification-outcome field, onboarding validates the declared profile against the canonical sets (fail-closed), human state labels; Rust decides / TS displays (M2.19G.3B)
banzai-operator-experience-check:
	@bash tools/check-banzai-operator-experience.sh

## public-claims-evidence: Executable evidence gate for the public technical claims — Rust engine battery + conformance vectors + federation runner + negative rosters + hashed commit-pinned bundle manifest
public-claims-evidence:
	@bash tools/public-claims-evidence.sh

## whitepaper-canonical-source-boundary-check: Overleaf PT dossier is the editorial source; derivations fresh; retired renderer out of the release path; verify non-destructive; frozen edition wording intact
whitepaper-canonical-source-boundary-check:
	@bash tools/check-whitepaper-canonical-source-boundary.sh

## ci-workflow-contract-check: Every CI workflow parses (an unparseable one silently does not run), no job name carries an ADR number, milestone or phase label (a required status check keyed to a moving label breaks the merge gate silently), and job names are unique within a workflow
ci-workflow-contract-check:
	@bash tools/check-ci-workflow-contract.sh

## website-decisions-parity-check: The website ADR/RFC mirror is a byte-identical derivation of decisions/{adr,rfc}/ — same set, same bytes; it cannot drift and cannot carry content its source does not
website-decisions-parity-check:
	@bash tools/check-website-decisions-parity.sh

## r2s2-principles-check: BANZA has exactly four fundamental principles — Robust · Resilient · Secure · Simple — in canonical order, with no competing set published under that name
r2s2-principles-check:
	@bash tools/check-r2s2-principles.sh

## semantic-closure-check: a clean-room package contains global ∪ profile ∪ transitive normative dependencies — self-containment of what is present is not enough
semantic-closure-check:
	@bash tools/check-semantic-closure.sh

## no-availability-bypass-check: no code path weakens a trust check because something was unavailable
no-availability-bypass-check:
	@bash tools/check-no-availability-bypass.sh

## banzai-outside-critical-path-check: BanzAI is auxiliary — no protocol engine depends on it and no normative artifact requires it
banzai-outside-critical-path-check:
	@bash tools/check-banzai-outside-critical-path.sh

## assurance-meta-check: the assurance engine proving its own closed-world semantics on synthetic fixtures — absence of required evidence is never PASS
assurance-meta-check:
	@cargo test -q --manifest-path engines/banza-assurance/Cargo.toml --test closed_world_semantics

## assurance-check: the R²S² layered assurance gates — every claimed property must have a falsifiable evidence chain (AG-0…AG-10)
assurance-check: assurance-meta-check r2s2-principles-check semantic-closure-check no-availability-bypass-check banzai-outside-critical-path-check
	@cargo run -q --manifest-path engines/banza-assurance/Cargo.toml --bin banza-assurance -- report

## mutation-proofs: prove every critical property guard can go red, in isolated worktrees only
mutation-proofs:
	@bash tools/run-mutation-proofs.sh

## protocol-version-consistency-check: One protocol version, declared once — engine constants agree with contracts/production/protocol-version.json, no stale version on the current surface, major derived not hardcoded
protocol-version-consistency-check:
	@bash tools/check-protocol-version-consistency.sh

## root-threshold-model-check: The root authorization model is 2-of-3 and one model everywhere — engine constants, distinct-authority counting, the tested accept/reject matrix, no superseded (2-of-2) or future (3-of-5) model presented as current, the rule readable on a current authority, and the normative federation contract carrying the same quorum
root-threshold-model-check:
	@bash tools/check-root-threshold-model.sh

## banza-whitepaper-check: Verify the BANZA Whitepaper v1.0 contract — exact authorship (Fidel first) + Banzami affiliation, BANZA: title prefix, bilingual structural equivalence, 4 figures, 3 equations, 10-page released PDFs (no DRAFT watermark), SHA-256 manifest, no forbidden claims (regulatory/real-funds/BANZA-CA/DOI), additive Home hero CTA with primary preserved (WP1-FINAL)
banza-whitepaper-check:
	@bash tools/check-banza-whitepaper.sh

.PHONY: whitepaper-release whitepaper-verify whitepaper-figures
## whitepaper-release: CANONICAL Whitepaper v1.0 build — the single source of truth for the published PDFs (LaTeX/tectonic → xdvipdfmx, 12 pp, deterministic z-0 + SOURCE_DATE_EPOCH; tectonic version enforced). Regenerates .tex, compiles PT+EN, publishes PDFs, syncs the web mirror, updates manifest + CHECKSUMS, and runs banza-whitepaper-check. Idempotent (zero git diff on an unchanged tree).
whitepaper-release:
	@bash tools/whitepaper-release.sh
## whitepaper-verify: Reproducibility gate — rebuilds PT+EN in a temp dir and asserts they are byte-identical (SHA-256) to the committed canonical PDFs; makes NO writes and aborts on any divergence. Safe for CI / a fresh clone.
whitepaper-verify:
	@bash tools/whitepaper-release.sh --verify
## whitepaper-figures: Regenerate the 24 vector figure PDFs from the single-source SVGs (needs rsvg-convert). Figures are committed assets; run this only when a figure SVG changes, then `make whitepaper-release`.
whitepaper-figures:
	@python3 tools/whitepaper-figures.py

## reference-information-architecture-check: Lock the public reference IA — canonical chapter order (PostgreSQL=05, FAQ=14), clean cards, stable routes, no tool-list narrative (M2.7L)
reference-information-architecture-check:
	@bash tools/check-reference-information-architecture.sh

## layer-profile-naming-check: Enforce the naming split — Camada 1/2/3 for the institutional architecture (§4), L0–L4 reserved for the conformance profiles (§7); no bare L1/L2/L3 as a layer (Ch04)
layer-profile-naming-check:
	@bash tools/check-layer-profile-naming.sh

## estado-protocolar-portability-check: Keep §5 technology-neutral — PostgreSQL is implementation of reference, not a conformance requirement (Ch05)
estado-protocolar-portability-check:
	@bash tools/check-estado-protocolar-portability.sh

## trust-semantics-boundary-check: Keep §6 trust bounded — root signs only the Key Manifest, trust ≠ certification ≠ admission ≠ authorisation (Ch06)
trust-semantics-boundary-check:
	@bash tools/check-trust-semantics-boundary.sh

## operator-implementation-boundary-check: Keep §8 distinct — operator (entity) ≠ implementation (evaluated subject); one operator → many implementations; no property climbs to the entity as a global state (Ch08)
operator-implementation-boundary-check:
	@bash tools/check-operator-implementation-boundary.sh

## operator-zero-reference-boundary-check: Keep §9 honest — Operador Zero is a reference implementation (non-normative, non-production, no real funds, NOT_CERTIFIED, substitutable), not a privileged/first/official operator nor a specification (Ch09)
operator-zero-reference-boundary-check:
	@bash tools/check-operator-zero-reference-boundary.sh

## federation-relation-boundary-check: Keep §10 honest — federation is a bounded, local, per-interaction technical relation (ROUTING_ALLOWED/FAIL_CLOSED; L3 necessary-not-sufficient; non-symmetric; non-transitive; non-propagating; BANZA not in the trust or funds path), never a network/membership/authority/scheme/settlement/authorization (Ch10)
federation-relation-boundary-check:
	@bash tools/check-federation-relation-boundary.sh

## governance-authority-boundary-check: Keep §11 honest — governance is a public process of the maintainers over the RULES (invariants/contracts/perfis/versões), never a regulator/administrator of operators; the verdict (motor Camada 2), admission (Camada 3), authorisation (autoridades competentes) and commercial relationship each have another owner; no silent mutation, no retroactivity; the Trust Root signs only the Key Manifest and does not govern the protocol (Ch11)
governance-authority-boundary-check:
	@bash tools/check-governance-authority-boundary.sh

## developer-resources-boundary-check: Keep §13 honest — the normative artefacts (contracts/invariants/vectors) DEFINE the rules; tools/SDKs/reference code and the current stack merely help; never a protocol requirement of Rust/PostgreSQL/Docker/SDK for operators, never OpenAPI=whole-spec, Operador Zero to copy, BanzAI/Workbench certifies, or the stale mirror as a source (Ch13)
developer-resources-boundary-check:
	@bash tools/check-developer-resources-boundary.sh

## reference-roadmap-durability-check: Keep §14 durable — "Evolução do Protocolo" states only directions (possibilities, not promises); no M1–M6/dates/em-breve/first-operator/roadmap tokens, no unadopted future architecture (L5/Camada 4/CA); state→§5, process→§11 (Ch14)
reference-roadmap-durability-check:
	@bash tools/check-reference-roadmap-durability.sh

## reference-faq-semantic-consistency-check: Keep §15 a faithful compression layer — the FAQ states the canonical boundaries (federation/routing/trust/BanzAI/non-propagation/Operador Zero/evolution/state→§5) and re-introduces no roadmap/current-state/membership/profile-as-status shorthand; wrong-premise terms only in questions or negated in answers (Ch15)
reference-faq-semantic-consistency-check:
	@bash tools/check-reference-faq-semantic-consistency.sh

## clean-room-package: Build the clean-room export packages under clean-room/packages/<level>/ by positive allowlist from the Phase D implementation sets. Reproducible: two exports from the same commit are byte-identical
clean-room-package:
	@python3 tools/gen-clean-room-package.py L0

## clean-room-package-check: The clean-room export is safe to hand to an external team — negative test (no reference implementation, demonstration operator, assistant resource, credential or host address), closed (digests verified, provenance complete, every $$ref resolves inside, every outbound link declared as a non-dependency), stable (byte-identical across rebuilds), and the question ledger keeps its 7 closed classifications with L4 requiring an external profile id + version
clean-room-package-check:
	@bash tools/check-clean-room-package.sh

## implementation-sets: Regenerate the derived per-profile implementation sets (docs/derived/) and the public conformance package (conformance/package/) from the Normative Manifest and the conformance-profile registry. Deterministic: a re-run on an unchanged tree produces byte-identical output
implementation-sets:
	@python3 tools/gen-implementation-sets.py
	@python3 tools/gen-conformance-package.py

## normative-discoverability-check: The normative surface is navigable from outside — the profile registry L0–L4 is the single normative definition and agrees with the invariants/paths it names, derived views declare themselves derived and impose nothing, generation is deterministic, every orphan is either a registry gap (none) or declared with a reason, the public conformance package passes an isolation test in an empty directory (digests, no escaping path, every $ref resolves, every case has a determinable outcome), and no profile requires an ADR, the README, the BanzAI or reference code
normative-discoverability-check:
	@bash tools/check-normative-discoverability.sh

## related-work-boundary-check: Related work stays informative and bounded — docs/research/related-work-positioning.md declares itself outside the normative surface, the manifest excludes it and nothing normative derives a requirement from it, the four comparisons (Mojaloop, DID, VC, CT) each reach a stated conclusion with "do not adopt" permitted, Mojaloop keeps the FSPIOP-specification/reference-platform distinction (no absolutist hub claim; bilateral-or-Switch quoted; Layer 3 marked as BANZA's own reading), CT is quoted on its own split-view limitation and Experimental status, and the bounding sentence on the monotonic mechanism survives verbatim
related-work-boundary-check:
	@bash tools/check-related-work-boundary.sh

## standalone-roadmap-surface-check: Single canonical protocol-evolution surface — the standalone /roteiro page is retired (permanent redirect to /referencia/roteiro, no chain via /roadmap), the sitemap and nav carry no independent /roteiro document, and §14 "Evolução do Protocolo" remains the one canonical evolution surface
standalone-roadmap-surface-check:
	@bash tools/check-standalone-roadmap-surface.sh

## canonical-discovery-surface-check: One machine-readable discovery surface (ADR-029) — contract SSOT + Rust registry + Operador Zero all publish /.well-known/banza/operator.json + /.well-known/banza/signed-protocol-metadata.json; the retired /manifest.json + /signed-metadata.json root routes appear on no active surface; OTE positive satisfiability pinned (federation-capable manifest validated against the federation extension, not the candidate schema)
canonical-discovery-surface-check:
	@bash tools/check-canonical-discovery-surface.sh

## conformance-certification-boundary-check: Keep §7 distinct — L0–L4 are perfis (not camadas/certificados), validação ≠ prontidão ≠ certificação ≠ admissão ≠ autorização, no CA (Ch07)
conformance-certification-boundary-check:
	@bash tools/check-conformance-certification-boundary.sh

## trust-signing-chain-check: Keep the canonical trust chain Model-A across the reconciled surface — root signs only the Key Manifest; BRL by the revocation-domain key (ADR-025)
trust-signing-chain-check:
	@bash tools/check-trust-signing-chain.sh

## adr-canonical-clean-check: The decision-record tree is contiguous from 001, every referenced record resolves, and the index lists exactly the tree
adr-canonical-clean-check:
	@bash tools/check-adr-canonical-clean.sh

## root-authority-model-check: The Root authority model stays real at every layer — three authorities and threshold two fixed in the contract, the Key Manifest authorised by a SET rather than a single root key, a self-signed set rejected and a removed authority never required (both engine-verified), no emergency/override/break-glass path in the trust engines, and no organisation name in Root validity.
root-authority-model-check:
	bash tools/check-root-authority-model.sh

## adr-architecture-check: The decision-record tree records CURRENT architecture only — six canonical sections per record, no status/lifecycle headers, no normative keywords (a record explains, it never requires), no process records, delete-the-records holds (no normative artifact defers to a record section), and no CI status context depends on a record number. Everything derived from the tree; no pinned list, no pinned wording.
adr-architecture-check:
	bash tools/check-adr-architecture.sh

## license-notice-governance-check: Verify Apache-2.0 canonical + Banzami attribution + open governance today + trademarks separate (M2.7M)
license-notice-governance-check:
	@bash tools/check-license-notice-governance.sh

# ── M2.19C — Three-Layer Institutional Architecture (ADR-004..063) ─────────────

## banza-three-layer-architecture-check: Verify ADR-004 + BANZA_THREE_LAYER_ARCHITECTURE.md name the three layers (L1 protocol / L2 certification / L3 Banzami scheme) + BanzAI transversal + the authority rule; BANZA never framed as an operator (M2.19C, ADR-004)
banza-three-layer-architecture-check:
	@bash tools/check-three-layer-architecture.sh

## banza-banzami-scheme-role-check: Verify ADR-006 + BANZAMI_OPERATIONAL_SCHEME.md name Banzami ONLY as designated scheme operator / creator-maintainer (never a BANZA payment operator; normative payment brands absent) (M2.19C, ADR-006)
banza-banzami-scheme-role-check:
	@bash tools/check-banzami-scheme-role.sh

## banza-regulatory-state-claim-check: Verify no surface claims Banzami is already authorised/BNA-approved/licensed; prudent phrasing + REGULATORY_AUTHORIZATION_IN_PROGRESS present (M2.19C, ADR-007)
banza-regulatory-state-claim-check:
	@bash tools/check-regulatory-state-claim.sh

## banza-real-money-activation-check: Verify the regulatory-state schema pins real_money/real_wallets/real_settlement/real_participants/bna_claim = const false at baseline; no config/flag flips real money ON outside the Rust gate (M2.19C, ADR-007)
banza-real-money-activation-check:
	@bash tools/check-real-money-activation.sh

## banza-protocol-scheme-separation-check: Verify no BANZA=Banzami / BANZA-is-the-scheme conflation; BANZA ≠ Banzami stated; certification described as non-exclusive (M2.19C, ADR-004/060)
banza-protocol-scheme-separation-check:
	@bash tools/check-protocol-scheme-separation.sh

## banza-conflict-of-interest-check: Verify CONFLICT_OF_INTEREST_POLICY + SEPARATION_MATRIX document the same-suite/same-engine/no-bypass controls + the eight-key-domain separation table (M2.19C, ADR-006)
banza-conflict-of-interest-check:
	@bash tools/check-conflict-of-interest.sh

## banza-certification-admission-separation-check: Verify ADR-005 + canonical surfaces state certification ≠ admission ≠ authorisation; no certification=licence / certification=admission conflation (M2.19C, ADR-005)
banza-certification-admission-separation-check:
	@bash tools/check-certification-admission-separation.sh

## banza-certification-model-check: Verify the L2 conformance & interoperability certification model (ADR-032/065/066) — implementation-bound record, required profile/scope/environment/validity/evidence/interop, closed fail-closed state machine, Rust-sole-authority, not a licence/admission/authorisation, registry ≠ scheme directory, no /certificates (M2.19D)
banza-certification-model-check:
	@bash tools/check-banza-certification-model.sh

# ── M2.19G — Public-surface reference canonicalization (owner pages + capstone sweep) ───────────────

## certification-page-check: Verify /certificacao owns the L2 certification model — both canonical sentences verbatim, certification ≠ admission ≠ authorisation, ADR-032/065/066, closed lifecycle states, no retired framing, linked from footer + sitemap (M2.19G, ADR-032/065/066)
certification-page-check:
	@bash tools/check-certification-page.sh

## technical-registry-page-check: Verify /registo-tecnico owns the BANZA Technical Registry — canonical definition, closed states, registry ≠ scheme-participant directory (listed ≠ admission ≠ authorisation), honest empty/pre-production state, no retired framing, linked from footer + sitemap (M2.19G, ADR-033)
technical-registry-page-check:
	@bash tools/check-technical-registry-page.sh

## banzai-mark-consistency-check: One official BanzAI mark across the whole site — the nav + home use components/BanzaiMark (the same sparkle as the /banzai <Ico name="sparkle">); the retired plain 4-point star is guard-blocked
banzai-mark-consistency-check:
	@bash tools/check-banzai-mark-consistency.sh

## glossary-page-check: Verify /glossario is the canonical current-only glossary — required current terms defined, no retired term (BANZA CA, operator certificate, L0–L4 tiers, BanzAI Web, Validation Workbench) as a current concept, linked from footer + sitemap (M2.19G, §26)
glossary-page-check:
	@bash tools/check-glossary-page.sh

## public-surface-canonical-check: Capstone aggregate sweep over the rendered public surface — zero retired framings as positive claims (negation-aware), three-layer vocabulary present (Camada 1/2/3 + Esquema Operacional + BanzAI transversal), qualified hero with no absolute "sem acordos bilaterais" (M2.19G)
public-surface-canonical-check:
	@bash tools/check-public-surface-canonical.sh

## home-canonical-check: Verify the G2 five-band Home — section order (Hero → status → Registo técnico → Três camadas → footer; journey ABSENT), one hero CTA → /banzai?mode=validation, no manifest form, three indicators, honest status bar + registry metrics (Operador Zero not a production operator), no empty cards, three-layer copy, institutional phrase (M2.19G.2 §36)
home-canonical-check:
	@bash tools/check-home-canonical.sh

## retired-page-removal-check: Verify the /o-que-e route removal — no route dir, no redirect/rewrite/alias source, no sitemap/SW/internal-link, every "Ler a referência" → /referencia, /referencia/o-que-e the single canonical definition, BanzAI grounding base carries no /o-que-e source/href (M2.19G.2 §27-28)
retired-page-removal-check:
	@bash tools/check-retired-page-removal.sh

## home-readiness-check: M2.19G.2 capstone — runs the two G2 guards and asserts the §42 static metric block (home_primary_ctas=1, all legacy_o_que_e_*=0, canonical_o_que_e_sources=1, …); runtime metrics delegated to public-edge QA (M2.19G.2 §42)
home-readiness-check:
	@bash tools/check-home-readiness.sh

# ── M2.19G.5C — Canonical BanzAI architecture guards (ADR-036..074) ─────────────────────────────────

## banzai-post-synthesis-validation-check: Verify the mandatory post-synthesis authority validator gates the grounded publish path — postValidate after synthesis, before groundedAnswer/cache/return; a post_validation_ fallback reason; three-state validation_status (M2.19G.5C, ADR-036)
banzai-post-synthesis-validation-check:
	@bash tools/check-banzai-post-synthesis-validation.sh

## banzai-runtime-ssot-check: Verify the runtime SSOT — one secret-free public /banzai/runtime route in every apex nginx conf, schema_version + authoritative:false projection, /estado consumes it and never hardcodes the live engine (M2.19G.5C, ADR-036)
banzai-runtime-ssot-check:
	@bash tools/check-banzai-runtime-ssot.sh

## banzai-simb-active-surface-clean-check: Verify SimB (banza-simb) is retired from every active public/agent surface (isolated draft libs + frozen crate + history exempt) (M2.19G.5C, ADR-036)
banzai-simb-active-surface-clean-check:
	@bash tools/check-banzai-simb-active-surface-clean.sh

## banzai-canonical-architecture-framing-check: Verify services/banzai-api is named the canonical BanzAI runtime and banza-protocol/banzai the frozen archive — no mock-façade framing, no canonical-core claim for the archive (M2.19G.5C, ADR-036)
banzai-canonical-architecture-framing-check:
	@bash tools/check-banzai-canonical-architecture-framing.sh

## banzai-reference-canonical-check: Verify the BanzAI reference chapter (§12, /referencia/banzai) — exactly 7 sections, 1300–1700 words, exactly 2 canonical diagrams (external position + cognitive engine), frozen-architecture phrases, single authority matrix, no fourth-layer/passive-ui/mandatory-hop claims, Registo Técnico canonical (M2.19G.5F)
banzai-reference-canonical-check:
	@bash tools/check-banzai-reference-canonical.sh

## banzai-architecture-manifest-check: Verify the canonical BanzAI architecture manifest (website/content/banzai/architecture-manifest.json) agrees with Referência §12 (canonical phrase, 2 diagrams, 9-row authority matrix, 3 provenance levels) AND the four §3 terminology invariants (primary+transversal interface present; zero mandatory-interface claims; protocol works without the BanzAI; direct public interfaces present) (M2.19G.5F)
banzai-architecture-manifest-check:
	@bash tools/check-banzai-architecture-manifest.sh

## banzai-monorepo-consolidation-check: Verify M2.19G.6 (ADR-036) — BanzAI consolidated into this monorepo as the SOLE active source: no legacy/ snapshot or second BanzAI workspace/API in HEAD; engines/banzai-trace + in-monorepo trace WASM (traceVerifier imports banzai_trace; banzai_core WASM gone); repo-indexer has no sibling remote and the manifest declares banzai_in_monorepo (never banzai_repo_indexed) with zero embedded banzai chunks; ADR-036 present
banzai-monorepo-consolidation-check:
	@bash tools/check-banzai-monorepo-consolidation.sh

## git-authorship-identity-check: Verify M2.19G.6B — no NEW commit is authored/committed as Claude/Anthropic and no Co-authored-by: Claude trailer is introduced (metadata + trailers only; CLAUDE.md/docs never flagged). Base defaults to main; override with GIT_AUTHORSHIP_BASE.
git-authorship-identity-check:
	@bash tools/check-git-authorship-identity.sh

## technical-registry-naming-parity-check: Verify PT surfaces say "Registo Técnico" (glossary is the source of truth) — no EN "Technical Registry"/"Public Protocol Registry" in PT rendered strings, layout meta clean (M2.19G.5C)
technical-registry-naming-parity-check:
	@bash tools/check-technical-registry-naming-parity.sh

## banzai-degraded-mode-render-check: Verify degraded/unknown BanzAI answers state the honest cause and never falsely claim "Qwen local confirmado" (BanzaiAgent engineLabel + banzaiKb telemetry) (M2.19G.5C, ADR-036 CD-9)
banzai-degraded-mode-render-check:
	@bash tools/check-banzai-degraded-mode-render.sh

# ── Repository purity ─────────────────────────────────────────────────────────

## purity-check: Verify no non-protocol artifacts in the repository
purity-check:
	@tools/check-repository-purity.sh

# ── Conformance ───────────────────────────────────────────────────────────────

## invariant-check: Verify every cited invariant ID resolves to contracts/invariants.json
invariant-check:
	@tools/check-invariants.sh

## trust-invariant-realignment-check: Verify the retired central-authority trust-invariant namespace stays retired (canonical: INV-OTE-*/INV-FEDEVAL-*/INV-ROOT-*) and no operator-certificate residue survives (fixtures, certificate_url, /certificates route, TRUST family) (M2.19B, ADR-025)
trust-invariant-realignment-check:
	@bash tools/check-trust-invariant-realignment.sh

## conformance-check: Run conformance (Rust) — offline vectors + live-operator against SimB
conformance-check: $(CONFORMANCE_RS_BIN)
	@$(CONFORMANCE_RS_BIN) check-vectors >/dev/null && $(CONFORMANCE_RS_BIN) run-live >/dev/null && echo "conformance: ✓ vectors + live-simb PASS (PASS = evidence, not certificate)"

## conformance-fed-fixtures-check: Execute the committed federation fixtures as vectors (Track C) — every fixture-backed suite case run against conformance/fixtures/federation/*.json, fail-closed on any outcome mismatch or fixture drift
conformance-fed-fixtures-check: $(CONFORMANCE_RS_BIN)
	@$(CONFORMANCE_RS_BIN) run-fed-fixtures >/dev/null && echo "conformance-fed-fixtures: ✓ 37 committed federation fixtures executed as vectors; 0 mismatch; 0 drift (PASS = evidence, not certificate)"

## conformance-ab-check: Execute the consolidated A→B multi-operator scenario end-to-end (Track D) — two cryptographically distinct operators, mutual Open Trust Evaluation (ROUTING_ALLOWED), atomic routed payment + idempotent replay, negatives fail-closed, byte-identical independent replay
conformance-ab-check: $(CONFORMANCE_RS_BIN)
	@$(CONFORMANCE_RS_BIN) run-ab >/dev/null && echo "conformance-ab: ✓ A→B executed end-to-end; mutual ROUTING_ALLOWED; negatives fail-closed; independent replay byte-identical (PASS = evidence, not certificate)"

## normative-surface-integrity-check: Protect the normative surface (ADR-008/082) — manifest complete and code-free, canonicalization spec + vectors wired to the version, no contract declaring implementation code as its source of truth, BCP 14 declared
normative-surface-integrity-check:
	@bash tools/check-normative-surface-integrity.sh

## normative-manifest: Regenerate contracts/production/normative-manifest.json after changing any normative artifact
normative-manifest:
	@python3 tools/gen-normative-manifest.py

## execution-semantics-check: Reason codes (ADR-021) and idempotency (ADR-022) — registry/engine parity, closed check-id set, published grammar, retention floor
execution-semantics-check:
	@bash tools/check-execution-semantics.sh

## reason-code-registry: Regenerate contracts/production/reason-code-registry.production.json
reason-code-registry:
	@python3 tools/gen-reason-code-registry.py

## crypto-check: Run protocol cryptographic integrity (Rust banza-trust golden ed25519 parity)
crypto-check:
	@cd $(TRUST_RS) && cargo test --quiet && echo "crypto: ✓ banza-trust golden ed25519 parity (INV-FEDEVAL-005)"

## reference-svg-check: Assert every SVG referenced by the Reference is served by the website
reference-svg-check:
	@tools/assert-reference-svgs.sh website/content/BANZA_REFERENCIA.md website/public

## svg-visual-quality-check: Hold official diagram SVGs to the SVG quality policy — structure (<title>/<desc>/viewBox), pure-vector, legibility floor (8px), and active-model semantics (M2.7E)
svg-visual-quality-check:
	@bash tools/check-svg-visual-quality.sh

## svg-visual-system-check: Hold official protocol SVGs to the canonical visual grammar — header/footer, palette, min font-size, no raster/base64/external, active-model semantics (M2.7J, SVG_VISUAL_SYSTEM.md)
svg-visual-system-check:
	@bash tools/check-svg-visual-system.sh

## banzai-protocol-agent-check: Verify BanzAI is presented as the native protocol AGENT — no authority/rule-source claims, no "BanzAI Workbench" public brand (M2.7H, ADR-036)
banzai-protocol-agent-check:
	@bash tools/check-banzai-protocol-agent.sh

## banzai-local-inference-check: Verify BanzAI local Qwen inference invariants — no GGUF in Git, no external keys, llama.cpp internal-only, benchmark-gated default, Rust controls validation (M2.8A, ADR-036)
banzai-local-inference-check:
	@bash tools/check-banzai-local-inference.sh

## banzai-public-interface-check: Verify BanzAI is a single public interface on the apex /banzai wired same-origin to the local_qwen backend — no banzai.banza.network backend route, no stale mock/demo labels (M2.8E)
banzai-public-interface-check:
	@bash tools/check-banzai-public-interface.sh

## banzai-qwen-routing-check: Verify Qwen-first grounded routing — grounded questions call the local model; only critical-boundary/refusal/no-source skip it; the pipeline executes the Rust route() decision (M2.8G, ADR-036)
banzai-qwen-routing-check:
	@bash tools/check-banzai-qwen-routing.sh

## banzai-action-boundary-check: Verify BanzAI is read-only — dangerous ACTION requests (delete docs, remove guards/bypass CI, alter Trust Root, publish/certify operators, expose/generate secrets, real money, reintroduce /operador-zero, destroy infra) are refused DETERMINISTICALLY (never Qwen) with a safe alternative, while informational/process questions still ground (M2.13B)
banzai-action-boundary-check:
	@bash tools/check-banzai-action-boundary.sh

## banzai-financial-action-boundary-check: Verify real financial-operation requests (transfer, pay, refund, settle, cash-in/out, credit/debit, reserve/block balance, create wallet/account, charge merchant) — PT or EN, with or without a value — are refused DETERMINISTICALLY as an action boundary BEFORE model/queue/cache/grounding/no_source, offer the safe Operador Zero/KZ_DEMO simulation path, never claim execution, while conceptual finance questions still answer (M2.14D)
banzai-financial-action-boundary-check:
	@bash tools/check-banzai-financial-action-boundary.sh

## banzai-operational-telemetry-check: Verify a duration/metric question about the validation journey is classified operational and answered from read-only telemetry (or an honest INSUFFICIENT_MEASUREMENTS fallback) — never the fixed topic list, never a fabricated number; off-topic/boundary questions stay non-operational (ADR-036)
banzai-operational-telemetry-check:
	@bash tools/check-banzai-operational-telemetry.sh

## banzai-contextual-fallback-check: Verify the operational-intent taxonomy classifies fine protocol intents + compound sub-intents from signals (boundary questions never reclassified) and that the fixed topic list is GONE from every NON-boundary route — replaced by the Rust-authored contextual fallback (understood_data_missing / ambiguous / tool_unavailable / out_of_scope / insufficient_source); the Tier-0 safety refusal is intact (Increment 2)
banzai-contextual-fallback-check:
	@bash tools/check-banzai-contextual-fallback.sh

## banzai-toolplanner-check: Verify the typed ToolPlanner (Increment 3) — the 19 typed ToolKinds each have a complete ToolContract, a boundary/refusal resolution plans exactly [HONEST_FALLBACK] (safety golden rule), every fallback chain terminates at HONEST_FALLBACK (no cycle), the deterministic intent→kind mapping holds, the planner logic is pure Rust (the model never selects a tool), and the toolplan.js adapter REUSES existing tools (no reimplementation) with /ask surfacing tool_plan
banzai-toolplanner-check:
	@bash tools/check-banzai-toolplanner.sh

## banzai-progress-contract-check: Verify the SPR-1 "Safe Progressive Response" typed foundation (additive; no runtime change) — the progressive-event contract is versioned (schema token banzai-progress/1) with EXACTLY the 18 declared event kinds and NO model-token/delta/partial-prose kind (no unvalidated model text is ever streamed), the 6 typed response dispositions exist and the mapping is safety-first (a boundary → REFUSED, a deterministic terminal → DETERMINISTIC_ANSWER, a validated synthesis → GROUNDED_ANSWER), response_disposition/boundary_context expose only the three safe boundary fields (no secret/PII/echoed user text), and the progressContract.js mirror equals the Rust source of truth
banzai-progress-contract-check:
	@bash tools/check-banzai-progress-contract.sh

## banzai-progress-endpoint-check: Verify the SPR-2 Safe Progressive Response SSE endpoint — the pipeline emits the Channel-A progress events at the real stage boundaries through onProgress and NEVER a terminal/model-token/delta frame itself; the ADR-036 post-synthesis validator + Inc.4 claim/citation verification run BEFORE any FINAL_VALIDATED with prose (the SSE endpoint emits the terminal only after ask() returns); a boundary/refusal streams no synthesis events (→ REFUSED); a deterministic terminal streams no model-synthesis/claim-verification events (→ FINAL_VALIDATED); a post-validation failure → HONEST_FALLBACK carrying the true degraded answer, never the model text; the terminal is chosen from the typed response_disposition (not `grounded`); the onProgress path does not alter the /ask envelope; and nginx exposes /banzai/ask/stream with buffering off
banzai-progress-endpoint-check:
	@bash tools/check-banzai-progress-endpoint.sh

## banzai-progressive-ui-check: Verify the SPR-5 Safe Progressive Response interface (§9) + metrics (§12) in the /banzai page — the frontend contract mirror (website/lib/banzaiProgress.ts) EQUALS the Rust-owned progressContract.js (schema token + 18 event kinds + terminal kinds + 6 response dispositions + disposition→terminal mapping; NO model-token/delta/partial-prose kind); the progressive view (BanzaiProgress.tsx) renders NO answer prose (no SafeMarkdown, no .final/answer field — only the SAFE factsFromEvents projection of ids/enums/counts/hashes); the chat renders the validated answer ONLY on the terminal path (single applyAnswer→SafeMarkdown funnel; the busy branch renders the progressive view, not the answer); the UI reacts to the typed response_disposition/boundary_context (a REFUSED disposition → a refusal), never to `grounded`; a stream failure falls back to the non-stream banzaiKb fetch; and cancel aborts the stream (frees the server queue slot). WASM-free static-degrade
banzai-progressive-ui-check:
	@bash tools/check-banzai-progressive-ui.sh

## banzai-factual-package-check: Verify the transversal FactualPackage + claim/citation verifier (Increment 4, §7–§9) — ONE package built BEFORE synthesis for the documentary trunk AND the operational/telemetry path (resolution + sub-intents + tool plan + freshness; tool_results + calculations + sample_size + aggregation_method), the 5-category claim taxonomy (SUPPORTED | DERIVED | ESTIMATED | HYPOTHETICAL | UNSUPPORTED) with the label/derivation/causality/single-observation rules (an UNSUPPORTED claim never reaches the answer), the citation verifier (a dead/invented citation is rejected), and the pipeline flow (FactualPackage → template OR Qwen → claim verification → citation verification → answer) with the Qwen constraints (grammar-constrained output; numbers only from the tool/package)
banzai-factual-package-check:
	@bash tools/check-banzai-factual-package.sh

## banzai-question-families-check: Verify the §10–§15 question families made grounded end to end (Increment 5) — the taxonomy resolves each family (reason code / comparison / diagnosis / hypothesis / requirement / applicability / API / security / governance / version change), a named reason code is explained from the registry (reason.rs) and an unnamed one honestly declines, the diagnosis classifier separates observed cause / consequence / hypothesis / suggestion (causality only where a receipt supports it, a code-less failure is a marked hypothesis), the tool-backed FactualPackage grounds on real tool results, the Inc.4 claim/citation verifier rejects an unsupported claim / dead citation, a boundary question stays boundary_request (safety), and the pipeline routes each family through plan → FactualPackage → verifier with NO canned per-question strings and NO tool re-implementation (the receipts read is injected; the handler stays pg-free)
banzai-question-families-check:
	@bash tools/check-banzai-question-families.sh

## banzai-multiturn-context-check: Verify multi-turn conversational context (Increment 6, §16-§17) — Rust resolve_references resolves each anaphor against the SAFE, technical-only prior context the client carried forward ("porquê?"→diagnose the prior execution, "e as chaves?"→that entity's key manifest, "compare com a anterior"→[prior, previous] operands, "agora reproduza"→reproduce the prior, "mostre o recibo"→that execution's receipt, "e quanto demorou?"→duration, "essa execução"→that execution) — the model never invents the referent; a boundary follow-up ("agora transfere 100 kz para essa execução", "apaga essa execução e os guards") is BOUNDARY (no referent, query never rewritten — safety golden rule); an anaphor with NO prior context asks to clarify (never a guess); and the /ask endpoint reads + sanitizes + threads + returns only the SAFE technical conversation_context (client-carried; no server PII store)
banzai-multiturn-context-check:
	@bash tools/check-banzai-multiturn-context.sh

## banzai-canonical-eval-check: Verify the CANONICAL BanzAI eval (Increment 7, §18-§20) — the count reconciliation is reproducible + in sync (canonical-reconciliation.{json,md} ties 709/1564/165/248/112 to the six-way classification with no double-counting); the versioned canonical-eval.jsonl regenerates byte-identically, holds ≥2500 structured cases across every family, and populates all six classes (base · variation · multi_turn · negative · live · regression); and the hermetic metrics harness (committed Rust WASM, 0 model calls, 0 network, 0 pg) computes the eleven accuracy metrics (each ≥ its frozen floor) and the eight zero-tolerance counters (every one exactly 0), with its committed report in sync
banzai-canonical-eval-check:
	@bash tools/check-banzai-canonical-eval.sh

## banzai-robustness-observability-check: Verify production robustness + observability + SLO (Increment 8, §21-§23) — the reusable tool-robustness harness (toolRuntime.js) wraps each tool call with per-tool timeout (AbortController), bounded retry (idempotent reads only, NEVER a mutating/reproduce tool), a circuit breaker (opens after N failures, half-open probe recovers), freshness-scoped caching, per-tool concurrency caps and FAULT ISOLATION (a down tool degrades to its honest fallback, never crashes the request); a boundary/refusal kind is NEVER wrapped/cached/retried; ONE typed observability record (observability.js) EXTENDS the reasoning_trace with the §22 fields, excludes every secret/PII field name and leaks NONE of the forbidden items under an adversarial prompt; and the in-process SLO aggregator (slo.js) exposes p50/p95/p99 (percentile_cont linear interpolation — the BZO-8 method), availability, fallback/error rate, %deterministic/%model + per-tool availability & mean cost via the read-only /slo endpoint (proxied as /banzai/slo)
banzai-robustness-observability-check:
	@bash tools/check-banzai-robustness-observability.sh

## banzai-interface-transparency-check: Verify the FINAL interface increment (Increment 9, §24-§25) — a per-answer INTERFACE TRANSPARENCY layer (TransparencyPanel) read verbatim from the /ask envelope (Inc.8 observability record + scope_resolution + reasoning_trace + safe telemetry: interpretation, entity, scope, tools+outcome/duration, source-type/authority, freshness+sha256, calculation method/sample/period, engine/version, model-called, confidence band, verification verdicts, validation status, total duration, honest limitations), rendered INSIDE the ONE contextual inspector (not a second panel), each field shown ONLY when the engine produced it, surfacing NO secret/PII/prompt/raw-output field name; and CONTEXTUAL, per-answer executable suggestions (contextualSuggestions) derived from intent/entity/scope/tools (the fixed M2.9A suggestionsFor/DEFAULT_SUGGESTIONS list is gone) that VARY by answer, where a boundary/refusal offers ONLY safe reframes — never a reframe toward the refused action
banzai-interface-transparency-check:
	@bash tools/check-banzai-interface-transparency.sh

## banzai-intent-first-grounded-reasoning-check: Verify the M2.18 Phase-1 deterministic spine — the exact-document resolver (route.rs bridges to docref BEFORE the glossary/critical tier so a bare "ADR 002" resolves the specific record, not the generic def-*), the one public-source policy (Rust source_policy, applied at retrieval in lib.rs AND at presentation in answerContract.js, excluding the assistant-instruction file CLAUDE.md — public_safe is not trusted), the corrected home answer symbol (no ◭ hazard glyph), and the permanent contracts + architecture document (M2.18)
banzai-intent-first-grounded-reasoning-check:
	@bash tools/check-banzai-intent-first-grounded-reasoning.sh


## banzai-grounded-synthesis-architecture-check: Verify the M2.18B.6 Rust-First Grounded Synthesis architecture — Rust understands, routes and grounds (resolve.rs resolve_intent + classify_trunk_intent, catalogue select_entity, factpack build_factual_package, synth build_output_prompt + output_schema, factcheck validate_output, all with WASM exports); NO input-model contracts survive (no IntentEnvelope/IntentEntry/intent_entry_schema/refine_intent/build_interpretation_prompt); grounded-synthesis.js resolves deterministically then makes EXACTLY ONE model call (provider.synthesize, no runEntryPass); candidate-constrained output (claims[].fact_ids + cited_source_ids); fail-safe fallback + the Rust factual validator gating the answer; NO architecture selector (configured via BANZAI_SYNTHESIS_*)
banzai-grounded-synthesis-architecture-check:
	@bash tools/check-banzai-grounded-synthesis-architecture.sh

## banzai-old-architecture-clean-check: Prove the retired two-pass / input-interpreter architecture is GONE from active code — scans engine + service source, tests, guard scripts and infra for any surviving old name (two-pass/IntentEnvelope/IntentEntry/runEntryPass/interpreter_*/refine_intent/BANZAI_UNIFIED_TWO_PASS/BANZAI_INTENT_INTERPRETER/BANZAI_SINGLE_PASS/twoPassGate/interpreterGate) and fails on any hit; complements banzai-grounded-synthesis-architecture-check (M2.18B.6)
banzai-old-architecture-clean-check:
	@bash tools/check-banzai-old-architecture-clean.sh

## banzai-single-synthesis-contract-check: Prove the M2.18B.6 SINGLE Grounded-Synthesis contract — exactly ONE FactualPackage builder (build_factual_package_planned; retired build_factual_package/_multi + their WASM/JS wrappers gone), the enriched contract embeds the three Rust plans + provenance (resolved_intent/answer_plan/retrieval_plan/citation_map/claims_forbidden/package_checksum, FACTUAL_PACKAGE_VERSION=2), the Rust factual validator gates, and contract_versions_json backs the cache + startup self-check (M2.18B.6 Part G)
banzai-single-synthesis-contract-check:
	@bash tools/check-banzai-single-synthesis-contract.sh

## banzai-intent-engine-quality-check: Prove the M2.18B.6 Rust intent engine is a typed, versioned, deterministic chain — resolve.rs (resolve_intent + ResolvedIntent), intent.rs taxonomy (PRIMARY_INTENTS/ENTITY_TYPES), relation.rs (RelationGraph + version + checksum + 11 RelationKinds), retrieval.rs (RetrievalPlan + version + 8 SourceRoles + checksum), answerplan.rs (AnswerPlan + version + AnswerType + checksum); every stage versioned and none calls a model/network (M2.18B.6 Part G)
banzai-intent-engine-quality-check:
	@bash tools/check-banzai-intent-engine-quality.sh

## banzai-boundary-semantic-recovery-check: Verify M2.18B.2 — the action boundary is a DETERMINISTIC safety layer (Rust boundary.rs taxonomy over 5 sensitive families run as a preflight BEFORE any interpreter/model call, hidden-imperative + document-prefix aware) proven at 100% recall / 0 false negatives / 0 doc-bypass by an OFFLINE eval this guard RUNS in CI (no model), and the interpreter's semantic recovery rests on a Rust candidate catalogue (generate_candidates → the model may only SELECT a real document id, never invent one); thresholds never lowered; boundary + candidate tests green; report present (M2.18B.2)
banzai-boundary-semantic-recovery-check:
	@bash tools/check-banzai-boundary-semantic-recovery.sh

## banzai-repo-knowledge-safety-check: Verify the served knowledge base + Rust indexes are safe — no secret/key material, no build-artifact paths, no GGUF weights (incl. the repo-wide index); no answer presents the retired /operador-zero apex as a live surface; the M2.13B basic-answer + refusal entries are present and well-formed (M2.13B)
banzai-repo-knowledge-safety-check:
	@bash tools/check-banzai-repo-knowledge-safety.sh

## banzai-repository-wide-knowledge-check: Verify BanzAI has repository-wide, safe, current knowledge — the Rust repo-wide index (banzai-repo-indexer) covers LICENSE/README/NOTICE/docs/ADRs/RFCs/examples/engines/website/Makefile/guards/workflows/reports across the BANZA monorepo, which since M2.19G.6 (ADR-036) includes the consolidated BanzAI runtime (services/banzai-api) + engines (engines/banzai-*); the mandatory technical questions resolve deterministically (never no_source); retrieval returns cited sources; the cache key binds the index hash; the action boundary still holds (M2.13B PR2)
banzai-repository-wide-knowledge-check:
	@bash tools/check-banzai-repository-wide-knowledge.sh

## banzai-answer-quality-eval-check: Broad answer-quality evaluation over the shared matrix — every mandatory question resolves (never no_source) citing existing paths; dangerous requests are refused deterministically (never Qwen) with a safe alternative; ambiguous/English coverage holds; source ranking picks the right category; no stale /operador-zero, secret or brand leaks (M2.13C)
banzai-answer-quality-eval-check:
	@bash tools/check-banzai-answer-quality-eval.sh

## banzai-bzc-coverage-check: BZC-4 cross-protocol RESOLUTION coverage — drives the Rust entity+artifact+scope resolver over the combinatorial matrix (entity aliases × artifacts × PT/EN × case/accent/hyphen/plural + adversarial + negative) and asserts the four zero-tolerance criteria (wrong_entity=0, wrong_artifact=0, silent_ambiguity=0, generic_protocol_document_substitution=0) above the case-count floor
banzai-bzc-coverage-check:
	@bash tools/check-banzai-bzc-coverage.sh

## banzai-canonical-corpus-integrity-check: Every public canonical document (ADR + RFC, discovered from disk) is discoverable (doc-index chunks), resolvable (Rust candidate generation), AND citable (FactualPackage allowed_source_ids via the Round B exact-source path); drives the real committed Rust/WASM engines over the whole corpus, asserts 100% integrity + explicit ADR-035/054 coverage, regenerates the truth-table manifest, and self-tests that a non-existent id is not citable (M2.18B.3A)
banzai-canonical-corpus-integrity-check:
	@bash tools/check-banzai-canonical-corpus-integrity.sh

## banzai-canonical-knowledge-coverage-check: Prove the M2.18B.7 coverage layer — every core canonical entity (BANZA/BanzAI/Banzami) is bound to declared primary sources (coverage.rs) with a builder fallback so a known entity never yields an empty package; the attribute registry answers creation year/date as NOT_DECLARED (never inferred) with a precise contextual message; reason codes are a closed enum flagging internal coverage failures; and the WASM/JS/pipeline wiring serves the attribute terminal instead of the generic topic list (M2.18B.7)
banzai-canonical-knowledge-coverage-check:
	@bash tools/check-banzai-canonical-knowledge-coverage.sh

## banzai-query-core-contract-check: Prove the M2.18B.7 single-authority architecture — the query logic lives once in engines/banzai-query-core (pure rlib, no wasm-bindgen), banzai-api-kb depends on it by path with NO cycle and is only the WASM shim (lib.rs, no mirror modules), the crate owns the 24 query modules + scenario library + canonical corpus, and the compiled WASM executes the core (M2.18B.7 H)
banzai-query-core-contract-check:
	@bash tools/check-banzai-query-core-contract.sh

## banzai-task-fulfilment-contract-check: BEHAVIORAL — drive the compiled WASM over the six zero-tolerance regressions and prove the engine FULFILS the task (example→scenario, manifest→real schema fields, procedure→transparent-partial, lookup≠explanation); every tasked terminal passes its TaskCompletionValidator and a definition/architecture/ADR-list answer is rejected (M2.18B.7 Semantic Task Fulfilment)
banzai-task-fulfilment-contract-check:
	@bash tools/check-banzai-task-fulfilment-contract.sh

## banzai-source-appropriateness-check: BEHAVIORAL — drive the compiled WASM retrieval planner and prove SOURCE APPROPRIATENESS is ACTIVE: every planned source carries a task_appropriateness class+score, sources are ordered appropriateness-first (a thematic-but-inadequate source never outranks a task-suitable one), documentary tasks find an exact/suitable ADR/RFC source, and the verdict is deterministic (M2.18B.7 / TFG-2 — the deferred deep reranking is now live)
banzai-source-appropriateness-check:
	@bash tools/check-banzai-source-appropriateness.sh

## banzai-golden-answer-quality-check: BEHAVIORAL — drive the compiled WASM over the human-reviewed golden dataset (artifacts/banzai/task-fulfilment-golden.json) and prove task fulfilment GENERALIZES across every supported subject×task (not only the six regressions): correct task classification, tasked terminals fulfil+publish, narrative source-appropriateness, and boundaries/unknown subjects never produce a deliverable terminal (M2.18B.7 / TFG-5)
banzai-golden-answer-quality-check:
	@bash tools/check-banzai-golden-answer-quality.sh

## banzai-query-scenario-assurance-check: BEHAVIORAL — load the compiled banzai-query-core WASM and drive the single scenario source (scenarios_json) through the real engine (route + boundary), asserting the scenario truth table holds: boundary detected iff class is boundary, boundary/insufficient never call the model, grounded classes route grounded and never trip the boundary (M2.18B.7 H)
banzai-query-scenario-assurance-check:
	@bash tools/check-banzai-query-scenario-assurance.sh

## banzai-production-e2e-readiness-check: BEHAVIORAL pre-deploy gate — drive the compiled WASM over the production-critical invariants: financial action refused deterministically (0 model), creation date DECLARED 2025, version NOT_DECLARED, known entities answerable, off-topic → insufficient, scenario source well-formed (M2.18B.7 H)
banzai-production-e2e-readiness-check:
	@bash tools/check-banzai-production-e2e-readiness.sh

## banzai-synthesis-latency-check: Config-invariant guard for the Round B latency compaction — the levers that produced the measured latency reduction cannot be silently reverted: FactualPackage depth profiles with a tight brief default (3/260), brief as the default answer depth (only compare/impact escalate to standard, deep caller-only), the bounded per-depth output budget (brief 512, the min for a complete valid answer), a brief length directive in the output prompt, and the measured benchmark evidence artifacts present (real latency proven separately on production-class hardware) (M2.18B.3A)
banzai-synthesis-latency-check:
	@bash tools/check-banzai-synthesis-latency-check.sh

## banzai-single-production-pipeline-check: The M2.18B.6 SINGLE production answer pipeline — one classifier-driven router where exact facts are Rust-confirmed source-bound terminals, safety boundaries are refusals, and every genuine explanation goes through the ONE grounded synthesis (seeded by the deterministic resolver) validated by Rust; the layered legacy (input-only interpreter tier, direct chunk→model tier) is gone from the pipeline; drives the real WASM engines over the routing truth-table (exact→terminal, boundary→refusal, concept/mixed/compare→trunk, unsourced→insufficient, concepts source-bound)
banzai-single-production-pipeline-check:
	@bash tools/check-banzai-single-production-pipeline.sh

## banzai-typo-intent-recovery-check: M2.18B.5 — deterministic typo tolerance / intent recovery / safe clarification (Rust fuzzy engine). Exact/alias always beat fuzzy; a single dominant typo auto-corrects; an ambiguous one asks for clarification (never a silent guess); a MISSPELLED prohibited action stays a boundary (§18/§19); internal sources / unsupported concepts never become candidates; scores are never exposed; no authoritative typo logic in the UI. Drives the real WASM engine + router + pipeline via the behavioural node suite.
banzai-typo-intent-recovery-check:
	@bash tools/check-banzai-typo-intent-recovery.sh

## banzai-canonical-alias-integrity-check: M2.18B.5 — the canonical alias tables (concept.rs + catalogue.rs) are the single source of truth; the Rust-derived truth table has every alias bound to a real id and ZERO silent collisions (one alias → two ids); the table is dynamic and the artifact is present.
banzai-canonical-alias-integrity-check:
	@bash tools/check-banzai-canonical-alias-integrity.sh

## banzai-intent-source-ranking-check: Ambiguous protocol terms are answered in the RIGHT domain with the RIGHT source class — software licence never confused with financial authorisation, certification never claimed, implementation vs normative kept apart, no stale /operador-zero, dangerous licence requests still refused (M2.13C-A)
banzai-intent-source-ranking-check:
	@bash tools/check-banzai-intent-source-ranking.sh

## banzai-answer-rendering-ux-check: BanzAI chat rendering polish — answers via a Markdown allowlist (no raw HTML/rehype-raw/dangerouslySetInnerHTML), a dedicated "Fontes usadas" block distinct from quick prompts, safe source links (excluded/secret/operador-zero paths never linked), the trailing "Fonte:" stripped, discreet metadata + a "RECUSA SEGURA" badge (M2.13D)
banzai-answer-rendering-ux-check:
	@bash tools/check-banzai-answer-rendering-ux.sh

## banzai-protocol-origin-intent-check: Institutional-origin questions (who created BANZA / when / initial maintainer / owner) resolve to the deterministic protocol-origin answer, cite NOTICE/MAINTAINERS/README, state the historical creation date 01/08/2025 (1 de agosto de 2025), and never turn origin into operational control/certification/licensing/financial authorisation (M2.13C-B)
banzai-protocol-origin-intent-check:
	@bash tools/check-banzai-protocol-origin-intent.sh

## banzai-protocol-vocabulary-check: Short questions and core protocol + fintech-domain terminology (federar, manifest, trust, revogação, PASS, evidence bundle, ledger, wallet, liquidação, reconciliação, PSP, KYC, AML/CFT, …) resolve DETERMINISTICALLY with cited sources and clear boundaries — never no_source, never the model — in PT/EN, while dangerous imperatives still refuse and the fintech domain is never stated as a BANZA rule (M2.13C-C)
banzai-protocol-vocabulary-check:
	@bash tools/check-banzai-protocol-vocabulary.sh

## banzai-global-answer-format-contract-check: The global answer rendering contract — every response path keeps a clean body with sources separated in sources[]; no in-body "Fonte:/Fontes:/Fontes citáveis:/Sources:" line when a source block exists; the context prompt no longer shows a parrotable "Fontes citáveis:" label; the server normalizer strips residual source blocks, dedups, drops nonexistent, and never surfaces /operador-zero; Markdown stays sanitized (M2.14C)
banzai-global-answer-format-contract-check:
	@bash tools/check-banzai-global-answer-format-contract.sh

## banzai-governance-developer-vocabulary-check: The governance/documentation/engineering vocabulary of the repo (ADR, RFC, spec, schema, contract, invariant, guard, CI, PR, issue, release, changelog, runbook, rollback, maintainer, governance, audit report) resolves DETERMINISTICALLY with cited sources — never no_source, never the model — while a record/process/check is never an authority (ADR ≠ certification, guard not bypassable, CI not a red merge, PR not --admin over red CI) (M2.14C)
banzai-governance-developer-vocabulary-check:
	@bash tools/check-banzai-governance-developer-vocabulary.sh

## banzai-entity-formatting-consistency-check: Every textual occurrence of a canonical ecosystem entity (Banzami, BANZA, BanzAI, Operador Zero, KZ_DEMO, PASS, ADR, RFC, Qwen, Trust Root, Action Boundary, Financial Action Boundary, Apache License 2.0) in an answer body is bold — not just the first — via the single global normalizeEntityEmphasis layer, with canonical spelling, while code/inline-code/existing-bold/links/URLs and paths/domains/packages/doc-ids (banza.network, banzai-api, engines/banzai-api-kb, BANZA.md, ADR-012) stay untouched, never double-bold (****), and common words are not bolded (M2.14C-FIX1)
banzai-entity-formatting-consistency-check:
	@bash tools/check-banzai-entity-formatting-consistency.sh

## banzai-short-query-recovery-check: Short queries / follow-ups for known technology, stack and ecosystem terms (Rust, TypeScript, WASM, Qwen, PostgreSQL, pgvector, nginx, Docker, JSON, Bash, Node, BanzAI) resolve DETERMINISTICALLY with a real answer + cited sources — never no_source / EVIDÊNCIA INSUFICIENTE, never the model (external_model_called stays false); and every fallback/no_source/deterministic body bolds slash-separated entity lists (Banzami/BANZA/BanzAI → **Banzami**/**BANZA**/**BanzAI**) while paths/domains/doc-ids/routes stay untouched and never ****  (M2.14C-FIX2)
banzai-short-query-recovery-check:
	@bash tools/check-banzai-short-query-recovery.sh

## banzai-semantic-answer-composition-check: Deterministic answers are COMPOSED to fit the question, not rigid text — a capabilities/limits question ("o que o BanzAI pode e não pode fazer?", "o que o BanzAI faz?") resolves deterministically to a STRUCTURED pode/não-pode/regra answer (never a yes/no "Não…"); every question carries a Rust-derived answer_type that reflects the expected shape and NEVER changes routing or weakens a safety/financial/secret boundary (refusals stay safe_refusal, deterministic, no model); the chat "thinking" indicator is a rotating, reduced-motion-aware, politely-announced animation that never leaks internal terms (model/worker/queue/lock/runtime) (M2.14F)
banzai-semantic-answer-composition-check:
	@bash tools/check-banzai-semantic-answer-composition.sh

## banzai-unified-markdown-rendering-check: Every surface that shows a BanzAI answer (hero/home widget AND the /banzai live surface) renders it through the SAME shared safe Markdown renderer (SafeMarkdown) — never as plain text; bold/lists/paragraphs display correctly everywhere, raw HTML stays inert (no rehype-raw / dangerouslySetInnerHTML), javascript:/data: links are stripped; the user's own message stays plain text (M2.14F-FIX2)
banzai-unified-markdown-rendering-check:
	@bash tools/check-banzai-unified-markdown-rendering.sh

## banzai-operator-publication-boundary-check: Operator publication / registry-admission / production-activation / certification / licensing / federation COMMANDS (publica/adiciona/regista/aceita/activa/emite certificado/federa/liga/torna real/go-live/... + operator/registry/network/production/certificate surface, PT+EN) are refused DETERMINISTICALLY as an action boundary BEFORE retrieval/grounding/model/queue — never no_source — with a safe preparation alternative and no claim of execution; conceptual/process questions ("como funciona /operators?", "PASS é certificado?") still answer; financial/secret/safety boundaries and the existing publish/certify arm are unchanged (M2.14G)
banzai-operator-publication-boundary-check:
	@bash tools/check-banzai-operator-publication-boundary.sh

## banzai-workbench-navigation-orchestration-check: The /banzai page opens on the interactive agent — "Perguntar ao BanzAI" is the FIRST nav item (its own assistant group), above the OPTIONAL step-by-step journey and the reference links; no redundant "BanzAI" nav item/section is created and Guia is never the default tab (desktop + mobile share the TABS array). A pasted/typed technical artefact ("valida esse manifesto: {…}", "avalia o trust…") routes to a deterministic technical-tool ANALYSIS (tool_routing → tool-*), NOT a generic Operador Zero description — AFTER every safety/action/financial/secret boundary, BEFORE grounding; the router needs an analyse/verify verb (conceptual questions ground), never routes pasted key material, and never certifies/approves/publishes (M2.14H)
banzai-workbench-navigation-orchestration-check:
	@bash tools/check-banzai-workbench-navigation-orchestration.sh

## banzai-primary-interface-architecture-check: BanzAI is the PRIMARY human-operator interface for the BANZA protocol (ADR-036) — but not a normative source, authority, certifier, approver, licenser, financial operator or a mandatory machine-to-machine gate. Enforces the ADR (primary interface + not normative + 4-clause phrase + M2M-not-mandatory boundary), the docs/UI framing, the engine role/architecture answers + the primary-interface router, the SVG-P-071/SVG-P-051 flow + boundary, and that every forbidden request is refused before orchestration (M2.14I)
banzai-primary-interface-architecture-check:
	@bash tools/check-banzai-primary-interface-architecture.sh

## banzai-public-surface-final-consistency-check: M2.14J final cross-surface consistency/regression + production-readiness aggregator (ADR-036). Invokes the core M2.14x guards (primary interface, navigation, financial + operator-publication boundaries) and adds only-missing checks: ADR-035/053/054 published on /decisoes (registry + byte-mirror), the primary-interface framing on the M2.14J-reframed surfaces (/banzai metadata, def-banzai-agent answer, /estado 4-clause, /referencia ch.12 card), the route.rs hardening (role questions, . / newline / agora / também compound separators, trust-root/evidence-history/credentials/verification/payment-request boundary widenings, reflexive certifica-te/make-sure exemptions), and BEHAVIOURAL RAW-input routing (14 architectural questions never no_source, every boundary + compound command refused, no over-block of legitimate/reflexive queries); negation-aware with self-tests (M2.14J)
banzai-public-surface-final-consistency-check:
	@bash tools/check-banzai-public-surface-final-consistency.sh

## banzai-inference-queue-readiness-check: BanzAI is multi-user ready at the inference layer and never exposes a "one request at a time" architecture — deterministic answers, the action & financial boundaries and cache hits bypass the queue (never wait for the model); dangerous/financial requests never reach the model or the queue; the queue is bounded with timeout, de-duplication and professional backpressure (no immediate 503 without a queue); rate limiting + health/queue telemetry + request_id logs exist; external_model_called stays false; public messages leak no internal architecture (M2.14E)
banzai-inference-queue-readiness-check:
	@bash tools/check-banzai-inference-queue-readiness.sh

## banzai-document-aware-agent-check: Verify explicit ADR/RFC references resolve the canonical document before generation — every written form, own sources (never ADR-INDEX/CLAUDE.md), not-found never invented, safety/critical-boundary still first, cache bound to document hash, structured payload + UI badge (M2.10A)
banzai-document-aware-agent-check:
	@bash tools/check-banzai-document-aware-agent.sh

## banzai-document-explanation-quality-check: Verify documentary answers are scoped to what was asked — mode taxonomy (summary/explain/decision/consequences/implementation), mode-scoped source packing, per-mode cache identity, and a truncated answer never cached nor presented as complete (M2.10B)
banzai-document-explanation-quality-check:
	@bash tools/check-banzai-document-explanation-quality.sh

## reference-chapter-order-check: Verify the BANZA Reference chapter ORDER — Operador Zero at 09 between Operadores (08) and Federação (10), CHAPTER_DEFS and the markdown source agreeing, the Índice matching the headings, every internal anchor resolving, and the chapter claiming no status and naming no commercial operator (M2.12B)
reference-chapter-order-check:
	@bash tools/check-reference-chapter-order.sh

## operator-zero-check: Verify the Operador Zero simulator stays a simulator — every artifact marked demo_only/monetary_value/production_allowed, KZ_DEMO the only currency, no private key material, never listed as a real operator, no status claim, and the engine's own E2E reaching completion while the negative scenario produces blockers (ADR-035, M2.12A)
operator-zero-check:
	@bash tools/check-operator-zero.sh

## operator-zero-vocabulary-contract-check: EXECUTE the Operador Zero engine and prove its ten slug vocabularies each have a Portuguese label, that every slug an end-to-end run emits is in the vocabulary, that the label map has no generic fallback, that the vendored web WASM the site ships is not stale, and that the TypeScript labels only through the engine (ADR-035, M2.12B)
operator-zero-vocabulary-contract-check:
	@bash tools/check-operator-zero-vocabulary-contract.sh

## zero-subdomain-design-check: Keep /operador-zero (the experience prepared for zero.banza.network, not active) a single-page, black/white/grey, interactive demo-only lab — dark theme with no strong colour as visual language, a demo-status bar, KZ_DEMO, the not-a-bank/PSP/wallet boundary, 100/100-not-certification, BanzAI deep links, JSON artifacts, a modal/drawer system, grayscale SVGs with title/desc, in-memory only (no web storage), no real-payment CTAs, no commercial operator brand, and no "subdomain is live" claim (ADR-035, M2.12D)
zero-subdomain-design-check:
	@bash tools/check-zero-subdomain-design.sh

## operator-zero-public-hardening-check: Keep the hardened Operador Zero public surface from eroding — the Reference chapter carries ≥3 dedicated SVGs (served, with title/desc/id) and explains KZ_DEMO, the clone, Demo Operator Root, the negative flow, the fictional ledger and PASS≠certification; the page and chapter cross-link and the page states zero.banza.network is prepared-not-active; no surface makes an unqualified certification/licence claim or names a commercial operator (ADR-035, M2.12C)
operator-zero-public-hardening-check:
	@bash tools/check-operator-zero-public-hardening.sh

## zero-subdomain-routing-check: Keep zero.banza.network host-aware routing intact — the pure resolveZeroRoute module + Next middleware map the subdomain `/` to the internal /oz lab and the ten root JSON endpoints onto its handler (so POST→405 and unknown→404 are inherited), the subdomain and apex endpoint lists never diverge, the retired apex /operador-zero is 410 Gone (not redirected), the apex stays a strict pass-through, and the routing layer carries no storage/db/secret/brand/CTA (ADR-035, M2.12E/G)
zero-subdomain-routing-check:
	@bash tools/check-zero-subdomain-routing.sh

## operator-zero-read-only-surface-check: Keep the Operador Zero surface read-only (no local simulation/ledger/validation, categorical status not a score, NOT_CERTIFIED shown, validation delegated to the canonical BanzAI validation mode /banzai?mode=validation, machine endpoints GET/405/404) (ADR-035, M2.19E/F.2)
operator-zero-read-only-surface-check:
	@bash tools/check-operator-zero-read-only-surface.sh

## operator-zero-cross-browser-routing-check: The Zero apex is a rewrite (200), never a permanent (301/308) cross-host redirect; /banzai is a temporary 307; /operador-zero is 410 (ADR-035, M2.19E/F, §19)
operator-zero-cross-browser-routing-check:
	@bash tools/check-operator-zero-cross-browser-routing.sh

## banzai-single-interface-check: BanzAI is ONE canonical route (/banzai) with two modes (ask default; validation via ?mode=validation&target=…&workflow=…) — the parallel /banzai/validar route, the "BanzAI Web" brand and the "Validation Workbench" product are removed; the 9 canonical step ids and the operator-zero-only target registry are intact (ADR-035, M2.19E/F.2)
banzai-single-interface-check:
	@bash tools/check-banzai-single-interface.sh

## operator-zero-standalone-surface-check: Keep zero.banza.network a standalone Operador Zero surface — its own shell (no global BANZA header/nav/footer, gated by path AND host), served from the internal /oz route; the apex /operador-zero surface removed and 410 Gone (never redirected); the reference points the interactive experience at the subdomain; BanzAI stays apex-only; and the surface never reads like a PSP/bank/wallet, names a commercial operator, offers real-payment CTAs, or claims certification (ADR-035, M2.12G)
operator-zero-standalone-surface-check:
	@bash tools/check-operator-zero-standalone-surface.sh

## operator-zero-full-e2e-check: Prove the Operador Zero end-to-end journey under Rust-backed verification — the E2E Demo Operator Root (real Ed25519) verifies, a tampered payload fails and a revoked key blocks trust fail-closed with the PUBLIC key only (no private key present), the engine happy trace is complete/evidence_complete with no blockers while the negative trace is blocked, the subdomain and apex endpoint lists never diverge, Operador Zero is never in an operators[] list, and the BanzAI clone reads the bundled manifest rather than the retired /operador-zero apex endpoint (ADR-035, M2.13A)
operator-zero-full-e2e-check:
	@bash tools/check-operator-zero-full-e2e.sh

## operator-zero-realistic-journey-check: Keep the Operador Zero a REALISTIC demo operator journey inside BanzAI — starting a session awards no step, each step exposes only its own files and unlocks the next only after the previous passes, no parallel generic example (no "Carregar exemplo válido") competes with it, zero.banza.network shows the versioned demo validation state without aprovado/certificado language, demo simulators stay separated from real operators (never in /operators), and BanzAI answers status/approval questions with the demo vocabulary (ADR-035, M2.14A)
operator-zero-realistic-journey-check:
	@bash tools/check-operator-zero-realistic-journey.sh

## operator-zero-only-architecture-check: Enforce the repo-wide Operator Zero Only demo/example policy (ADR-035) — every PUBLIC example/demo/sample derives from Operador Zero, no parallel fictional example operator or "valid manifest example" affordance exists on any public/product/docs surface, the served manifest fixtures are Operador Zero, the retired apex /operador-zero is not reintroduced and the action boundary stays intact; internal engine test fixtures and abstract placeholders (<…> / RFC-2606 operator.example) remain allowed (M2.14B)
operator-zero-only-architecture-check:
	@bash tools/check-operator-zero-only-architecture.sh

## banzai-operator-zero-only-ui-check: The BanzAI product UI presents Operador Zero as the ONLY demo operator (ADR-035) — all demo scenarios belong to Operador Zero, the manual JSON upload is an ADVANCED tool explicitly "not an official example", no parallel fictional example operator appears, and BanzAI routes the two policy questions deterministically while still refusing dangerous actions (M2.14B)
banzai-operator-zero-only-ui-check:
	@bash tools/check-banzai-operator-zero-only-ui.sh

## operator-zero-only-docs-examples-check: Public docs, getting-started, OpenAPI and JSON schemas carry no FILLED fictional example operator identity (ADR-035) — every worked demo identity is Operador Zero, while abstract structural placeholders (<…>, RFC-2606 operator.example) and archival ADRs/reports stay allowed (M2.14B)
operator-zero-only-docs-examples-check:
	@bash tools/check-operator-zero-only-docs-examples.sh

## banzai-vocabulary-contract-check: Verify the Rust/WASM slug vocabulary and the TypeScript that renders it cannot disagree — every value the engine can emit has a UI label, and no UI branch compares a string the engine never emits (the M2.11B and M2.11D defect class) (M2.11D)
banzai-vocabulary-contract-check:
	@bash tools/check-banzai-vocabulary-contract.sh

## banzai-release-qa-check: Verify the BanzAI release QA gate is intact — the guided layer (Model A) is guidance only (no score/verdict) and the gate records the single technical-state authority (Model B, ADR-036), every response field it names still exists in the backend, the phase-report template carries its mandatory sections, and any report claiming BanzAI completeness records observed browser values (M2.11C)
banzai-release-qa-check:
	@bash tools/check-banzai-release-qa.sh

## banzai-operator-journey-e2e-check: Verify the operator journey is closed end to end — ONE evaluator in the browser, the /ask compatibility view derived from the evidence model (never a second engine), both halves of the E2E test present and joined, and the session confined to browser memory (M2.11B)
banzai-operator-journey-e2e-check:
	@bash tools/check-banzai-operator-journey-e2e.sh

## banzai-session-context-robustness-check: Verify the guided session reflects REAL validation state — journey and technical evidence separated, Guia never evidence, examples/uploads/visits non-inflatable, dependencies block, blockers computed, safe summary leaks nothing, session in memory only (M2.11A)
banzai-session-context-robustness-check:
	@bash tools/check-banzai-session-context-robustness.sh

## banzai-knowledge-quality-check: Verify BanzAI knowledge & conversational context — manifest example grounds, follow-ups resolve via context (never bypassing safety), examples are illustrative/non-normative, frontend sends history (M2.8H, ADR-036)
banzai-knowledge-quality-check:
	@bash tools/check-banzai-knowledge-quality.sh

## banzai-agent-quality-check: Verify BanzAI is an OPERATIONAL protocol agent — onboarding/operational questions ground to Qwen with a fine intent, criticals stay deterministic, context never bypasses safety, the documentary index is secret-free and enriches only grounded local answers (M2.9A, ADR-036)
banzai-agent-quality-check:
	@bash tools/check-banzai-agent-quality.sh

## banzai-operator-journey-check: Verify the guided operator journey — Rust owns the step order/transitions/statuses/safe context (dual WASM), the session is in-memory only (no localStorage/DB), the nav is primary→secondary+Repositório, and the backend re-derives the context server-side without trusting the browser (M2.9B, ADR-036)
banzai-operator-journey-check:
	@bash tools/check-banzai-operator-journey.sh

## banzai-model-a-guidance-only-check: Verify Model A (the guided operator-orientation layer) is guidance ONLY — navigation statuses (not_started|available|in_progress|completed), no verdict (valid/evidence_ready) and no score/points, technical state referenced only by typed Model B id, and a Model B FAILED/BLOCKED never rendered as a positive; Model B remains the single technical-state authority (ADR-036/02)
banzai-model-a-guidance-only-check:
	@bash tools/check-banzai-model-a-guidance-only.sh

## banzai-upload-copy-check: Verify the journey uses product copy (no "fixture") and a SAFE in-memory JSON upload — size-limited, Rust secret/JSON scan, no browser/DB persistence, no certify/approve/license claim (M2.9C, ADR-036)
banzai-upload-copy-check:
	@bash tools/check-banzai-upload-copy.sh

## banzai-docs-current-state-check: Verify current public docs (README, docs/banzai, reference) reflect the deployed BanzAI reality — no stale mock/preview/BANZA-CA/certified-operator terms, no BanzAI-authority or BANZA-financial-actor claims; historical ADR/RFC snapshots + reports excluded (M2.9D)
banzai-docs-current-state-check:
	@bash tools/check-banzai-docs-current-state.sh

# ── Rust-first policy (ADR-038) ───────────────────────────────────────────────

$(RUST_GUARD_BIN): FORCE
	@cd $(RUST_GUARD) && cargo build --release --quiet

## rust-rule-check: Enforce ADR-038 — block new non-Rust engines (allow UI/glue/legacy)
rust-rule-check: $(RUST_GUARD_BIN)
	@$(RUST_GUARD_BIN) check --root . --allowlist $(ALLOWLIST)

## no-new-ts-engine-check: Alias of rust-rule-check (guards TS/JS/Python engine drift)
no-new-ts-engine-check: rust-rule-check

## rust-engine-check: Build + test every Rust engine crate under engines/
rust-engine-check:
	@for c in engines/*/Cargo.toml; do \
	  d=$$(dirname $$c); \
	  echo "── cargo test $$d ──"; \
	  ( cd $$d && cargo test --quiet ) || exit 1; \
	done

CONFORMANCE_RS := engines/banza-conformance
CONFORMANCE_RS_BIN := $(CONFORMANCE_RS)/target/release/banza-conformance-rs

$(CONFORMANCE_RS_BIN): FORCE
	@cd $(CONFORMANCE_RS) && cargo build --release --quiet

## conformance-rs-check: Rust conformance runner — validate vectors + invariants (offline)
conformance-rs-check: $(CONFORMANCE_RS_BIN)
	@$(CONFORMANCE_RS_BIN) check-vectors >/dev/null && $(CONFORMANCE_RS_BIN) report

## conformance-rs-test: cargo fmt/clippy/test for the Rust conformance crate
conformance-rs-test:
	@cd $(CONFORMANCE_RS) && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test --quiet

## conformance-rs-parity: Compare the Rust vector summary against the committed golden
conformance-rs-parity: $(CONFORMANCE_RS_BIN)
	@$(CONFORMANCE_RS_BIN) parity

TRUST_RS := engines/banza-trust

## trust-rs-check: Rust trust verifier — golden ed25519 parity + fmt/clippy/test
trust-rs-check:
	@cd $(TRUST_RS) && cargo test --quiet && echo "trust-rs: ✓ golden ed25519 parity"

## trust-rs-test: cargo fmt/clippy/test for the Rust trust verifier crate
trust-rs-test:
	@cd $(TRUST_RS) && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test --quiet

TRUST_RS_BIN := $(TRUST_RS)/target/release/banza-trust
SIMB_RS := engines/banza-simb

$(TRUST_RS_BIN): FORCE
	@cd $(TRUST_RS) && cargo build --release --quiet

## trust-rs-signing-check: TEST-ONLY signing round-trips (Rust signs, Rust verifies)
trust-rs-signing-check: $(TRUST_RS_BIN)
	@$(TRUST_RS_BIN) ceremony-check >/dev/null && echo "trust signing: ✓ TEST-ONLY sign+verify"

## trust-rs-ceremony-sim-check: Root ceremony simulator (TEST ONLY, no production state)
trust-rs-ceremony-sim-check: $(TRUST_RS_BIN)
	@$(TRUST_RS_BIN) ceremony-simulate >/dev/null && echo "trust ceremony: ✓ simulated chain valid (test only)"

## simb-rs-check: banza-simb operator/federation simulator tests
simb-rs-check:
	@cd $(SIMB_RS) && cargo test --quiet && echo "simb: ✓ operator/federation simulator"

## conformance-rs-live-check: live-operator conformance against the Rust SimB
conformance-rs-live-check: $(CONFORMANCE_RS_BIN)
	@$(CONFORMANCE_RS_BIN) run-live >/dev/null && echo "conformance-live: ✓ SimB PASS (evidence, not certificate)"

## conformance-rs-fed-check: federation conformance against two Rust SimB peers
conformance-rs-fed-check: $(CONFORMANCE_RS_BIN)
	@$(CONFORMANCE_RS_BIN) run-fed >/dev/null && echo "conformance-fed: ✓ SimB A/B federation PASS"

## rust-final-closure-check: the full R7-R9 closure — signing, ceremony, SimB, live + federation
rust-final-closure-check: trust-rs-signing-check trust-rs-ceremony-sim-check simb-rs-check conformance-rs-live-check conformance-rs-fed-check
	@echo "rust-final-closure: ✓ zero NOT_YET_PORTED blockers"

## repo-guards-rs-check: Run the Rust repository-hygiene gates (purity + contamination + invariants)
repo-guards-rs-check:
	@cargo run --quiet --release --manifest-path $(REPO_GUARDS_RS)/Cargo.toml -- all

## repo-guards-rs-test: cargo fmt/clippy/test for the Rust repository-guards crate (R10)
repo-guards-rs-test:
	@cd $(REPO_GUARDS_RS) && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test --quiet

# ── Pre-commit ────────────────────────────────────────────────────────────────

## pre-commit: Run all fast protocol checks before committing
pre-commit: identity-check purity-check invariant-check rust-rule-check

# ── Help ──────────────────────────────────────────────────────────────────────

## help: Show available make targets
help:
	@grep -E '^## ' Makefile | sed 's/^## /  /'

# Force cargo to re-check binary targets (cargo skips if unchanged) — avoids stale binaries
FORCE:

## banzai-canonical-protocol-vocabulary-check: DFN A–F — regenerate the canonical protocol vocabulary from the real public corpus + engine registries; the vocabulary (not a manual subject list) is the source of truth for supported subjects; fail on drift / unresolved / orphaned / conflicted / a catalogue subject missing from the truth table / a subject without a source (M2.18B.7)
banzai-canonical-protocol-vocabulary-check:
	@bash tools/check-banzai-canonical-protocol-vocabulary.sh

## banzai-truth-table-current-check: DFN-2 — regenerate the exportable task-fulfilment truth table from the compiled WASM and assert it is current + partition-sound + full-taxonomy + N/A-audited + insufficient-legitimate + floors met (M2.18B.7)
banzai-truth-table-current-check:
	@bash tools/check-banzai-truth-table-current.sh

# ── M2.19G.1 — Endpoint-Originated Operator Validation guard suite (ADR-034 §37) ───────────────
# Every evaluated artifact is obtained from the selected implementation's public endpoints by the secure
# Rust fetcher; Rust decides every verdict; the receipt fixes the result to its exact origin. These
# guards lock the §37 invariants across the fetcher, the closed registry, the served validate path, the
# receipts, and the simplified BanzAI validation UI.

## banzai-operator-validation-mode-check: M2.19G.1 — the BanzAI sidebar mode is "Validar operador" (ADR-034 §4.1)
banzai-operator-validation-mode-check:
	@bash tools/check-banzai-operator-validation-mode-check.sh

## banzai-operator-implementation-model-check: M2.19G.1 — Fase 0 selects operator THEN implementation; Operator/Implementation records present (ADR-034 §4.2/§4.3)
banzai-operator-implementation-model-check:
	@bash tools/check-banzai-operator-implementation-model-check.sh

## banzai-endpoint-originated-validation-check: M2.19G.1 — the official journey calls /banzai/validate/step|journey and the served path fetches via the Rust fetcher, never a fixture (ADR-034 core rule)
banzai-endpoint-originated-validation-check:
	@bash tools/check-banzai-endpoint-originated-validation-check.sh

## banzai-no-manual-input-official-flow-check: M2.19G.1 — no textarea/file-picker/drag-drop/paste/URL/fixture-loader in the official validation flow (ADR-034 §4.4)
banzai-no-manual-input-official-flow-check:
	@bash tools/check-banzai-no-manual-input-official-flow-check.sh

## banzai-draft-validation-isolation-check: M2.19G.1 — DraftValidationTool is isolated, emits DRAFT_VALIDATION_RESULT, banner present, under Programadores, never VERIFIED/readiness/official receipt (ADR-034 §4.5/§17)
banzai-draft-validation-isolation-check:
	@bash tools/check-banzai-draft-validation-isolation-check.sh

## banzai-closed-target-registry-check: M2.19G.1 — targets come from a CLOSED registry (production_registry + OPERATOR_REGISTRY); operator-zero only, no fictional operators (ADR-034 §4.6/§4.9)
banzai-closed-target-registry-check:
	@bash tools/check-banzai-closed-target-registry-check.sh

## banzai-no-arbitrary-url-check: M2.19G.1 — fetcherClient + validate.js never accept a user-supplied URL; only registry-resolved origin+path; closed id shape (ADR-034 §4.7)
banzai-no-arbitrary-url-check:
	@bash tools/check-banzai-no-arbitrary-url-check.sh

## banzai-secure-fetcher-check: M2.19G.1 — banza-artifact-fetcher SSRF policy (HTTPS-only, private/loopback/link-local/metadata blocks, no redirects, size/timeout/media-type/TLS) + reason codes (ADR-034 §4.7/§19)
banzai-secure-fetcher-check:
	@bash tools/check-banzai-secure-fetcher-check.sh

## banzai-fetch-receipt-binding-check: M2.19G.1 — each OperationReceipt binds endpoint/resolved_host/fetched_at/http_status/content_type/input_hash/signature_status (ADR-034 §4.8/§30)
banzai-fetch-receipt-binding-check:
	@bash tools/check-banzai-fetch-receipt-binding-check.sh

## banzai-nine-step-endpoint-input-check: M2.19G.1 — exactly 9 steps, each technical step mapped to an endpoint fetch (ADR-034 §21)
banzai-nine-step-endpoint-input-check:
	@bash tools/check-banzai-nine-step-endpoint-input-check.sh

## banzai-single-results-area-check: M2.19G.1 — ONE Resultados sidebar entry with in-area sub-views (Resumo/Receipts/Relatórios/Artefactos/Traces/Evidence) (ADR-034 §29)
banzai-single-results-area-check:
	@bash tools/check-banzai-single-results-area-check.sh

## banzai-no-duplicate-tabs-check: M2.19G.1 — no step also appears as a persistent Resultados tab (no Manifest/Conformance/Trust/Federation/Evidence duplication) (ADR-034 §29)
banzai-no-duplicate-tabs-check:
	@bash tools/check-banzai-no-duplicate-tabs-check.sh

## banzai-no-orphan-tabs-check: M2.19G.1 — no renderable panel absent from the sidebar list (no trust/simb orphans) (ADR-034 §29)
banzai-no-orphan-tabs-check:
	@bash tools/check-banzai-no-orphan-tabs-check.sh

## banzai-contextual-actions-check: M2.19G.1 — step actions are state-contextual (VERIFIED shows Ver receipt/Explicar/Executar novamente, not Executar esta etapa) (ADR-034 §24)
banzai-contextual-actions-check:
	@bash tools/check-banzai-contextual-actions-check.sh

## banzai-contextual-right-panel-check: M2.19G.1 — header carries static metadata; right panel is contextual only (no permanent header duplication) (ADR-034 §27)
banzai-contextual-right-panel-check:
	@bash tools/check-banzai-contextual-right-panel-check.sh

## banzai-certification-readiness-language-check: M2.19G.1 — Certification Readiness (BLOCKED) distinct from Certification Status (NOT_CERTIFIED); no "9/9 · Bloqueado" phrasing (ADR-034 §4.10)
banzai-certification-readiness-language-check:
	@bash tools/check-banzai-certification-readiness-language-check.sh

## banzai-operator-zero-parity-check: M2.19G.1 — OZ uses the same registry/endpoint/engine path as any implementation (ADR-034 §4.9)
banzai-operator-zero-parity-check:
	@bash tools/check-banzai-operator-zero-parity-check.sh

## banzai-operator-zero-no-bypass-check: M2.19G.1 — no operator-zero shortcut/fixture/precomputed verdict/bypass in the served validate path (ADR-034 §4.9)
banzai-operator-zero-no-bypass-check:
	@bash tools/check-banzai-operator-zero-no-bypass-check.sh

## banzai-operator-zero-public-e2e-check: M2.19G.1 — the OZ public E2E evidence artifact (9 receipts + 1 journey, real endpoints/hashes, NOT_CERTIFIED); soft-pends if absent, hard-checks if present (ADR-034 §4.9)
banzai-operator-zero-public-e2e-check:
	@bash tools/check-banzai-operator-zero-public-e2e-check.sh

## banzai-no-fixture-as-production-evidence-check: M2.19G.1 — no example/vendored fixture flows into the official Evidence Bundle or a VERIFIED verdict (served path) (ADR-034 §4.5)
banzai-no-fixture-as-production-evidence-check:
	@bash tools/check-banzai-no-fixture-as-production-evidence-check.sh

## banzai-receipt-origin-fields-check: M2.19G.1 — OperationReceipt schema carries all §30 origin fields (contract + builder) (ADR-034 §30)
banzai-receipt-origin-fields-check:
	@bash tools/check-banzai-receipt-origin-fields-check.sh

## banzai-journey-receipt-origin-check: M2.19G.1 — JourneyReceipt carries all §31 fields incl. endpoints-consulted, hashes, protocol_fetch_count (ADR-034 §31)
banzai-journey-receipt-origin-check:
	@bash tools/check-banzai-journey-receipt-origin-check.sh

## banzai-no-qwen-decision-check: M2.19G.1 — qwen_calls:0 / external_model_calls:0 in receipts; Qwen only explains, never decides in the served path (ADR-034 §4.8)
banzai-no-qwen-decision-check:
	@bash tools/check-banzai-no-qwen-decision-check.sh

## banzai-rust-fetch-authority-check: M2.19G.1 — the official fetch happens in Rust (banza-artifact-fetcher); banzai-api calls FETCHER_URL; the browser only POSTs closed ids (ADR-034 §4.7)
banzai-rust-fetch-authority-check:
	@bash tools/check-banzai-rust-fetch-authority-check.sh

## banzai-semantic-regression-check: M2.19G.1 — the M2.19G three-layer public surface stays intact on the touched pages; 0 reintroduced retired terms (m2_19g_semantic_regressions=0)
banzai-semantic-regression-check:
	@bash tools/check-banzai-semantic-regression-check.sh

## banzai-accessibility-check: M2.19G.1 — a11y invariants on the BanzAI validation UI (one h1, labelled controls, aria on the journey/results lists)
banzai-accessibility-check:
	@bash tools/check-banzai-accessibility-check.sh

## banzai-responsive-check: M2.19G.1 — responsive invariants (no fixed-width overflow; the validation layout uses responsive units)
banzai-responsive-check:
	@bash tools/check-banzai-responsive-check.sh

## banzai-endpoint-readiness-check: M2.19G.1 — CAPSTONE aggregate gate over the §44 metrics (manual/url/fixture inputs, duplicate/orphan/non-actionable tabs, receipt origin fields, OZ bypasses, qwen/TS verdicts — all 0) (ADR-034 §44)
banzai-endpoint-readiness-check:
	@bash tools/check-banzai-endpoint-readiness-check.sh
