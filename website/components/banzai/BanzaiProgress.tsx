"use client";

// SPR-5 — the "Safe Progressive Response" progressive interface (§9) + the progressive-metrics readout (§12).
//
// These are PURE, prop-driven presentation components: given ONLY the typed Channel-A progress events (never
// the final answer), they render the live processing line, the SAFE facts-available cards, and the synthesis
// state. They import NO answer renderer (no SafeMarkdown) and read NO prose field — the projection they render
// (factsFromEvents) reads only an explicit allowlist of ids/enums/counts/checksums. The validated answer prose
// is rendered ELSEWHERE, by the chat message list, ONLY after the terminal FINAL_VALIDATED/HONEST_FALLBACK
// arrives. So no model prose can ever reach the DOM through this progressive interface. The guard
// tools/check-banzai-progressive-ui.sh enforces exactly that.

import { useEffect, useState } from "react";
import { Ico, CARD } from "@/components/banzai/banzaiUi";
import {
  progressLineFor,
  factsFromEvents,
  hasAnyFact,
  isSynthesisActive,
  hasStreamMetrics,
  type ProgressEvent,
  type ProgressMetrics,
} from "@/lib/banzaiProgress";

function elapsedLabel(startedAt: number, nowMs: number): string | null {
  if (!startedAt) return null;
  const s = Math.max(0, Math.round((nowMs - startedAt) / 1000));
  return s > 0 ? `${s} s` : null;
}

// A small, compact fact chip (label · value). Value is always a safe id/enum/count/checksum string.
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-[6px] rounded-[7px] border border-black/[0.07] bg-white/70 px-[9px] py-[4px]">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-5">{label}</span>
      <span className="font-mono text-[11.5px] text-ink-2">{value}</span>
    </span>
  );
}

// §9 — the SAFE facts-available cards. Everything here is an id / closed enum / count / checksum taken
// verbatim from the event payloads; there is deliberately no path that renders any prose.
function FactCards({ events }: { events: ProgressEvent[] }) {
  const f = factsFromEvents(events);
  if (!hasAnyFact(f)) return null;
  return (
    <div data-progress-facts="1" className="mt-[12px] flex flex-col gap-[10px]">
      <div className="flex items-center gap-[6px] font-mono text-[9.5px] tracking-[0.14em] text-ink-5">
        <Ico name="graph" size={12} className="text-bordo-soft" /> FACTOS VERIFICÁVEIS (EM CURSO)
      </div>

      {f.entity && (
        <div data-fact="entity" className={`flex flex-wrap gap-[6px] p-[10px] ${CARD}`}>
          {f.entity.entity_id && <Chip label="Entidade" value={f.entity.entity_id} />}
          {f.entity.entity_type && <Chip label="Tipo" value={f.entity.entity_type} />}
          {f.entity.artifact_type && <Chip label="Artefacto" value={f.entity.artifact_type} />}
          {f.entity.protocol_scope && <Chip label="Âmbito" value={f.entity.protocol_scope} />}
          {f.entity.authority_requirement && <Chip label="Autoridade" value={f.entity.authority_requirement} />}
          {f.entity.requires_live_tool && <Chip label="Fonte" value="ao vivo" />}
        </div>
      )}

      {f.package && (
        <div data-fact="package" className={`flex flex-wrap gap-[6px] p-[10px] ${CARD}`}>
          {f.package.source && <Chip label="Pacote" value={f.package.source} />}
          {f.package.primary_intent && <Chip label="Intenção" value={f.package.primary_intent} />}
          {f.package.question_family && <Chip label="Família" value={f.package.question_family} />}
          {f.package.reason_code && <Chip label="Reason code" value={f.package.reason_code} />}
          {f.package.facts_count != null && <Chip label="Factos" value={String(f.package.facts_count)} />}
          {f.package.sample_size != null && <Chip label="Amostra" value={String(f.package.sample_size)} />}
          {f.package.aggregation_method && <Chip label="Agregação" value={f.package.aggregation_method} />}
          {f.package.depth && <Chip label="Profundidade" value={f.package.depth} />}
          {f.package.documentary_sources.map((s) => (
            <Chip key={`ps-${s}`} label="Fonte" value={s} />
          ))}
          {f.package.package_checksum && <Chip label="Checksum" value={f.package.package_checksum} />}
        </div>
      )}

      {f.sources.length > 0 && (
        <div data-fact="sources" className={`flex flex-wrap gap-[6px] p-[10px] ${CARD}`}>
          {f.sources.map((s, i) => (
            <span key={`src-${i}`} className="inline-flex flex-wrap items-baseline gap-[6px]">
              {s.source_kind && <Chip label="Fonte" value={s.source_kind} />}
              {s.document_id && <Chip label="Doc" value={s.document_id} />}
              {s.document_status && <Chip label="Estado" value={s.document_status} />}
              {s.seeded_entity && <Chip label="Entidade" value={s.seeded_entity} />}
              {s.implementation_id && <Chip label="Implementação" value={s.implementation_id} />}
              {s.canonical_origin && <Chip label="Origem" value={s.canonical_origin} />}
              {s.artifact_version && <Chip label="Versão" value={s.artifact_version} />}
              {s.artifact_sha256 && <Chip label="sha256" value={s.artifact_sha256} />}
            </span>
          ))}
        </div>
      )}

      {f.tools.length > 0 && (
        <div data-fact="tools" className={`flex flex-wrap gap-[6px] p-[10px] ${CARD}`}>
          {f.tools.map((t, i) => (
            <span key={`tool-${i}`} className="inline-flex flex-wrap items-baseline gap-[6px]">
              {t.tool_kind && <Chip label="Ferramenta" value={t.tool_kind} />}
              {t.outcome && <Chip label="Resultado" value={t.outcome} />}
              {t.error_code && <Chip label="Código" value={t.error_code} />}
              {t.comparable_n != null && <Chip label="N" value={String(t.comparable_n)} />}
              {t.operational_metric && <Chip label="Métrica" value={t.operational_metric} />}
              {t.question_family && <Chip label="Família" value={t.question_family} />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * §9 — the live progressive block shown WHILE a streamed answer is in flight. It renders the processing line
 * (driven by the real events, never a timer), the safe facts-available cards, and the synthesis state. It
 * NEVER renders model prose. Announced to assistive tech via a single polite live region; the pulse honours
 * prefers-reduced-motion (passed in by the caller). A Cancelar control lets the user free the queue slot.
 */
export function BanzaiProgressView({
  events,
  startedAt,
  reducedMotion = false,
  onCancel,
}: {
  events: ProgressEvent[];
  startedAt: number;
  reducedMotion?: boolean;
  onCancel?: () => void;
}) {
  // A gentle 1s tick for the elapsed readout only. It updates a clock, not an animation — it is intentionally
  // NOT gated by reduced-motion (a clock is informational). The processing LINE itself is driven by events.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const line = progressLineFor(events);
  const synth = isSynthesisActive(events);
  const elapsed = elapsedLabel(startedAt, nowMs);

  return (
    <div data-banzai-progress="1" className="flex items-start gap-[14px]">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-bordo text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.22)]">
        <Ico name="sparkle" size={15} sw={1.4} />
      </span>
      <div className="min-w-0 flex-1">
        {/* The live processing line — one polite live region for assistive tech. */}
        <div data-progress-line="1" role="status" aria-live="polite" className="flex items-center gap-[10px] text-ink-4">
          <span className="sr-only">Progresso do BanzAI: </span>
          <span className="font-mono text-[12px] text-ink-3">{line.label}</span>
          {elapsed && <span aria-hidden="true" className="font-mono text-[10.5px] text-ink-5">· {elapsed}</span>}
          {!reducedMotion && (
            <span aria-hidden="true" className="flex items-center gap-[3px]">
              <span className="h-[4px] w-[4px] rounded-full bg-ink-5/60 motion-safe:animate-bounce [animation-delay:-0.24s]" />
              <span className="h-[4px] w-[4px] rounded-full bg-ink-5/60 motion-safe:animate-bounce [animation-delay:-0.12s]" />
              <span className="h-[4px] w-[4px] rounded-full bg-ink-5/60 motion-safe:animate-bounce" />
            </span>
          )}
        </div>

        {/* §9 — the safe facts-available cards, rendered progressively as events arrive. */}
        <FactCards events={events} />

        {/* §9 — the synthesis state. NEVER shows model prose (there is none on the wire); it states, honestly,
            that the explanation is being prepared from the already-verified facts. */}
        {synth && (
          <p data-progress-synthesis="1" className="m-0 mt-[12px] font-mono text-[11.5px] leading-[1.5] text-ink-4">
            A preparar uma explicação baseada nos factos verificados…
          </p>
        )}

        {onCancel && (
          <div className="mt-[12px]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[8px] border border-black/10 bg-white px-[11px] py-[5px] font-mono text-[11px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// §12 — a fmt helper for the metrics readout (ms → "640 ms" / "1,3 s"), PT decimal comma.
function fmtMetric(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  return `${Math.round(ms)} ms`;
}

/**
 * §12 — the progressive-metrics readout for the last streamed answer, shown in the contextual inspector. All
 * three are client-side elapsed DURATIONS (no secret/PII) and are distinct from TTFB (shown separately).
 */
export function BanzaiProgressMetrics({ metrics }: { metrics: ProgressMetrics | null | undefined }) {
  if (!hasStreamMetrics(metrics)) return null;
  const m = metrics as ProgressMetrics;
  const rows: [string, number | null][] = [
    ["Primeiro progresso", m.timeToFirstProgressMs],
    ["Primeiro facto verificável", m.timeToFirstVerifiedFactMs],
    ["Resposta validada", m.timeToFinalValidatedAnswerMs],
    ["TTFB (distinto)", m.ttfbMs],
  ];
  return (
    <section data-progress-metrics="1">
      <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5">
        <Ico name="graph" size={13} className="text-ink-5" /> MÉTRICAS PROGRESSIVAS
      </div>
      <dl className={`m-0 grid grid-cols-2 gap-x-[14px] gap-y-[7px] p-[14px] ${CARD}`}>
        {rows.map(([label, v]) => (
          <div key={label} className="flex flex-col">
            <dt className="font-mono text-[9.5px] tracking-[0.1em] text-ink-5">{label.toUpperCase()}</dt>
            <dd className="m-0 font-mono text-[12.5px] text-ink-2">{fmtMetric(v)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
