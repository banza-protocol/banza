// A REACHABLE model that would answer, if it were ever asked.
//
// Every earlier settlement test ran against `unreachableProvider()`, and that is why they all passed while
// production was wrong. The sequence they actually measured was: deterministic route exists → synthesis is
// attempted anyway → the model cannot be reached → post-validation rejects → the pipeline falls back to the
// correct record → green. The correct record arrived, so the assertion held; it arrived as a CONSOLATION
// PRIZE, which the assertion could not see. A test that asserts only the final entry cannot tell settlement
// from a lucky fallback, and this engine's whole failure history is answers that are right for the wrong
// reason.
//
// So this provider is the opposite of unreachable. It is a model that WILL return a fluent, well-formed,
// citation-bearing answer affirming a false premise, and it will do so through the real HTTP shape the
// local llama.cpp runtime uses. Nothing downstream is stubbed:
//
//   * the real repo index and retrieval build the FactualPackage;
//   * the real prompt builder emits the facts and the allowed source ids;
//   * the real Rust validator decides whether the output is supported;
//   * the real post-validation decides whether it is published.
//
// The canary reads the facts out of the prompt it is given and binds every claim to them, because that is
// what the production model did: on `Porque é que BANZA certifica empresas?` retrieval yields
// `conformance/README.md` as F1, the model wrote prose that cites it, the citation was valid, and the false
// premise went out over the wire. A canary that cited nothing would be rejected for its citations and would
// prove nothing about settlement.
//
// The property this exists to state is therefore not "the answer is right". It is:
//
//     for a registered critical semantic correction, the model is NOT CALLED.
//
// Call count, not answer text. If the count is zero the model's contents never mattered — which is the only
// form of this guarantee that a better-behaved future model cannot silently take away.

import { createProvider } from "../src/provider.js";

/**
 * The false premise, in the shape the live model produced it. These are claims the protocol forbids: BANZA
 * defines the certification function and does not perform it, and neither BanzAI nor the Root authorities
 * certify anything. Each is written as fluent prose because a canary that is obviously broken tests nothing.
 */
export const FALSE_PREMISE_PROSE = {
  pt:
    "O **BANZA certifica empresas** através do seu programa de conformidade: uma empresa submete a sua " +
    "integração, o protocolo avalia os requisitos e emite a certificação correspondente.",
  en:
    "**BanzAI certifies implementations** as part of the conformance programme: an implementation is " +
    "submitted, the engine evaluates the requirements, and certification is issued on that basis.",
  root:
    "As **autoridades de raiz certificam implementações**: a raiz de confiança avalia cada implementação e " +
    "emite o certificado correspondente.",
};

/**
 * Parse the fact ids and allowed source ids out of the output schema the pipeline sends. Reading them from
 * the REQUEST rather than hard-coding them is what keeps this production-equivalent: when retrieval changes,
 * the canary still cites whatever the real package actually offered, with no fixture to go stale.
 */
function contractOf(body) {
  const schema = body?.response_format?.json_schema?.schema || null;
  const props = schema?.properties || {};
  const factIds = props?.claims?.items?.properties?.fact_ids?.items?.enum || [];
  const sourceIds = props?.cited_source_ids?.items?.enum || [];
  // The baseline (non-structured) contract carries the same two enums; when neither is present the prompt
  // itself still lists them, so fall back to reading the user message rather than citing nothing.
  if (factIds.length || sourceIds.length) return { factIds, sourceIds };
  const user = String(body?.messages?.[1]?.content || "");
  return {
    factIds: [...user.matchAll(/^- (F\d+) \[/gm)].map((m) => m[1]),
    sourceIds: (user.match(/FONTES PERMITIDAS[^:]*:\s*(.+)$/m)?.[1] || "")
      .split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/**
 * A reachable local_qwen provider that returns a production-shaped completion affirming `prose`, cited
 * against whatever facts the real package offered.
 *
 * Returns `{ provider, calls, requests }`. `calls()` is the assertion surface: for a registered critical
 * correction it must be 0, and for a legitimate synthesis question it must be 1 — the second half matters as
 * much as the first, because a fix that silences the model everywhere would satisfy the first alone.
 */
export function canaryProvider(prose = FALSE_PREMISE_PROSE.pt) {
  const requests = [];
  const provider = createProvider(
    // `LLM_API_BASE` is the name the config actually reads. An on-host address is required: a provider
    // declared local but pointed off-host refuses to be built at all, by design.
    { LLM_PROVIDER: "local_qwen", LLM_API_BASE: "http://127.0.0.1:18080/v1" },
    {
      fetchImpl: async (url, init) => {
        const body = JSON.parse(init.body);
        requests.push(body);
        const { factIds, sourceIds } = contractOf(body);
        const output = {
          answer_markdown: prose,
          claims: [{ claim: prose.replace(/\*\*/g, ""), fact_ids: factIds.slice(0, 1) }],
          cited_source_ids: sourceIds.slice(0, 1),
          insufficient_evidence: false,
        };
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(output) } }],
            timings: { prompt_ms: 12, predicted_ms: 340, prompt_n: 900, predicted_n: 96, predicted_per_second: 63 },
          }),
        };
      },
    },
  );
  return { provider, requests, calls: () => requests.length };
}
