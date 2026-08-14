// banzaiState.ts — the single, validated URL-state contract for the canonical /banzai app (M2.19EF2).
//
// /banzai is the ONE BanzAI route. It runs two MODES of the SAME shell — "ask" (the conversation) and
// "validation" (the 9-step implementation-validation journey). This module parses the request's query
// params against CLOSED allowlists (see banzaiValidation.ts) and returns a typed, always-valid state.
// It NEVER throws and NEVER trusts a caller-supplied URL: unknown values fall back to safe defaults, so
// SSRF / path-traversal / injection are impossible by construction. Reused server-side (app/banzai/
// page.tsx reads the params on first paint) and safe to reuse client-side.

import {
  resolveTarget,
  resolveWorkflow,
  resolveStep,
  isClosedId,
  VALIDATION_TARGETS,
  DEFAULT_TARGET_ID,
  type ValidationTarget,
  type ValidationWorkflow,
  type ValidationStepId,
} from "@/lib/banzaiValidation";

/** The modes of the single BanzAI shell. M2.19G.3 (ADR-037) adds "onboarding". */
export type BanzaiMode = "ask" | "validation" | "onboarding";

/** M2.19G.4 (ADR-036) — the navigable CONTEXT of the single interface. A pure *navigation* concept:
 *  the global list of the session's operators → a selected operator → a selected implementation. It is
 *  NOT the three architectural layers (ADR-004..063) and NOT the L0–L4 certification profiles
 *  (ADR-032..066). Contexts are addressable route segments under /banzai; every segment is a closed slug
 *  resolved server-side against the closed registry, never a caller-supplied URL. */
export type BanzaiContext = "global" | "operator" | "implementation";

/** M2.19G.4 (ADR-036) — the closed-slug ids carried by the route segments (never a URL). The segment
 *  page shape-validates them (isClosedId) before handing them here; they are re-resolved in the session
 *  against the FETCHED registry, so an off-registry id simply falls back to the global context. */
export interface BanzaiPathSeed {
  operatorId?: string | null;
  implementationId?: string | null;
}

/** A read-only resource the ask surface can deep-link to (keeps the existing ?view=guia behaviour). */
export type BanzaiResource = "guia";

export interface BanzaiState {
  mode: BanzaiMode;
  /** M2.19G.4 (ADR-036/05) — the current navigable context. Derived from the route segments
   *  (path seed) with precedence over the query. "operator"/"implementation" imply the validation
   *  workspace; "global" keeps the query-selected mode. Navigation only — never a layer or a tier. */
  context: BanzaiContext;
  /** The validation target (closed registry). Always a real target; `targetKnown` records whether the
   *  requested target was on-list (an off-list request falls back to the default and flags this false). */
  target: ValidationTarget;
  targetKnown: boolean;
  workflow: ValidationWorkflow;
  /** The active journey step, when the URL named one (via ?step= or a step-shaped ?workflow=). */
  step: ValidationStepId | null;
  /** A read-only resource to open in ask mode (?view=guia → Guia). */
  view: BanzaiResource | null;
  /** M2.19G.1 (ADR-034) / M2.19G.3B — the Fase 0 seed ids from the deep link (?target=/?implementation=).
   *  The operator list is fetched at runtime from the closed Technical Registry (no static map lives on
   *  the client any more), so state seeding carries only the shape-validated ids; the validation session
   *  resolves them against the fetched operators once loaded. Both may be null — the shell then shows the
   *  Fase 0 selectors and enables the journey on choice. Closed-shape only; no URL is ever accepted. */
  initialOperatorId: string | null;
  initialImplementationId: string | null;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function resolveMode(v: string | undefined): BanzaiMode {
  if (v === "validation") return "validation";
  if (v === "onboarding") return "onboarding";
  return "ask";
}

/**
 * Parse the /banzai query params into a typed, validated state. Never throws; every field is resolved
 * against a closed allowlist and falls back to a safe default. Callers can trust the returned object.
 */
export function parseBanzaiState(
  sp: Record<string, string | string[] | undefined>,
  pathSeed?: BanzaiPathSeed,
): BanzaiState {
  const rawMode = first(sp.mode);
  const rawTarget = first(sp.target);
  const rawWorkflow = first(sp.workflow);
  const rawStep = first(sp.step);
  const rawView = first(sp.view);
  const rawImplementation = first(sp.implementation);

  // Closed-allowlist target resolution. An unknown/off-list target is NOT an error surface: fall back to
  // the default Operador Zero target and remember it was unknown, so a stale/malformed deep link still
  // lands on a working, honest journey rather than a dead end.
  const resolved = resolveTarget(rawTarget);
  const targetKnown = !(rawTarget != null && rawTarget !== "" && resolved === null);
  const target = resolved ?? VALIDATION_TARGETS[DEFAULT_TARGET_ID];

  const workflow = resolveWorkflow(rawWorkflow);

  // Prefer an explicit ?step=; otherwise derive from a step-shaped ?workflow= (so a workflow deep link
  // opens on the matching step). "full" and anything off-list → null: the shell then starts at discovery.
  const step = resolveStep(rawStep) ?? resolveStep(rawWorkflow);

  const view: BanzaiResource | null = rawView === "guia" ? "guia" : null;

  // M2.19G.4 (ADR-036) — route-segment seeds take PRECEDENCE over the query. The segment page has already
  // shape-validated them; we re-check isClosedId here so parseBanzaiState stays a throw-free, allowlist-
  // only choke-point regardless of caller. A closed-shape implementation id only counts when it rides a
  // closed-shape operator id (operator ≠ implementation; ADR-034). No URL is ever accepted.
  const pathOperatorId = isClosedId(pathSeed?.operatorId) ? (pathSeed!.operatorId as string) : null;
  const pathImplementationId =
    pathOperatorId && isClosedId(pathSeed?.implementationId) ? (pathSeed!.implementationId as string) : null;

  // The navigable context is derived from the path seed only (/05): a shape-valid implementation
  // segment → "implementation"; a shape-valid operator segment → "operator"; otherwise "global". The
  // segment values are re-resolved in the session against the fetched registry; an off-registry id still
  // resolves to null there and the shell falls back to the global context.
  const context: BanzaiContext = pathImplementationId ? "implementation" : pathOperatorId ? "operator" : "global";

  // M2.19G.3B / ADR-036 — the Fase 0 seed ids. A CLEAN visit (no path seed, no explicit
  // ?target=) seeds NO operator: nothing — not even Operador Zero — is pre-selected. The dynamic Rust
  // Technical Registry (GET /banzai/validate/registry) is the only source of selectable operators; a
  // target is resolved/seeded ONLY on an EXPLICIT deep link — a route-segment operator id
  // (pathOperatorId) or an on-list ?target=. The path seed wins; otherwise an explicit, on-list
  // ?target= seeds the operator id, and ?implementation= (closed-shape) seeds the implementation. Both
  // are re-resolved in the session against the FETCHED registry — a seed absent from the live registry
  // simply resolves to null. An absent ?target= no longer defaults to Operador Zero.
  const explicitTargetRequested = rawTarget != null && rawTarget !== "";
  const initialOperatorId =
    pathOperatorId ??
    (explicitTargetRequested && targetKnown && isClosedId(target.id) ? target.id : null);
  const initialImplementationId =
    pathImplementationId ??
    (initialOperatorId && isClosedId(rawImplementation) ? (rawImplementation as string) : null);

  // "operator"/"implementation" contexts are the validation workspace; "global" keeps the query mode.
  const mode: BanzaiMode = context === "global" ? resolveMode(rawMode) : "validation";

  return {
    mode,
    context,
    target,
    targetKnown,
    workflow,
    step,
    view,
    initialOperatorId,
    initialImplementationId,
  };
}
