// The static operational facts a reader is told when BanzAI cannot measure something — as data.
//
// When an operational question is understood but there are not enough public executions to answer it,
// the honest reply still tells the reader real things: the validation journey has nine named steps, each
// execution's observed duration is recorded in a JourneyReceipt, and once executions exist BanzAI will
// report the median and the 95th percentile. Those facts were embedded in a Portuguese sentence written
// in Rust, which meant English readers could not be told them at all without someone re-typing the
// sentence — and a re-typed list is a second source of truth that drifts.
//
// So the facts live here as identifiers, and each locale names them. NOT a second copy of the step list:
// `STEP_ORDER` is the canonical nine-step spine (ADR-034 §21) that the validation runner itself executes,
// and it is imported rather than restated. If a step is ever added or renamed there, this description
// follows automatically instead of quietly disagreeing with the thing it describes.
//
// Everything here is REQUEST-INDEPENDENT. What a particular reader asked about — subject, metric,
// aggregation — is decision data and stays on the decision.

// The step ORDER only — deliberately not from validate.js, which carries the receipt store and a
// PostgreSQL driver that this module has no use for.
import { STEP_ORDER } from "./journeySteps.js";

/**
 * The statistics BanzAI promises once comparable executions exist.
 *
 * These are the claim identities telemetry actually emits (`median_total`, `p95_total` in
 * telemetry.js), not a prose flourish — so the promise and the implementation cannot drift apart
 * silently.
 */
export const SUPPORTED_STATISTICS = ["median_total", "p95_total"];

/** The canonical artifact that records an execution's observed duration. A proper noun in every locale. */
export const RECEIPT_ARTIFACT = "JourneyReceipt";

/**
 * The language-neutral description of the operational domain, for presentation to consume.
 *
 * Read it; do not extend it with per-request values. Callers pass their decision separately.
 */
export function operationalDomain() {
  return {
    journey_steps: STEP_ORDER.slice(),
    receipt_artifact: RECEIPT_ARTIFACT,
    supported_statistics: SUPPORTED_STATISTICS.slice(),
  };
}
