/** The BanzAI row of the protocol-status panel — one decision, two languages.
 *
 * Every other row on that panel is editorial: a person wrote it and a person keeps it true. This row is
 * not. It is derived server-side from the runtime SSOT (GET /banzai/runtime, ADR-036) so the page cannot
 * contradict what the service actually reports, and the rule is that where the prose and the route
 * disagree, the route wins.
 *
 * That rule only holds if there is ONE derivation. Writing a second English copy of this logic would
 * create a second status authority — two readings of the same route that can disagree about what the
 * runtime is doing, which is precisely the failure this row exists to prevent. So the decision lives here
 * once, and the locale chooses only WORDS: the same payload always yields the same tone and the same
 * sequence of facts in both editions.
 *
 * Fail-closed by construction. An unreachable route, a non-ok response, an unrecognised schema, mode or
 * status all produce the neutral fallback. "Qwen local activo" / "local Qwen engine running" is emitted
 * ONLY when the route itself confirms an ok local_qwen mode — it is never a hardcoded claim.
 */

export type StatusTone = "ok" | "pend";
export type RuntimeRow = { value: string; tone: StatusTone };
type Locale = "pt" | "en";

const RUNTIME_ORIGIN = process.env.BANZA_RUNTIME_ORIGIN || "https://banza.network";

const KNOWN_MODES = ["local_qwen", "external_hosted", "mock", "degraded"];
const KNOWN_STATUS = ["ok", "degraded", "unknown"];

const PHRASE: Record<Locale, Record<string, string>> = {
  pt: {
    prefix: "Interface humana primária do protocolo",
    suffix: "estado por resposta · não normativo · pré-produção",
    degraded: "motor de modelo degradado — modelo indisponível",
    unknown: "estado do motor por confirmar",
    local_qwen: "Qwen local activo",
    external_hosted: "modelo externo alojado",
    mock: "motor determinístico (mock)",
    active: "motor activo",
    inference_local: "inferência local on-host",
    inference_external: "inferência externa",
    inference_none: "sem inferência de modelo",
    external_yes: "com chamadas externas",
    external_no: "sem chamadas externas",
  },
  en: {
    prefix: "The protocol's primary human interface",
    suffix: "per-answer state · non-normative · pre-production",
    degraded: "model engine degraded — model unavailable",
    unknown: "engine state unconfirmed",
    local_qwen: "local Qwen running",
    external_hosted: "externally hosted model",
    mock: "deterministic engine (mock)",
    active: "engine running",
    inference_local: "inference local, on-host",
    inference_external: "inference external",
    inference_none: "no model inference",
    external_yes: "with external calls",
    external_no: "no external calls",
  },
};

const fallback = (locale: Locale): RuntimeRow => ({
  value: `${PHRASE[locale].prefix} · ${PHRASE[locale].suffix}`,
  tone: "pend",
});

/** Compose the engine substring from the route payload only. */
function engineLine(rt: Record<string, unknown>, locale: Locale): RuntimeRow {
  const p = PHRASE[locale];
  const status = String(rt.status);
  const mode = String(rt.mode);
  const inference = String(rt.inference_location);
  const external = Boolean(rt.external_calls);

  const parts: string[] = [];
  if (status === "degraded") parts.push(p.degraded);
  else if (status === "unknown") parts.push(p.unknown);
  else if (mode === "local_qwen") parts.push(p.local_qwen);
  else if (mode === "external_hosted") parts.push(p.external_hosted);
  else if (mode === "mock") parts.push(p.mock);
  else parts.push(p.active);

  if (inference === "local") parts.push(p.inference_local);
  else if (inference === "external") parts.push(p.inference_external);
  else if (inference === "none") parts.push(p.inference_none);

  parts.push(external ? p.external_yes : p.external_no);

  return {
    value: `${p.prefix} · ${parts.join(" · ")} · ${p.suffix}`,
    tone: status === "ok" ? "ok" : "pend",
  };
}

/** Read the runtime SSOT and render the row for one edition. Short revalidate mirrors the route's max-age. */
export async function fetchBanzaiRuntimeRow(locale: Locale): Promise<RuntimeRow> {
  try {
    const res = await fetch(`${RUNTIME_ORIGIN}/banzai/runtime`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return fallback(locale);
    const rt = (await res.json()) as Record<string, unknown>;
    if (
      rt.schema_version !== "banzai-runtime/1" ||
      !KNOWN_MODES.includes(String(rt.mode)) ||
      !KNOWN_STATUS.includes(String(rt.status))
    ) {
      return fallback(locale);
    }
    return engineLine(rt, locale);
  } catch {
    return fallback(locale);
  }
}

/** Exposed for the tests that prove both editions decide identically from one payload. */
export const __runtimeRowInternals = { engineLine, fallback, KNOWN_MODES, KNOWN_STATUS };
