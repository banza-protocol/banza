import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { agentCopy, agentCopyIds } from "@/components/banzai/agentPresentation";
import { navPrimary, footerColumns } from "./site";

// The three starter questions the empty conversation offers, realized from the catalogue.
const STARTER_QUESTIONS = (["starter.journeyDuration", "starter.slowestStep", "starter.compareRuns"] as const).map((id) =>
  agentCopy(id, "pt"),
);
import { RFC_DOCS, PROTOCOL_MAP_NODES, DEV_COMMANDS, DEV_ENDPOINTS, TRACE_FLOW, TABS } from "@/components/banzai/banzai-agent";

// M2.5 public-surface invariants (pure vitest — no WASM/DOM). This guards the two decisions that shape
// the public product surface:
//   (1) BANZAI_AGENT operator path — the public verification path is BanzAI-guided. The operator copy
//       presents that path positively (BanzAI guides; the engines verify; the evidence proves) and must
//       not surface package-manager / container / CI install strings as the operator method. Internal CI
//       / Rust dev commands may exist for MAINTAINERS but must not appear as an operator method in copy.
//   (2) ACTIVE-MODEL only — the surface presents the open-protocol model (signed protocol metadata,
//       delegated signing keys, public protocol registry, revocation/fail-closed) with no milestone
//       (M2.x) UI, no certification-of-operator framing, and no central-CA vocabulary.
//
// Genuine boundary NEGATIONS ("não certifica", "não é certificado") are intentionally KEPT and live in
// AUTHORITY_COPY — the certification-as-goal check below is scoped to STARTER_QUESTIONS so those
// negations are never treated as violations.

// Actual user-facing copy constants ONLY. FORBIDDEN_PHRASES is deliberately excluded — it is the
// forbid-list itself (it literally contains the banned strings by design).
// Block E2/Q8 — the workspace copy now lives in the bilingual catalogue, so this scans BOTH editions
// rather than the Portuguese-only module constants it used to read. FORBIDDEN_PHRASES stays excluded: it
// is the forbid-list itself and literally contains the banned strings by design.
const workbenchCopy: string[] = [
  ...agentCopyIds().map((id) => agentCopy(id, "pt")),
  ...agentCopyIds().map((id) => agentCopy(id, "en")),
  ...DEV_COMMANDS,
  ...DEV_ENDPOINTS,
  ...TRACE_FLOW,
];

const navLabels: string[] = [
  ...navPrimary.map((i) => i.label),
  ...footerColumns.flatMap((c) => [c.title, ...c.items.map((i) => i.label)]),
];

const publicCopy = [...workbenchCopy, ...navLabels];
const publicText = publicCopy.join("  ");
const publicTextLower = publicText.toLowerCase();

describe("BanzAI-guided operator path (positive framing)", () => {
  // The operator copy presents a BanzAI-guided path positively. Package-manager / container / CI install
  // strings must not surface as an operator method anywhere in the public copy — asserted as data tokens
  // below (the enforcement mechanism), never as a narrative that lists tools as an anti-path.
  const forbiddenRunnerMethods = [
    "pip install",
    "python3 -m pip",
    "docker pull",
    "docker run",
    "ghcr.io/banza-protocol/banza-conformance",
    "workflow_dispatch",
    "actions/upload-artifact",
    "github action",
    "testpypi",
    "pypi",
    "banza-conformance/1.0",
    "método recomendado",
  ];

  it("never presents Python / Docker / GitHub-Action / external-runner as an operator method", () => {
    for (const phrase of forbiddenRunnerMethods) {
      expect(publicTextLower).not.toContain(phrase);
    }
  });

  it("keeps only the Rust developer commands (banza-conformance-rs), never the pip/docker package", () => {
    const cmds = DEV_COMMANDS.join(" ");
    // The Programadores tab is maintainer-oriented and Rust-first (ADR-038): the Rust binary is fine,
    // the Python package install / Docker runner are not.
    expect(cmds).toContain("banza-conformance-rs");
    expect(cmds).not.toContain("pip install");
    expect(cmds).not.toContain("docker");
  });

  it("routes operators to BanzAI (the public verification path)", () => {
    const allHrefs = [
      ...navPrimary.map((i) => i.href),
      ...footerColumns.flatMap((c) => c.items.map((i) => i.href)),
    ];
    expect(allHrefs).toContain("/banzai");
    // The removed operational route must not resurface in nav/footer.
    expect(allHrefs).not.toContain("/banzai/workbench");
  });
});

describe("M2.5 — active-model only (no milestone / certification / CA surface)", () => {
  it("has no 'M2 protocol gate' nor any milestone (M2.x) token in the public copy", () => {
    expect(publicText).not.toContain("M2 protocol gate");
    for (const milestone of ["M2.0", "M2.1", "M2.2", "M2.3", "M2.4", "M2.5"]) {
      expect(publicText).not.toContain(milestone);
    }
    // No public/operator-facing label carries a bare "M2" milestone token either.
    for (const label of [...TABS.map((x) => agentCopy(x.nameId, "pt")), ...navLabels]) {
      expect(label).not.toContain("M2");
    }
  });

  it("uses no certification-of-operator or central-CA framing", () => {
    for (const phrase of [
      "operador certificado",
      "operadores certificados",
      "certificação de operador",
      "certificado de produção",
      "BANZA CA",
    ]) {
      expect(publicText).not.toContain(phrase);
    }
  });

  it("uses only qualified certification vocabulary — never a bare 'Certificação' operator credential", () => {
    // M2.19C/D/G — the L2 model made "Certificação de Conformidade e Interoperabilidade" (a technical
    // certification of a specific implementation) active canonical vocabulary. So a label MAY carry the
    // word "Certificação", but only in the qualified per-implementation sense (e.g. "Certificação
    // técnica", "Certificação de Conformidade e Interoperabilidade") — never as a bare standalone
    // "Certificação" that would read as an operator credential. The retired operator-certification / CA
    // framing stays forbidden by the test above.
    for (const label of [...TABS.map((x) => agentCopy(x.nameId, "pt")), ...navLabels]) {
      expect(label).not.toBe("Certificação");
      if (label.includes("Certificação")) {
        expect(label).toMatch(/Certificação\s+(técnica|de\s+Conformidade)/i);
      }
    }
    // The active-model compliance vocabulary "conformidade" remains present in the public copy.
    expect(publicTextLower).toContain("conformidade");
  });

  it("uses no 'corpus' and no bare 'KB' knowledge-base vocabulary", () => {
    expect(publicTextLower).not.toContain("corpus");
    expect(publicText).not.toMatch(/\bKB\b/);
  });

  it("presents the active open-protocol trust vocabulary", () => {
    // Block E2/Q8 — this used to read TRUST_CARDS, a constant with NO consumer: the guard was passing on
    // dead code, so the vocabulary it protects was never actually public through that route. It now reads
    // the surfaces where the vocabulary really is published, in both editions.
    const trustText = [
      readFileSync(new URL("../app/(pt)/confianca/page.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("../app/(pt)/layout.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("../app/en/trust/page.tsx", import.meta.url), "utf8"),
      readFileSync(new URL("../app/en/layout.tsx", import.meta.url), "utf8"),
    ]
      .join("  ")
      .toLowerCase();
    for (const term of [
      "signed protocol metadata",
      "delegated signing key",
      "registo técnico",
      // revocation/fail-closed appear as PT copy ("revogação" / "fecho por omissão"); the exact hyphenated
      // "fail-closed" token is kept out of .ts source because rust-rule-guard treats it as an engine marker.
      "revogação",
      "fecho por omissão",
    ]) {
      expect(trustText).toContain(term);
    }
  });
});

describe("M2.5 — assistant suggestions are task-oriented", () => {
  it("offers non-empty, question-shaped operator tasks", () => {
    expect(STARTER_QUESTIONS.length).toBeGreaterThan(0);
    for (const s of STARTER_QUESTIONS) {
      expect(s.trim().length).toBeGreaterThan(0);
      // A task/question (or an imperative demonstrator), not a certification-as-goal claim. ADR-036
      // added a broad operational demonstrator phrased as an instruction ("Compara …"), which ends
      // with a period; a question still ends with "?".
      expect(/[?.]$/.test(s.trim())).toBe(true);
      expect(s).toMatch(/^(Como|O que|Que |Qual|Quanto|Compara|Onde|Porqu[êe]|Para )/);
    }
  });

  it("never frames certification as the goal", () => {
    for (const s of STARTER_QUESTIONS) {
      expect(s.toLowerCase()).not.toContain("certific");
    }
  });

  it("points at the real operator goals — the validation journey's operational telemetry (ADR-036)", () => {
    const joined = STARTER_QUESTIONS.join("  ");
    expect(joined.toLowerCase()).toContain("valida");
    // ADR-036 operational duration/metric demonstrators: total duration, the slowest step, and a
    // run-over-run comparison.
    expect(joined.toLowerCase()).toContain("tempo");
    expect(joined.toLowerCase()).toContain("etapa");
    expect(joined.toLowerCase()).toContain("duração");
  });
});
