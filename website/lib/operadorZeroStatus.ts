// Operador Zero — read-only technical status (M2.19E/F).
//
// The Operador Zero surface NEVER computes a verdict. It publishes the LAST validation state produced
// by the BanzAI validation mode (Rust engines) and vendored into the canonical artifact tree
// (examples/operators/zero/status/…). This module only SELECTS + LABELS those published facts for the
// read-only page. TypeScript computes nothing about validation (ADR-037): no scoring, no pass/fail
// arithmetic, no thresholds — every state below comes verbatim from a published artifact.
//
// There is deliberately NO aggregate score and NO "100/100": a score is not a certification, and the
// canonical status vocabulary is categorical (mirrors the M2.19D certification state machine, ADR-066).

import { OPERADOR_ZERO_VALIDATION_STATE } from "@/lib/operadorZero";

/** The categorical states a validation dimension can hold. Mirrors ADR-066 + the readiness vocabulary.
 *  `NOT_EVALUATED` is the honest default when nothing has been published. */
export type ZeroDimensionState =
  | "NOT_EVALUATED"
  | "PENDING"
  | "VERIFIED"
  | "FAILED"
  | "BLOCKED"
  | "EXPIRED"
  | "SUSPENDED"
  | "REVOKED"
  | "SUPERSEDED"
  | "NOT_CERTIFIED"
  | "PRE_PRODUCTION";

export interface ZeroDimension {
  /** Canonical dimension key. */
  key:
    | "availability"
    | "manifest"
    | "keys"
    | "conformance"
    | "interoperability"
    | "trust"
    | "federation"
    | "evidence"
    | "certification";
  label: string;
  state: ZeroDimensionState;
  /** Human PT label for the state. */
  state_label: string;
  /** The engine that produced this state (Rust; never a model). */
  engine: string;
  /** Where the evidence lives (a read-only artifact endpoint). */
  evidence_ref: string;
}

/** PT labels for each categorical state — colour is NEVER the only signal. */
export const STATE_LABEL_PT: Record<ZeroDimensionState, string> = {
  NOT_EVALUATED: "não avaliado",
  PENDING: "pendente",
  VERIFIED: "verificado",
  FAILED: "falhou",
  BLOCKED: "bloqueado",
  EXPIRED: "expirado",
  SUSPENDED: "suspenso",
  REVOKED: "revogado",
  SUPERSEDED: "substituído",
  NOT_CERTIFIED: "não certificado",
  PRE_PRODUCTION: "pré-produção",
};

/** The tone class per state (for CSS). Colour supplements, never replaces, the label. */
export const STATE_TONE: Record<ZeroDimensionState, "verified" | "pending" | "failed" | "neutral"> = {
  NOT_EVALUATED: "neutral",
  PENDING: "pending",
  VERIFIED: "verified",
  FAILED: "failed",
  BLOCKED: "failed",
  EXPIRED: "failed",
  SUSPENDED: "failed",
  REVOKED: "failed",
  SUPERSEDED: "neutral",
  NOT_CERTIFIED: "neutral",
  PRE_PRODUCTION: "pending",
};

// The published demo validation state. Every technical dimension whose evidence artifact is complete
// and valid in the canonical tree is VERIFIED (the artifact IS the evidence). Certification is the
// honest exception: the Operador Zero is demo_only / production_allowed=false, so it is NOT_CERTIFIED —
// it never certifies itself. This mapping READS the published facts; it does not decide them.
const S = OPERADOR_ZERO_VALIDATION_STATE;

function published(dimEvidenceComplete: boolean): ZeroDimensionState {
  return dimEvidenceComplete ? "VERIFIED" : "NOT_EVALUATED";
}

// artifacts_ready === artifacts_total in the published demo state ⇒ the technical evidence is complete.
const evidenceComplete = S.artifacts_ready > 0 && S.artifacts_ready === S.artifacts_total && S.blockers === 0;

export const ZERO_DIMENSIONS: ZeroDimension[] = [
  { key: "availability", label: "Disponibilidade", state: published(true), state_label: STATE_LABEL_PT[published(true)], engine: "banza-operator-manifest", evidence_ref: "/.well-known/banza/operator.json" },
  { key: "manifest", label: "Manifest", state: published(evidenceComplete), state_label: STATE_LABEL_PT[published(evidenceComplete)], engine: "banza-operator-manifest", evidence_ref: "/.well-known/banza/operator.json" },
  { key: "keys", label: "Chaves e Assinaturas", state: published(evidenceComplete), state_label: STATE_LABEL_PT[published(evidenceComplete)], engine: "banza-trust", evidence_ref: "/key-manifest.json" },
  { key: "conformance", label: "Conformidade", state: published(evidenceComplete), state_label: STATE_LABEL_PT[published(evidenceComplete)], engine: "banza-conformance", evidence_ref: "/conformance/evidence.json" },
  { key: "interoperability", label: "Interoperabilidade", state: published(evidenceComplete), state_label: STATE_LABEL_PT[published(evidenceComplete)], engine: "banza-l2-readiness", evidence_ref: "/traces/full-e2e.json" },
  { key: "trust", label: "Trust", state: published(evidenceComplete), state_label: STATE_LABEL_PT[published(evidenceComplete)], engine: "banza-trust", evidence_ref: "/revocation-list.json" },
  { key: "federation", label: "Federação", state: published(evidenceComplete), state_label: STATE_LABEL_PT[published(evidenceComplete)], engine: "banza-l3-readiness", evidence_ref: "/federation/metadata.json" },
  { key: "evidence", label: "Evidência", state: published(evidenceComplete), state_label: STATE_LABEL_PT[published(evidenceComplete)], engine: "banza-evidence-bundle", evidence_ref: "/evidence-bundle.json" },
  // Certification: honest categorical state — a demo implementation is NOT_CERTIFIED (ADR-064/066).
  { key: "certification", label: "Prontidão de certificação", state: "NOT_CERTIFIED", state_label: STATE_LABEL_PT.NOT_CERTIFIED, engine: "banza-certification", evidence_ref: "/banzai?mode=validation&target=operator-zero&workflow=certification" },
];

/** The proof chain (read-only): Manifest → Keys → Metadata → Conformance → Interoperability → Trust →
 *  Evidence → Certification Record. A node reflects the published dimension state; no click evaluates. */
export const PROOF_CHAIN: { key: ZeroDimension["key"]; label: string }[] = [
  { key: "manifest", label: "Manifest" },
  { key: "keys", label: "Keys" },
  { key: "trust", label: "Metadata" },
  { key: "conformance", label: "Conformance" },
  { key: "interoperability", label: "Interoperability" },
  { key: "trust", label: "Trust" },
  { key: "evidence", label: "Evidence" },
  { key: "certification", label: "Certification Record" },
];

export function dimensionState(key: ZeroDimension["key"]): ZeroDimensionState {
  return ZERO_DIMENSIONS.find((d) => d.key === key)?.state ?? "NOT_EVALUATED";
}
