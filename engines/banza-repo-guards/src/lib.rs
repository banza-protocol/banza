//! banza-repo-guards (ADR-038, R10) — the Rust repository-hygiene gates.
//!
//! Rust owns the gate **logic**; `git` is only a data source (`git ls-files`). Ports the former
//! shell gates: repository purity, operator-brand contamination, and invariant-registry integrity.
//! The old `.sh` scripts become thin `RUST_WRAPPER_ONLY` wrappers that call this binary.
//!
//! Deterministic, no network, no secrets. The gates self-exclude this crate's own source (exactly as
//! the shell scripts excluded themselves) so the pattern literals here are not self-flagged.

use serde_json::Value;
use std::process::Command;

pub struct GateResult {
    pub name: String,
    pub pass: bool,
    pub failures: Vec<String>,
    pub warnings: Vec<String>,
}

/// Tracked files (`git ls-files`), forward-slashed, relative to the repo root.
pub fn tracked_files() -> Vec<String> {
    let out = Command::new("git")
        .args(["ls-files"])
        .output()
        .expect("git ls-files");
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect()
}

fn read(path: &str) -> Option<String> {
    std::fs::read(path)
        .ok()
        .and_then(|b| String::from_utf8(b).ok()) // skip binary (non-UTF-8)
}

/// This crate's own source tree — self-excluded from content scans (the shells did the same).
const SELF_PREFIX: &str = "engines/banza-repo-guards/";

// ── Gate 1: repository purity ────────────────────────────────────────────────

const FORBIDDEN_DIRS: &[&str] = &[
    "apps",
    "core",
    "reference",
    "sdk",
    "sdk-certification",
    "integrations",
    "docker",
    "scripts",
    "tests",
];
const FORBIDDEN_TERMS: &[&str] = &[
    "financial kernel",
    "rust kernel",
    "banza kernel",
    "wallet engine",
    "ledger engine",
    "settlement engine",
    "protocol operating system",
    "sistema operativo de protocolo",
];
const FORBIDDEN_DOCS_DIRS: &[&str] = &[
    "docs/adr",
    "docs/rfc",
    "docs/protocol",
    "docs/core",
    "docs/history",
    "docs/operations",
    "docs/architecture",
    "docs/federation",
    "docs/trust",
    "docs/audits",
    "docs/validation",
    "docs/observability",
    "docs/annexes",
];

fn purity_excluded(path: &str) -> bool {
    let base = path.rsplit('/').next().unwrap_or(path);
    path.starts_with("docs/history/")
        || path.contains("/audit/")
        || path.ends_with("-REPORT.md")
        || path.ends_with("_REPORT.md")
        || path.ends_with("-AUDIT.md")
        || path.ends_with("_AUDIT.md")
        || base == "check-repository-purity.sh"
        || base == "repository-purity.yml"
        // M2.13B PR2: the repo-wide indexer's deny-list NAMES the forbidden terminology in order to
        // FILTER it out of the generated index (a scanner, like the check scripts above).
        || path == "engines/banzai-repo-indexer/src/main.rs"
        || (path.starts_with("docs/governance/")
            && base
                .chars()
                .next()
                .is_some_and(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
            && base.ends_with(".md"))
        || path.starts_with(SELF_PREFIX)
}

pub fn purity() -> GateResult {
    let files = tracked_files();
    let mut failures = Vec::new();

    for dir in FORBIDDEN_DIRS {
        let pfx = format!("{dir}/");
        if files.iter().any(|f| f.starts_with(&pfx)) {
            failures.push(format!("forbidden directory tracked: {dir}/"));
        }
    }
    for f in &files {
        if f.contains(".next/")
            || f.contains("node_modules/")
            || f.contains(".pytest_cache/")
            || f.contains(".claude/")
            || f.contains("tsconfig.tsbuildinfo")
            || f.contains("__pycache__")
            || f.ends_with(".pyc")
        {
            failures.push(format!("build artifact tracked: {f}"));
        }
    }
    // forbidden implementation terminology (case-insensitive substring), self/report-excluded
    for f in files.iter().filter(|f| !purity_excluded(f)) {
        if let Some(content) = read(f) {
            let lc = content.to_lowercase();
            for term in FORBIDDEN_TERMS {
                if lc.contains(term) {
                    failures.push(format!("forbidden terminology '{term}' in {f}"));
                }
            }
        }
    }
    for d in FORBIDDEN_DOCS_DIRS {
        let pfx = format!("{d}/");
        if files.iter().any(|f| f.starts_with(&pfx)) {
            failures.push(format!("forbidden docs dir tracked: {d}/"));
        }
    }
    for f in &files {
        let base = f.rsplit('/').next().unwrap_or(f);
        if !f.contains('/')
            && ((base.starts_with("BANZA_") && base.ends_with(".md")) || base == "deploy.sh")
        {
            failures.push(format!("operator-era root artifact tracked: {f}"));
        }
        // stray phase/dev report outside docs/governance/
        if (base.starts_with("PHASE-")
            || base.starts_with("PHASE_")
            || base.ends_with("_FINAL_REPORT.md")
            || base.ends_with("_PHASE_REPORT.md"))
            && base.ends_with(".md")
            && !f.starts_with("docs/governance/")
        {
            let is_phase_num = base.starts_with("PHASE-") || base.starts_with("PHASE_");
            let phase_digit = base
                .get(6..7)
                .map(|c| c.chars().next().unwrap().is_ascii_digit())
                .unwrap_or(false);
            if (is_phase_num && phase_digit)
                || base.ends_with("_FINAL_REPORT.md")
                || base.ends_with("_PHASE_REPORT.md")
            {
                failures.push(format!(
                    "phase/dev report tracked outside docs/governance/: {f}"
                ));
            }
        }
    }
    // ADR numbering 1..=85 (gaps at 004/022/026/027/032 are intentional — removed per ADR-010
    // clean-slate policy; numbers are stable identifiers, survivors are never renumbered). ADR-036 =
    // BanzAI Monorepo Consolidation and Separate Repository Archive (M2.19G.6); ADR-036 = BanzAI
    // validation-journey consolidation, single technical-state authority, durable append-only receipts;
    // ADR-030 = profile applicability model (REQUIRED/OPTIONAL/NOT_APPLICABLE per conformance level);
    // ADR-036 = BanzAI operational reasoning + read-only telemetry + honest INSUFFICIENT_MEASUREMENTS fallback;
    // ADR-025 = Canonical Trust Signing Model Reconciliation (root signs only the Key Manifest; Model A);
    // ADR-029 = Canonical Discovery-Surface Reconciliation (.well-known/banza/operator.json + signed-protocol-metadata.json);
    // ADR-008 = Normative-completeness versioning decision (protocol_version stays 1.0.0; canonicalization
    // versioned separately from the protocol); ADR-011 = BANZA Canonical JSON (BCJ/1), a profile of RFC 8785.
    for f in files
        .iter()
        .filter(|f| f.starts_with("decisions/adr/ADR-") && f.ends_with(".md"))
    {
        if let Some(num) = f
            .rsplit('/')
            .next()
            .and_then(|b| b.strip_prefix("ADR-"))
            .and_then(|s| s.split('-').next())
            .and_then(|s| s.parse::<u32>().ok())
        {
            if !(1..=85).contains(&num) {
                failures.push(format!("ADR outside canonical 001..085: {f}"));
            }
        }
    }
    GateResult {
        name: "purity".into(),
        pass: failures.is_empty(),
        failures,
        warnings: vec![],
    }
}

// ── Gate 2: operator-brand contamination ─────────────────────────────────────

const CONTAM_L2: &[&str] = &[
    "governs banza",
    "governs the protocol",
    "defines banza",
    "defines the protocol",
    "owns banza",
    "owns the protocol",
    "controls banza",
    "controls the protocol",
    "banza owned by",
];
const NORMATIVE_BRANDS: &[&str] = &["multicaixa", "unitel money", "africell money", "e-kwanza"];

fn contam_excluded(path: &str) -> bool {
    let base = path.rsplit('/').next().unwrap_or(path);
    path.starts_with("docs/history/")
        || path.contains("/audit/")
        || path.ends_with("-REPORT.md")
        || path.ends_with("_REPORT.md")
        || path.ends_with("-AUDIT.md")
        || path.ends_with("_AUDIT.md")
        || path.ends_with("-SCORECARD.md")
        || path.ends_with("_SCORECARD.md")
        || base == "brand-naming.test.ts"
        || base == "OPERATOR_NEUTRALITY_TERMINOLOGY.md"
        || base == "check-operator-contamination.sh"
        || base == "identity-guard.yml"
        // ADR-036 / M2.9A: the doc-indexer's brand deny-list NAMES the forbidden brands in order to
        // FILTER them out of the generated doc-index (a scanner, like the check scripts above).
        || path == "engines/banzai-doc-indexer/src/main.rs"
        // M2.13B PR2: the repo-wide indexer's deny-list NAMES the brands+terms it filters out.
        || path == "engines/banzai-repo-indexer/src/main.rs"
        || (path.starts_with("docs/governance/")
            && base
                .chars()
                .next()
                .is_some_and(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
            && base.ends_with(".md"))
        || path.starts_with(SELF_PREFIX)
}

/// Files where BANZAMI INSTITUTIONAL ATTRIBUTION is allowed (ADR-009 / M2.7M): the creator and initial
/// institutional maintainer is named as origin and steward. This is a governance/legal attribution role,
/// distinct from a payment-OPERATOR brand — the NORMATIVE_BRANDS payment operators are blocked on the
/// NORMATIVE surface (contracts/, conformance/) by the L1b scan below — not repository-wide, and the brand stem stays forbidden in filenames and on all other surfaces.
fn banzami_attribution_allowed(path: &str) -> bool {
    let base = path.rsplit('/').next().unwrap_or(path);
    matches!(
        base,
        "LICENSE"
            | "NOTICE"
            | "GOVERNANCE.md"
            | "TRADEMARKS.md"
            | "MAINTAINERS.md"
            | "CONTRIBUTING.md"
            | "README.md"
            | "Makefile"
            | "decisions.ts"
            | "check-license-notice-governance.sh"
            | "check-banzai-qwen-routing.sh"
            | "check-banzai-knowledge-quality.sh"
            | "check-banzai-canonical-knowledge-coverage.sh"
            // M2.18B.7 DFN: the truth-table + canonical-vocabulary generators/guards enumerate the
            // ecosystem-identity subjects (BANZA/BanzAI/Banzami) as canonical protocol vocabulary — same
            // ADR-001/ADR-009 institutional-attribution basis. Not a payment-OPERATOR brand.
            | "gen-banzai-truth-table.mjs"
            | "check-banzai-truth-table-current.sh"
            | "gen-banzai-vocabulary.mjs"
            | "check-banzai-canonical-protocol-vocabulary.sh"
            // WP1.2: the whitepaper LaTeX generator carries the publisher/institution (Banzami,
            // BANZAMI – Tecnologia e Serviços, Lda.) in the generated BibTeX @techreport, the same
            // ADR-009 creator-attribution basis as CITATION/NOTICE. Not a payment-OPERATOR brand.
            | "whitepaper-latex.py"
            | "whitepaper-figures.py"
            | "licensing.md"
            // The two Reference editions name the Layer-3 designated scheme operator on the same
            // ADR-001/ADR-009 institutional-attribution basis. Portuguese is canonical, English is
            // its official translation; both carry the same passages, so both are allowed.
            | "BANZA_REFERENCIA.md"
            | "BANZA_REFERENCE.md"
    )
        // The generated website mirrors of those two editions. They are derived byte-for-byte from
        // the allowlisted sources and cannot carry anything the source does not — the source-boundary
        // check proves it — so they inherit the source's basis rather than earning their own.
        || path.starts_with("website/content/reference/")
        // Public-technical-claims evidence gate: the verification map + machine claim matrix + bundle
        // legitimately quote the canonical Layer-3 scheme (Banzami Operational Scheme, ADR-004..063) when
        // recording claim evidence — the same ADR-001/ADR-009 institutional-attribution basis as
        // BANZA_REFERENCIA.md / decisions.ts. These are internal verification artifacts, not a
        // payment-OPERATOR brand and not a public protocol surface.
        || path.starts_with("docs/verification/")
        || path.starts_with("evidence/")
        || base.starts_with("ADR-009-")
        // ADR-036 / M2.9A: documents the banzami/banza/banzai distinction operational intent (the
        // institutional-identity question), same attribution basis as ADR-009 / route.rs.
        || base.starts_with("ADR-036-")
        // ADR-035 / M2.12A: a deliberate institutional reference, to document the boundary between
        // the protocol's canonical SIMULATOR (Operador Zero) and the future real reference operator,
        // which sits outside the protocol with its own legal framing.
        //
        // This mention does not turn the protocol into an operator, does not publish that operator
        // in /operators, confers no certification and no licence, and does not weaken BANZA's
        // neutrality. The exception is limited to this one ADR ON PURPOSE: the brand is barred from
        // examples/operators/zero, engines/operator-zero-core, the public page, the JSON endpoints,
        // the UI, runtime output, cloned workspaces and fixtures — `make operator-zero-check` fails
        // if it appears in any of them.
        || base.starts_with("ADR-035-")
        // ADR-036 / M2.18B.7: the definitive coverage layer binds each ecosystem identity
        // (BANZA/BanzAI/Banzami) to its primary sources; the ADR + its report name the creator/org for
        // the same ADR-001/ADR-009 institutional-attribution reason. Not a payment operator.
        // M2.19C / three-layer architecture: the canonical decisions that establish Banzami as the
        // DESIGNATED OPERATOR of the first BANZA-based operational scheme (Layer 3). This is a first-class
        // institutional role — the ADR-001/ADR-009 attribution basis extended from "creator/initial
        // maintainer" to "designated scheme operator". BANZA stays operator-neutral (BANZA != Banzami; the
        // protocol + certification remain non-exclusive to the scheme); the L1b normative-surface payment
        // operators (Multicaixa, …) stay blocked EVERYWHERE, and Banzami is never presented as a BANZA
        // payment operator nor as regulator-authorised without evidence. One ADR per decision:
        //   059 three-layer architecture · 060 Banzami Operational Scheme (designated operator) ·
        //   061 certification != admission != authorisation · 062 regulatory-state + real-money gate ·
        //   063 conflict-of-interest + infrastructure/key separation.
        || base.starts_with("ADR-004-")
        || base.starts_with("ADR-006-")
        || base.starts_with("ADR-005-")
        || base.starts_with("ADR-007-")
        // M2.19D: the L2 certification ADRs (064 conformance & interoperability certification model ·
        //   065 BANZA Technical Registry · 066 closed certification-state machine) reference the Banzami
        //   Operational Scheme as the L3 counterexample (certification != admission); institutional basis.
        || base.starts_with("ADR-032-")
        || base.starts_with("ADR-033-")
        // M2.19G.1: ADR-034 (endpoint-originated operator validation + operator–implementation model)
        //   names the Banzami Operational Scheme as the admission counterparty (§4.10: validation !=
        //   scheme admission != regulatory authorisation); institutional attribution, not a payment operator.
        || base.starts_with("ADR-034-")
        // M2.19G.3: ADR-037 (BanzAI-hosted operator onboarding) + its architecture report name the
        //   Banzami Operational Scheme ONLY in their out-of-scope list (onboarding is not scheme
        //   admission); institutional attribution, never a payment operator.
        || base.starts_with("ADR-037-")
        || base == "SIMPLE_SECURE_OPERATOR_ONBOARDING_ARCHITECTURE.md"
        // M2.19D: the L2 certification contracts/examples + canonical governance doc name the scheme as the
        // admission counterparty (certification != scheme admission); attribution, not a payment operator.
        || base.starts_with("certification-")
        || base == "BANZA_CONFORMANCE_INTEROP_CERTIFICATION.md"
        // M2.19C: the L3 regulatory-state artifact + its examples name the designated scheme operator and
        // its REGULATORY_AUTHORIZATION_IN_PROGRESS state; institutional-attribution basis, not a payment op.
        || base == "regulatory-state.production.schema.json"
        || base.starts_with("regulatory-state.")
        // M2.19C: the seven three-layer-architecture guard scripts NAME the designated scheme operator
        // (Banzami) precisely so they can assert its designated-operator/creator-maintainer framing and
        // FORBID any payment-operator / already-authorised misframing. Scanners, like the check scripts
        // allowlisted above; same ADR-001/ADR-009 institutional-attribution basis. Not a payment operator.
        || base == "check-three-layer-architecture.sh"
        || base == "check-banzami-scheme-role.sh"
        || base == "check-regulatory-state-claim.sh"
        || base == "check-real-money-activation.sh"
        || base == "check-protocol-scheme-separation.sh"
        || base == "check-conflict-of-interest.sh"
        || base == "check-certification-admission-separation.sh"
        // M2.18B.7 DFN: the exportable truth table + canonical protocol vocabulary artefacts enumerate the
        // ecosystem-identity subjects (BANZA/BanzAI/Banzami) as vocabulary; same ADR-001/043 attribution.
        || path == "artifacts/banzai/task-fulfilment-truth-table.json"
        || path == "artifacts/banzai/canonical-protocol-vocabulary.json"
        || path == "artifacts/banzai/canonical-protocol-vocabulary-coverage.json"
        || path == "artifacts/banzai/canonical-protocol-vocabulary-review.md"
        // M2.18B.7 semantic audit: the two-phase vocabulary pipeline emits the candidate ledger, the derived
        // subject registry, the human-review doc, and the engine-alias reconciliation. These enumerate the
        // ecosystem-identity subjects (BANZA/BanzAI/Banzami) as vocabulary; same ADR-001/043 attribution.
        || path == "artifacts/banzai/protocol-terminology-candidates.json"
        || path == "artifacts/banzai/subject-registry.json"
        || path == "artifacts/banzai/canonical-subject-review.md"
        || path == "artifacts/banzai/vocabulary-alias-reconciliation.json"
        // M2.18B.7 DFN-3/DFN-4: the stratified golden dataset + its generator include the ecosystem-identity
        // definition case ("o que é a Banzami") as a covered entity question; same ADR-001/043 attribution.
        || path == "artifacts/banzai/task-fulfilment-golden.json"
        || path == "tools/gen-banzai-golden-dataset.mjs"
        // M2.18B.7 DFN-10: the public-edge QA result artifact records the served answer for the same
        // covered entity case ("o que é a Banzami") — identical ADR-001/043 institutional attribution.
        || path == "artifacts/banzai/public-edge-qa.json"
        || path == "website/app/(pt)/governanca/page.tsx"
        || path == "website/app/(pt)/licenca/page.tsx"
        // M2.19G: the public reconstruction surfaces the canonical three-layer architecture (L1 protocol ·
        // L2 certification · L3 Banzami Operational Scheme, designated operator) on the primary editorial
        // pages, so they name Banzami as the L3 designated scheme operator — the same M2.19C/ADR-004/060
        // institutional-attribution basis as the governanca/licenca pages above. BANZA (L1) + certification
        // (L2) stay operator-neutral; Banzami is never framed as a BANZA payment operator nor regulator-
        // authorised without evidence; the NORMATIVE_BRANDS payment operators are blocked on the normative
        // surface (contracts/, conformance/) by L1b — this admission does not touch that scan.
        || path == "website/app/(pt)/page.tsx"
        || path == "website/app/(pt)/arquitectura/page.tsx"
        || path == "website/app/(pt)/estado/page.tsx"
        // Website Phase 2 / Block C: the ENGLISH edition of the architecture page, and the parity harness
        // that holds it to its source. Same ADR-004/060 institutional attribution as the Portuguese page
        // two lines above — Banzami named as the L3 designated scheme operator, with its qualifications
        // (regulatory preparation in progress, real payments switched off) carried into the translation
        // rather than dropped. A translation that had to omit the qualified attribution in order to pass
        // this guard would say something WEAKER than its source, which is the failure mode the parity
        // harness exists to prevent; the harness asserts the attribution, so it names the subject too
        // (the same basis on which home-canonical.test.ts is listed below). BANZA (L1) and certification
        // (L2) stay operator-neutral; the NORMATIVE_BRANDS payment operators are blocked on the normative
        // surface (contracts/, conformance/) by L1b, which this admission does not reach.
        || path == "website/app/en/architecture/page.tsx"
        || path == "website/lib/corePageParity.test.ts"
        // Website Phase 2 / Block D: the ENGLISH editions of the protocol-status and open-governance
        // pages. Both Portuguese originals are already listed above and below on the same ADR-004/060
        // basis, and each English edition makes the identical attribution its source makes — status names
        // Banzami as the Layer 3 designated scheme operator with its qualifications (regulatory
        // preparation in progress, real payments switched off), governance names it as original creator
        // and initial institutional maintainer, immediately alongside the sentence saying the protocol is
        // nonetheless governed by the repository's public processes. A translation forced to drop the
        // attribution would say LESS about who maintains BANZA than the Portuguese page a reader can open
        // in the next tab.
        || path == "website/app/en/status/page.tsx"
        || path == "website/app/en/open-governance/page.tsx"
        || path == "website/app/roteiro/page.tsx"
        // M2.19G: the canonical glossary names Banzami as the L3 designated scheme operator (the "operador"
        // / "scheme" entries define the term against the L3 role); same ADR-004/060 attribution basis.
        || path == "website/app/(pt)/glossario/page.tsx"
        // Website Phase 2 / Block E1: the glossary's SEMANTIC records, and the English licence page.
        //
        // The glossary moved its 25 terms out of the Portuguese page into bilingual records, so the
        // "scheme participant" definition — which names the Banzami Operational Scheme as the Layer-3
        // example, exactly as the already-admitted Portuguese page did — now lives in the data file. Same
        // ADR-004/060 institutional attribution; it did not become a new claim by changing file.
        //
        // The English licence page is the counterpart of the admitted `(pt)/licenca/page.tsx`. A licence
        // page names its trademark holder because the trademark holder is the licence's SUBJECT: it is the
        // page that says the Apache grant does not carry the BANZA/BanzAI/Banzami marks. A translation
        // that had to omit the holder in order to pass this guard would state something weaker than its
        // source about what the licence does not give away.
        //
        // The E1 render harness names it for the same reason `corePageParity.test.ts` above does: it
        // asserts that both editions carry the attribution, so it must name the subject to assert it.
        //
        // Scoped to these three paths, and PATH-scoped rather than clause-scoped: this gate admits the
        // designated-scheme stem for the whole file, so it cannot tell a legitimate attribution from an
        // illegitimate claim WITHIN an admitted page. That limit is the gate's design, not this
        // admission's — recorded in docs/website/phase2-pr32-guard-regressions.json under open_findings.
        || path == "website/lib/glossaryTerms.ts"
        // GENERATED from glossaryTerms.ts, which is admitted immediately above: the resolved copy exists so
        // guards can read a term's wording without grepping the component that renders it. It is derived
        // and regenerated (`make website-copy-resolved`), never authored, so admitting it adds no surface a
        // human can write to — it inherits exactly what its source is already allowed to say.
        || path == "website/lib/copyResolved.json"
        || path == "website/app/en/license/page.tsx"
        || path == "website/lib/blockE1Surfaces.test.tsx"
        || path == "website/lib/reference.ts"
        // M2.19G.2: the Home-canonicalization audit artifact and the new Home vitest name the L3
        // designated scheme operator (Banzami Operational Scheme) in their three-layer records/assertions —
        // the same ADR-004/060 institutional-attribution basis as the M2.19G editorial pages above (the
        // Home page.tsx itself is already allowlisted). Not a payment-OPERATOR brand; the NORMATIVE_BRANDS
        // payment operators are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "artifacts/banzai/home-current-surface-audit.json"
        || base == "home-canonical.test.ts"
        // ADR-009 / M2.8F: the BanzAI knowledge base carries the same institutional attribution
        // when a user asks "o que é o Banzami?" — the answer names Banzami as the creator/initial
        // maintainer (a governance role), grounded in GOVERNANCE.md. This is attribution, not a
        // payment-OPERATOR brand; payment operators are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "services/banzai-api/src/knowledge.js"
        || path == "services/banzai-api/src/pipeline.js"
        || path == "engines/banzai-query-core/src/entries-index.json"
        || path == "engines/banzai-api-kb/tests/kb.rs"
        // Block 5A: the same ecosystem-identity distinction, asserted from two more angles. The phrase
        // boundary test proves a keyword for one identity cannot win a question about the other, and the
        // institutional tests forbid any ecosystem actor — including the creator/maintainer — from being
        // presented as a certifier. Naming the identity is the point of the assertion; removing it would
        // leave a test that cannot state what it forbids. Same ADR-001/ADR-009 attribution basis as kb.rs.
        || path == "engines/banzai-query-core/tests/phrase_boundary.rs"
        || path == "services/banzai-api/test/institutional-semantics.test.js"
        || path == "services/banzai-api/test/prohibited-claims-sweep.test.js"
        // M2.8G: the routing policy + its tests classify the "what is Banzami" institutional-identity
        // question (ADR-009 attribution), so they name the creator/maintainer. Not a payment operator.
        || path == "engines/banzai-query-core/src/route.rs"
        || path == "engines/banzai-api-kb/tests/route.rs"
        || path == "services/banzai-api/test/pipeline.test.js"
        // M2.18B.6-FIX1: the typo-recovery engine PROTECTS the ecosystem-identity distinction (ADR-001) —
        // it names Banzami / BANZA / BanzAI precisely so a spelling variant of one is never silently
        // rewritten into another. Same ADR-001/ADR-009 institutional-attribution basis as route.rs above;
        // not a payment operator, payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "engines/banzai-query-core/src/fuzzy.rs"
        // M2.18B.7: the canonical coverage + attribute registries bind each ecosystem identity
        // (BANZA/BanzAI/Banzami) to its primary sources and answer exact facts about it. They NAME the
        // creator/organization for the same ADR-001/ADR-009 institutional-attribution reason as route.rs
        // above; not a payment operator, payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "engines/banzai-query-core/src/coverage.rs"
        || path == "engines/banzai-query-core/src/attribute.rs"
        || path == "engines/banzai-query-core/src/scenarios.rs"
        // M2.18B.6/7: the milestone continuity artifacts document the BANZA/BanzAI/Banzami identity work
        // (the coverage layer + the banzami↔banzai typo-confusion fix). Internal engineering records naming
        // the ecosystem identities — same ADR-001/ADR-009 attribution basis; not a payment operator.
        || path == "artifacts/banzai/execution-state.json"
        || path == "artifacts/banzai/execution-state.json"
        // M2.19C: the M2.19-FINAL program spine documents the three-layer architecture, incl. Layer 3
        // (Banzami Operational Scheme). Same institutional-attribution basis as the ADRs above; internal
        // engineering record, not a payment operator.
        || path == "artifacts/banzai/execution-state.json"
        // M2.19G: the public-surface reconstruction audit artifacts (crawl, inventory, concept matrix,
        // semantic audit) faithfully RECORD the live/canonical public surface, which names Banzami as the L3
        // designated scheme operator (M2.19C). They are evidence records of what is published, not authored
        // protocol content; scrubbing the captured name would corrupt the audit. Same ADR-001/ADR-009
        // attribution basis. This admission covers the designated-scheme stem only; it never allowlists a
        // payment-operator brand as content. Those brands are scanned by the separate L1b normative-brand
        // list, whose scope is contracts/ and conformance/ — not this path, and not repository-wide.
        || path.starts_with("artifacts/banzai/")
        // M2.19C: the GENERATED grounding indexes + truth-table now index the Layer-3 scheme ADRs/docs, so
        // they carry the designated-operator name (the indexers stopped dropping "Banzami" so BanzAI can
        // ground the scheme; real payment-operator brands are still filtered out of these artifacts).
        || path == "engines/banzai-query-core/src/doc-index.json"
        || path.starts_with("engines/banzai-query-core/src/repoindex/")
        || (path.starts_with("artifacts/") && base.ends_with("corpus-truth-table.json"))
        // M2.18B.4: the typed-terminal engine returns the origin EXACT FACT — "Banzami — criador e
        // mantenedor inicial do protocolo" — bound to NOTICE/MAINTAINERS. Same ADR-009 institutional-
        // attribution basis as route.rs / knowledge.js above; not a payment operator, payment-OPERATOR
        // brands are blocked on the normative surface (contracts/, conformance/) by the L1b scan.
        || path == "engines/banzai-query-core/src/terminal.rs"
        // M2.13C-B: the protocol-origin / creation-date phase report names the creator as institutional
        // origin (same ADR-009 attribution basis). Not a payment operator; brand stays barred elsewhere.
        // M2.19G: the public-surface reconstruction reports document the three-layer work, incl. Layer 3
        // (the Banzami Operational Scheme, designated operator) — the guard-convergence, README-sweep,
        // reference, SVG and verification-battery reports name Banzami exactly to record the L3 framing.
        // Internal engineering reports; same ADR-004/060 + ADR-009 attribution basis; payment-operator
        // brands are blocked on the normative surface (contracts/, conformance/) by the L1b scan.
        // M2.14C: the global rendering contract report documents the "Banzami" origin-answer before/after
        // (§10/§11), and the contract test + guard verify that same answer renders with a clean body.
        // Same ADR-009 institutional-attribution basis as route.rs / knowledge.js above — not a payment
        // operator; the payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "services/banzai-api/test/answer-contract.test.js"
        || path == "tools/check-banzai-global-answer-format-contract.sh"
        // M2.14C Part 16: the minimal-highlight pass lists the ecosystem ENTITIES it bolds (Banzami /
        // BANZA / BanzAI) so every answer shares one look — same ADR-009 attribution basis as
        // knowledge.js above. Not a payment operator; payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "services/banzai-api/src/answerContract.js"
        // M2.14C-FIX1: the entity-emphasis consistency test + guard drive the same canonical-entity
        // table (Banzami / BANZA / BanzAI …) to prove every occurrence is bold. Same ADR-009
        // institutional-attribution basis; payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "services/banzai-api/test/entity-formatting-consistency.test.js"
        || path == "tools/check-banzai-entity-formatting-consistency.sh"
        // M2.14C-FIX2: the short-query/fallback test + guard + report drive the same slash-separated
        // canonical-entity list (Banzami/BANZA/BanzAI) to prove each segment is bolded. Same ADR-009
        // institutional-attribution basis; payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "services/banzai-api/test/short-query-recovery.test.js"
        || path == "tools/check-banzai-short-query-recovery.sh"
        // M2.14F: the semantic-answer-composition report + test + guard exercise the same
        // institutional-identity query ("o que é o banzami") and canonical entities to prove the
        // composed answers keep the ADR-009 attribution. Same basis as knowledge.js / route.rs above;
        // payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "services/banzai-api/test/semantic-answer-composition.test.js"
        || path == "tools/check-banzai-semantic-answer-composition.sh"
        // M2.14F-FIX2: the SafeMarkdown render test drives the same institutional entity table
        // (Banzami / BANZA / BanzAI) to prove every occurrence renders as bold <strong>. Same ADR-009
        // attribution basis as knowledge.js / route.rs; payment-operator brands are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path == "website/components/banzai/SafeMarkdown.render.test.tsx"
        // WP1-FINAL: the official BANZA Whitepaper v1.0 (autonomous documental program) names Banzami as
        // the authors' affiliation + institutional PUBLISHER, and once as the L3 designated scheme operator
        // — the same ADR-001/043/059/060 institutional-attribution basis as the ADRs and editorial pages
        // above. Scoped STRICTLY to the Whitepaper surfaces (content/routes/components/loader/build/report);
        // the Home hero change lives in website/app/(pt)/page.tsx, already allowlisted. BANZA (L1) + certification
        // (L2) stay operator-neutral; the NORMATIVE_BRANDS payment operators are blocked on the normative surface
        // (contracts/, conformance/) by the L1b NORMATIVE_BRANDS scan — not repository-wide.
        || path.starts_with("docs/whitepaper/")
        || path.starts_with("artifacts/whitepaper-v1/")
        || path.starts_with("website/content/whitepaper/")
        || path.starts_with("website/app/(pt)/whitepaper/")
        || path.starts_with("website/components/whitepaper/")
        || path == "website/lib/whitepaper.ts"
        || path == "tools/whitepaper-build.sh"
        || path == "tools/check-banza-whitepaper.sh"
}

pub fn contamination() -> GateResult {
    // The forbidden brand is built from parts (like the shell) to avoid self-match.
    let brand = format!("{}{}", "banza", "mi"); // -> the forbidden operator brand stem
    let files = tracked_files();
    let mut failures = Vec::new();
    let mut warnings = Vec::new();

    for f in files.iter().filter(|f| !contam_excluded(f)) {
        // filename — the designated-operator institutional artifacts (ADR-004..063, the L3
        // regulatory-state artifact/examples, and the allowlisted governance/tooling files) may carry the
        // Banzami name in their PATH for the same ADR-001/ADR-009 attribution reason as their contents
        // (M2.19C). Commercial payment-operator brands are never "banzami" and stay blocked in filenames.
        if f.to_lowercase().contains(&brand) && !banzami_attribution_allowed(f) {
            failures.push(format!("forbidden operator brand in filename: {f}"));
        }
        if let Some(content) = read(f) {
            let lc = content.to_lowercase();
            if lc.contains(&brand) && !banzami_attribution_allowed(f) {
                failures.push(format!("forbidden operator brand in contents: {f}"));
            }
            // L2 governance claims (advisory → warning)
            for p in CONTAM_L2 {
                if lc.contains(p) {
                    warnings.push(format!("governance-claim pattern '{p}' in {f} (advisory)"));
                }
            }
        }
    }
    // L1b: commercial payment brand in the normative surface (contracts/, conformance/)
    for f in files.iter().filter(|f| {
        (f.starts_with("contracts/") || f.starts_with("conformance/")) && !contam_excluded(f)
    }) {
        if let Some(content) = read(f) {
            let lc = content.to_lowercase();
            for b in NORMATIVE_BRANDS {
                if lc.contains(b) {
                    failures.push(format!("commercial brand '{b}' in normative surface: {f}"));
                }
            }
            // \bEMIS\b (word-boundary, case-sensitive as in the shell)
            if content
                .split(|c: char| !c.is_ascii_alphanumeric())
                .any(|w| w == "EMIS")
            {
                failures.push(format!("commercial brand 'EMIS' in normative surface: {f}"));
            }
        }
    }
    GateResult {
        name: "contamination".into(),
        pass: failures.is_empty(),
        failures,
        warnings,
    }
}

// ── Gate 3: invariant-registry integrity ─────────────────────────────────────

fn extract_ids(text: &str) -> Vec<String> {
    // \b(?:INV-[A-Z]+(?:-[A-Z]+)*|MON)-\d+\b — scanned over bytes (tokens are pure ASCII), so no
    // str slicing at arbitrary indices (which would panic on multi-byte UTF-8 boundaries).
    let mut ids = Vec::new();
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i..].starts_with(b"INV-") || bytes[i..].starts_with(b"MON-") {
            // \b: preceding byte must not be alnum/'-' (else mid-token match)
            let boundary =
                i == 0 || !(bytes[i - 1].is_ascii_alphanumeric() || bytes[i - 1] == b'-');
            let start = i;
            let mut j = i;
            while j < bytes.len() && (bytes[j].is_ascii_alphanumeric() || bytes[j] == b'-') {
                j += 1;
            }
            if boundary {
                let tok = std::str::from_utf8(&bytes[start..j]).unwrap_or("");
                // must end in -<digits> (the family shape)
                if let Some(last) = tok.rsplit('-').next() {
                    if !last.is_empty() && last.bytes().all(|b| b.is_ascii_digit()) {
                        ids.push(tok.to_string());
                    }
                }
            }
            i = j;
        } else {
            i += 1;
        }
    }
    ids
}

pub fn invariants() -> GateResult {
    let mut failures = Vec::new();
    let raw = match read("contracts/invariants.json") {
        Some(r) => r,
        None => {
            return GateResult {
                name: "invariants".into(),
                pass: false,
                failures: vec!["contracts/invariants.json unreadable".into()],
                warnings: vec![],
            }
        }
    };
    let reg: Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(e) => {
            return GateResult {
                name: "invariants".into(),
                pass: false,
                failures: vec![format!("invariants.json invalid JSON: {e}")],
                warnings: vec![],
            }
        }
    };
    let list = reg
        .get("invariants")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    if list.is_empty() {
        failures.push("registry defines no invariants".into());
    }
    let mut known = std::collections::BTreeSet::new();
    for inv in &list {
        if let Some(id) = inv.get("id").and_then(|v| v.as_str()) {
            known.insert(id.to_string());
        }
        if let Some(aliases) = inv.get("aliases").and_then(|v| v.as_array()) {
            for a in aliases {
                if let Some(s) = a.as_str() {
                    known.insert(s.to_string());
                }
            }
        }
    }
    // every cited INV-*/MON-* under contracts/ + conformance/ must resolve
    let files = tracked_files();
    let mut undefined = std::collections::BTreeSet::new();
    for f in files
        .iter()
        .filter(|f| f.starts_with("contracts/") || f.starts_with("conformance/"))
    {
        if let Some(content) = read(f) {
            for id in extract_ids(&content) {
                if !known.contains(&id) {
                    undefined.insert(id);
                }
            }
        }
    }
    for id in &undefined {
        failures.push(format!("cited invariant not defined in registry: {id}"));
    }
    GateResult {
        name: "invariants".into(),
        pass: failures.is_empty(),
        failures,
        warnings: vec![],
    }
}

// ── Gate 4: OpenAPI backward-compatibility diff ───────────────────────────────
//
// Faithful Rust port of the former `tools/check-openapi-compatibility.sh` (Python stdlib).
// Compares NEW against OLD and reports breaking changes: removed endpoints, removed methods,
// removed required request-body fields, removed response fields. Both JSON and YAML specs load
// through `serde_yaml` (YAML is a JSON superset, so JSON specs parse too).

const HTTP_METHODS: &[&str] = &["get", "post", "put", "patch", "delete", "head", "options"];

/// Exit codes mirror the shell: 0 = compatible, 1 = breaking changes, 2 = usage/parse error.
pub enum OpenApiOutcome {
    Compatible { old_ops: usize, new_ops: usize },
    Breaking(Vec<String>),
    Error(String),
}

fn load_spec(path: &str) -> Result<Value, String> {
    let content = std::fs::read_to_string(path).map_err(|e| format!("cannot read {path}: {e}"))?;
    // serde_yaml parses both YAML and JSON into a serde_json::Value.
    serde_yaml::from_str::<Value>(&content).map_err(|e| format!("cannot parse {path}: {e}"))
}

fn paths_of(spec: &Value) -> Vec<(String, &Value)> {
    spec.get("paths")
        .and_then(|v| v.as_object())
        .map(|m| m.iter().map(|(k, v)| (k.clone(), v)).collect())
        .unwrap_or_default()
}

fn methods_of(path_item: &Value) -> Vec<(String, &Value)> {
    path_item
        .as_object()
        .map(|m| {
            m.iter()
                .filter(|(k, _)| HTTP_METHODS.contains(&k.as_str()))
                .map(|(k, v)| (k.clone(), v))
                .collect()
        })
        .unwrap_or_default()
}

fn required_body_fields(op: &Value) -> std::collections::BTreeSet<String> {
    // First media type's schema.required (matches the Python `return` on first iteration).
    let content = op
        .get("requestBody")
        .and_then(|b| b.get("content"))
        .and_then(|c| c.as_object());
    if let Some(map) = content {
        if let Some((_, media)) = map.iter().next() {
            return media
                .get("schema")
                .and_then(|s| s.get("required"))
                .and_then(|r| r.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|x| x.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();
        }
    }
    Default::default()
}

fn response_fields(op: &Value) -> std::collections::BTreeSet<String> {
    // First 2xx response, first media type, schema.properties keys.
    if let Some(responses) = op.get("responses").and_then(|r| r.as_object()) {
        for (status, resp) in responses {
            if status.starts_with('2') {
                if let Some(cmap) = resp.get("content").and_then(|c| c.as_object()) {
                    if let Some((_, media)) = cmap.iter().next() {
                        return media
                            .get("schema")
                            .and_then(|s| s.get("properties"))
                            .and_then(|p| p.as_object())
                            .map(|m| m.keys().cloned().collect())
                            .unwrap_or_default();
                    }
                }
                return Default::default();
            }
        }
    }
    Default::default()
}

fn count_ops(spec: &Value) -> usize {
    paths_of(spec)
        .iter()
        .map(|(_, pi)| methods_of(pi).len())
        .sum()
}

pub fn openapi_compat(new_path: &str, old_path: &str) -> OpenApiOutcome {
    let new_spec = match load_spec(new_path) {
        Ok(s) => s,
        Err(e) => return OpenApiOutcome::Error(e),
    };
    let old_spec = match load_spec(old_path) {
        Ok(s) => s,
        Err(e) => return OpenApiOutcome::Error(e),
    };

    let new_paths: std::collections::BTreeMap<String, &Value> =
        paths_of(&new_spec).into_iter().collect();
    let mut breaking = Vec::new();

    for (path, old_item) in paths_of(&old_spec) {
        let Some(new_item) = new_paths.get(&path) else {
            for (method, _) in methods_of(old_item) {
                breaking.push(format!(
                    "REMOVED endpoint: {} {path}",
                    method.to_uppercase()
                ));
            }
            continue;
        };
        let new_methods: std::collections::BTreeMap<String, &Value> =
            methods_of(new_item).into_iter().collect();
        for (method, old_op) in methods_of(old_item) {
            let Some(new_op) = new_methods.get(&method) else {
                breaking.push(format!("REMOVED method: {} {path}", method.to_uppercase()));
                continue;
            };
            for field in required_body_fields(old_op).difference(&required_body_fields(new_op)) {
                breaking.push(format!(
                    "REMOVED required request field '{field}': {} {path}",
                    method.to_uppercase()
                ));
            }
            for field in response_fields(old_op).difference(&response_fields(new_op)) {
                breaking.push(format!(
                    "REMOVED response field '{field}': {} {path}",
                    method.to_uppercase()
                ));
            }
        }
    }

    if breaking.is_empty() {
        OpenApiOutcome::Compatible {
            old_ops: count_ops(&old_spec),
            new_ops: count_ops(&new_spec),
        }
    } else {
        OpenApiOutcome::Breaking(breaking)
    }
}
