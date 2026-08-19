"use client";

// BanzAI validation mode — the in-shell UI for the endpoint-originated operator-validation journey
// (M2.19G.1, ADR-034).
//
// Fase 0 (§12) selects an operator + one of its published implementations from the CLOSED registry.
// The nine-step journey (§21) then evaluates that implementation by calling the Rust backend, which
// fetches every artifact from the implementation's PUBLIC endpoints and decides the verdict. There is
// NO manual input in this official path — no textarea, upload, drag-drop, URL field or fixture loader.
// Those live only in the developer draft tool (Programadores). Rust decides; Qwen only explains;
// TypeScript renders receipts and never authors a verdict.

import { useCallback, useEffect, useState } from "react";
import { Ico, CARD, type IconKey } from "@/components/banzai/banzaiUi";
import { useBanzaiLocale } from "@/components/banzai/BanzaiWorkspaceProvider";
import { agentCopy } from "@/components/banzai/agentPresentation";
import {
  publicationStatusLabelFor,
  realizeProgress,
  type ProgressResult,
  stepBlurb,
  stepStatusLabel,
  stepTitle,
  reproOutcomeLabel,
  validationCopy,
  type ValidationCopyId,
} from "@/components/banzai/validationPresentation";
import type { Locale } from "@/lib/i18n";

// Block E2/Q5 — one reader-facing lookup for this whole surface. `locale` always arrives from the
// workspace boundary; nothing below re-derives it and there is no default to fall back to.
const copy = (locale: Locale) => (id: ValidationCopyId, params?: Record<string, string>) =>
  validationCopy(id, locale, params);
import {
  STEP_META,
  shortHash,
  type StepId,
  type ValidationSession,
} from "@/components/banzai/validationJourney";
import { downloadReceipt, type StepStatus, type ServerOperationReceipt } from "@/lib/operationReceipt";
import {
  listExecutions,
  getExecution,
  compareExecutions,
  reproduce,
  type PersistenceInfo,
  type ExecutionSummary,
  type ExecutionDetail,
  type ExecutionComparison,
  type ReproductionOutcome,
} from "@/lib/banzaiValidateClient";

const STEP_ICON: Record<StepId, IconKey> = {
  discovery: "info",
  manifest: "code",
  keys: "shield",
  conformance: "medal",
  interoperability: "coins",
  trust: "scale",
  federation: "graph",
  evidence: "book",
  certification: "route",
};

const ST_DOT: Record<StepStatus, string> = {
  VERIFIED: "bg-ok",
  PENDING: "bg-pend",
  FAILED: "bg-bordo",
  BLOCKED: "bg-[#8957e5]",
  NOT_EVALUATED: "bg-ink-5/40",
  // ADR-030: out of scope for the profile — a neutral, dashed marker, never a failure colour.
  NOT_APPLICABLE: "bg-ink-5/25",
};

const ST_BADGE: Record<StepStatus, string> = {
  VERIFIED: "border-ok/40 bg-ok/[0.08] text-ok",
  PENDING: "border-pend/40 bg-pend/[0.08] text-pend",
  FAILED: "border-bordo/40 bg-tint-bordo text-bordo",
  BLOCKED: "border-[#8957e5]/40 bg-[#8957e5]/[0.08] text-[#6f42c1]",
  NOT_EVALUATED: "border-black/10 bg-paper-2 text-ink-5",
  NOT_APPLICABLE: "border-dashed border-ink-5/40 bg-paper-2 text-ink-5",
};

const ST_LEFT: Record<StepStatus, string> = {
  VERIFIED: "border-l-ok",
  PENDING: "border-l-pend",
  FAILED: "border-l-bordo",
  BLOCKED: "border-l-[#8957e5]",
  NOT_EVALUATED: "border-l-black/10",
  NOT_APPLICABLE: "border-l-ink-5/30",
};

/* ── Persistence status (ADR-036 correction 1) — the HONEST durable-archive verdict of a full-journey
   run. The engine result stands regardless of storage; this badge never claims durable/consultable/
   comparable/reproducible when persistence is not confirmed, and NEVER shows an archive reference for a
   non-persisted run. `onRetry` re-checks durability (reads the store) and never re-runs the engine. */
/**
 * The journey's progress, rendered. Block E2/Q5 — a mutation that substituted a DIFFERENT result at the
 * render site (an English reader told a journey with a blocker had finished clean) survived a property
 * that only checked `realizeProgress`, because the divergence lived at the call site. There is no call
 * site left: the component takes the semantic result and reads its own edition, so the witness and the
 * words are produced from the same value and cannot disagree.
 */
export function JourneyProgress({ result, className }: { result: ProgressResult; className?: string }) {
  const locale = useBanzaiLocale();
  return (
    <p className={className} data-journey-progress={result.kind}>
      {realizeProgress(result, locale)}
    </p>
  );
}

/**
 * Which durability verdict the archive reached. Block E2/Q5 — this is a DECISION about the run, not copy:
 * it is taken once, from the archive's status alone, with no locale in scope. A mutation that let the
 * English edition present a pending run as durable survived a property that only compared wording, so the
 * verdict is now chosen here as an id and rendered as data alongside its words.
 */
type PersistenceVerdict = "persisted" | "disabled" | "failed" | "pending";

function persistenceVerdict(p: PersistenceInfo): PersistenceVerdict {
  if (p.status === "PERSISTED") return "persisted";
  if (p.status === "DISABLED") return "disabled";
  if (p.detail === "FAILED") return "failed";
  return "pending";
}

const VERDICT_STYLE: Record<PersistenceVerdict, { cls: string; dot: string }> = {
  persisted: { cls: "border-ok/40 bg-ok/[0.08] text-ok", dot: "bg-ok" },
  disabled: { cls: "border-black/10 bg-paper-2 text-ink-5", dot: "bg-ink-5/50" },
  failed: { cls: "border-bordo/40 bg-tint-bordo text-bordo", dot: "bg-bordo" },
  pending: { cls: "border-pend/40 bg-pend/[0.08] text-pend", dot: "bg-pend" },
};

function persistencePresentation(
  p: PersistenceInfo,
  locale: Locale,
): { verdict: PersistenceVerdict; label: string; sub: string; cls: string; dot: string } {
  const t = copy(locale);
  const verdict = persistenceVerdict(p);
  return {
    verdict,
    label: t(`persistence.${verdict}` as ValidationCopyId),
    sub: t(`persistence.${verdict}.sub` as ValidationCopyId),
    ...VERDICT_STYLE[verdict],
  };
}

export function PersistenceBadge({ p, onRetry, retrying }: { p: PersistenceInfo; onRetry?: () => void; retrying?: boolean }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  const v = persistencePresentation(p, locale);
  const persisted = p.status === "PERSISTED";
  return (
    <div className={`rounded-[10px] border px-[13px] py-[10px] ${v.cls}`} data-persistence={p.status} data-persistence-verdict={v.verdict}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-semibold">
          <span className={`h-[6px] w-[6px] rounded-full ${v.dot}`} /> {v.label}
        </span>
        <span className="font-mono text-[10.5px] opacity-80">
          {persisted && p.execution_id ? `arquivo: ${p.execution_id}` : t("persistence.noArchiveRef")}
        </span>
      </div>
      <p className="m-0 mt-1.5 text-[11.5px] leading-[1.5] text-ink-4">{v.sub}</p>
      {!persisted && p.retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-[11px] py-[5px] font-mono text-[11px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo disabled:opacity-60"
        >
          {retrying ? t("persistence.retrying") : t("persistence.retry")}
        </button>
      )}
    </div>
  );
}

/* A labelled, clearly-separated step block. The active step shows THREE such blocks, never mixed:
   (1) engine result, (2) verifiable evidence, (3) BanzAI explanation (ADR-034 §24/§16 / ADR-036). */
function StepBlock({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  return (
    <section className="mt-5 border-t border-black/[0.07] pt-4">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-tint-bordo font-mono text-[10px] font-semibold text-bordo">{n}</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-5">{title}</span>
        {hint && <span className="ml-auto truncate font-mono text-[10px] text-ink-5">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/* ── The single Resultados area sub-views (ADR-034 §29) — in-area tabs, NOT sidebar entries ─────── */
export type ResultsSubView = "resumo" | "receipts" | "relatorios" | "artefactos" | "traces" | "evidence" | "execucoes";
// A tab is an id plus an icon — both semantic — and a NAME id realized wherever it is rendered. The set
// and its order are the same for every reader.
export const RESULTS_VIEWS: { id: ResultsSubView; nameId: ValidationCopyId; icon: IconKey }[] = [
  { id: "resumo", nameId: "tab.summary", icon: "info" },
  { id: "receipts", nameId: "tab.receipts", icon: "doc" },
  { id: "relatorios", nameId: "tab.reports", icon: "medal" },
  { id: "artefactos", nameId: "tab.artifacts", icon: "code" },
  { id: "traces", nameId: "tab.traces", icon: "route" },
  { id: "evidence", nameId: "tab.evidenceBundle", icon: "book" },
  // ADR-036 — the durable append-only archive: history · 9-step matrix · comparison · reproduction.
  { id: "execucoes", nameId: "tab.executions", icon: "graph" },
];

// §26 — t("action.explainResult"): the prompt attaches operador/implementação/etapa/endpoint/fetched_at/
// hash/status/reason_codes/evidence so Qwen can explain the ALREADY-COMPUTED Rust verdict. Qwen never
// changes status/reason/receipt.
function explainPrompt(session: ValidationSession, id: StepId, locale: Locale): string {
  const t = copy(locale);
  const m = STEP_META[id];
  const st = session.results[id];
  const r = st.receipt;
  const impl = session.implementation;
  const parts: string[] = [t("explain.opening", { title: stepTitle(id, locale), engine: m.engine })];
  if (impl) parts.push(t("explain.identity", { operator: impl.operator_id, implementation: impl.implementation_id }));
  if (r) {
    parts.push(t("explain.status", { status: st.status }));
    if (r.endpoint) parts.push(t("explain.endpoint", { endpoint: r.endpoint }));
    if (r.fetched_at) parts.push(t("explain.fetchedAt", { at: r.fetched_at }));
    if (r.http_status != null) parts.push(`HTTP ${r.http_status}.`);
    if (r.output_hash) parts.push(`Hash: ${r.output_hash}.`);
    if (st.reason_codes.length) parts.push(t("explain.reasonCodes", { codes: st.reason_codes.join(", ") }));
    if (st.evidence_refs.length) parts.push(t("explain.evidence", { refs: st.evidence_refs.slice(0, 3).join(", ") }));
  }
  parts.push(t("explain.closing"));
  return parts.join(" ");
}

/* ── Fase 0 — operator + implementation selection (ADR-034 §12) ──────────────── */
export function ValidationContextSetup({ session }: { session: ValidationSession }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  const { operators, operator, implementation, operatorsLoading, operatorsError } = session;
  return (
    <div className="mx-auto max-w-[820px]">
      <div className={`p-[18px] ${CARD}`}>
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-5">
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-tint-bordo text-bordo"><Ico name="sliders" size={13} /></span>{t("setup.phase0")}</div>
        <h2 className="m-0 mt-2 font-serif text-[clamp(19px,2.2vw,24px)] font-semibold leading-[1.2] text-ink">{agentCopy("validation.header", locale)}</h2>
        <p className="m-0 mt-3 max-w-[62ch] text-[13.5px] leading-[1.6] text-ink-3">{agentCopy("validation.intro", locale)}</p>
        <p className="m-0 mt-2 max-w-[62ch] text-[12.5px] leading-[1.55] text-ink-4">{agentCopy("validation.entities", locale)}</p>

        {/* Operator selector — the list is fetched from the closed Technical Registry (Rust-sourced). */}
        <div className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-5">{t("setup.step1")}</div>
        {operatorsLoading && (
          <div role="status" aria-live="polite" className="mt-2 rounded-[10px] border border-black/[0.08] bg-white px-[13px] py-[12px] text-[12.5px] text-ink-4">{t("setup.loadingOperators")}</div>
        )}
        {!operatorsLoading && operators.length === 0 && (
          <div role="status" aria-live="polite" className="mt-2 rounded-[10px] border border-bordo/20 bg-tint-bordo px-[13px] py-[12px] text-[12.5px] leading-[1.55] text-pend">
            {operatorsError
              ? t("setup.registryErrorFull")
              : t("setup.noOperators")}
          </div>
        )}
        <div className="mt-2 flex flex-col gap-[8px]">
          {operators.map((op) => {
            const active = session.operatorId === op.operator_id;
            return (
              <button
                key={op.operator_id}
                type="button"
                onClick={() => session.selectOperator(op.operator_id)}
                aria-pressed={active}
                className={`flex flex-col gap-[6px] rounded-[10px] border p-[13px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${
                  active ? "border-bordo/40 bg-tint-bordo" : "border-black/[0.08] bg-white hover:border-bordo/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-ink">{op.display_name}</span>
                  <code className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[6px] py-[2px] font-mono text-[10.5px] text-ink-4">{op.operator_id}</code>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-[3px] font-mono text-[11px] text-ink-4 sm:grid-cols-3">
                  <KV k={t("setup.publicationState")} v={op.publication_status} />
                  <KV k={t("setup.implementations")} v={String(op.implementations.length)} />
                  <KV k={t("setup.technicalRegistry")} v={op.technical_registry_ref} mono />
                </div>
              </button>
            );
          })}
        </div>
        <p className="m-0 mt-2 text-[11.5px] leading-[1.5] text-ink-5">{agentCopy("validation.onlyOperatorHint", locale)}</p>

        {/* Implementation selector (only once an operator is chosen) */}
        {operator && (
          <>
            <div className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-5">{t("setup.step2")}</div>
            <div className="mt-2 flex flex-col gap-[8px]">
              {operator.implementations.map((impl) => {
                const active = session.implementationId === impl.implementation_id;
                return (
                  <button
                    key={impl.implementation_id}
                    type="button"
                    onClick={() => session.selectImplementation(impl.implementation_id)}
                    aria-pressed={active}
                    className={`flex flex-col gap-[6px] rounded-[10px] border p-[13px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${
                      active ? "border-bordo/40 bg-tint-bordo" : "border-black/[0.08] bg-white hover:border-bordo/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">{impl.display_name}</span>
                      <code className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[6px] py-[2px] font-mono text-[10.5px] text-ink-4">{impl.implementation_id}</code>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-[3px] font-mono text-[11px] text-ink-4 sm:grid-cols-3">
                      <KV k={t("setup.version")} v={impl.version} />
                      <KV k={t("setup.environment")} v={impl.environment} />
                      <KV k={t("setup.profile")} v={impl.profile} />
                      <KV k={t("setup.protocolVersion")} v={impl.protocol_version} />
                      <KV k={t("setup.canonicalOrigin")} v={impl.canonical_origin} mono />
                      <KV k={t("setup.registryState")} v={publicationStatusLabelFor(impl.publication_status, locale)} />
                      <KV k={t("setup.eligible")} v={impl.eligible ? t("setup.yes") : t("setup.no")} />
                    </div>
                    <div className="flex flex-wrap gap-[5px]">
                      {impl.capabilities.map((c) => (
                        <code key={c} className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[6px] py-[2px] font-mono text-[10px] text-ink-3">{c}</code>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-5 rounded-[10px] border border-bordo/20 bg-tint-bordo px-[13px] py-[10px] text-[12px] leading-[1.55] text-pend">
          {implementation
            ? t("setup.targetSelectedFull")
            : t("setup.selectPromptFull")}
        </div>
      </div>
    </div>
  );
}

/* ── Left sidebar: the 9-step spine ─────────────────────────────────────────── */
export function ValidationStepNav({ session }: { session: ValidationSession }) {
  const locale = useBanzaiLocale();
  const enabled = session.ready;
  return (
    <ol className="m-0 flex list-none flex-col gap-[3px] p-0">
      {session.steps.map((s) => {
        const st = session.results[s.id];
        const active = session.activeStep === s.id;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => session.setActiveStep(s.id)}
              disabled={!enabled}
              aria-current={active ? "step" : undefined}
              className={`group flex w-full items-center gap-[10px] rounded-[9px] border-l-[3px] px-3 py-[9px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 disabled:opacity-45 ${ST_LEFT[st.status]} ${
                active ? "bg-tint-bordo text-ink shadow-[inset_0_0_0_1px_rgba(142,19,38,0.18)]" : "text-ink-4 hover:bg-black/[0.03]"
              }`}
            >
              <span className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border font-mono text-[10.5px] ${active ? "border-bordo/40 bg-white text-bordo" : "border-black/15 bg-white text-ink-5"}`}>
                {s.num}
              </span>
              <span className={`flex-1 text-[13px] ${active ? "font-semibold" : ""}`}>{stepTitle(s.id, locale)}</span>
              {st.running ? (
                <span className="h-[12px] w-[12px] flex-none animate-spin rounded-full border-2 border-black/10 border-t-bordo" aria-hidden="true" />
              ) : (
                <span className={`h-[7px] w-[7px] flex-none rounded-full ${ST_DOT[st.status]}`} aria-hidden="true" />
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Compact validation header — STATIC metadata only (ADR-034 §27) ─────────────
   Operador · implementação · ambiente · perfil · versão do protocolo · estado da jornada. The right
   panel (contextual) NEVER re-states this permanently. */
function HeaderField({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-[2px] bg-white px-[11px] py-[8px]">
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-5">{k}</span>
      <span className={`text-[12px] font-semibold text-ink-2 ${mono ? "font-mono break-words" : ""}`}>{v}</span>
    </div>
  );
}

export function ValidationHeader({ session }: { session: ValidationSession }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  const { operator, implementation, overall, runningAll, progressResult } = session;
  const confirmReset = () => {
    // §25 — restarting the session requires confirmation; clears ONLY ephemeral/session state.
    if (window.confirm(t("header.resetConfirmFull"))) {
      session.reset();
    }
  };
  return (
    <div className="border-b border-black/[0.07] bg-paper-2/60 px-[26px] py-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-[11px]">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-tint-bordo text-bordo"><Ico name="medal" size={16} /></span>
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-5">{agentCopy("validation.header", locale)}</div>
            <div className="text-[15px] font-semibold text-ink">{implementation?.display_name ?? t("setup.selectImplementation")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[4px] font-mono text-[11px] font-semibold ${ST_BADGE[overall]}`}>
            <span className={`h-[6px] w-[6px] rounded-full ${ST_DOT[overall]}`} />
            {stepStatusLabel(overall, locale)}
          </span>
          {implementation && operator && (
            <button type="button" onClick={() => session.selectOperator(operator.operator_id)} disabled={runningAll} className="rounded-[10px] border border-black/10 bg-white px-[11px] py-[6px] font-mono text-[11.5px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo disabled:opacity-60">{t("header.changeTarget")}</button>
          )}
          <button type="button" onClick={confirmReset} disabled={runningAll} className="rounded-[10px] border border-black/10 bg-white px-[11px] py-[6px] font-mono text-[11.5px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo disabled:opacity-60">{t("header.resetSession")}</button>
        </div>
      </div>

      {implementation && operator && (
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[9px] border border-black/[0.07] bg-black/[0.06] sm:grid-cols-3 lg:grid-cols-6">
          <HeaderField k="operador" v={operator.operator_id} mono />
          <HeaderField k={t("header.implementation")} v={implementation.implementation_id} mono />
          <HeaderField k="ambiente" v={implementation.environment} />
          <HeaderField k="perfil" v={implementation.profile} />
          <HeaderField k={t("setup.protocolVersion")} v={implementation.protocol_version} mono />
          <HeaderField k={t("ctx.journey")} v={realizeProgress(progressResult, locale)} />
        </div>
      )}
    </div>
  );
}

/* ── §16 receipt fields — every origin field bound to the verdict ───────────────── */
function ReceiptField({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-[2px] rounded-[6px] border border-black/[0.06] bg-paper-2 px-[9px] py-[6px]">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-5">{k}</span>
      <span className={`break-all text-[11px] text-ink-2 ${mono ? "font-mono" : ""}`}>{v || "—"}</span>
    </div>
  );
}

function ReceiptOriginGrid({ r }: { r: ServerOperationReceipt }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  return (
    <div className="mt-4 grid gap-[6px] sm:grid-cols-2 lg:grid-cols-3">
      <ReceiptField k={t("receipt.endpointQueried")} v={r.endpoint ?? "—"} mono />
      <ReceiptField k={t("receipt.canonicalOrigin")} v={r.canonical_origin} mono />
      <ReceiptField k={t("receipt.resolvedHost")} v={r.resolved_host ?? "—"} mono />
      <ReceiptField k={t("receipt.httpStatus")} v={r.http_status != null ? String(r.http_status) : "—"} />
      <ReceiptField k={t("receipt.contentType")} v={r.content_type ?? "—"} mono />
      <ReceiptField k={t("receipt.contentLength")} v={r.content_length != null ? String(r.content_length) : "—"} />
      <ReceiptField k="fetched_at" v={r.fetched_at ?? "—"} mono />
      <ReceiptField k="ETag" v={r.etag ?? "—"} mono />
      <ReceiptField k={t("receipt.outputHash")} v={shortHash(r.output_hash)} mono />
      <ReceiptField k={t("receipt.signatureStatus")} v={r.signature_status} />
      <ReceiptField k="engine" v={`${r.engine} · ${r.engine_version}`} mono />
      <ReceiptField k="result" v={r.result?.status ?? "—"} />
    </div>
  );
}

/* ── Center workspace: the active step detail + contextual actions (ADR-034 §24) ── */
export function ValidationWorkspace({
  session,
  onAsk,
  onOpenResults,
}: {
  session: ValidationSession;
  onAsk: (t: string) => void;
  onOpenResults: (view: ResultsSubView) => void;
}) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  const { activeStep, results, progress } = session;
  const active = session.steps.find((s) => s.id === activeStep)!;
  const st = results[activeStep];
  const r = st.receipt;
  const journeyDone = progress.evaluated === progress.total && !session.runningAll;
  const isBlocked = st.status === "BLOCKED" || st.status === "FAILED";
  const hasReceipt = Boolean(r);

  const primaryBtn = "inline-flex items-center gap-2 rounded-[10px] bg-bordo px-[15px] py-[9px] text-[13px] font-semibold text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.25)] transition-colors hover:bg-[#7a0f20] disabled:opacity-60";
  const ghostBtn = "rounded-[10px] border border-bordo/30 bg-white px-[13px] py-[8px] text-[12.5px] font-semibold text-bordo transition-colors hover:bg-tint-bordo";
  const mutedBtn = "rounded-[10px] border border-black/10 bg-white px-[13px] py-[8px] font-mono text-[12px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo";

  const explainBtn = (
    <button type="button" onClick={() => onAsk(explainPrompt(session, activeStep, locale))} className={ghostBtn}>
      Explicar este resultado
    </button>
  );

  const actions = (() => {
    if (st.running || session.runningAll) {
      return (
        <>
          <span className="inline-flex items-center gap-2 rounded-[10px] border border-bordo/20 bg-tint-bordo px-[15px] py-[9px] text-[13px] font-semibold text-bordo">
            <span className="h-[13px] w-[13px] animate-spin rounded-full border-2 border-bordo/25 border-t-bordo" /> A executar…
          </span>
          <button type="button" onClick={session.cancel} className={mutedBtn}>{t("action.cancel")}</button>
        </>
      );
    }
    if (journeyDone) {
      return (
        <>
          <button type="button" onClick={() => onOpenResults("resumo")} className={primaryBtn}><Ico name="info" size={15} /> {t("action.viewSummary")}</button>
          <button type="button" onClick={() => onOpenResults("receipts")} className={ghostBtn}>{t("action.viewResults")}</button>
          <button type="button" onClick={session.exportJourney} disabled={!session.journeyReceipt} className={mutedBtn}>{t("action.exportJourneyReceipt")}</button>
          <button type="button" onClick={session.runAll} className={mutedBtn}>{t("action.runAgain")}</button>
        </>
      );
    }
    if (isBlocked) {
      return (
        <>
          <button type="button" onClick={() => onOpenResults("resumo")} className={primaryBtn}><Ico name="scale" size={15} /> {t("action.viewBlock")}</button>
          {explainBtn}
          <button type="button" onClick={() => onAsk(`Consulta a documentação d${t("ask.unblock", { title: stepTitle(active.id, locale), engine: active.engine, codes: st.reason_codes.join(", ") || t("ask.unblock.fallback") })}`)} className={mutedBtn}>{t("action.consultDocs")}</button>
          <button type="button" onClick={() => session.runOne(activeStep)} className={mutedBtn}>{t("action.runAgain")}</button>
        </>
      );
    }
    if (hasReceipt) {
      return (
        <>
          <button type="button" onClick={() => onOpenResults("receipts")} className={primaryBtn}><Ico name="doc" size={15} /> {t("action.viewReceipt")}</button>
          {explainBtn}
          <button type="button" onClick={() => session.runOne(activeStep)} className={mutedBtn}>{t("action.runAgain")}</button>
        </>
      );
    }
    if (progress.evaluated === 0) {
      return (
        <>
          <button type="button" onClick={session.runAll} className={primaryBtn}><Ico name="route" size={15} /> {t("action.runFullJourney")}</button>
          <button type="button" onClick={() => { session.setActiveStep(session.steps[0].id); session.runOne(session.steps[0].id); }} className={ghostBtn}>{t("action.runFirstStep")}</button>
        </>
      );
    }
    return (
      <>
        <button type="button" onClick={() => session.runOne(activeStep)} className={primaryBtn}><Ico name="sparkle" size={15} /> {t("action.runThisStep")}</button>
        <button type="button" onClick={() => session.runFrom(activeStep)} className={ghostBtn}>{t("action.runFromHere")}</button>
      </>
    );
  })();

  return (
    <div className="mx-auto max-w-[820px]">
      <div className={`p-[18px] ${CARD}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-5">
              <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-tint-bordo text-bordo"><Ico name={STEP_ICON[active.id]} size={13} /></span>
              Etapa {active.num} · motor {active.engine}
            </div>
            <h2 className="m-0 mt-2 font-serif text-[clamp(19px,2.2vw,24px)] font-semibold leading-[1.2] text-ink">{stepTitle(active.id, locale)}</h2>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[4px] font-mono text-[11px] font-semibold ${ST_BADGE[st.status]}`}>
            <span className={`h-[6px] w-[6px] rounded-full ${ST_DOT[st.status]}`} />
            {st.status} · {stepStatusLabel(st.status, locale)}
          </span>
        </div>

        <p className="m-0 mt-3 max-w-[62ch] text-[13.5px] leading-[1.6] text-ink-3">{stepBlurb(active.id, locale)}</p>

        <div className="mt-4 flex flex-wrap gap-[8px]">{actions}</div>

        {/* THREE SEPARATE blocks, never mixed (ADR-034 §24/§16 · ADR-036): (1) engine result,
            (2) verifiable evidence, (3) BanzAI explanation. */}
        <StepBlock n={1} title={t("step.engineResult")} hint={`motor ${active.engine}`}>
          <div className="flex flex-wrap items-center gap-2">
            {r ? (
              <>
                <code className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[6px] py-[2px] font-mono text-[10.5px] text-ink-4">{r.engine} · {r.engine_version}</code>
                {r.result?.status && <code className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[6px] py-[2px] font-mono text-[10.5px] text-ink-4">verdicto {String(r.result.status)}</code>}
              </>
            ) : (
              <span className="text-[12px] leading-[1.5] text-ink-5">{t("step.notEvaluated")}</span>
            )}
          </div>
          {st.error && (
            <div className="mt-3 rounded-[10px] border border-bordo/25 bg-tint-bordo px-[13px] py-[10px] text-[12.5px] text-bordo">Falha ao obter/validar: {st.error}</div>
          )}
          {(r || st.reason_codes.length > 0) && (
            <div className="mt-3">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">{t("step.reasonCodes")}</div>
              {st.reason_codes.length ? (
                <div className="flex flex-wrap gap-[5px]">
                  {st.reason_codes.map((c, i) => (
                    <code key={`${c}-${i}`} className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[6px] py-[2px] font-mono text-[10.5px] text-ink-3">{c}</code>
                  ))}
                </div>
              ) : (
                <span className="text-[12px] text-ink-5">—</span>
              )}
            </div>
          )}
        </StepBlock>

        <StepBlock n={2} title={t("step.verifiableEvidence")} hint={r ? t("step.receiptFromEndpoint") : undefined}>
          {r ? (
            <>
              <ReceiptOriginGrid r={r} />
              <div className="mt-3">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">{t("step.evidenceReferences")}</div>
                {st.evidence_refs.length ? (
                  <div className="flex flex-col gap-[3px]">
                    {st.evidence_refs.map((e, i) => (
                      <code key={`${e}-${i}`} className="break-all font-mono text-[10.5px] text-ink-3">{e}</code>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] text-ink-5">—</span>
                )}
              </div>
            </>
          ) : (
            <p className="m-0 text-[12.5px] leading-[1.55] text-ink-5">{t("step.evidenceHintFull")}</p>
          )}
        </StepBlock>

        <StepBlock n={3} title={t("step.banzaiExplanation")} hint={t("step.doesNotDecide")}>
          <p className="m-0 text-[12.5px] leading-[1.55] text-ink-4">{t("step.banzaiHintFull")}</p>
          <button type="button" onClick={() => onAsk(explainPrompt(session, activeStep, locale))} className={`mt-3 ${ghostBtn}`}>{t("step.explainWithBanzai")}</button>
          {activeStep === "certification" && r && (
            <div className="mt-3 rounded-[10px] border border-[#8957e5]/30 bg-[#8957e5]/[0.06] px-[13px] py-[10px] text-[12.5px] leading-[1.55] text-[#6f42c1]">
              {t("ctx.readinessInline")} <strong>{session.certificationReadiness ?? "—"}</strong>{t("ctx.certificationStateInline")}<code>NOT_CERTIFIED</code>{t("ctx.readinessNote")}
            </div>
          )}
        </StepBlock>
      </div>

      {/* Persistence status of the last full-journey run (ADR-036 correction 1) — honest, never fabricated. */}
      {session.persistence && (
        <div className="mt-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">{t("persistence.heading")}</div>
          <PersistenceBadge p={session.persistence} onRetry={session.recheckPersistence} retrying={session.recheckingPersistence} />
        </div>
      )}

      <p className="mt-5 max-w-[62ch] border-t border-black/[0.07] pt-4 text-[12px] leading-[1.55] text-ink-5">{agentCopy("validation.originNote", locale)}</p>
    </div>
  );
}

/* ── Right context panel — CONTEXTUAL content only (ADR-034 §27) ─────────────────
   Progresso · próxima acção · bloqueios · endpoint seleccionado · evidência da etapa · fontes. It does
   NOT permanently re-state the header metadata. */
function CtxSection({ icon, title, children }: { icon: IconKey; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5">
        <Ico name={icon} size={13} className="text-ink-5" /> {title}
      </div>
      {children}
    </section>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
      <span className="text-ink-4">{k}</span>
      <span className={`truncate text-ink-2 ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

export function ValidationContextPanel({ session }: { session: ValidationSession }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  const { progress, progressResult, blockers, activeStep, results } = session;
  const st = results[activeStep];
  const r = st.receipt;
  const nextStep = session.steps.find((s) => results[s.id].status === "NOT_EVALUATED");
  return (
    <>
      <CtxSection icon="route" title="PROGRESSO">
        <div className={`flex flex-col gap-[9px] p-[14px] ${CARD}`}>
          <div>
            <div className="mb-[4px] flex items-baseline justify-between gap-2">
              <span className="font-mono text-[10px] tracking-[0.1em] text-ink-5">{t("ctx.steps")}</span>
              <span className="font-mono text-[10.5px] text-ink-4">{progress.evaluated}/{progress.total} avaliadas</span>
            </div>
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-bordo transition-[width] duration-500" style={{ width: `${Math.round((progress.evaluated / progress.total) * 100)}%` }} />
            </div>
          </div>
          <JourneyProgress result={progressResult} className="m-0 text-[12px] leading-[1.5] text-ink-3" />
          <div className="grid grid-cols-2 gap-[3px] border-t border-black/[0.05] pt-[8px] font-mono text-[10px] text-ink-4">
            <span>{t("ctx.certificationReadiness")} <span className="text-ink-2">{session.certificationReadiness ?? "—"}</span></span>
            <span>{t("ctx.certificationState")} <span className="text-ink-2">{session.certificationStatus}</span></span>
          </div>
        </div>
      </CtxSection>

      <CtxSection icon="arrow" title={t("ctx.nextAction")}>
        <div className={`p-[14px] ${CARD}`}>
          {session.runningAll || st.running ? (
            <p className="m-0 text-[12px] leading-[1.5] text-ink-4">{t("ctx.running")}</p>
          ) : nextStep ? (
            <button type="button" onClick={() => { session.setActiveStep(nextStep.id); session.runOne(nextStep.id); }} className="self-start font-mono text-[11.5px] text-bordo transition-colors hover:underline">
              {t("action.runThisStep")} {nextStep.num} {stepTitle(nextStep.id, locale)} →
            </button>
          ) : (
            <p className="m-0 text-[12px] leading-[1.5] text-ink-4">{t("ctx.allEvaluated")}</p>
          )}
        </div>
      </CtxSection>

      {r && (
        <CtxSection icon="sliders" title={t("ctx.selectedEndpoint")}>
          <div className={`flex flex-col gap-[6px] p-[14px] ${CARD}`}>
            <KV k={t("ctx.step")} v={stepTitle(activeStep, locale)} />
            <KV k="endpoint" v={r.endpoint ?? "—"} mono />
            <KV k="host" v={r.resolved_host ?? "—"} mono />
            <KV k="HTTP" v={r.http_status != null ? String(r.http_status) : "—"} />
            <KV k="fetched_at" v={r.fetched_at ?? "—"} mono />
            <KV k="hash" v={shortHash(r.output_hash)} mono />
          </div>
        </CtxSection>
      )}

      <CtxSection icon="scale" title={`BLOQUEIOS (${blockers.length})`}>
        <div className={`p-[14px] ${CARD}`}>
          {blockers.length ? (
            <div className="flex flex-col gap-[8px]">
              {blockers.map((b) => (
                <div key={b.step} className="flex flex-col gap-[3px]">
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="text-ink-2">{stepTitle(b.step, locale)}</span>
                    <span className={b.status === "FAILED" ? "text-bordo" : "text-[#6f42c1]"}>{b.status}</span>
                  </div>
                  <code className="break-all font-mono text-[10px] text-ink-4">{b.reason}</code>
                  <button type="button" onClick={() => session.setActiveStep(b.step)} className="self-start font-mono text-[10.5px] text-bordo transition-colors hover:underline">{t("ctx.openStep")}</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-[12px] leading-[1.5] text-ink-4">{t("ctx.noBlocks")}</p>
          )}
        </div>
      </CtxSection>

      {st.evidence_refs.length > 0 && (
        <CtxSection icon="book" title={`EVIDÊNCIA DA ETAPA (${st.evidence_refs.length})`}>
          <div className={`p-[14px] ${CARD}`}>
            <div className="flex flex-col gap-[4px]">
              {st.evidence_refs.slice(0, 10).map((e, i) => (
                <code key={`${e}-${i}`} className="break-all font-mono text-[10.5px] text-ink-3">{e}</code>
              ))}
            </div>
          </div>
        </CtxSection>
      )}
    </>
  );
}

/* ── The SINGLE Resultados area (ADR-034 §29) — one surface, in-area sub-views ──── */
function ReceiptCard({ r, onExport }: { r: ServerOperationReceipt; onExport: () => void }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  return (
    <div className={`p-[14px] ${CARD}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">{STEP_META[r.step as StepId]?.num} {STEP_META[r.step as StepId] ? stepTitle(r.step as StepId, locale) : r.step}</span>
        <button type="button" onClick={onExport} className="rounded-full border border-black/10 bg-white px-[11px] py-[4px] font-mono text-[11px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo">{t("action.exportJson")}</button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-[4px] font-mono text-[10.5px] text-ink-4 sm:grid-cols-2">
        <KV k="engine" v={`${r.engine} · ${r.engine_version}`} mono />
        <KV k="result" v={r.result?.status ?? "—"} />
        <KV k="operation_id" v={r.operation_id} mono />
        <KV k="qwen_calls" v={String(r.qwen_calls)} />
        <KV k="protocol_fetch_count" v={String(r.protocol_fetch_count)} />
        <KV k="external_model_calls" v={String(r.external_model_calls)} />
      </div>
    </div>
  );
}

/* ── Execuções (durable append-only archive, ADR-036) — history · 9-step matrix · comparison ·
   reproduction · export. Reads the store by server-issued ids only (never a URL); the store preserves,
   it never recomputes a verdict. Reproduction creates a NEW execution and never overwrites the original. */
const REPRO_LABEL_ID: Record<ReproductionOutcome, ValidationCopyId> = {
  SEMANTICALLY_EQUIVALENT: "repro.equivalent",
  NOT_EQUIVALENT: "repro.notEquivalent",
  INPUTS_UNAVAILABLE: "repro.inputsUnavailable",
  ENGINE_VERSION_UNAVAILABLE: "repro.engineVersionUnavailable",
  BLOCKED: "repro.blocked",
};

function ExecMatrix({ session, receipts }: { session: ValidationSession; receipts: ServerOperationReceipt[] }) {
  const locale = useBanzaiLocale();
  // ADR-030: a NOT_APPLICABLE step surfaces as its own display status (never a failure/omission).
  const byStep = new Map(
    receipts.map((r) => [
      r.step,
      (r.applicability === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : r.result?.status ?? "NOT_EVALUATED") as StepStatus,
    ]),
  );
  return (
    <div className="flex flex-wrap gap-[4px]">
      {session.steps.map((s) => {
        const st = (byStep.get(s.id) ?? "NOT_EVALUATED") as StepStatus;
        return (
          <span key={s.id} title={`${s.num} ${stepTitle(s.id, locale)} · ${stepStatusLabel(st, locale)}`} className={`inline-flex items-center gap-1 rounded-full border px-[7px] py-[2px] font-mono text-[10px] ${ST_BADGE[st]}`}>
            <span className={`h-[5px] w-[5px] rounded-full ${ST_DOT[st]}`} />{s.num}
          </span>
        );
      })}
    </div>
  );
}

export function ExecutionHistoryPanel({ session }: { session: ValidationSession }) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  const opId = session.operatorId;
  const implId = session.implementationId;
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [rows, setRows] = useState<ExecutionSummary[]>([]);
  const [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ExecutionComparison | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!implId) { setPhase("idle"); return; }
    setPhase("loading"); setDetail(null); setComparison(null); setNote(null);
    const res = await listExecutions(implId);
    if (!res.ok) { setPhase("error"); return; }
    setRows(res.executions);
    setPhase(res.executions.length ? "ready" : "empty");
  }, [implId]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); setComparison(null); setNote(null);
    const r = await getExecution(id);
    setDetailLoading(false);
    if (r.ok) setDetail(r.execution); else setNote(t("exec.openFailed"));
  };
  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : [s[1], id]));
  const doCompare = async () => {
    if (selected.length !== 2) return;
    setAction("compare"); setDetail(null); setNote(null);
    const r = await compareExecutions(selected[0], selected[1]);
    setAction(null);
    if (r.ok) setComparison(r.comparison); else setNote(t("exec.compareFailed"));
  };
  const doReproduce = async (id: string) => {
    if (!opId || !implId) return;
    setAction("reproduce:" + id); setNote(null);
    const r = await reproduce(opId, implId, id);
    setAction(null);
    if (r.ok) { setNote(`Reprodução: ${reproOutcomeLabel(r.reproduction.outcome, locale)} — nova execução ${r.reproduction.new_execution_id}. O original é preservado.`); await load(); }
    else setNote(t("exec.replayFailed"));
  };

  if (!implId) {
    return (
      <div className={`p-[16px] ${CARD}`}>
        <p className="m-0 text-[13px] leading-[1.6] text-ink-3">{t("exec.selectPrefix")} <strong>Validar operador</strong> {t("exec.selectSuffix")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">Arquivo durável · {implId}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={doCompare} disabled={selected.length !== 2 || action === "compare"} className="rounded-[8px] border border-black/10 bg-white px-[11px] py-[5px] font-mono text-[11px] text-ink-4 transition-colors enabled:hover:border-bordo/30 enabled:hover:text-bordo disabled:opacity-40">
            {action === "compare" ? t("exec.comparing") : `Comparar (${selected.length}/2)`}
          </button>
          <button type="button" onClick={() => void load()} className="rounded-[8px] border border-black/10 bg-white px-[11px] py-[5px] font-mono text-[11px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo">{t("exec.refresh")}</button>
        </div>
      </div>

      {note && <div className="rounded-[10px] border border-pend/30 bg-tint-gold px-[13px] py-[9px] text-[12px] leading-[1.5] text-pend">{note}</div>}

      {phase === "loading" && <div role="status" aria-live="polite" className={`p-[14px] text-[12.5px] text-ink-4 ${CARD}`}>{t("exec.loading")}</div>}
      {phase === "error" && (
        <div className="rounded-[10px] border border-bordo/25 bg-tint-bordo px-[13px] py-[10px] text-[12.5px] leading-[1.55] text-bordo">
          Não foi possível carregar o arquivo de execuções (indisponível ou desativado). O resultado do motor não depende do arquivo.{" "}
          <button type="button" onClick={() => void load()} className="underline">{t("exec.retry")}</button>
        </div>
      )}
      {phase === "empty" && (
        <div className={`p-[16px] ${CARD}`}>
          <p className="m-0 text-[13px] leading-[1.6] text-ink-3">{t("exec.emptyPrefix")} <strong>Validar operador</strong> {t("exec.emptySuffix")}</p>
        </div>
      )}

      {phase === "ready" && rows.map((e) => {
        const sel = selected.includes(e.execution_id);
        return (
          <div key={e.execution_id} className={`p-[13px] ${CARD} ${sel ? "ring-2 ring-bordo/30" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={sel} onChange={() => toggleSelect(e.execution_id)} aria-label={`Selecionar a execução ${e.execution_id} para comparar`} className="accent-bordo" />
                <code className="font-mono text-[11.5px] text-ink-2">{e.execution_id}</code>
              </label>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] font-mono text-[10.5px] font-semibold ${ST_BADGE[e.overall_status]}`}>
                <span className={`h-[5px] w-[5px] rounded-full ${ST_DOT[e.overall_status]}`} />{e.overall_status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-[3px] font-mono text-[10.5px] text-ink-4 sm:grid-cols-4">
              <KV k={t("exec.start")} v={e.started_at ?? "—"} />
              <KV k={t("exec.profileEnvironment")} v={`${e.profile} · ${e.environment}`} />
              <KV k="readiness" v={e.certification_readiness ?? "—"} />
              <KV k={t("exec.receiptSha")} v={e.receipt_sha256 ? shortHash(e.receipt_sha256) : "—"} mono />
            </div>
            <div className="mt-2 flex flex-wrap gap-[6px]">
              <button type="button" onClick={() => void openDetail(e.execution_id)} className="rounded-[8px] border border-bordo/30 bg-white px-[11px] py-[5px] font-mono text-[11px] text-bordo transition-colors hover:bg-tint-bordo">{t("exec.open")}</button>
              <button type="button" onClick={() => void doReproduce(e.execution_id)} disabled={action === "reproduce:" + e.execution_id} className="rounded-[8px] border border-black/10 bg-white px-[11px] py-[5px] font-mono text-[11px] text-ink-4 transition-colors enabled:hover:border-bordo/30 enabled:hover:text-bordo disabled:opacity-50">
                {action === "reproduce:" + e.execution_id ? t("exec.replaying") : "Reproduzir"}
              </button>
            </div>
          </div>
        );
      })}

      {detailLoading && <div className={`p-[14px] text-[12.5px] text-ink-4 ${CARD}`}>{t("exec.opening")}</div>}

      {detail && (
        <div className={`p-[15px] ${CARD}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="truncate text-[13.5px] font-semibold text-ink">Execução {detail.execution.execution_id}</span>
            {detail.journey_receipt && (
              <button type="button" onClick={() => downloadReceipt(detail.journey_receipt!, `journey-${detail.execution.execution_id}.json`)} className="rounded-full border border-bordo/30 bg-tint-bordo px-[11px] py-[4px] font-mono text-[11px] text-bordo transition-colors hover:bg-bordo hover:text-creme-high">{t("action.exportJourneyReceipt")}</button>
            )}
          </div>
          <div className="mb-3 mt-2 grid grid-cols-2 gap-[4px] font-mono text-[11px] text-ink-4 sm:grid-cols-3">
            <KV k="estado" v={detail.execution.overall_status} />
            <KV k="readiness" v={detail.execution.certification_readiness ?? "—"} />
            <KV k={t("exec.certification")} v={detail.execution.certification_status} />
            <KV k={t("setup.profile")} v={detail.execution.profile} />
            <KV k={t("setup.version")} v={detail.execution.version} />
            <KV k={t("setup.environment")} v={detail.execution.environment} />
          </div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">{t("exec.matrix9")}</div>
          <ExecMatrix session={session} receipts={detail.step_receipts} />
          {detail.evidence_bundle_reference && (
            <div className="mt-3 break-all font-mono text-[11px] text-ink-4">{t("exec.evidenceBundleLabel")} <span className="text-ink-3">{detail.evidence_bundle_reference}</span></div>
          )}
          <div className="mt-3 flex flex-col divide-y divide-black/[0.05]">
            {detail.step_receipts.map((r) => (
              <div key={r.operation_id} className="flex items-center justify-between gap-2 py-[6px]">
                <span className="text-[12px] text-ink-2">{STEP_META[r.step as StepId]?.num} {STEP_META[r.step as StepId] ? stepTitle(r.step as StepId, locale) : r.step}</span>
                <div className="flex items-center gap-2">
                  <code className="hidden font-mono text-[10px] text-ink-5 sm:inline">{shortHash(r.output_hash)}</code>
                  <button type="button" onClick={() => downloadReceipt(r, `receipt-${r.step}-${r.operation_id}.json`)} className="rounded-full border border-black/10 bg-white px-[9px] py-[3px] font-mono text-[10px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo">{t("exec.export")}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {comparison && (
        <div className={`p-[15px] ${CARD}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13.5px] font-semibold text-ink">{t("exec.comparison")}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] font-mono text-[10.5px] font-semibold ${comparison.equivalent ? "border-ok/40 bg-ok/[0.08] text-ok" : "border-pend/40 bg-pend/[0.08] text-pend"}`}>
              {comparison.equivalent ? "Equivalentes" : "Diferem"}
            </span>
          </div>
          <div className="mt-1 break-all font-mono text-[10.5px] text-ink-5">{comparison.a} ↔ {comparison.b}</div>
          <div className="mt-3 flex flex-col divide-y divide-black/[0.05]">
            {comparison.step_deltas.map((d) => (
              <div key={d.step} className="flex items-center justify-between gap-2 py-[6px] font-mono text-[11px]">
                <span className="text-ink-2">{STEP_META[d.step as StepId] ? stepTitle(d.step as StepId, locale) : d.step}</span>
                <span className="flex items-center gap-2">
                  <span className="text-ink-4">{d.status_a ?? "—"} → {d.status_b ?? "—"}</span>
                  {d.changed ? <span className="rounded-full border border-pend/40 bg-pend/[0.08] px-[7px] py-[1px] text-[10px] text-pend">{t("exec.changed")}</span> : <span className="text-ink-5">=</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] leading-[1.5] text-ink-5">{t("exec.archiveNoteFull")}</p>
    </div>
  );
}

export function ValidationResultsPanel({
  session,
  view,
  setView,
  onAsk,
}: {
  session: ValidationSession;
  view: ResultsSubView;
  setView: (v: ResultsSubView) => void;
  onAsk: (t: string) => void;
}) {
  const locale = useBanzaiLocale();
  const t = copy(locale);
  const { receipts, journeyReceipt, implementation, operator, overall, progressResult, blockers } = session;
  const evidenceReceipt = session.results.evidence.receipt;

  return (
    <div className="mx-auto max-w-[820px] pb-4">
      <div className="mb-5 flex items-start gap-[14px]">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[13px] border border-bordo/15 bg-gradient-to-b from-tint-bordo to-white text-bordo shadow-[0_4px_14px_rgba(142,19,38,0.08)]">
          <Ico name="graph" size={22} sw={1.5} />
        </span>
        <div className="pt-0.5">
          <h2 className="m-0 font-serif text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.2] text-ink">{t("results.title")}</h2>
          <p className="mb-0 mt-1.5 max-w-[60ch] text-[14px] leading-[1.55] text-ink-3">{t("results.introFull")}</p>
        </div>
      </div>

      {/* In-area sub-views (tabs), NOT separate sidebar entries. */}
      <div className="mb-5 flex flex-wrap gap-[6px] border-b border-black/[0.07] pb-3">
        {RESULTS_VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-current={active ? "true" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-[12px] py-[5px] font-mono text-[11.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${
                active ? "border-bordo/40 bg-tint-bordo text-bordo" : "border-black/10 bg-white text-ink-4 hover:border-bordo/30"
              }`}
            >
              <Ico name={v.icon} size={13} /> {t(v.nameId)}
            </button>
          );
        })}
      </div>

      {view === "execucoes" ? (
        <ExecutionHistoryPanel session={session} />
      ) : receipts.length === 0 && !journeyReceipt ? (
        <div className={`p-[16px] ${CARD}`}>
          <p className="m-0 text-[13px] leading-[1.6] text-ink-3">{t("results.emptyPrefix")} <strong>Validar operador</strong>{t("results.emptyMiddle")}<strong>{t("tab.executions")}</strong>.</p>
        </div>
      ) : view === "resumo" ? (
        <div className="flex flex-col gap-[12px]">
          <div className={`p-[16px] ${CARD}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-ink">{t("results.journeySummary")}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[4px] font-mono text-[11px] font-semibold ${ST_BADGE[overall]}`}>
                <span className={`h-[6px] w-[6px] rounded-full ${ST_DOT[overall]}`} /> {stepStatusLabel(overall, locale)}
              </span>
            </div>
            <JourneyProgress result={progressResult} className="m-0 mt-2 text-[12.5px] leading-[1.55] text-ink-3" />
            {implementation && operator && (
              <p className="m-0 mt-2 text-[12.5px] leading-[1.6] text-ink-2">
                {t("validation.resultPhrase", {
                  impl: implementation.implementation_id,
                  operator: operator.operator_id,
                  profile: implementation.profile,
                  version: implementation.version,
                  environment: implementation.environment,
                })}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-[6px] font-mono text-[11px] sm:grid-cols-2">
              <KV k={t("results.readiness")} v={session.certificationReadiness ?? "—"} />
              <KV k={t("results.certificationState")} v={session.certificationStatus} />
            </div>
          </div>
          {session.persistence && <PersistenceBadge p={session.persistence} onRetry={session.recheckPersistence} retrying={session.recheckingPersistence} />}
          {blockers.length > 0 && (
            <div className={`p-[14px] ${CARD}`}>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">Bloqueios ({blockers.length})</div>
              <div className="flex flex-col gap-[6px]">
                {blockers.map((b) => (
                  <div key={b.step} className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="text-ink-2">{stepTitle(b.step, locale)}</span>
                    <code className="break-all text-ink-4">{b.reason}</code>
                    <span className={b.status === "FAILED" ? "text-bordo" : "text-[#6f42c1]"}>{b.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-[8px]">
            <button type="button" onClick={session.exportJourney} disabled={!journeyReceipt} className="rounded-[10px] border border-bordo/30 bg-white px-[13px] py-[8px] font-mono text-[12px] text-bordo transition-colors enabled:hover:bg-tint-bordo disabled:opacity-40">{t("action.exportJourneyReceipt")}</button>
            <button type="button" onClick={() => setView("receipts")} className="rounded-[10px] border border-black/10 bg-white px-[13px] py-[8px] font-mono text-[12px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo">{t("results.viewReceipts")}</button>
          </div>
        </div>
      ) : view === "receipts" ? (
        <div className="flex flex-col gap-[10px]">
          {journeyReceipt && (
            <div className={`p-[15px] ${CARD}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-ink">{t("results.journeyReceipt")}</span>
                <button type="button" onClick={session.exportJourney} className="rounded-full border border-bordo/30 bg-tint-bordo px-[11px] py-[4px] font-mono text-[11px] text-bordo transition-colors hover:bg-bordo hover:text-creme-high">{t("action.exportJson")}</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-[4px] font-mono text-[11px] text-ink-4 sm:grid-cols-3">
                <KV k="journey_id" v={journeyReceipt.journey_id} mono />
                <KV k="etapas" v={String(journeyReceipt.step_count)} />
                <KV k="estado" v={journeyReceipt.overall_status} />
                <KV k="readiness" v={journeyReceipt.certification_readiness} />
                <KV k={t("exec.certification")} v={journeyReceipt.certification_status} />
                <KV k="protocol_fetch_count" v={String(journeyReceipt.protocol_fetch_count)} />
              </div>
            </div>
          )}
          {receipts.map((r) => (
            <ReceiptCard key={r.operation_id} r={r} onExport={() => session.exportStep(r.step as StepId)} />
          ))}
        </div>
      ) : view === "relatorios" ? (
        <div className={`p-[14px] ${CARD}`}>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">{t("results.rustVerdicts")}</div>
          <div className="flex flex-col divide-y divide-black/[0.05]">
            {session.steps.map((s) => {
              const rs = session.results[s.id];
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 py-[8px]">
                  <span className="text-[12.5px] text-ink-2">{s.num} {stepTitle(s.id, locale)}</span>
                  <div className="flex items-center gap-2">
                    {rs.reason_codes[0] && <code className="hidden break-all font-mono text-[10px] text-ink-5 sm:inline">{rs.reason_codes[0]}</code>}
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] font-mono text-[10.5px] font-semibold ${ST_BADGE[rs.status]}`}>
                      <span className={`h-[5px] w-[5px] rounded-full ${ST_DOT[rs.status]}`} /> {rs.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "artefactos" ? (
        <div className="flex flex-col gap-[10px]">
          {receipts.filter((r) => r.endpoint).length === 0 ? (
            <div className={`p-[16px] ${CARD}`}><p className="m-0 text-[13px] leading-[1.6] text-ink-3">{t("results.noArtifacts")}</p></div>
          ) : (
            receipts.filter((r) => r.endpoint).map((r) => (
              <div key={r.operation_id} className={`p-[14px] ${CARD}`}>
                <div className="mb-2 text-[13px] font-semibold text-ink">{STEP_META[r.step as StepId] ? stepTitle(r.step as StepId, locale) : r.step}</div>
                <div className="grid grid-cols-2 gap-[4px] font-mono text-[10.5px] text-ink-4 sm:grid-cols-2">
                  <KV k="endpoint" v={r.endpoint ?? "—"} mono />
                  <KV k="host" v={r.resolved_host ?? "—"} mono />
                  <KV k={t("receipt.contentType")} v={r.content_type ?? "—"} mono />
                  <KV k={t("receipt.contentLength")} v={r.content_length != null ? String(r.content_length) : "—"} />
                  <KV k="ETag" v={r.etag ?? "—"} mono />
                  <KV k="hash" v={shortHash(r.output_hash)} mono />
                </div>
              </div>
            ))
          )}
        </div>
      ) : view === "traces" ? (
        <div className={`p-[14px] ${CARD}`}>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">{t("results.tracesTitle")}</div>
          {session.evidence.length ? (
            <div className="flex flex-col gap-[4px]">
              {session.evidence.map((e, i) => (
                <div key={`${e.step}-${e.ref}-${i}`} className="flex items-center justify-between gap-2 font-mono text-[10.5px]">
                  <code className="truncate text-ink-3">{e.ref}</code>
                  <span className="flex-none text-ink-5">{stepTitle(e.step, locale)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-[12px] leading-[1.5] text-ink-4">{t("results.tracesHint")}</p>
          )}
        </div>
      ) : (
        // view === "evidence"
        <div className={`p-[16px] ${CARD}`}>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">{t("results.bundleFetched")}</div>
          {evidenceReceipt ? (
            <>
              <ReceiptOriginGrid r={evidenceReceipt} />
              <div className="mt-3 flex flex-wrap gap-[5px]">
                {(session.results.evidence.reason_codes ?? []).map((c, i) => (
                  <code key={`${c}-${i}`} className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[6px] py-[2px] font-mono text-[10.5px] text-ink-3">{c}</code>
                ))}
              </div>
              <button type="button" onClick={() => session.exportStep("evidence")} className="mt-3 rounded-[10px] border border-black/10 bg-white px-[13px] py-[8px] font-mono text-[12px] text-ink-4 transition-colors hover:border-bordo/30 hover:text-bordo">{t("results.exportReceipt")}</button>
            </>
          ) : (
            <p className="m-0 text-[13px] leading-[1.6] text-ink-3">{t("results.bundleHintFull")}</p>
          )}
          <div className="mt-3 rounded-[10px] border border-bordo/20 bg-tint-bordo px-[13px] py-[9px] font-mono text-[11px] leading-[1.5] text-pend">{t("results.evidenceNote")}</div>
        </div>
      )}

      <button type="button" onClick={() => onAsk(t("results.askBundle"))} className="mt-5 font-mono text-[11.5px] text-bordo transition-colors hover:underline">{t("results.askConcepts")}</button>
    </div>
  );
}
