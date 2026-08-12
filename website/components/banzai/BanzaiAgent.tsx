"use client";

// BanzAI — the single protocol-agent shell (ADR-054), rebuilt for endpoint-originated operator
// validation (M2.19G.1, ADR-068). ONE app at /banzai, TWO modes of the SAME shell:
//
//   • "Perguntar ao BanzAI" (ask)        — the conversation, answered by the live Rust-controlled
//                                           banzai-api backend (local Qwen, same-origin /banzai/ask).
//   • "Validar operador"    (validation) — the endpoint-originated 9-step journey: Fase 0 selects an
//                                           operator + a published implementation from the CLOSED
//                                           registry, then each step calls the Rust backend which
//                                           FETCHES from the implementation's public endpoints and
//                                           decides the verdict. No manual input in this official path.
//
// The manual paste/upload developer tooling lives ONLY under Recursos → Programadores ("Validar
// rascunho"). Results live in ONE "Resultados" area with in-area sub-views. BanzAI guides and explains;
// it decides nothing and confers no status on operators.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { banzaiKb, type CiteLink, type KbKind, type KbDuration, type Source, type KbTransparency, type KbAnswer, type ConversationState } from "@/components/home/banzaiKb";
import { SafeMarkdown } from "@/components/banzai/SafeMarkdown";
import { SourceBlock } from "@/components/banzai/SourceBlock";
import { TransparencyPanel } from "@/components/banzai/TransparencyPanel";
import {
  BANZAI_AGENT, TABS, TAB_META, MODES, type WbTab, type WbMode,
  AGENT_SUGGESTIONS, AGENT_GUIA_TEXT, AGENT_WHO_DOES_WHAT, AGENT_RULE_SOURCES,
  RFC_DOCS, PROTOCOL_MAP_NODES,
} from "@/components/banzai/banzai-agent";
import { Ico, CARD } from "@/components/banzai/banzaiUi";
import type { BanzaiState } from "@/lib/banzaiState";
import { useValidationSession } from "@/components/banzai/validationJourney";
import {
  ValidationContextSetup, ValidationStepNav, ValidationHeader, ValidationWorkspace,
  ValidationContextPanel, ValidationResultsPanel, type ResultsSubView,
} from "@/components/banzai/BanzaiValidationMode";
import { ProgramadoresTools } from "@/components/banzai/ProgramadoresTools";
import { BanzaiOnboardingMode } from "@/components/banzai/BanzaiOnboardingMode";
// SPR-5 — the Safe Progressive Response client + progressive interface (§9) + metrics (§12).
import { askViaStream } from "@/lib/banzaiProgressClient";
import { BanzaiProgressView, BanzaiProgressMetrics } from "@/components/banzai/BanzaiProgress";
import type { ProgressEvent, ProgressMetrics } from "@/lib/banzaiProgress";

type Msg = {
  role: "user" | "ai";
  text: string;
  cites?: string[];
  kind?: KbKind;
  links?: CiteLink[];
  sources?: Source[];
  limits?: string[];
  followUps?: string[];
  status?: string;
  resolvedDocument?: { id: string; type: string | null; title: string | null; path: string | null; status: string | null } | null;
  documentNotFound?: boolean;
  documentMode?: string | null;
  documentTruncated?: boolean;
  correctionDisplay?: string[];
  correctionClarification?: string[];
  // ADR-078 — operational duration/metric. `terminalKind`/`answerType` echo the backend; `duration`
  // carries the measured numbers rendered by <DurationAnswerBlock/> (a typed block, never markdown).
  answerType?: string;
  terminalKind?: string;
  duration?: KbDuration;
  // Increment 9 (§24) — the per-answer transparency projection (what the engine actually computed),
  // surfaced in the contextual inspector. Present unless the answer was a bare outage.
  transparency?: KbTransparency;
};

// M2.14F — dynamic "thinking" indicator. Public wording only; never names the model/runtime. Honours
// prefers-reduced-motion and announces a single stable status to assistive tech.
const THINKING_STAGES = [
  "A consultar a referência…",
  "A cruzar fontes verificáveis…",
  "A compor a resposta…",
  "A validar as fronteiras…",
  "A preparar as fontes…",
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return reduced;
}

// Tracks whether the viewport is at the `lg` breakpoint (>=1024px). Used to open the contextual inspector
// by default on desktop while keeping it CLOSED by default on smaller screens (the drawer contract).
// Starts false so SSR and first client render agree; the real value lands in the mount effect.
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return desktop;
}

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

// The four literal grid templates for the shell (rail expanded/collapsed × inspector closed/open). They
// are FULL literals — Tailwind's JIT only emits arbitrary-value classes it can see verbatim, and the
// responsive guard anchors on `lg:grid-cols-[clamp(`. The inspector is a real third column ONLY on lg
// when open; on smaller screens it is an off-canvas drawer (see the inspector aside), never a fixed pane.
const SHELL_GRID = {
  "expanded-closed": "lg:grid-cols-[clamp(232px,20vw,288px)_minmax(0,1fr)]",
  "expanded-open": "lg:grid-cols-[clamp(232px,20vw,288px)_minmax(0,1fr)_clamp(288px,24vw,368px)]",
  "collapsed-closed": "lg:grid-cols-[64px_minmax(0,1fr)]",
  "collapsed-open": "lg:grid-cols-[64px_minmax(0,1fr)_clamp(288px,24vw,368px)]",
} as const;

function ThinkingIndicator() {
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % THINKING_STAGES.length), 2200);
    return () => window.clearInterval(id);
  }, [reduced]);
  const line = reduced ? THINKING_STAGES[0] : THINKING_STAGES[i];
  return (
    <div className="flex items-center gap-[12px] text-ink-5" role="status" aria-live="polite" data-thinking="1">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-bordo text-creme-high">
        <Ico name="sparkle" size={15} sw={1.4} />
      </span>
      <span className="sr-only">A preparar a resposta…</span>
      <span aria-hidden="true" className="font-mono text-[12px] transition-opacity duration-300">{line}</span>
      <span aria-hidden="true" className="flex items-center gap-[3px]">
        <span className="h-[4px] w-[4px] rounded-full bg-ink-5/60 motion-safe:animate-bounce [animation-delay:-0.24s]" />
        <span className="h-[4px] w-[4px] rounded-full bg-ink-5/60 motion-safe:animate-bounce [animation-delay:-0.12s]" />
        <span className="h-[4px] w-[4px] rounded-full bg-ink-5/60 motion-safe:animate-bounce" />
      </span>
    </div>
  );
}

const AGENT_STANCE =
  "Faça perguntas sobre a referência, a jornada de validação e os artefactos técnicos. Os motores verificam. A evidência prova. A autoridade competente decide.";

// ADR-078 — format a millisecond count for display: ≥1000ms → seconds with a PT decimal comma
// ("12,8 s"); below that → whole milliseconds ("640 ms"). Returns null for an absent value so the
// caller renders nothing (the UI only ever shows numbers the backend actually measured).
function fmtMs(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  return `${Math.round(ms)} ms`;
}

// ADR-078 — the operational duration/metric answer, rendered as a TYPED block (not markdown, because
// SafeMarkdown drops tables/headings). It renders ONLY the values present in `duration`; it never
// invents or hardcodes a number. A single run (measureType "observação") reads as one observation —
// never an average — so both the summary and the per-step lines drop aggregate wording in that case.
function DurationAnswerBlock({ duration }: { duration: KbDuration }) {
  const single = duration.measureType === "observação";

  const meta: [string, string][] = [];
  if (duration.profile) meta.push(["Perfil", duration.profile]);
  if (duration.environment) meta.push(["Ambiente", duration.environment]);
  if (duration.protocolVersion) meta.push(["Versão", duration.protocolVersion]);
  if (duration.implementationId) meta.push(["Implementação", duration.implementationId]);
  if (duration.observedFrom || duration.observedTo) {
    meta.push(["Período", `${duration.observedFrom ?? "—"} – ${duration.observedTo ?? "—"}`]);
  }

  const nums: [string, string][] = [];
  const pushNum = (label: string, ms: number | null) => {
    const v = fmtMs(ms);
    if (v) nums.push([label, v]);
  };
  if (single) {
    // n=1: one observed value, never labelled as a median/average.
    pushNum("Duração observada", duration.latestMs ?? duration.medianMs);
  } else {
    pushNum("Última", duration.latestMs);
    pushNum("Mediana", duration.medianMs);
    pushNum("Média", duration.avgMs);
    pushNum("P95", duration.p95Ms);
    pushNum("Mínimo", duration.minMs);
    pushNum("Máximo", duration.maxMs);
  }

  return (
    <section data-duration-block="1" aria-label="Medição operacional" className="mt-[12px] rounded-[10px] border border-black/[0.07] bg-paper-2/60 p-[14px]">
      <div className="mb-[8px] flex items-center gap-[6px] font-mono text-[10px] tracking-[0.14em] text-ink-4">
        <Ico name="graph" size={13} className="text-bordo-soft" /> MEDIÇÃO OPERACIONAL
      </div>
      <p className="m-0 mb-[10px] font-mono text-[11.5px] leading-[1.5] text-ink-3">
        Tipo: <span className="text-ink-2">{duration.measureType || "—"}</span> · Execuções comparáveis:{" "}
        <span className="text-ink-2">{duration.comparableRuns}</span>
      </p>
      {meta.length > 0 && (
        <dl className="m-0 mb-[10px] grid gap-x-[16px] gap-y-[6px] sm:grid-cols-2">
          {meta.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="font-mono text-[9.5px] tracking-[0.12em] text-ink-5">{k.toUpperCase()}</dt>
              <dd className="m-0 truncate text-[12.5px] leading-[1.4] text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {nums.length > 0 && (
        <div className="flex flex-wrap gap-[8px]">
          {nums.map(([k, v]) => (
            <span key={k} className="inline-flex items-baseline gap-[6px] rounded-[8px] border border-black/[0.07] bg-white/70 px-[10px] py-[6px]">
              <span className="font-mono text-[10px] tracking-[0.06em] text-ink-5">{k}</span>
              <span className="font-mono text-[13px] font-semibold text-ink">{v}</span>
            </span>
          ))}
        </div>
      )}
      {duration.perStep.length > 0 && (
        <div className="mt-[12px]">
          <div className="mb-[6px] font-mono text-[9.5px] tracking-[0.12em] text-ink-5">POR ETAPA</div>
          <ul className="m-0 flex list-none flex-col gap-[5px] p-0">
            {duration.perStep.map((s) => {
              const med = fmtMs(s.medianMs);
              const mx = fmtMs(s.maxMs);
              const value = single
                ? med ?? "—"
                : `mediana ${med ?? "—"}${mx ? ` (máx ${mx})` : ""}`;
              return (
                <li key={s.stepId || s.label} className="flex items-start justify-between gap-[10px] text-[12.5px] leading-[1.45] text-ink-2">
                  <span className="min-w-0 flex-1 truncate">{s.label || s.stepId}</span>
                  <span className="flex-none font-mono text-[11.5px] text-ink-3">{value}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {(!single && (duration.percentileMethod || duration.orchestratorVersion || duration.reproductionsExcluded > 0)) && (
        <p className="m-0 mt-[12px] border-t border-black/[0.06] pt-[8px] font-mono text-[10px] leading-[1.5] text-ink-5">
          {duration.percentileMethod
            ? `Mediana e P95 por interpolação linear (percentile_cont).`
            : ""}
          {duration.orchestratorVersion ? ` Instrumentação ${duration.orchestratorVersion}.` : ""}
          {duration.reproductionsExcluded > 0
            ? ` ${duration.reproductionsExcluded} reprodução(ões) excluída(s) da agregação.`
            : ""}
        </p>
      )}
    </section>
  );
}

/* ── Recursos → Guia ─────────────────────────────────────────────────────────── */
function GuiaPanel({ onAsk, onValidate }: { onAsk: (t: string) => void; onValidate: () => void }) {
  return (
    <div className="mx-auto max-w-[760px] pb-4">
      <div className="mb-6 flex items-start gap-[14px]">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[13px] border border-bordo/15 bg-gradient-to-b from-tint-bordo to-white text-bordo shadow-[0_4px_14px_rgba(142,19,38,0.08)]">
          <Ico name="info" size={22} sw={1.5} />
        </span>
        <div className="pt-0.5">
          <h2 className="m-0 font-serif text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.2] text-ink">Guia</h2>
          <p className="mb-0 mt-1.5 max-w-[58ch] text-[14px] leading-[1.55] text-ink-3">{AGENT_GUIA_TEXT}</p>
        </div>
      </div>

      <div className="mb-3 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">QUEM FAZ O QUÊ</div>
      <div className={`p-[14px] ${CARD}`}>
        <dl className="m-0 grid gap-[8px] sm:grid-cols-2">
          {AGENT_WHO_DOES_WHAT.map(([who, does]) => (
            <div key={who} className="flex flex-col gap-[2px]">
              <dt className="text-[12.5px] font-semibold text-ink">{who}</dt>
              <dd className="m-0 text-[12px] leading-[1.45] text-ink-4">{does}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mb-3 mt-8 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">PROVENIÊNCIA DAS REGRAS</div>
      <div className={`p-[14px] ${CARD}`}>
        <p className="m-0 font-mono text-[12px] leading-[1.6] text-ink-3">{AGENT_RULE_SOURCES}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-[8px]">
        <button type="button" onClick={onValidate} className="inline-flex items-center gap-2 rounded-[10px] bg-bordo px-[15px] py-[9px] text-[13px] font-semibold text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.25)] transition-colors hover:bg-[#7a0f20]">
          <Ico name="medal" size={15} /> Validar operador
        </button>
        <button type="button" onClick={() => onAsk("Como implemento o protocolo BANZA e demonstro conformidade por evidência verificável?")} className="rounded-[10px] border border-bordo/30 bg-white px-[13px] py-[8px] text-[12.5px] font-semibold text-bordo transition-colors hover:bg-tint-bordo">
          Perguntar ao BanzAI
        </button>
      </div>
    </div>
  );
}

/* ── Recursos → Referência (ADR/RFC ask-cards + protocol map) ────────────────── */
function RfcPanel({ onAsk }: { onAsk: (t: string) => void }) {
  return (
    <div className="mx-auto max-w-[760px] pb-4">
      <div className="mb-6 flex items-start gap-[14px]">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[13px] border border-bordo/15 bg-gradient-to-b from-tint-bordo to-white text-bordo shadow-[0_4px_14px_rgba(142,19,38,0.08)]">
          <Ico name="doc" size={22} sw={1.5} />
        </span>
        <div className="pt-0.5">
          <h2 className="m-0 font-serif text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.2] text-ink">Referência</h2>
          <p className="mb-0 mt-1.5 max-w-[58ch] text-[14px] leading-[1.55] text-ink-3">ADRs, RFCs e o mapa do protocolo. Cada cartão pergunta ao BanzAI, que responde com base nas fontes locais.</p>
        </div>
      </div>

      <div className="mb-3 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">DECISÕES E RFCs</div>
      <div className="grid gap-[8px] sm:grid-cols-2">
        {RFC_DOCS.map((d) => (
          <button key={d.id} type="button" onClick={() => onAsk(d.q)} className={`flex flex-col gap-[4px] p-[14px] text-left transition-all hover:-translate-y-px hover:border-bordo/30 hover:shadow-[0_6px_18px_rgba(142,19,38,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${CARD}`}>
            <span className="font-mono text-[11px] text-bordo">{d.id}</span>
            <span className="text-[13px] text-ink-2">{d.title}</span>
          </button>
        ))}
      </div>

      <div className="mb-3 mt-8 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">MAPA DO PROTOCOLO</div>
      <div className="grid gap-[8px] sm:grid-cols-2">
        {PROTOCOL_MAP_NODES.map((n) => (
          <button key={n.id} type="button" onClick={() => onAsk(n.q)} className={`flex flex-col gap-[3px] p-[13px] text-left transition-all hover:-translate-y-px hover:border-bordo/30 hover:shadow-[0_6px_18px_rgba(142,19,38,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${CARD}`}>
            <span className="text-[13px] font-semibold text-ink">{n.id}</span>
            <span className="text-[11.5px] leading-[1.4] text-ink-4">{n.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// M2.19G.4 (ADR-070 D-070-04/05) — the contextual inspector trail. Shows WHERE you are among the
// navigable contexts (global → operador → implementação) and lets you move up. It labels the surface with
// the word "contexto" exclusively: a context is a NAVIGATION position, distinct from the ecosystem's three
// architectural strata (ADR-059..063) and from the L0–L4 conformance profiles (ADR-064..066), which this
// trail never names. Each crumb is a real /banzai route (closed slug), so browser back/forward and the
// crumbs agree.
function BanzaiContextTrail({
  context,
  operatorId,
  operatorName,
  implementationId,
  implementationName,
}: {
  context: "global" | "operator" | "implementation";
  operatorId: string | null;
  operatorName: string | null;
  implementationId: string | null;
  implementationName: string | null;
}) {
  const crumb = (label: string, href: string | null, active: boolean) =>
    href && !active ? (
      <Link
        href={href}
        className="rounded-[6px] px-[7px] py-[3px] text-ink-4 transition-colors hover:bg-black/[0.04] hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40"
      >
        {label}
      </Link>
    ) : (
      <span aria-current={active ? "page" : undefined} className={`rounded-[6px] px-[7px] py-[3px] ${active ? "bg-tint-bordo font-semibold text-bordo" : "text-ink-4"}`}>
        {label}
      </span>
    );
  return (
    <nav
      aria-label="Contexto da navegação"
      data-context={context}
      className="flex flex-wrap items-center gap-[3px] border-b border-black/[0.06] bg-paper-2/60 px-[clamp(16px,4vw,28px)] py-[9px] font-mono text-[11px]"
    >
      <span className="mr-[6px] tracking-[0.14em] text-ink-5">CONTEXTO</span>
      {crumb("Global", "/banzai?mode=validation", context === "global")}
      {operatorId && (
        <>
          <span aria-hidden className="text-ink-5">›</span>
          {crumb(operatorName || operatorId, `/banzai/operador/${operatorId}`, context === "operator")}
        </>
      )}
      {operatorId && implementationId && (
        <>
          <span aria-hidden className="text-ink-5">›</span>
          {crumb(implementationName || implementationId, `/banzai/operador/${operatorId}/${implementationId}`, context === "implementation")}
        </>
      )}
    </nav>
  );
}

export function BanzaiAgent({
  routeState,
  runtimeStrip,
}: {
  routeState: BanzaiState;
  // ADR-076 D-076-10 — the runtime-truth strip (server component from app/banzai/layout.tsx reading
  // GET /banzai/runtime, fail-safe). Rendered as an inert node in the sidebar ESTADO slot; it replaces
  // the former static green badges + hardcoded "Pré-produção…" literal so displayed runtime/provider
  // state derives from the SSOT, exactly as /referencia/banzai does.
  runtimeStrip?: React.ReactNode;
}) {
  // ONE shell, always mounted by app/banzai/layout.tsx (ADR-070). `routeState` is the server-resolved
  // state of the CURRENT route segment (global → operator → implementation), pushed here by the segment's
  // <BanzaiRouteBinder>. `mode` selects "ask" / "validation" / "onboarding"; the operator/implementation
  // CONTEXTS are real route segments that seed the validation session below. The shell reflects route
  // changes without ever remounting, so the conversation, the validation selection/receipts and the
  // onboarding candidature survive navigation between contexts.
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<WbMode>(routeState.mode);
  // In ask mode, `activeTool` selects the workspace panel. Default = the conversation (assistente); a
  // Recursos/Resultados tab shows that tool. Deep link /banzai?view=guia → the Guia resource.
  const [activeTool, setActiveTool] = useState<WbTab>(routeState.view === "guia" ? "guia" : "assistente");
  // The endpoint-originated validation session — the SINGLE source of truth for validation mode. Always
  // mounted (even in ask mode) so switching modes never loses the selection, progress or receipts.
  const validation = useValidationSession({
    initialOperatorId: routeState.initialOperatorId,
    initialImplementationId: routeState.initialImplementationId,
    workflow: routeState.workflow,
    initialStep: routeState.step,
  });
  // The single Resultados area sub-view (controlled here so cross-links can target a sub-view).
  const [resultsView, setResultsView] = useState<ResultsSubView>("resumo");
  const openResults = (v: ResultsSubView) => { setResultsView(v); setMode("ask"); setActiveTool("resultados"); };

  // ── Navigable contexts (ADR-070) — real /banzai route segments, closed slugs only ─────────────
  // Canonical path for a context. Global ask/onboarding stay at /banzai (+ ?mode=); the operator and
  // implementation contexts are addressable segments. Never a caller-supplied URL — the ids are the
  // session's own closed-slug ids (already registry-resolved).
  const operatorPath = (opId: string, implId?: string | null) =>
    implId ? `/banzai/operador/${opId}/${implId}` : `/banzai/operador/${opId}`;
  const goGlobal = (m: WbMode) => {
    setMode(m);
    if (m === "ask") setActiveTool("assistente");
    router.push(m === "ask" ? "/banzai" : `/banzai?mode=${m}`);
  };
  const goValidation = () => {
    setMode("validation");
    // If a target is already selected, land on its context; otherwise the global validation picker.
    if (validation.operatorId && validation.implementationId) router.push(operatorPath(validation.operatorId, validation.implementationId));
    else if (validation.operatorId) router.push(operatorPath(validation.operatorId));
    else router.push("/banzai?mode=validation");
  };

  const [msgs, setMsgs] = useState<Msg[]>([]);
  // BZCI-6 (§2) — the SAFE typed conversational state the backend returned on the LAST turn. The browser
  // carries it verbatim into the NEXT ask so the Rust reference resolver can inherit the subject/intent/
  // referent (the ADR→RFC→"qual a diferença?" chain). It is a referent re-resolved server-side, never a fact.
  const [convState, setConvState] = useState<ConversationState | null>(null);
  const [lastLinks, setLastLinks] = useState<CiteLink[]>([]);
  // Increment 9 (§24) — the transparency projection of the LAST answer, shown in the inspector.
  const [lastTransparency, setLastTransparency] = useState<KbTransparency | null>(null);
  const [busy, setBusy] = useState(false);
  // M2.19G.4 (F5) — runtime-truth. The engine label is NOT hardcoded: it is derived from the real /ask
  // telemetry (engine_state + external_model_called) once a response arrives; before that it shows the
  // CONFIGURED default (honestly qualified "por omissão"). Never asserts "Qwen local" as observed fact
  // until the backend has actually confirmed it.
  const [engineInfo, setEngineInfo] = useState<{ engine: string | null; external: boolean; degraded: boolean } | null>(null);
  // SPR-5 — the in-flight progressive stream state (§9) + the last answer's progressive metrics (§12).
  // `progressEvents` are the typed Channel-A events for the CURRENT in-flight query; `progressActive` gates
  // the live progress block; `abortRef` lets the user cancel (aborts the fetch → the server frees its queue
  // slot). None of this ever holds model prose — the validated answer arrives only on the terminal event.
  const reducedMotion = usePrefersReducedMotion();
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
  const [progressActive, setProgressActive] = useState(false);
  const [progressStart, setProgressStart] = useState(0);
  const [lastMetrics, setLastMetrics] = useState<ProgressMetrics | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingDocRef = useRef<string | null>(null);

  // ── Layout state (in-memory only — the journey session must never touch browser storage) ────────────
  // `railCollapsed` shrinks the desktop rail to an icon strip; `railOpen` is the mobile off-canvas rail;
  // `inspectorOpen` is the contextual inspector drawer (a third column on lg, an off-canvas drawer below).
  const isDesktop = useIsDesktop();
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  // Open the inspector by default on desktop; keep it closed by default on smaller screens (drawer rule).
  useEffect(() => { setInspectorOpen(isDesktop); }, [isDesktop]);
  // Escape closes whichever overlay is open on small screens; on desktop it also closes the inspector.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (railOpen) { setRailOpen(false); return; }
      if (inspectorOpen && !isDesktop) { setInspectorOpen(false); inspectorToggleRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen, inspectorOpen, isDesktop]);
  // When the inspector opens on a small screen, move focus into it (drawer a11y); restore on close.
  useEffect(() => {
    if (inspectorOpen && !isDesktop) inspectorRef.current?.focus();
  }, [inspectorOpen, isDesktop]);
  const gridKey = `${railCollapsed ? "collapsed" : "expanded"}-${inspectorOpen ? "open" : "closed"}` as keyof typeof SHELL_GRID;

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout>;
    const focusAsk = () => {
      const h = window.location.hash;
      if (h === "#perguntar" || h === "#assistente" || h === "#agent") {
        setMode("ask");
        setActiveTool("assistente");
        timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 140);
      }
    };
    focusAsk();
    window.addEventListener("hashchange", focusAsk);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", focusAsk);
    };
  }, []);

  // ADR-070 — reflect the route segment's MODE/VIEW onto the shell. Keyed on mode/view only, so it never
  // clobbers an in-shell panel switch (openResults, askInChat) that leaves the URL unchanged. Browser
  // back/forward re-renders the segment page → the binder pushes a new routeState → this fires.
  useEffect(() => {
    setMode(routeState.mode);
    if (routeState.view === "guia") setActiveTool("guia");
  }, [routeState.mode, routeState.view]);

  // ADR-070 — seed the validation session from an operator/implementation CONTEXT segment. Retried when
  // the closed registry finishes loading (validation.operators dep) so a fresh deep link resolves once the
  // list is in. selectTarget ignores off-registry ids → the shell honestly falls back (D-070-03). The
  // guard reads the live selection to stay idempotent; excluded from deps deliberately.
  useEffect(() => {
    if (routeState.context === "global" || !routeState.initialOperatorId) return;
    const wantOp = routeState.initialOperatorId;
    const wantImpl = routeState.initialImplementationId ?? null;
    if (wantOp !== validation.operatorId || wantImpl !== (validation.implementationId ?? null)) {
      validation.selectTarget(wantOp, wantImpl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeState.context, routeState.initialOperatorId, routeState.initialImplementationId, validation.operators]);

  // ADR-070 — reflect an in-shell Fase-0 SELECTION back into the URL as the canonical context segment, so
  // the operator/implementation becomes addressable and back/forward moves between contexts. Only in
  // validation mode, and only when the URL is not already the canonical path (prevents a navigation loop
  // with the seed effect above). Never a caller-supplied URL — the path is built from the session's own
  // closed-slug ids.
  useEffect(() => {
    if (mode !== "validation" || !validation.operatorId) return;
    const desired = operatorPath(validation.operatorId, validation.implementationId);
    if (desired !== pathname) router.push(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, validation.operatorId, validation.implementationId, pathname]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  // Pre-fill the Assistente input from ?q= (e.g. "Explicar com BanzAI"). Prefill only — the visitor
  // still submits. ?doc= carries the canonical document id, consumed once by the first ask().
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const doc = params.get("doc");
    if (doc && /^(ADR|RFC)-\d{1,4}$/i.test(doc)) pendingDocRef.current = doc.toUpperCase();
    if (!q) return;
    setMode("ask");
    setActiveTool("assistente");
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = q;
        inputRef.current.focus({ preventScroll: true });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  // Append a finished answer to the conversation + refresh the inspector projections. Shared by the stream
  // terminal and the non-stream fallback so both render the validated answer IDENTICALLY (SafeMarkdown +
  // TransparencyPanel + sources + followUps). This is the ONLY place a BanzAI answer's prose enters the DOM.
  const applyAnswer = (ans: KbAnswer) => {
    setMsgs((p) => [...p, { role: "ai", text: ans.text, cites: ans.cites, kind: ans.kind, links: ans.links, sources: ans.sources, limits: ans.limits, followUps: ans.followUps, status: ans.status, resolvedDocument: ans.resolvedDocument ?? null, documentNotFound: Boolean(ans.documentNotFound), documentMode: ans.documentMode ?? null, documentTruncated: Boolean(ans.documentTruncated), correctionDisplay: ans.correctionDisplay ?? [], correctionClarification: ans.correctionClarification ?? [], answerType: ans.answerType, terminalKind: ans.terminalKind, duration: ans.duration, transparency: ans.transparency }]);
    setLastLinks(ans.links ?? []);
    // BZCI-6 (§2) — carry the backend's SAFE conversation_context forward so the NEXT turn resolves the
    // referent (the ADR→RFC follow-up chain). Runs on BOTH the stream and non-stream paths (applyAnswer is
    // shared), so it always reflects the latest answer. Only updated when the answer carried one.
    if (ans.conversationContext) setConvState(ans.conversationContext);
    // Increment 9 (§24) — record this answer's transparency projection for the inspector (null when
    // the backend produced none, e.g. a live outage — the inspector then shows nothing, honestly).
    setLastTransparency(ans.transparency ?? null);
    // F5 — record the observed engine so the sidebar reflects runtime truth (not a hardcoded claim).
    setEngineInfo({ engine: ans.engine ?? null, external: Boolean(ans.externalModelCalled), degraded: Boolean(ans.degraded) });
  };

  // SPR-5 — the send path is STREAM-FIRST: POST /banzai/ask/stream (SSE) drives the live progressive
  // interface (§9) from the REAL pipeline events, and the validated answer arrives ONCE on the terminal
  // event. If the stream errors/aborts/is unsupported, askViaStream falls back to the existing non-stream
  // /banzai/ask fetch (banzaiKb) so nothing regresses. A deliberate user cancel frees the server queue slot.
  const ask = async (text: string) => {
    const q = (text || "").trim();
    if (!q || busy) return;
    const history = msgs.slice(-4).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((p) => [...p, { role: "user", text: q }]);
    const docId = pendingDocRef.current;
    pendingDocRef.current = null;
    const journey = docId ? { document_id: docId } : undefined;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setProgressEvents([]);
    setProgressActive(true);
    setProgressStart(Date.now());
    try {
      const outcome = await askViaStream(q, history, journey, {
        signal: controller.signal,
        // Each REAL Channel-A event drives the live processing line + safe fact cards (never prose).
        onEvent: (evt) => setProgressEvents((prev) => [...prev, evt]),
        // BZCI-6 (§2) — carry the previous turn's typed state into BOTH the streamed request and the
        // non-stream fallback (the fallback closure is bound to the same convState).
        convState,
        // The escape hatch — the existing non-stream fetch, bound to the same query.
        fallback: () => banzaiKb(q, history, journey, convState),
      });
      setLastMetrics(outcome.metrics); // §12 — surfaced in the inspector
      if (outcome.cancelled) {
        // Honest cancelled state — nothing was generated/persisted server-side (the slot was freed).
        setMsgs((p) => [...p, { role: "ai", text: "Pedido cancelado.", kind: "unavailable", status: "Cancelado" }]);
      } else if (outcome.answer) {
        applyAnswer(outcome.answer);
      }
    } catch {
      // Ultimate safety net — never leave the user without an honest reply.
      const ans = await banzaiKb(q, history, journey, convState);
      applyAnswer(ans);
    } finally {
      setBusy(false);
      setProgressActive(false);
      setProgressEvents([]);
      abortRef.current = null;
    }
  };

  // Cancel the in-flight streamed query — aborts the fetch so the server frees its inference-queue slot.
  const cancelAsk = () => abortRef.current?.abort();

  // F5 / ADR-072 CD-9 — the runtime-truth engine label + status dot. Derived from the last observed /ask
  // telemetry; the pre-response state is the configured default, honestly marked "por omissão". A
  // confirmed local run shows "· confirmado"; an (unexpected) external call, a degraded state, or an
  // unreported engine are each surfaced honestly rather than hidden — and NEVER collapse to a hardcoded
  // "Qwen local activo" (only a route/telemetry-confirmed local_qwen may claim the local engine).
  const engineLabel = (() => {
    if (!engineInfo) return "Motor por omissão: Qwen local (on-host) · sem chamadas externas · estado por resposta";
    if (engineInfo.external) return "Motor: modelo externo utilizado nesta resposta · fora do host";
    // Degraded: the local model was unavailable this response, so the answer came from the deterministic/
    // grounded path. State the honest cause; do NOT append "sem chamadas externas · confirmado".
    if (engineInfo.engine === "degraded" || engineInfo.degraded) {
      return "Motor: degradado — modelo local indisponível nesta resposta · resposta pelo caminho determinístico/fundamentado";
    }
    // A response arrived but the runtime engine was not reported → stay neutral, never assume local.
    if (!engineInfo.engine) return "Motor: estado por confirmar nesta resposta · não normativo";
    const name = engineInfo.engine === "local_qwen" ? "Qwen local (on-host)" : engineInfo.engine;
    return `Motor: ${name} · sem chamadas externas · confirmado nesta resposta`;
  })();
  const engineOk = !engineInfo
    ? true
    : !engineInfo.external && engineInfo.engine !== "degraded" && !engineInfo.degraded && Boolean(engineInfo.engine);

  // Clear the ask-side, in-memory state (conversation + citations). In-memory only. The validation
  // session has its own "Reiniciar sessão".
  const clearConversation = () => {
    setMsgs([]);
    setLastLinks([]);
    setLastTransparency(null);
    // BZCI-6 (§2) — clearing the conversation must also drop the carried referent, so the next turn starts
    // a fresh chain (no stale subject/intent leaks into an unrelated question).
    setConvState(null);
  };

  // Tool panels + validation "Explicar este resultado" route their actions into the ask conversation.
  const askInChat = (text: string) => {
    setMode("ask");
    setActiveTool("assistente");
    ask(text);
  };
  const send = () => {
    if (inputRef.current) {
      ask(inputRef.current.value);
      inputRef.current.value = "";
    }
  };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isValidation = mode === "validation";
  const isOnboarding = mode === "onboarding";
  const current = TAB_META[activeTool];
  const isChat = !isValidation && !isOnboarding && activeTool === "assistente";
  // The workspace utility-strip eyebrow: the mode label in validation/onboarding, else the active panel.
  const mainEyebrow = isValidation ? "Validação técnica de implementação" : isOnboarding ? "Onboarding de operador" : current.name;

  const renderPanel = () => {
    switch (activeTool) {
      case "guia": return <GuiaPanel onAsk={askInChat} onValidate={goValidation} />;
      case "rfc": return <RfcPanel onAsk={askInChat} />;
      case "programadores": return <ProgramadoresTools onAsk={askInChat} />;
      case "resultados": return <ValidationResultsPanel session={validation} view={resultsView} setView={setResultsView} onAsk={askInChat} />;
      default: return null;
    }
  };

  // A Recursos/Resultados tab: selecting it drops into ask-panel view and shows that panel. Highlighted
  // only when ask mode is active (in validation mode the journey owns the workspace). `collapsed` renders
  // the icon-only rail (label kept for assistive tech + a native tooltip).
  const renderTab = (t: (typeof TABS)[number], collapsed = false) => {
    const active = !isValidation && !isOnboarding && activeTool === t.key;
    return (
      <button
        key={t.key}
        type="button"
        onClick={() => { setMode("ask"); setActiveTool(t.key); setRailOpen(false); }}
        aria-current={active ? "page" : undefined}
        title={collapsed ? t.name : undefined}
        className={cx(
          "group flex items-center rounded-[9px] py-[10px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40",
          collapsed ? "justify-center px-0" : "gap-[11px] px-3",
          active ? "bg-tint-bordo text-ink shadow-[inset_0_0_0_1px_rgba(142,19,38,0.18)]" : "text-ink-4 hover:bg-black/[0.03]",
        )}
      >
        <Ico name={t.icon} size={17} className={active ? "text-bordo" : "text-ink-5"} />
        <span className={cx("flex-1 text-[13.5px]", active && "font-semibold", collapsed && "sr-only")}>{t.name}</span>
        {active && !collapsed ? <span className="h-[6px] w-[6px] rounded-full bg-bordo" /> : null}
      </button>
    );
  };

  // A "Modos" button (Perguntar / Validar operador / Onboarding). Switching mode navigates (ADR-070):
  // "validation" lands on the selected context segment when one exists; the others stay at /banzai (+?mode=).
  const renderMode = (m: (typeof MODES)[number], collapsed = false) => {
    const active = mode === m.mode;
    return (
      <button
        key={m.mode}
        type="button"
        onClick={() => { if (m.mode === "validation") goValidation(); else goGlobal(m.mode); setRailOpen(false); }}
        aria-current={active ? "page" : undefined}
        title={collapsed ? m.name : undefined}
        className={cx(
          "group flex items-center rounded-[9px] py-[10px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40",
          collapsed ? "justify-center px-0" : "gap-[11px] px-3",
          active ? "bg-bordo text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.22)]" : "text-ink-3 hover:bg-black/[0.03]",
        )}
      >
        <Ico name={m.icon} size={17} className={active ? "text-creme-high" : "text-ink-5"} />
        <span className={cx("flex-1 text-[13.5px] font-semibold", collapsed && "sr-only")}>{m.name}</span>
        {active && !collapsed ? <span className="h-[6px] w-[6px] rounded-full bg-creme-high" /> : null}
      </button>
    );
  };

  // Reads `railCollapsed` from the component scope so the divider call sites stay literal (the nav-order
  // guard anchors on them). Collapsed → a short centred rule only, no label.
  const sidebarDivider = (label: string) =>
    railCollapsed ? (
      <div className="mx-auto my-2 h-px w-6 bg-black/[0.09]" aria-hidden="true" />
    ) : (
      <div className="my-2 flex items-center gap-2 px-3">
        <span className="h-px flex-1 bg-black/[0.07]" />
        <span className="font-mono text-[9px] tracking-[0.16em] text-ink-5">{label}</span>
        <span className="h-px flex-1 bg-black/[0.07]" />
      </div>
    );

  return (
    <div
      id="chat"
      className={cx(
        "flex scroll-mt-[64px] flex-col border-y border-line bg-paper lg:grid lg:h-[calc(100dvh-64px)] lg:min-h-[580px]",
        SHELL_GRID[gridKey],
      )}
    >
      {/* ── MOBILE TOP BAR (compact, <lg only) — rail hamburger + inspector toggle ─────────────────── */}
      <div className="order-1 flex items-center gap-2 border-b border-black/[0.07] bg-paper-2 px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setRailOpen(true)}
          aria-label="Abrir navegação"
          aria-controls="banzai-rail"
          aria-expanded={railOpen}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px] border border-black/10 bg-white text-ink-3 transition-colors hover:border-bordo/30 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40"
        >
          <Ico name="menu" size={18} />
        </button>
        <span className="flex items-center gap-2 font-serif text-[15px] font-semibold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-bordo text-creme-high"><Ico name="sparkle" size={15} sw={1.4} /></span>
          {BANZAI_AGENT.name}
        </span>
        <button
          type="button"
          onClick={() => setInspectorOpen((v) => !v)}
          aria-label={inspectorOpen ? "Fechar inspetor" : "Abrir inspetor"}
          aria-controls="banzai-inspector"
          aria-expanded={inspectorOpen}
          className="ml-auto flex h-9 flex-none items-center gap-1.5 rounded-[9px] border border-black/10 bg-white px-3 text-[12.5px] font-medium text-ink-3 transition-colors hover:border-bordo/30 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40"
        >
          <Ico name="panel" size={16} /> Inspetor
        </button>
      </div>

      {/* Mobile rail backdrop — closes the off-canvas rail on tap/Escape (<lg only). */}
      {railOpen && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setRailOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      {/* ── SIDEBAR / RAIL ─────────────────────────────────────────
          Desktop: a grid column that COLLAPSES to an icon strip (railCollapsed). Mobile: an off-canvas
          drawer opened from the top bar (railOpen), closed by default. State is in-memory only (the
          journey session must never touch browser storage). Sections: Modos · Jornada (active session
          only) · Resultados · Recursos. */}
      <aside
        id="banzai-rail"
        aria-label="Navegação lateral do BanzAI"
        className={cx(
          "order-2 flex min-h-0 flex-col overflow-y-auto border-black/[0.07] bg-paper-2 lg:order-1 lg:border-r",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[min(84vw,300px)] max-lg:border-r max-lg:shadow-[8px_0_28px_rgba(16,19,30,0.14)] max-lg:transition-transform max-lg:duration-200 motion-reduce:max-lg:transition-none",
          railOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        {/* rail header: brand (expanded) + desktop collapse toggle + mobile close */}
        <div className={cx("flex items-center gap-2 pt-5", railCollapsed ? "justify-center px-2" : "justify-between px-5")}>
          {!railCollapsed && (
            <div className="flex items-center gap-[11px]">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-bordo text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.25)]">
                <Ico name="sparkle" size={18} sw={1.4} />
              </span>
              <span>
                <span className="block font-serif text-[16px] font-semibold leading-tight text-ink">{BANZAI_AGENT.name}</span>
                <span className="block text-[11px] leading-[1.3] text-ink-5">{BANZAI_AGENT.subtitle}</span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setRailCollapsed((v) => !v)}
            aria-label={railCollapsed ? "Expandir navegação" : "Colapsar navegação"}
            aria-expanded={!railCollapsed}
            title={railCollapsed ? "Expandir" : "Colapsar"}
            className="hidden h-8 w-8 flex-none items-center justify-center rounded-[8px] border border-black/10 bg-white text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 lg:flex"
          >
            <Ico name={railCollapsed ? "arrow" : "chevronLeft"} size={16} />
          </button>
          <button
            type="button"
            onClick={() => setRailOpen(false)}
            aria-label="Fechar navegação"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] border border-black/10 bg-white text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 lg:hidden"
          >
            <Ico name="x" size={16} />
          </button>
        </div>
        <div className={railCollapsed ? "pt-2" : "pt-3"} />

        {/* Modos (ask/validation/onboarding) · Jornada de validação (active session only) · Resultados
            (ONE entry) · Recursos (Guia · Referência · Programadores). */}
        <nav className={cx("flex flex-1 flex-col gap-[3px] pb-4", railCollapsed ? "px-[8px]" : "px-[10px]")} aria-label="Navegação do BanzAI">
          {sidebarDivider("MODOS")}
          {MODES.map((m) => renderMode(m, railCollapsed))}

          {/* ADR-076 — the 9-step journey group appears only when a validation is ACTIVE (an operator +
              one of its published implementations are selected and resolved against the registry:
              validation.ready), not merely because validation mode is selected. Hidden in the collapsed
              icon strip (expand to see the step spine). Before a selection, Fase 0 owns the workspace. */}
          {isValidation && validation.ready && !railCollapsed && (
            <>
              {sidebarDivider("JORNADA DE VALIDAÇÃO")}
              <ValidationStepNav session={validation} />
            </>
          )}

          {sidebarDivider("RESULTADOS")}
          {TABS.filter((t) => t.group === "resultados").map((t) => renderTab(t, railCollapsed))}

          {sidebarDivider("RECURSOS")}
          {TABS.filter((t) => t.group === "recursos").map((t) => renderTab(t, railCollapsed))}
        </nav>

        {!railCollapsed && (
          <div className="mt-auto flex flex-col gap-1 border-t border-black/[0.06] px-[14px] pb-5 pt-3">
            <div className="flex items-center gap-[8px] rounded-[8px] border border-black/10 bg-paper-2 px-[12px] py-[8px]" aria-live="polite">
              <span className={`h-[6px] w-[6px] flex-none rounded-full ${engineOk ? "bg-ok" : "bg-pend"}`} />
              <span className="font-mono text-[10.5px] text-ink-4">{engineLabel}</span>
            </div>
            <div className="mt-2 flex gap-[10px] rounded-[10px] border border-bordo/20 bg-tint-bordo px-[14px] py-[13px]">
              <Ico name="scale" size={15} sw={1.4} className="mt-px flex-none text-bordo" />
              <p className="m-0 font-mono text-[11px] leading-[1.55] text-pend">{BANZAI_AGENT.shortPhrase}</p>
            </div>
          </div>
        )}
      </aside>

      {/* ── WORKSPACE ─────────────────────────────────────────── */}
      <main className="order-2 flex min-h-0 flex-col lg:order-2">
      {/* Desktop utility strip: mode eyebrow + the contextual-inspector toggle (mobile uses the top bar). */}
      <div className="hidden items-center justify-between gap-3 border-b border-black/[0.07] bg-paper-2/50 px-[clamp(16px,3vw,26px)] py-[8px] lg:flex">
        <span className="truncate font-mono text-[10.5px] tracking-[0.16em] text-ink-5">{mainEyebrow.toUpperCase()}</span>
        <button
          ref={inspectorToggleRef}
          type="button"
          onClick={() => setInspectorOpen((v) => !v)}
          aria-label={inspectorOpen ? "Ocultar inspetor" : "Mostrar inspetor"}
          aria-controls="banzai-inspector"
          aria-expanded={inspectorOpen}
          className="flex flex-none items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-[11px] py-[5px] font-mono text-[11px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40"
        >
          <Ico name="panel" size={14} /> {inspectorOpen ? "Ocultar inspetor" : "Mostrar inspetor"}
        </button>
      </div>
      {isValidation ? (
        <>
          <BanzaiContextTrail
            context={routeState.context}
            operatorId={validation.operatorId}
            operatorName={validation.operator?.display_name ?? null}
            implementationId={validation.implementationId}
            implementationName={validation.implementation?.display_name ?? null}
          />
          <ValidationHeader session={validation} />
          <div className="min-h-[320px] max-h-[58vh] flex-1 overflow-y-auto px-[clamp(16px,4vw,28px)] py-8 lg:max-h-none">
            {validation.ready ? (
              <ValidationWorkspace session={validation} onAsk={askInChat} onOpenResults={openResults} />
            ) : (
              <ValidationContextSetup session={validation} />
            )}
          </div>
        </>
      ) : isOnboarding ? (
        <div className="min-h-[320px] max-h-[58vh] flex-1 overflow-y-auto px-[clamp(16px,4vw,28px)] py-8 lg:max-h-none">
          <BanzaiOnboardingMode onSwitchMode={(m) => { if (m === "validation") goValidation(); else goGlobal(m); }} />
        </div>
      ) : (
        <>
        <div ref={scrollRef} className="min-h-[320px] max-h-[58vh] flex-1 overflow-y-auto px-[clamp(16px,4vw,28px)] py-8 lg:max-h-none">
          {isChat ? (
            msgs.length === 0 ? (
              <div className="mx-auto max-w-[720px] pt-2 text-center">
                <span className="mx-auto mb-4 flex h-[56px] w-[56px] items-center justify-center rounded-[16px] border border-bordo/15 bg-gradient-to-b from-tint-bordo to-white text-bordo shadow-[0_6px_20px_rgba(142,19,38,0.10)]">
                  <Ico name="sparkle" size={26} sw={1.3} />
                </span>
                <h2 className="mb-[10px] font-serif text-[clamp(22px,2.6vw,28px)] font-semibold leading-[1.2] text-ink">{BANZAI_AGENT.heroTitle}</h2>
                <p className="mx-auto mb-2 max-w-[54ch] text-[15px] leading-[1.6] text-ink-3">{BANZAI_AGENT.heroText}</p>
                <p className="mx-auto mb-6 max-w-[56ch] text-[12.5px] leading-[1.6] text-ink-4">{AGENT_STANCE}</p>

                <div className="mb-4 flex items-center justify-center gap-3 font-mono text-[10.5px] tracking-[0.18em] text-ink-5">
                  <span className="h-px w-8 bg-black/10" /> COMEÇAR POR AQUI <span className="h-px w-8 bg-black/10" />
                </div>
                <div className="flex flex-col gap-[10px] text-left">
                  {AGENT_SUGGESTIONS.map((q) => (
                    <button key={q} onClick={() => ask(q)} className={`group flex w-full items-center gap-[14px] px-[18px] py-[13px] text-left transition-all hover:-translate-y-px hover:border-bordo/30 hover:shadow-[0_6px_18px_rgba(142,19,38,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${CARD}`}>
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[8px] bg-tint-bordo font-mono text-[12px] text-bordo">↳</span>
                      <span className="flex-1 text-[14.5px] text-ink-2">{q}</span>
                      <Ico name="chevron" size={16} className="flex-none text-ink-5 transition-transform group-hover:translate-x-0.5 group-hover:text-bordo" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-[760px] flex-col gap-[22px]">
                {msgs.map((m, i) => {
                  const ai = m.role === "ai";
                  return (
                    <div key={i} className={`flex items-start gap-[14px] ${ai ? "flex-row" : "flex-row-reverse"}`}>
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${ai ? "bg-bordo text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.22)]" : "border border-line-2 bg-white font-mono text-[12px] text-ink-4"}`}>
                        {ai ? <Ico name="sparkle" size={15} sw={1.4} /> : "tu"}
                      </span>
                      <div className="max-w-[84%] flex-1">
                        {ai && m.kind && m.kind !== "answer" && (
                          <div className="mb-[7px]">
                            {/* ADR-078 — an operational answer keys the badge on terminalKind FIRST so a
                                measurement reads "MEDIÇÃO OPERACIONAL" and a no-data outcome reads "SEM
                                MEDIÇÕES SUFICIENTES" — never the generic "EVIDÊNCIA INSUFICIENTE". */}
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-[10px] py-[3px] font-mono text-[10px] tracking-[0.06em] ${
                              m.terminalKind === "operational_duration" ? "border border-black/15 bg-paper-2 text-ink-3"
                              : m.terminalKind === "insufficient_measurements" ? "border border-pend/35 bg-pend/[0.08] text-pend"
                              : m.kind === "refusal" ? "border border-bordo/30 bg-tint-bordo text-bordo"
                              : m.kind === "unavailable" ? "border border-black/15 bg-paper-2 text-ink-4"
                              : "border border-pend/35 bg-pend/[0.08] text-pend"
                            }`}>
                              <span className="h-[5px] w-[5px] rounded-full bg-current" />
                              {m.terminalKind === "operational_duration"
                                ? "MEDIÇÃO OPERACIONAL"
                                : m.terminalKind === "insufficient_measurements"
                                  ? "SEM MEDIÇÕES SUFICIENTES"
                                  : m.kind === "refusal"
                                    ? "RECUSA SEGURA"
                                    : m.kind === "unavailable"
                                      ? "SERVIÇO INDISPONÍVEL"
                                      : "EVIDÊNCIA INSUFICIENTE"}
                            </span>
                          </div>
                        )}
                        <div className={`rounded-[12px] px-[18px] py-[14px] ${ai ? CARD : "border border-pend/25 bg-tint-gold"}`}>
                          {ai && m.correctionDisplay && m.correctionDisplay.length > 0 && (
                            <p className="m-0 mb-[9px] font-mono text-[11px] leading-[1.5] text-ink-4">
                              Interpretado como {m.correctionDisplay.map((c) => `“${c}”`).join(", ")}.
                            </p>
                          )}
                          {ai ? (
                            <SafeMarkdown text={m.text} />
                          ) : (
                            <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.68] text-ink-2">{m.text}</p>
                          )}
                          {/* ADR-078 — the measured numbers as a typed block (SafeMarkdown drops tables,
                              so per-step MUST render here). Shown only when the backend sent duration. */}
                          {ai && m.duration && <DurationAnswerBlock duration={m.duration} />}
                          {ai && m.limits && m.limits.length > 0 && (
                            <ul className="m-0 mt-[10px] flex list-none flex-col gap-[4px] p-0">
                              {m.limits.map((l) => (
                                <li key={l} className="flex items-start gap-[7px] text-[12px] leading-[1.5] text-ink-4">
                                  <span className="mt-[6px] h-[4px] w-[4px] flex-none rounded-full bg-[#B98A3E]" />{l}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {ai && m.sources && m.sources.length > 0 && (
                          <SourceBlock sources={m.sources} />
                        )}
                        {ai && m.resolvedDocument && (
                          <div className="mt-[10px] flex flex-wrap items-center gap-[7px]">
                            <span className="inline-flex items-center gap-[6px] rounded-full border border-ok/30 bg-tint-green px-[10px] py-[4px] font-mono text-[10.5px] font-semibold text-ok">
                              Documento resolvido: {m.resolvedDocument.id}
                            </span>
                            {m.resolvedDocument.status && (
                              <span className="rounded-full border border-line-2 bg-white px-[9px] py-[4px] font-mono text-[10.5px] text-ink-4">
                                {m.resolvedDocument.status}
                              </span>
                            )}
                            {m.resolvedDocument.path && (
                              <span className="font-mono text-[10.5px] text-ink-5">{m.resolvedDocument.path}</span>
                            )}
                            {m.documentMode && (
                              <span className="rounded-full border border-line-2 bg-paper-2 px-[9px] py-[4px] font-mono text-[10.5px] text-ink-5">
                                {String(m.documentMode).replace("document_", "")}
                              </span>
                            )}
                          </div>
                        )}
                        {ai && m.documentTruncated && (
                          <p className="m-0 mt-[8px] rounded-[6px] border border-pend/30 bg-tint-gold px-[10px] py-[6px] text-[11.5px] leading-[1.45] text-pend">
                            Resposta resumida para caber no limite actual. Peça detalhes por secção.
                          </p>
                        )}
                        {ai && m.resolvedDocument && (
                          <div className="mt-[10px] flex flex-wrap gap-[7px]">
                            {[
                              ["Ver decisão", `Qual foi a decisão do ${m.resolvedDocument.id}?`],
                              ["Ver consequências", `Quais foram as consequências do ${m.resolvedDocument.id}?`],
                              ["Impacto para operadores", `Como o ${m.resolvedDocument.id} afecta implementadores?`],
                              ["Resumir", `Resume o ${m.resolvedDocument.id}`],
                            ].map(([label, q]) => (
                              <button key={label} type="button" onClick={() => askInChat(q)} className="rounded-full border border-line-2 bg-white px-[11px] py-[4px] text-[12px] text-ink-3 transition-colors hover:border-bordo/40 hover:text-bordo">{label}</button>
                            ))}
                          </div>
                        )}
                        {ai && m.documentNotFound && (
                          <div className="mt-[10px]">
                            <span className="inline-flex items-center gap-[6px] rounded-full border border-pend/40 bg-tint-gold px-[10px] py-[4px] font-mono text-[10.5px] font-semibold text-pend">
                              Documento não encontrado
                            </span>
                          </div>
                        )}
                        {ai && m.status && (
                          <p className="m-0 mt-[8px] font-mono text-[10.5px] leading-[1.4] text-ink-5">{m.status}</p>
                        )}
                        {ai && m.correctionClarification && m.correctionClarification.length > 0 && (
                          <div className="mt-[11px]" data-clarify="1">
                            <div className="mb-[6px] font-mono text-[10px] tracking-[0.14em] text-ink-4">PRETENDIA DIZER</div>
                            <div className="flex flex-wrap gap-[7px]">
                              {m.correctionClarification.map((c) => (
                                <button key={c} type="button" onClick={() => askInChat(c)} className="rounded-full border border-line-2 bg-white px-[12px] py-[5px] text-[12px] text-ink-3 transition-colors hover:border-bordo/40 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40">{c}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {ai && m.followUps && m.followUps.length > 0 && (
                          <div className="mt-[11px]" data-quick-prompts="1">
                            <div className="mb-[6px] font-mono text-[10px] tracking-[0.14em] text-ink-4">CONTINUAR</div>
                            <div className="flex flex-wrap gap-[7px]">
                              {m.followUps.map((f) => (
                                <button key={f} type="button" onClick={() => askInChat(f)} className="rounded-full border border-line-2 bg-white px-[12px] py-[5px] text-[12px] text-ink-3 transition-colors hover:border-bordo/40 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40">{f}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Increment 9 (§25) — a duration answer's contextual chips now come from the
                            per-answer generator (m.followUps, rendered above) so they vary by what the
                            engine measured (per-step present, comparable runs, resolved entity). */}
                      </div>
                    </div>
                  );
                })}
                {/* SPR-5 (§9) — while a streamed query is in flight, the live progressive block (real
                    events → processing line + safe fact cards + synthesis state; NEVER prose). Before the
                    first event, or on the non-stream fallback path, the neutral thinking indicator. */}
                {busy && (progressActive && progressEvents.length > 0 ? (
                  <BanzaiProgressView events={progressEvents} startedAt={progressStart} reducedMotion={reducedMotion} onCancel={cancelAsk} />
                ) : (
                  <ThinkingIndicator />
                ))}
              </div>
            )
          ) : (
            <div className="mx-auto max-w-[820px]">
              {renderPanel()}
            </div>
          )}
        </div>

        {isChat && (
          <div className="border-t border-black/[0.07] px-[clamp(16px,4vw,28px)] pb-4 pt-[18px]">
            <div className="mx-auto max-w-[760px]">
              <div className="flex items-end gap-[10px] rounded-[14px] border border-black/10 bg-white py-[10px] pl-3 pr-[10px] shadow-[0_1px_2px_rgba(16,19,30,0.04)] transition-shadow focus-within:border-bordo/40 focus-within:shadow-[0_0_0_3px_rgba(142,19,38,0.08)]">
                <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-tint-bordo text-bordo"><Ico name="sparkle" size={17} sw={1.4} /></span>
                <textarea ref={inputRef} onKeyDown={onKey} rows={1} placeholder={BANZAI_AGENT.assistantPlaceholder} aria-label="Pergunte ao BanzAI" className="max-h-[120px] flex-1 resize-none bg-transparent py-[9px] text-[15px] leading-[1.5] text-ink outline-none placeholder:text-ink-5" />
                <button onClick={send} aria-label="Enviar" className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-bordo text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.25)] transition-colors hover:bg-[#7a0f20]"><Ico name="send" size={17} sw={1.6} /></button>
              </div>
              <div className="mt-[10px] flex flex-wrap justify-between gap-3 px-1">
                <span className="font-mono text-[11px] text-ink-5">Enter para enviar · Shift+Enter para nova linha</span>
                {msgs.length > 0 && (
                  <button type="button" onClick={clearConversation} className="font-mono text-[11px] text-bordo transition-colors hover:underline">Limpar conversa</button>
                )}
              </div>
            </div>
          </div>
        )}
        </>
      )}
      </main>

      {/* Mobile inspector backdrop (<lg only, when open). */}
      {inspectorOpen && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setInspectorOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      {/* ── CONTEXTUAL INSPECTOR (drawer) ─────────────────────────
          The former permanent right column is now a collapsible inspector: a third grid column on lg
          (open by default), an off-canvas drawer on smaller screens (closed by default). Keyboard-
          accessible (labelled region, receives focus on open, Escape closes on small screens). It shows
          REAL info for the current selection — citações (ask) · progresso/endpoint/motor/reason codes/
          recibo/evidência (validation, via ValidationContextPanel) · FRONTEIRA · ESTADO (runtime SSOT). */}
      <aside
        id="banzai-inspector"
        ref={inspectorRef}
        tabIndex={-1}
        aria-label={isValidation ? "Inspetor · contexto da validação" : "Inspetor · fontes e contexto"}
        className={cx(
          "order-3 min-h-0 flex-col gap-5 overflow-y-auto border-black/[0.07] bg-paper-2 px-[20px] py-6 focus-visible:outline-none lg:order-3 lg:border-l",
          inspectorOpen ? "flex" : "hidden",
          "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-[min(90vw,360px)] max-lg:border-l max-lg:shadow-[-8px_0_28px_rgba(16,19,30,0.14)]",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-ink-4">
            <Ico name="book" size={15} className="text-bordo-soft" /> {isValidation ? "CONTEXTO DA VALIDAÇÃO" : "FONTES E CONTEXTO"}
          </div>
          <button
            type="button"
            onClick={() => setInspectorOpen(false)}
            aria-label="Fechar inspetor"
            title="Fechar inspetor"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] border border-black/10 bg-white text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40"
          >
            <Ico name="x" size={15} />
          </button>
        </div>

        {/* Validation mode → contextual content ONLY (progresso, próxima acção, bloqueios, endpoint,
            evidência). Ask mode → citations. The header owns the static metadata (no duplication). */}
        {isValidation ? (
          validation.ready ? (
            <ValidationContextPanel session={validation} />
          ) : (
            <section>
              <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5"><Ico name="sliders" size={13} className="text-ink-5" /> FASE 0 · CONTEXTO</div>
              <div className={`p-[14px] ${CARD}`}>
                <p className="m-0 text-[12.5px] leading-[1.55] text-ink-4">Seleccione um operador e uma das suas implementações publicadas para activar a jornada. O contexto da validação aparece aqui depois da selecção.</p>
              </div>
            </section>
          )
        ) : isChat ? (
          <section>
            <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5"><Ico name="quote" size={13} className="text-ink-5" /> CITAÇÕES</div>
            <div className={`min-h-[60px] p-[14px] ${CARD}`}>
              {lastLinks.length === 0 ? (
                <span className="text-[12.5px] italic text-ink-5">As citações aparecerão aqui quando o BanzAI responder.</span>
              ) : (
                <div className="flex flex-col gap-[9px]">
                  {lastLinks.map((c) => (
                    <Link key={`${c.href}|${c.label}`} href={c.href} className="flex items-center gap-[9px] no-underline">
                      <span className="h-[5px] w-[5px] flex-none rotate-45 bg-[#B98A3E]" />
                      <span className="font-mono text-[12px] text-ink-2 transition-colors hover:text-bordo">{c.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Increment 9 (§24) — the per-answer transparency layer, rendered INSIDE this one inspector
            (not a second competing panel), directly below the citations. It surfaces what the engine
            actually computed for the last answer; each field appears only when the engine produced it. */}
        {isChat && lastTransparency && <TransparencyPanel t={lastTransparency} />}

        {/* SPR-5 (§12) — the progressive metrics for the last STREAMED answer (time to first progress /
            first verifiable fact / final validated answer, plus TTFB, all safe client-side durations).
            Rendered only when a real progressive stream ran (a non-stream fallback carries no timings). */}
        {isChat && <BanzaiProgressMetrics metrics={lastMetrics} />}

        {!isValidation && !isChat && (
          <section>
            <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5"><Ico name="sliders" size={13} className="text-ink-5" /> CONTEXTO — {current.name.toUpperCase()}</div>
            <div className={`p-[16px] ${CARD}`}>
              <p className="m-0 text-[12.5px] leading-[1.55] text-ink-4">{activeTool === "resultados" ? "Os resultados da validação de operador vivem aqui, com origem nos endpoints públicos da implementação." : "Referência e ferramentas do protocolo. Use os cartões para perguntar ao BanzAI ou abrir a validação de operador."}</p>
            </div>
          </section>
        )}

        <section>
          <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5"><Ico name="scale" size={13} className="text-ink-5" /> FRONTEIRA</div>
          <div className={`flex flex-col gap-[11px] p-[16px] ${CARD}`}>
            <p className="m-0 text-[12px] leading-[1.55] text-ink-3">BanzAI é o agente IA do protocolo BANZA. Responde com base nas fontes locais do protocolo, não certifica, não aprova operadores, não emite licenças e não substitui a governação do protocolo.</p>
            <p className="m-0 text-[12px] leading-[1.55] text-ink-3">Ninguém aceita nem aprova operadores por decisão humana central. PASS é evidência verificável de conformidade, não certificado.</p>
          </div>
        </section>

        {/* ADR-076 D-076-10 — runtime/provider state is DERIVED from the runtime SSOT (GET /banzai/runtime),
            not asserted by static green pills. The strip (server component, ISR + fail-safe) states its
            source, shows the live projection or an honest "estado não confirmado" fallback, and never
            presents last-known state as current. Replaces the former hardcoded BADGES + "Pré-produção…". */}
        {runtimeStrip && (
          <section>
            <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5"><Ico name="shield" size={13} className="text-ink-5" /> ESTADO</div>
            {runtimeStrip}
          </section>
        )}
      </aside>
    </div>
  );
}
