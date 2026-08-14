// Operador Zero — the artifacts served on zero.banza.network (root JSON endpoints, via the internal
// /oz handler). The apex /operador-zero surface is retired (410 Gone, M2.12G).
//
// Read at build time from `examples/operators/zero/`, the SAME canonical tree the Rust engine
// validates. Nothing is re-typed here: a hand-maintained copy on the website would be a second
// source of truth, and the whole point of the simulator is that one operator's artifacts agree with
// each other.
//
// RUST_WRAPPER_ONLY. The engine's boundary checker (operator-zero-core) is what proves the marking;
// this module only reads files and exports constants. TypeScript computes nothing about the
// simulator (ADR-038) — no ledger arithmetic, no validation, no scoring, no signatures.
//
// The marker is needed because the `kind` values below mirror the Rust engine's own `ARTIFACT_TYPE`
// vocabulary, one of which is literally `evidence_bundle` — an engine marker the Rust-first guard
// looks for. Renaming it to satisfy the guard would break the cross-language vocabulary contract,
// which is the more important invariant.

import { ARTIFACT_DATA, VALIDATION_STATE } from "@/lib/operadorZeroArtifacts.generated";

// The served payloads are BUNDLED, not read from disk: the website Docker image is built from
// `website/` alone, so `examples/operators/zero/` is unavailable at build and at runtime (a runtime
// read 500s in production — M2.12B found this the hard way). operadorZeroArtifacts.generated.ts is
// vendored from the canonical tree by tools/gen-operador-zero-artifacts.mjs, and
// `make operator-zero-check` fails if it drifts.

/** Every public artifact, by its public route segment. `file` names the CANONICAL source (for
 *  provenance + the freshness guard); the served bytes come from the bundled ARTIFACT_DATA. */
export const ARTIFACT_ROUTES: { route: string; file: string; label: string; kind: string }[] = [
  { route: ".well-known/banza/operator", file: "manifest/operator-zero.manifest.valid.json", label: "Manifest", kind: "manifest" },
  { route: "key-manifest", file: "keys/demo-key-manifest.json", label: "Key Manifest", kind: "key_manifest" },
  { route: "revocation-list", file: "keys/revocation-list.demo.json", label: "Revocation List", kind: "revocation_list" },
  { route: "conformance/evidence", file: "conformance/conformance-pass.json", label: "Conformance Evidence", kind: "conformance_evidence" },
  { route: "federation/metadata", file: "federation/federation-manifest.demo.json", label: "Federation Metadata", kind: "federation_metadata" },
  { route: "evidence-bundle", file: "evidence-bundle/evidence-bundle.complete.json", label: "Evidence Bundle", kind: "evidence_bundle" },
  { route: "traces/full-e2e", file: "traces/full-e2e-trace.json", label: "Full E2E Trace", kind: "trace" },
  { route: "ledger/demo", file: "ledger/demo-accounts.json", label: "Ledger Demo", kind: "ledger" },
  { route: "payments/demo-qr", file: "payments/demo-qr-payment.json", label: "Payment Demo (QR)", kind: "payment" },
  { route: "payments/demo-refund", file: "payments/demo-refund.json", label: "Refund Demo", kind: "payment" },
  { route: "discovery", file: "discovery/discovery.json", label: "Discovery", kind: "discovery" },
  { route: "capabilities", file: "capabilities/capabilities.json", label: "Capabilities", kind: "capabilities" },
  { route: ".well-known/banza/signed-protocol-metadata", file: "metadata/signed-metadata.json", label: "Signed Metadata", kind: "signed_metadata" },
  { route: "federation-metadata", file: "federation/federation-metadata.json", label: "Federation Manifest", kind: "federation_manifest" },
];

/** The bundled payload for a public route. Undefined for anything off the public list. */
export function readArtifact(route: string): unknown {
  return ARTIFACT_DATA[route];
}

/** Look a route up. Returns undefined for anything not on the public list — never a guess. */
export function artifactForRoute(route: string) {
  return ARTIFACT_ROUTES.find((a) => a.route === route);
}

/** M2.14A — the versioned demo-validation state shown on zero.banza.network. Vendored from
 *  examples/operators/zero/status/operator-zero-validation-state.json (canonical source of truth).
 *  Demo evidence only: never certification, approval, licence or a real/production operator. */
export interface OperadorZeroValidationState {
  operator_id: string;
  operator_display_name: string;
  demo_only: boolean;
  monetary_value: boolean;
  production_allowed: boolean;
  currency: string;
  real_money: boolean;
  certification: boolean;
  operator_real: boolean;
  status: string;
  status_label_pt: string;
  pass_label_pt: string;
  journey_steps_completed: number;
  journey_steps_total: number;
  artifacts_ready: number;
  artifacts_total: number;
  blockers: number;
  evidence_bundle_url: string;
  trace_url: string;
  boundary_pt: string;
  note: string;
}

export const OPERADOR_ZERO_VALIDATION_STATE = VALIDATION_STATE as unknown as OperadorZeroValidationState;

/** The public identity, mirrored from the engine's own `identity()` shape. */
export const OPERADOR_ZERO = {
  operator_id: "operator-zero",
  operator_display_name: "Operador Zero",
  short_description: "Implementação de referência BANZA",
  currency: "KZ_DEMO",
  demo_only: true,
  monetary_value: false,
  production_allowed: false,
} as const;

// M2.19E/F — the Operador Zero is the canonical read-only reference implementation. It EXPOSES
// identity, manifest, capabilities, endpoints, metadata, keys and evidence; it does NOT run tests,
// payments, conformance, trust, federation or certification. Every human-initiated validation runs in
// the modo de validação do BanzAI, executed by the Rust engines. These strings are the public
// boundary the guards enforce.

export const BOUNDARY =
  "O Operador Zero não é banco, não é PSP, não é carteira, não é operador financeiro licenciado, não movimenta dinheiro real, não participa no scheme operacional (Camada 3), não aparece como operador real no registo e não possui certificação de produção. É a implementação pública de referência do protocolo BANZA — um ambiente de demonstração.";

export const DEFINITION =
  "O Operador Zero é a implementação pública de referência do protocolo BANZA. Expõe os artefactos, endpoints e estados necessários para descoberta, verificação de conformidade, interoperabilidade, trust e preparação de certificação. Não movimenta fundos reais, não é um PSP e não é um participante activo. Os testes e validações desta implementação são iniciados exclusivamente através do BanzAI.";

export const DISCLAIMER =
  "Operador Zero — implementação de referência e ambiente de demonstração. Não corresponde a um participante financeiro activo, não movimenta fundos reais e não possui certificação de produção. Esta superfície expõe o estado e os artefactos da implementação; não executa testes, pagamentos, conformidade ou certificação.";

/** M2.19E/F — the descriptor shown across the read-only surface. */
export const OPERADOR_ZERO_DESCRIPTOR = "Implementação de referência BANZA";

/** M2.19E/F — the eyebrow / category line. */
export const OPERADOR_ZERO_EYEBROW = "IMPLEMENTAÇÃO CANÓNICA · AMBIENTE DE DEMONSTRAÇÃO";
