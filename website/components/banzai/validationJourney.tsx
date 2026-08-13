// BanzAI validation mode — the endpoint-originated 9-step operator-validation journey (M2.19G.1, ADR-038).
//
// This is the ONLY official validation journey in BanzAI. It is ENDPOINT-ORIGINATED: every evaluated
// artifact is obtained by the Rust backend from the selected implementation's PUBLIC endpoints
// (resolved through the closed Technical Registry). The browser sends only a closed operator_id +
// implementation_id to POST /banzai/validate/step and /banzai/validate/journey; the server fetches,
// the Rust engines decide, and the response is a receipt bound to its exact public origin.
//
// NO pasted content, uploaded file, drag-and-drop, user-entered URL, local fixture, bundled artifact,
// pre-computed result or manually chosen artifact EVER enters this path (ADR-038 §4.4/§4.5 — those live
// only in the developer draft tool). TypeScript decides NOTHING: it shuttles JSON and renders receipts.
// Qwen only explains. `qwen_calls`/`external_model_calls` are 0 by construction on every receipt.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  VALIDATION_STEP_IDS,
  resolveOperatorIn,
  resolveImplementationIn,
  isClosedId,
  type ValidationStepId,
  type ValidationWorkflow,
  type ValidationOperator,
  type ValidationImplementation,
} from "@/lib/banzaiValidation";
import { validateStepRequest, validateJourneyRequest, fetchRegistry, getExecution, type PersistenceInfo } from "@/lib/banzaiValidateClient";
import { downloadReceipt, type StepStatus, type ServerOperationReceipt, type ServerJourneyReceipt } from "@/lib/operationReceipt";

// ---------------------------------------------------------------------------------------------------
// Step catalogue (ADR-038 §21 — the canonical nine-step spine). Each step names the Rust engine that
// decides its verdict and describes what the backend fetches from the implementation's PUBLIC endpoints.
// ---------------------------------------------------------------------------------------------------

export type StepId = ValidationStepId;

export const STEP_ORDER: readonly StepId[] = VALIDATION_STEP_IDS;

export interface StepMeta {
  id: StepId;
  num: number;
  title: string;
  engine: string;
  blurb: string;
}

export const STEPS: StepMeta[] = [
  {
    id: "discovery",
    num: 1,
    title: "Discovery",
    engine: "banza-target-registry",
    blurb:
      "Resolve a implementação no registo técnico fechado e obtém o documento de discovery da sua origem canónica. O motor Rust decide se a superfície pública é reconhecível.",
  },
  {
    id: "manifest",
    num: 2,
    title: "Manifest",
    engine: "banza-operator-manifest",
    blurb:
      "Obtém o operator manifest publicado no endpoint declarado e valida campos obrigatórios, tipos, endpoints e a invariante de segurança. Estado VALID/INCOMPLETE/INVALID/MALFORMED calculado em Rust.",
  },
  {
    id: "keys",
    num: 3,
    title: "Keys",
    engine: "banza-trust",
    blurb:
      "Obtém a signed metadata, o key manifest e a lista de revogação publicados e avalia o material de chaves real: assinatura, chave delegada e revogação. O veredicto corre em Rust.",
  },
  {
    id: "conformance",
    num: 4,
    title: "Conformidade",
    engine: "banza-conformance",
    blurb:
      "Obtém e verifica a evidência de conformidade publicada pela implementação, incluindo as invariantes financeiras do protocolo. PASS/FAIL técnico calculado em Rust.",
  },
  {
    id: "interoperability",
    num: 5,
    title: "Interoperabilidade",
    engine: "banza-l2-readiness",
    blurb:
      "Obtém os artefactos de pagamento/refund, ledger e traces publicados e valida o fluxo, a idempotência, o double-entry e o settlement (L2 readiness). Estado calculado em Rust.",
  },
  {
    id: "trust",
    num: 6,
    title: "Confiança",
    engine: "banza-trust",
    blurb:
      "Avalia o trust do protocolo a partir da signed metadata publicada: chaves delegadas, manifest, evidência de conformidade, registo e revogação. O estado de trust corre em Rust.",
  },
  {
    id: "federation",
    num: 7,
    title: "Federação",
    engine: "banza-l3-readiness",
    blurb:
      "Obtém a metadata e o manifest de federação publicados e os traces cross-operator e prepara a interoperabilidade entre operadores (L3 readiness). Estado calculado em Rust.",
  },
  {
    id: "evidence",
    num: 8,
    title: "Evidence Bundle",
    engine: "banza-evidence-bundle",
    blurb:
      "Obtém o Evidence Bundle publicado pela implementação e valida artefactos obrigatórios/em falta e a integridade SHA-256. Tudo calculado em Rust a partir do bundle obtido.",
  },
  {
    id: "certification",
    num: 9,
    title: "Prontidão de certificação",
    engine: "banza-target-registry",
    blurb:
      "Agrega em Rust os veredictos das oito etapas técnicas numa Prontidão de Certificação (READY/BLOCKED). Não emite um Registo de Certificação e nunca devolve CERTIFIED (ADR-038 §4.10).",
  },
];

export const STEP_META: Record<StepId, StepMeta> = Object.fromEntries(STEPS.map((s) => [s.id, s])) as Record<
  StepId,
  StepMeta
>;

export function stepLabel(id: StepId): string {
  const m = STEP_META[id];
  return `${m.num} ${m.title}`;
}

// ---------------------------------------------------------------------------------------------------
// Per-step UI state + presentation helpers
// ---------------------------------------------------------------------------------------------------

export interface StepState {
  status: StepStatus;
  running: boolean;
  error: string | null;
  receipt: ServerOperationReceipt | null;
  reason_codes: string[];
  evidence_refs: string[];
}

const BLANK_STEP: StepState = {
  status: "NOT_EVALUATED",
  running: false,
  error: null,
  receipt: null,
  reason_codes: [],
  evidence_refs: [],
};

function blankResults(): Record<StepId, StepState> {
  return Object.fromEntries(STEP_ORDER.map((id) => [id, { ...BLANK_STEP }])) as Record<StepId, StepState>;
}

export const STATUS_LABEL_PT: Record<StepStatus, string> = {
  NOT_EVALUATED: "Não avaliado",
  PENDING: "Pendente",
  VERIFIED: "Verificado",
  FAILED: "Falhou",
  BLOCKED: "Bloqueado",
  // ADR-039: a step out of scope for the declared profile — never a failure.
  NOT_APPLICABLE: "Não aplicável",
};

export function statusClass(s: StepStatus): string {
  return `st-${s.toLowerCase()}`;
}

export function shortHash(h: string): string {
  if (!h) return "—";
  const [algo, hex] = h.split(":");
  if (!hex) return h;
  return `${algo}:${hex.slice(0, 12)}…`;
}

function stepStatusOf(receipt: ServerOperationReceipt): StepStatus {
  // ADR-039: a NOT_APPLICABLE step is sealed with result.status="NOT_EVALUATED" + applicability
  // "NOT_APPLICABLE". Surface it as the distinct NOT_APPLICABLE display status (out of scope, not a
  // failure and not an omission) so it never reads as an un-run or failed step.
  if (receipt.applicability === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  const s = receipt.result?.status;
  return (s ?? "NOT_EVALUATED") as StepStatus;
}

// ---------------------------------------------------------------------------------------------------
// Progress language (ADR-038 §28) — "steps evaluated" is distinct from the certification outcome.
// ---------------------------------------------------------------------------------------------------

interface ProgressCounts {
  total: number;
  evaluated: number;
  verified: number;
  failed: number;
  blocked: number;
  pending: number;
  notApplicable: number;
  current: StepId;
}

function progressPhrase(c: ProgressCounts, runningAll: boolean): string {
  if (runningAll) return "A executar a jornada…";
  if (c.evaluated === 0) return "Jornada por iniciar";
  if (c.evaluated < c.total) return `${c.evaluated}/${c.total} etapas avaliadas`;
  const parts: string[] = [];
  if (c.verified) parts.push(`${c.verified} ${c.verified === 1 ? "verificada" : "verificadas"}`);
  if (c.pending) parts.push(`${c.pending} ${c.pending === 1 ? "pendente" : "pendentes"}`);
  if (c.failed) parts.push(`${c.failed} ${c.failed === 1 ? "falhada" : "falhadas"}`);
  if (c.blocked) parts.push(`${c.blocked} ${c.blocked === 1 ? "bloqueada" : "bloqueadas"}`);
  if (c.failed === 0 && c.pending === 0 && c.blocked === 1) return "Jornada concluída com um bloqueio";
  if (c.failed === 0 && c.pending === 0 && c.blocked === 0) return "Jornada concluída · todas as etapas verificadas";
  return `Jornada concluída · ${parts.join(" · ")}`;
}

// ---------------------------------------------------------------------------------------------------
// useValidationSession — the single source of truth for validation mode (owned by the BanzAI shell).
// It owns the Fase 0 selection (operator + implementation, both from the closed registry) and drives the
// endpoint-originated journey by calling the Rust backend. There is no second store.
// ---------------------------------------------------------------------------------------------------

export interface ValidationBlocker {
  step: StepId;
  status: StepStatus;
  reason: string;
}

export interface ValidationEvidenceRef {
  step: StepId;
  ref: string;
}

export interface ValidationSession {
  // Fase 0 — target selection (closed registry, fetched at runtime from the Rust-sourced endpoint).
  operators: readonly ValidationOperator[];
  operatorsLoading: boolean;
  operatorsError: boolean;
  operator: ValidationOperator | null;
  implementation: ValidationImplementation | null;
  operatorId: string | null;
  implementationId: string | null;
  ready: boolean;
  selectOperator: (id: string) => void;
  selectImplementation: (id: string) => void;
  /** M2.19G.4 (ADR-042) — atomically seed operator + implementation from a route segment. Both are
   *  resolved against the fetched registry; an off-registry operator is ignored, an off-registry (or
   *  null) implementation lands on the operator context. Used by the route binder so operator↔
   *  implementation navigation re-seeds without the two-render race of selectOperator + selectImplementation. */
  selectTarget: (operatorId: string, implementationId: string | null) => void;
  // Journey.
  workflow: ValidationWorkflow;
  steps: StepMeta[];
  results: Record<StepId, StepState>;
  activeStep: StepId;
  setActiveStep: (id: StepId) => void;
  journeyReceipt: ServerJourneyReceipt | null;
  /** ADR-042 correction 1 — the honest durable-persistence verdict of the last full-journey run (null
   *  until one runs). The engine result stands regardless; this records whether it was archived so the UI
   *  never presents a non-persisted run as durable/consultable/comparable/reproducible. */
  persistence: PersistenceInfo | null;
  /** ADR-042 D-076-08 — re-check whether a not-yet-persisted run has since become durable. Reads the
   *  durable store (GET /banzai/validate/execution) and NEVER re-runs the engine; on confirmation it
   *  upgrades the persistence verdict to PERSISTED. */
  recheckPersistence: () => Promise<void>;
  recheckingPersistence: boolean;
  runningAll: boolean;
  overall: StepStatus;
  runOne: (id: StepId) => Promise<void>;
  runFrom: (id: StepId) => Promise<void>;
  runAll: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
  exportJourney: () => void;
  exportStep: (id: StepId) => void;
  progress: ProgressCounts;
  progressLabel: string;
  blockers: ValidationBlocker[];
  evidence: ValidationEvidenceRef[];
  receipts: ServerOperationReceipt[];
  certificationReadiness: "READY" | "BLOCKED" | null;
  certificationStatus: "NOT_CERTIFIED";
}

function initialActiveStep(workflow: ValidationWorkflow, initialStep: StepId | null): StepId {
  if (initialStep) return initialStep;
  if (workflow !== "full" && (STEP_ORDER as readonly string[]).includes(workflow)) return workflow as StepId;
  return "discovery";
}

export function useValidationSession(opts: {
  initialOperatorId: string | null;
  initialImplementationId: string | null;
  workflow: ValidationWorkflow;
  initialStep: StepId | null;
}): ValidationSession {
  const { workflow } = opts;
  // M2.19G.3B — the operator list is fetched at runtime from the CLOSED Technical Registry (Rust-sourced
  // GET /banzai/validate/registry). Seed the selection with the shape-checked deep-link ids; they are
  // re-resolved against the fetched list once it loads (a seed absent from the live registry → null).
  const [operators, setOperators] = useState<readonly ValidationOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(true);
  const [operatorsError, setOperatorsError] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(
    isClosedId(opts.initialOperatorId) ? opts.initialOperatorId : null,
  );
  const [implementationId, setImplementationId] = useState<string | null>(
    isClosedId(opts.initialOperatorId) && isClosedId(opts.initialImplementationId) ? opts.initialImplementationId : null,
  );
  const [results, setResults] = useState<Record<StepId, StepState>>(blankResults);
  const [journeyReceipt, setJourneyReceipt] = useState<ServerJourneyReceipt | null>(null);
  const [persistence, setPersistence] = useState<PersistenceInfo | null>(null);
  const [recheckingPersistence, setRecheckingPersistence] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>(initialActiveStep(workflow, opts.initialStep));

  // Cancellation token: bumped on cancel/reset/new selection so stale async completions are ignored,
  // plus an AbortController for the in-flight fetch (safe cancel — ADR-038 §24 running state).
  const runTokenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Load the closed registry once on mount. The list is the ONLY source of selectable operators — no
  // operator (not even Operador Zero) is hardcoded on the client. Failure → honest empty state.
  useEffect(() => {
    const ctrl = new AbortController();
    setOperatorsLoading(true);
    setOperatorsError(false);
    fetchRegistry(ctrl.signal)
      .then((list) => {
        setOperators(list);
        setOperatorsError(list.length === 0);
      })
      .catch(() => setOperatorsError(true))
      .finally(() => setOperatorsLoading(false));
    return () => ctrl.abort();
  }, []);

  const operator = useMemo(() => resolveOperatorIn(operators, operatorId), [operators, operatorId]);
  const implementation = useMemo(
    () => resolveImplementationIn(operators, operatorId, implementationId),
    [operators, operatorId, implementationId],
  );
  const ready = Boolean(operator && implementation);

  const abortInFlight = useCallback(() => {
    runTokenRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const clearRun = useCallback(() => {
    setResults(blankResults());
    setJourneyReceipt(null);
    setPersistence(null);
    setRunningAll(false);
  }, []);

  const selectOperator = useCallback(
    (id: string) => {
      if (!resolveOperatorIn(operators, id)) return;
      abortInFlight();
      setOperatorId(id);
      // Reset the implementation: it must be re-chosen for the new operator (ADR-038 §12).
      setImplementationId(null);
      setActiveStep("discovery");
      clearRun();
    },
    [operators, abortInFlight, clearRun],
  );

  const selectImplementation = useCallback(
    (id: string) => {
      if (!resolveImplementationIn(operators, operatorId, id)) return;
      abortInFlight();
      setImplementationId(id);
      setActiveStep(initialActiveStep(workflow, opts.initialStep));
      clearRun();
    },
    [operators, operatorId, workflow, opts.initialStep, abortInFlight, clearRun],
  );

  // M2.19G.4 (ADR-042) — atomic route-seed. Sets operator + implementation in ONE update so a deep link
  // or a context navigation resolves both without the selectOperator→(next render)→selectImplementation
  // race. Off-registry operator → ignored (stay put); off-registry/null implementation → operator
  // context (Fase 0 waits on the implementation choice). Never fetches a URL; ids come pre-shape-checked.
  const selectTarget = useCallback(
    (opId: string, implId: string | null) => {
      if (!resolveOperatorIn(operators, opId)) return;
      abortInFlight();
      const implOk = implId != null && Boolean(resolveImplementationIn(operators, opId, implId));
      setOperatorId(opId);
      setImplementationId(implOk ? (implId as string) : null);
      setActiveStep(implOk ? initialActiveStep(workflow, opts.initialStep) : "discovery");
      clearRun();
    },
    [operators, workflow, opts.initialStep, abortInFlight, clearRun],
  );

  // Run ONE endpoint-originated step via the Rust backend.
  const runOne = useCallback(
    async (id: StepId) => {
      if (!operatorId || !implementationId) return;
      const token = runTokenRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      setResults((prev) => ({ ...prev, [id]: { ...prev[id], running: true, error: null } }));
      const res = await validateStepRequest(operatorId, implementationId, id, controller.signal);
      if (token !== runTokenRef.current) return; // cancelled / superseded
      if (res.ok) {
        const r = res.receipt;
        setResults((prev) => ({
          ...prev,
          [id]: {
            status: stepStatusOf(r),
            running: false,
            error: null,
            receipt: r,
            reason_codes: r.reason_codes ?? [],
            evidence_refs: r.evidence_refs ?? [],
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            running: false,
            status: "BLOCKED",
            error: res.reason ? `${res.error}: ${res.reason}` : res.error,
            reason_codes: [res.error.toUpperCase()],
          },
        }));
      }
    },
    [operatorId, implementationId],
  );

  // Run every step from `id` to the end sequentially (single-step calls), so progress + cancel are
  // granular. Stops early if the run is cancelled/superseded.
  const runFrom = useCallback(
    async (id: StepId) => {
      if (!ready) return;
      const start = STEP_ORDER.indexOf(id);
      for (let i = Math.max(0, start); i < STEP_ORDER.length; i++) {
        const token = runTokenRef.current;
        setActiveStep(STEP_ORDER[i]);
        await runOne(STEP_ORDER[i]);
        if (token !== runTokenRef.current) return;
      }
    },
    [ready, runOne],
  );

  // Run the WHOLE journey in one backend call (§21 "Executar jornada completa").
  const runAll = useCallback(async () => {
    if (!operatorId || !implementationId) return;
    abortInFlight();
    const token = runTokenRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setResults(() => {
      const r = blankResults();
      for (const id of STEP_ORDER) r[id].running = true;
      return r;
    });
    setJourneyReceipt(null);
    setPersistence(null);
    setRunningAll(true);
    const res = await validateJourneyRequest(operatorId, implementationId, controller.signal);
    if (token !== runTokenRef.current) return; // cancelled
    if (res.ok) {
      const jr = res.journey_receipt;
      const next = blankResults();
      for (const receipt of jr.steps) {
        const sid = receipt.step as StepId;
        if (!(STEP_ORDER as readonly string[]).includes(sid)) continue;
        next[sid] = {
          status: stepStatusOf(receipt),
          running: false,
          error: null,
          receipt,
          reason_codes: receipt.reason_codes ?? [],
          evidence_refs: receipt.evidence_refs ?? [],
        };
      }
      setResults(next);
      setJourneyReceipt(jr);
      // Record the HONEST persistence verdict — the engine result stands even if the archive write did not.
      setPersistence(res.persistence);
    } else {
      setResults(() => {
        const r = blankResults();
        for (const id of STEP_ORDER) {
          r[id] = { ...BLANK_STEP, status: "BLOCKED", error: res.reason ? `${res.error}: ${res.reason}` : res.error, reason_codes: [res.error.toUpperCase()] };
        }
        return r;
      });
    }
    setRunningAll(false);
    abortRef.current = null;
  }, [operatorId, implementationId, abortInFlight]);

  const cancel = useCallback(() => {
    abortInFlight();
    setRunningAll(false);
    setResults((prev) => {
      const next = { ...prev };
      for (const id of STEP_ORDER) if (next[id].running) next[id] = { ...next[id], running: false };
      return next;
    });
  }, [abortInFlight]);

  const reset = useCallback(() => {
    abortInFlight();
    setResults(blankResults());
    setJourneyReceipt(null);
    setPersistence(null);
    setRunningAll(false);
    setActiveStep(initialActiveStep(workflow, opts.initialStep));
  }, [workflow, opts.initialStep, abortInFlight]);

  // ADR-042 D-076-08 — re-check durability of a run whose persistence was not confirmed. Reads the
  // append-only store by its server-issued execution id; NEVER re-runs the engine. If the store now
  // returns the execution, the run has become durable and the verdict is upgraded to PERSISTED.
  const recheckPersistence = useCallback(async () => {
    const execId = persistence?.execution_id;
    if (!execId || persistence?.status === "PERSISTED") return;
    setRecheckingPersistence(true);
    const res = await getExecution(execId);
    setRecheckingPersistence(false);
    if (res.ok) {
      setPersistence((p) =>
        p ? { ...p, status: "PERSISTED", durable: true, consultable: true, comparable: true, reproducible: true, detail: undefined, retryable: false } : p,
      );
    }
  }, [persistence]);

  const exportJourney = useCallback(() => {
    if (journeyReceipt) downloadReceipt(journeyReceipt, `journey-receipt-${journeyReceipt.journey_id}.json`);
  }, [journeyReceipt]);

  const exportStep = useCallback(
    (id: StepId) => {
      const r = results[id].receipt;
      if (r) downloadReceipt(r, `receipt-${id}-${r.operation_id}.json`);
    },
    [results],
  );

  const progress = useMemo<ProgressCounts>(() => {
    const statuses = STEP_ORDER.map((id) => results[id].status);
    return {
      total: STEP_ORDER.length,
      // ADR-039: NOT_APPLICABLE steps are out of scope — not counted as "evaluated", tracked separately.
      evaluated: statuses.filter((s) => s !== "NOT_EVALUATED" && s !== "NOT_APPLICABLE").length,
      verified: statuses.filter((s) => s === "VERIFIED").length,
      failed: statuses.filter((s) => s === "FAILED").length,
      blocked: statuses.filter((s) => s === "BLOCKED").length,
      pending: statuses.filter((s) => s === "PENDING").length,
      notApplicable: statuses.filter((s) => s === "NOT_APPLICABLE").length,
      current: activeStep,
    };
  }, [results, activeStep]);

  const overall = useMemo<StepStatus>(() => {
    if (journeyReceipt) return journeyReceipt.overall_status;
    const statuses = STEP_ORDER.filter((id) => id !== "certification").map((id) => results[id].status);
    if (statuses.some((s) => s === "FAILED")) return "FAILED";
    if (statuses.some((s) => s === "BLOCKED")) return "BLOCKED";
    if (statuses.some((s) => s === "PENDING")) return "PENDING";
    if (statuses.length > 0 && statuses.every((s) => s === "VERIFIED")) return "VERIFIED";
    return "NOT_EVALUATED";
  }, [journeyReceipt, results]);

  const progressLabel = useMemo(() => progressPhrase(progress, runningAll), [progress, runningAll]);

  const blockers = useMemo<ValidationBlocker[]>(
    () =>
      STEP_ORDER.filter((id) => results[id].status === "FAILED" || results[id].status === "BLOCKED").map((id) => ({
        step: id,
        status: results[id].status,
        reason: results[id].reason_codes[0] ?? results[id].error ?? "—",
      })),
    [results],
  );

  const evidence = useMemo<ValidationEvidenceRef[]>(() => {
    const items: ValidationEvidenceRef[] = [];
    for (const id of STEP_ORDER) {
      if (results[id].status === "NOT_EVALUATED") continue;
      for (const ref of results[id].evidence_refs) items.push({ step: id, ref });
    }
    return items;
  }, [results]);

  const receipts = useMemo<ServerOperationReceipt[]>(
    () => STEP_ORDER.map((id) => results[id].receipt).filter((r): r is ServerOperationReceipt => r != null),
    [results],
  );

  const certificationReadiness = useMemo<"READY" | "BLOCKED" | null>(() => {
    if (journeyReceipt) return journeyReceipt.certification_readiness;
    const cert = results.certification.receipt;
    const r = cert?.result as { certification?: { readiness?: "READY" | "BLOCKED" } } | undefined;
    return r?.certification?.readiness ?? null;
  }, [journeyReceipt, results]);

  return {
    operators,
    operatorsLoading,
    operatorsError,
    operator,
    implementation,
    operatorId,
    implementationId,
    ready,
    selectOperator,
    selectImplementation,
    selectTarget,
    workflow,
    steps: STEPS,
    results,
    activeStep,
    setActiveStep,
    journeyReceipt,
    persistence,
    recheckPersistence,
    recheckingPersistence,
    runningAll,
    overall,
    runOne,
    runFrom,
    runAll,
    cancel,
    reset,
    exportJourney,
    exportStep,
    progress,
    progressLabel,
    blockers,
    evidence,
    receipts,
    certificationReadiness,
    certificationStatus: "NOT_CERTIFIED",
  };
}
