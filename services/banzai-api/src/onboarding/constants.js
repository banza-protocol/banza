// Shared onboarding constants (M2.19G.3, ADR-069). These MIRROR the canonical Rust engine
// (engines/banzai-onboarding) values; the engine remains the source of truth (onboarding_tool_version_json
// reports them). Kept here so the Node glue can reference the .well-known path synchronously without a
// WASM round-trip.

// The single origin-ownership challenge location an operator must publish. Must equal the Rust
// `WELL_KNOWN_PATH`; a mismatch is caught by the onboarding contract guard and the engine self-check.
export const WELL_KNOWN_PATH = "/.well-known/banza/ownership-challenge.json";
