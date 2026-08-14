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
const PROV_SEP = RT.labels.provenance_pt.indexOf(": ");
const PROV_LABEL = PROV_SEP >= 0 ? RT.labels.provenance_pt.slice(0, PROV_SEP + 1) : "Fonte:";
const PROV_TEXT = PROV_SEP >= 0 ? RT.labels.provenance_pt.slice(PROV_SEP + 2) : RT.labels.provenance_pt;

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

function yesNo(v: unknown): string {
  return v === true ? "Sim" : v === false ? "Não" : "—";
}

function inferenceLabel(v: unknown): string {
  const s = String(v);
  if (s === "local") return "local (on-host)";
  if (s === "external") return "externa";
  if (s === "none") return "sem inferência";
  return "—";
}

function str(v: unknown): string {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

// `variant` only adjusts how the strip is framed for its host surface; it never changes the fetch,
// validation or fail-safe behaviour. "reference" (default) is the §12 chapter placement;
// "agent" embeds the same runtime-truth strip in the /banzai shell right sidebar (no top margin, so it
// sits flush inside the sidebar's ESTADO slot).
export async function BanzaiRuntimeStrip({ variant = "reference" }: { variant?: "reference" | "agent" } = {}) {
  const rt = await fetchRuntime();
  const wrapClass =
    variant === "agent"
      ? "rounded-[10px] border border-line bg-white px-[16px] py-[16px]"
      : "mt-8 rounded-cardish border border-line bg-white px-[22px] py-[20px]";

  return (
    <section
      aria-label="Estado verificável do runtime do BanzAI"
      className={wrapClass}
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <div className="eyebrow">ESTADO DO RUNTIME · AGORA</div>
        <a
          href={RT.route}
          className="font-mono text-[10.5px] tracking-[0.06em] text-ink-5 no-underline hover:text-ink-4"
        >
          GET {RT.route}
        </a>
      </div>

      {/* Provenance is stated as a field (§8), not merely inferable from prose — in both branches. */}
      <div className="mt-1 text-[11px] leading-[1.5] text-ink-5">
        <span className="font-semibold text-ink-4">{PROV_LABEL}</span> {PROV_TEXT} ·{" "}
        <span className="font-mono">
          GET {RT.route}
        </span>{" "}
        (schema <span className="font-mono">{RT.schema_version}</span>, {RT.adr})
      </div>

      {rt === null ? (
        <p className="mt-2 text-[14.5px] font-semibold leading-[1.5] text-ink">
          {RT.labels.fallback_pt}
          <span className="ml-1 font-normal text-ink-4">{RT.labels.fallback_detail_pt}</span>
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
                ["Estado", str(rt.status)],
                ["Modo", str(rt.mode)],
                ["Modelo disponível", yesNo(rt.model_available)],
                ["Inferência", inferenceLabel(rt.inference_location)],
                ["Chamadas externas", yesNo(rt.external_calls)],
                ["Motores determinísticos", yesNo(rt.deterministic_engines_available)],
                ["Serviço", str(rt.service)],
                ["Release", str(rt.release)],
                ["Autoritativo", yesNo(rt.authoritative)],
                // §8: the verification timestamp, bound to the shown snapshot, is now a distinct field.
                [RT.labels.verified_prefix_pt.replace(/:$/, ""), str(rt.checked_at)],
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
            {RT.rule_pt.split("/estado")[0]}
            <a href="/estado" className="text-ink-4 underline hover:text-ink">
              /estado
            </a>
            {RT.rule_pt.split("/estado")[1]}
          </p>
        </>
      )}
    </section>
  );
}
