// Canonical, single-source protocol status for the public Home (M2.19G.2 §13/§15).
// Every value is SOURCED, never decorative:
//   - version / phase: the canonical protocol version — BANZA v1.0, pre-production.
//   - LAST_VERIFIED_AT: the build/deploy timestamp injected at build time (next.config.mjs
//     `env.NEXT_PUBLIC_BANZA_BUILD_TIME`). It is the moment the canonical public snapshot was last built,
//     deployed and verified by the public-edge QA — a real timestamp, not a browser-seeded counter. The
//     hero status bar renders the elapsed time relative to THIS real value on the client.
//   - REGISTRY_SUMMARY: derived from the closed Technical Registry (ADR-068). The single reference
//     implementation is Operador Zero; there are no production operators and no active technical
//     certifications. Operador Zero is NEVER counted as a production operator, an active participant or an
//     active certification (§15/§16).

export const PROTOCOL_VERSION = "1.0";
export const PROTOCOL_PHASE = "PRÉ-PRODUÇÃO";

export const LAST_VERIFIED_AT: string =
  process.env.NEXT_PUBLIC_BANZA_BUILD_TIME ?? "1970-01-01T00:00:00.000Z";

export type RegistrySummary = {
  /** Real production operators published in the Technical Registry (0 in pre-production). */
  productionOperators: number;
  /** Canonical reference implementations (Operador Zero). */
  referenceImplementations: number;
  /** Active technical certifications (0 — no implementation is certified). */
  activeCertifications: number;
  /** Implementations that passed L2 conformance & interoperability (0 — none today). */
  inConformance: number;
};

export const REGISTRY_SUMMARY: RegistrySummary = {
  productionOperators: 0,
  referenceImplementations: 1,
  activeCertifications: 0,
  inConformance: 0,
};
