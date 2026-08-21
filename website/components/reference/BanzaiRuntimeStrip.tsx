// Live runtime strip for the BanzAI reference chapter (§12 "Estado verificável do runtime").
// It reads the runtime single source of truth server-side — GET /banzai/runtime (schema
// banzai-runtime/1, ADR-036) — so the reference never fixes the provider, model or counters in prose.
// Any failure or an unrecognised schema/mode/status resolves to an honest "estado não confirmado"
// line rather than a fabricated claim. This mirrors the /estado consumer; the machine route wins.
//
// M2.19G.5F closure (§8): the provenance ("Fonte: estado público do runtime") and the "Verificado em:"
// timestamp are explicit, labelled fields — the source is STATED, not merely inferable from prose — and
// all copy is sourced from the canonical architecture manifest so §8 and the manifest never drift. The
// fetch/validation logic is exported (validateRuntime, RUNTIME_FETCH) so the change-test can prove the
// reference follows the route (ISR, no rebuild), fails safe, and never presents last-known as current.

import { getBanzaiRuntimeContract } from "@/lib/banzaiArchitecture";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

const RT = getBanzaiRuntimeContract();
const RUNTIME_ORIGIN = process.env[RT.fetch.origin_env] || RT.fetch.origin_default;

// Fetch policy (ISR): revalidated at most every `revalidate_seconds` and abandoned after `timeout_ms`,
// so the reference follows route changes WITHOUT a rebuild and fails safe when the origin is silent.
export const RUNTIME_FETCH = {
  url: `${RUNTIME_ORIGIN}${RT.route}`,
  revalidateSeconds: RT.fetch.revalidate_seconds,
  timeoutMs: RT.fetch.timeout_ms,
} as const;

// The manifest provenance is a complete labelled statement ("Fonte: estado público do runtime"). Split
// off the leading label so it can be emphasised WITHOUT the component re-adding "Fonte:" (which produced
// a duplicated "Fonte: Fonte:"). Resilient: if the manifest ever drops the prefix, we still bold "Fonte:".
// Every reader-facing string here comes from the manifest, per edition. The strip composes no prose of
// its own: it lived entirely in Portuguese, and on the English BanzAI surface the whole ESTADO panel —
// heading, provenance, field labels, even the Sim/Não values — was Portuguese under an English app.
function provenance(locale: Locale): { label: string; text: string } {
  const full = locale === "en" ? RT.labels.provenance_en : RT.labels.provenance_pt;
  const sep = full.indexOf(": ");
  const fallbackLabel = locale === "en" ? "Source:" : "Fonte:";
  return sep >= 0
    ? { label: full.slice(0, sep + 1), text: full.slice(sep + 2) }
    : { label: fallbackLabel, text: full };
}

type Runtime = Record<string, unknown>;

/**
 * Validate a runtime payload against the banzai-runtime/1 contract. Returns the object only when the
 * schema, mode and status are all recognised; otherwise null — so a stale/foreign/garbled payload is
 * never presented as the current state. Pure and exported for the change-test.
 */
export function validateRuntime(rt: unknown): Runtime | null {
  if (!rt || typeof rt !== "object") return null;
  const r = rt as Runtime;
  if (
    r.schema_version !== RT.schema_version ||
    !RT.enums.mode.includes(String(r.mode)) ||
    !RT.enums.status.includes(String(r.status))
  ) {
    return null;
  }
  return r;
}

async function fetchRuntime(): Promise<Runtime | null> {
  try {
    const res = await fetch(RUNTIME_FETCH.url, {
      headers: { Accept: "application/json" },
      next: { revalidate: RUNTIME_FETCH.revalidateSeconds },
      signal: AbortSignal.timeout(RUNTIME_FETCH.timeoutMs),
    });
    if (!res.ok) return null;
    return validateRuntime(await res.json());
  } catch {
    return null;
  }
}

function yesNo(v: unknown, locale: Locale): string {
  if (v === true) return RT.value_labels.yes[locale];
  if (v === false) return RT.value_labels.no[locale];
  return "—";
}

function inferenceLabel(v: unknown, locale: Locale): string {
  const key = `inference.${String(v)}` as keyof typeof RT.value_labels;
  const entry = RT.value_labels[key];
  return entry ? entry[locale] : "—";
}

function str(v: unknown): string {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

// `variant` only adjusts how the strip is framed for its host surface; it never changes the fetch,
// validation or fail-safe behaviour. "reference" (default) is the §12 chapter placement;
// "agent" embeds the same runtime-truth strip in the /banzai shell right sidebar (no top margin, so it
// sits flush inside the sidebar's ESTADO slot).
export async function BanzaiRuntimeStrip({
  variant = "reference",
  locale = DEFAULT_LOCALE,
}: { variant?: "reference" | "agent"; locale?: Locale } = {}) {
  const rt = await fetchRuntime();
  const prov = provenance(locale);
  const statusHref = locale === "en" ? "/en/status" : "/estado";
  const wrapClass =
    variant === "agent"
      ? "rounded-[10px] border border-line bg-white px-[16px] py-[16px]"
      : "mt-8 rounded-cardish border border-line bg-white px-[22px] py-[20px]";

  return (
    <section
      aria-label={RT.aria_label[locale]}
      className={wrapClass}
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <div className="eyebrow">{RT.section_label[locale].toUpperCase()}</div>
        <a
          href={RT.route}
          className="font-mono text-[10.5px] tracking-[0.06em] text-ink-5 no-underline hover:text-ink-4"
        >
          GET {RT.route}
        </a>
      </div>

      {/* Provenance is stated as a field (§8), not merely inferable from prose — in both branches. */}
      <div className="mt-1 text-[11px] leading-[1.5] text-ink-5">
        <span className="font-semibold text-ink-4">{prov.label}</span> {prov.text} ·{" "}
        <span className="font-mono">
          GET {RT.route}
        </span>{" "}
        (schema <span className="font-mono">{RT.schema_version}</span>, {RT.adr})
      </div>

      {rt === null ? (
        <p className="mt-2 text-[14.5px] font-semibold leading-[1.5] text-ink">
          {locale === "en" ? RT.labels.fallback_en : RT.labels.fallback_pt}
          <span className="ml-1 font-normal text-ink-4">
            {locale === "en" ? RT.labels.fallback_detail_en : RT.labels.fallback_detail_pt}
          </span>
          {/* No "Verificado em:" here — no value was confirmed, so the timestamp is honestly omitted
              (never substitute the client/render time). */}
        </p>
      ) : (
        <>
          <div
            className={
              // The "agent" strip lives in the narrow inspector sidebar (~300px), whose width is
              // decoupled from the viewport — so a viewport `sm:` breakpoint would force 3 cramped
              // columns and long labels (e.g. "MOTORES DETERMINÍSTICOS") would spill past the card.
              // Keep 2 columns there; the wide "reference" chapter placement keeps 2→3.
              variant === "agent"
                ? "mt-3 grid grid-cols-2 gap-x-[16px] gap-y-[12px]"
                : "mt-3 grid grid-cols-2 gap-x-[18px] gap-y-[12px] sm:grid-cols-3"
            }
          >
            {(
              [
                [RT.field_labels.status[locale], str(rt.status)],
                [RT.field_labels.mode[locale], str(rt.mode)],
                [RT.field_labels.model_available[locale], yesNo(rt.model_available, locale)],
                [RT.field_labels.inference_location[locale], inferenceLabel(rt.inference_location, locale)],
                [RT.field_labels.external_calls[locale], yesNo(rt.external_calls, locale)],
                [
                  RT.field_labels.deterministic_engines_available[locale],
                  yesNo(rt.deterministic_engines_available, locale),
                ],
                [RT.field_labels.service[locale], str(rt.service)],
                [RT.field_labels.release[locale], str(rt.release)],
                [RT.field_labels.authoritative[locale], yesNo(rt.authoritative, locale)],
                // §8: the verification timestamp, bound to the shown snapshot, is now a distinct field.
                [
                  (locale === "en" ? RT.labels.verified_prefix_en : RT.labels.verified_prefix_pt).replace(/:$/, ""),
                  str(rt.checked_at),
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <div className="mb-1 break-words font-mono text-[10px] tracking-[0.07em] text-ink-5">
                  {label.toUpperCase()}
                </div>
                <div className="break-words text-[14px] font-semibold leading-[1.4] text-ink">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] leading-[1.6] text-ink-4">
            {/* The rule names the status page; each edition links to its OWN, so an English reader is not
                sent into the Portuguese site by a sentence they just read in English. */}
            {locale === "en" ? RT.rule_en.split("the status page")[0] : RT.rule_pt.split("/estado")[0]}
            <a href={statusHref} className="text-ink-4 underline hover:text-ink">
              {locale === "en" ? "the status page" : "/estado"}
            </a>
            {locale === "en" ? RT.rule_en.split("the status page")[1] : RT.rule_pt.split("/estado")[1]}
          </p>
        </>
      )}
    </section>
  );
}
