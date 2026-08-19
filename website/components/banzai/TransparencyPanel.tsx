"use client";

// Increment 9 (§24) — the per-answer INTERFACE TRANSPARENCY layer. Rendered INSIDE the existing
// contextual inspector (not a second competing panel): it surfaces, honestly, exactly what the engine
// computed for the LAST answer — how the question was understood, the resolved entity + scope, the tools
// that ran (with per-tool outcome + duration), the source-type/authority provenance, the freshness of a
// live-fetched artifact, the calculation method + sample size + period, the runtime truth (engine,
// version, model-called, confidence band, verification verdicts, validation status, total duration) and
// an honest limitations line. EVERY field renders ONLY when the engine actually produced it — an absent
// field is omitted, never shown as a placeholder. All values come from the /ask envelope (the Inc.8
// observability record + scope_resolution + reasoning_trace), already allowlisted + scrubbed server-side,
// so nothing here is a secret, PII, prompt or raw model output.

import type { KbTransparency } from "@/components/home/banzaiKb";
import { Ico, CARD } from "@/components/banzai/banzaiUi";
import { useBanzaiLocale } from "@/components/banzai/BanzaiWorkspaceProvider";
import { agentCopy, type AgentCopyId } from "@/components/banzai/agentPresentation";

function shortHash(h: string): string {
  return h.length > 20 ? `${h.slice(0, 12)}…${h.slice(-6)}` : h;
}

function fmtDuration(ms: number | null): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  return `${Math.round(ms)} ms`;
}

/**
 * The answer validator's verdict, normalized once from whatever the backend reported — with no locale in
 * scope. Block E2/Q5: the verdict is the claim this row makes about the answer, so it is resolved here
 * and the words, and the witness, both read that one value. An unrecognised status passes through
 * verbatim rather than being invented in either language.
 */
export type AnswerValidationVerdict = "rejected" | "passed" | "notApplicable" | null;

export function answerValidationVerdict(status: string): AnswerValidationVerdict {
  if (status === "rejected") return "rejected";
  if (status === "passed") return "passed";
  if (status === "n/a" || status === "n_a") return "notApplicable";
  return null;
}

/** The validation row's value. Reads its own edition; there is no call site to hand it another. */
export function AnswerValidationValue({ status }: { status: string }) {
  const locale = useBanzaiLocale();
  const verdict = answerValidationVerdict(status);
  return (
    <span data-answer-validation={verdict ?? status}>
      {verdict ? agentCopy(`tp.validation.${verdict}` as AgentCopyId, locale) : status}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <dt className="font-mono text-[9.5px] tracking-[0.12em] text-ink-5">{label}</dt>
      <dd className="m-0 break-words text-[12px] leading-[1.45] text-ink-2">{children}</dd>
    </div>
  );
}

export function TransparencyPanel({ t }: { t: KbTransparency }) {
  const locale = useBanzaiLocale();
  const tr = (id: AgentCopyId) => agentCopy(id, locale);
  // Which interpretation signals are present (any → render the block).
  const hasInterpretation =
    t.correctionDisplay.length > 0 || t.intent !== null || t.answerType !== null || t.questionFamily !== null || t.subIntents.length > 0;
  const hasFreshness = t.observedAt !== null || t.sha256 !== null || t.canonicalOrigin !== null;
  const hasVerification =
    (t.claimVerification && t.claimVerification.ok !== null) || (t.citationVerification && t.citationVerification.ok !== null);
  const totalDuration = fmtDuration(t.totalDurationMs);
  const hasRuntime =
    t.engine !== null || t.runtimeVersion !== null || t.modelCalled !== null || t.confidenceBand !== null || t.validationStatus !== null || totalDuration !== null;

  return (
    <section data-transparency="1" aria-label="Transparência da resposta">
      <div className="mb-[10px] flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-ink-5">
        <Ico name="sliders" size={13} className="text-bordo-soft" /> {tr("tp.heading")}
      </div>
      <div className={`flex flex-col gap-[12px] p-[14px] ${CARD}`}>
        {hasInterpretation && (
          <dl data-tp="interpretation" className="m-0 flex flex-col gap-[8px]">
            {t.correctionDisplay.length > 0 && (
              <Row label={tr("tp.row.interpretedAs")}>{t.correctionDisplay.map((c) => `«${c}»`).join(", ")}</Row>
            )}
            {t.intent && <Row label={tr("tp.row.intent")}>{t.intent}</Row>}
            {t.answerType && <Row label={tr("tp.row.answerType")}>{t.answerType}</Row>}
            {t.questionFamily && <Row label={tr("tp.row.family")}>{t.questionFamily}</Row>}
            {t.subIntents.length > 0 && <Row label={tr("tp.row.subIntents")}>{t.subIntents.join(", ")}</Row>}
          </dl>
        )}

        {t.entity && (
          <dl data-tp="entity" className="m-0 flex flex-col gap-[8px]">
            <Row label={tr("tp.row.entity")}>
              {t.entity.display || t.entity.id}
              {t.entity.type ? <span className="ml-[6px] font-mono text-[10.5px] text-ink-5">· {t.entity.type}</span> : null}
            </Row>
            {t.entity.implementationId && <Row label={tr("tp.row.implementation")}>{t.entity.implementationId}</Row>}
          </dl>
        )}

        {t.scope && (
          <dl data-tp="scope" className="m-0 grid grid-cols-2 gap-x-[12px] gap-y-[8px]">
            {t.scope.profile && <Row label={tr("tp.row.profile")}>{t.scope.profile}</Row>}
            {t.scope.environment && <Row label={tr("tp.row.environment")}>{t.scope.environment}</Row>}
            {t.scope.protocolVersion && <Row label={tr("tp.row.version")}>{t.scope.protocolVersion}</Row>}
            {t.scope.artifactType && <Row label={tr("tp.row.artifact")}>{t.scope.artifactType}</Row>}
            {t.scope.protocolScope && <Row label={tr("tp.row.scope")}>{t.scope.protocolScope}</Row>}
          </dl>
        )}

        {t.tools.length > 0 && (
          <div data-tp="tools" className="flex flex-col gap-[4px]">
            <div className="font-mono text-[9.5px] tracking-[0.12em] text-ink-5">FERRAMENTAS USADAS</div>
            <ul className="m-0 flex list-none flex-col gap-[4px] p-0">
              {t.tools.map((tool) => {
                const d = fmtDuration(tool.durationMs);
                return (
                  <li key={tool.kind} className="flex items-center justify-between gap-[8px] text-[11.5px] leading-[1.4] text-ink-2">
                    <span className="min-w-0 flex-1 truncate font-mono">{tool.kind}</span>
                    <span className="flex-none font-mono text-[10.5px] text-ink-4">
                      {tool.outcome || "—"}
                      {d ? ` · ${d}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {t.sourceCount > 0 && (
          <dl data-tp="sources" className="m-0 flex flex-col gap-[8px]">
            <Row label={tr("tp.row.sources")}>
              {t.sourceCount}
              {t.sourceTypes.length > 0 ? (
                <span className="ml-[6px] font-mono text-[10.5px] text-ink-5">
                  {t.sourceTypes.map((s) => `${s.label}×${s.count}`).join(" · ")}
                </span>
              ) : null}
            </Row>
            {t.authority && (t.authority.kind || t.authority.scope || t.authority.requirement) && (
              <Row label={tr("tp.row.authority")}>
                {[t.authority.kind, t.authority.scope, t.authority.requirement].filter(Boolean).join(" · ")}
              </Row>
            )}
          </dl>
        )}

        {hasFreshness && (
          <dl data-tp="freshness" className="m-0 flex flex-col gap-[8px]">
            {t.observedAt && <Row label={tr("tp.row.observedAt")}>{t.observedAt}</Row>}
            {t.canonicalOrigin && <Row label={tr("tp.row.canonicalOrigin")}>{t.canonicalOrigin}</Row>}
            {t.sha256 && (
              <Row label={tr("tp.row.sha256")}>
                <span className="font-mono text-[10.5px]">{shortHash(t.sha256)}</span>
              </Row>
            )}
          </dl>
        )}

        {t.calculation && (
          <dl data-tp="calculation" className="m-0 flex flex-col gap-[8px]">
            {t.calculation.method && <Row label={tr("tp.row.method")}>{t.calculation.method}</Row>}
            {t.calculation.sampleSize != null && <Row label={tr("tp.row.sample")}>{t.calculation.sampleSize}</Row>}
            {t.calculation.count != null && t.calculation.count > 0 && <Row label={tr("tp.row.claims")}>{t.calculation.count}</Row>}
            {t.calculation.period && <Row label={tr("tp.row.period")}>{t.calculation.period}</Row>}
          </dl>
        )}

        {hasRuntime && (
          <dl data-tp="runtime" className="m-0 grid grid-cols-2 gap-x-[12px] gap-y-[8px]">
            {t.engine && <Row label={tr("tp.row.engine")}>{t.engine}</Row>}
            {t.runtimeVersion && <Row label={tr("tp.row.engineVersion")}>{t.runtimeVersion}</Row>}
            {t.modelCalled !== null && <Row label={tr("tp.row.model")}>{t.modelCalled ? tr("tp.model.called") : tr("tp.model.notCalled")}</Row>}
            {t.confidenceBand && <Row label={tr("tp.row.confidence")}>{t.confidenceBand}</Row>}
            {t.validationStatus && <Row label={tr("tp.row.validation")}><AnswerValidationValue status={t.validationStatus} /></Row>}
            {totalDuration && <Row label={tr("tp.row.totalDuration")}>{totalDuration}</Row>}
          </dl>
        )}

        {hasVerification && (
          <dl data-tp="verification" className="m-0 flex flex-col gap-[8px]">
            {t.claimVerification && t.claimVerification.ok !== null && (
              <Row label={tr("tp.row.claimVerification")}>
                {t.claimVerification.ok ? "verificada" : `falhou (${t.claimVerification.errors})`}
              </Row>
            )}
            {t.citationVerification && t.citationVerification.ok !== null && (
              <Row label={tr("tp.row.citationVerification")}>
                {t.citationVerification.ok ? "verificada" : `falhou (${t.citationVerification.errors})`}
              </Row>
            )}
          </dl>
        )}

        {t.limitations.length > 0 && (
          <div data-tp="limitations" className="flex flex-col gap-[4px] border-t border-black/[0.06] pt-[10px]">
            <div className="flex items-center gap-[6px] font-mono text-[9.5px] tracking-[0.12em] text-pend">
              <Ico name="scale" size={12} className="text-pend" /> {tr("tp.limitations")}
            </div>
            <ul className="m-0 flex list-none flex-col gap-[4px] p-0">
              {t.limitations.map((l) => (
                <li key={l} className="flex items-start gap-[7px] text-[11.5px] leading-[1.45] text-ink-4">
                  <span className="mt-[6px] h-[4px] w-[4px] flex-none rounded-full bg-[#B98A3E]" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
