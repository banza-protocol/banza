// Operador Zero — realistic operator journey model (ADR-052, M2.14A). RUST_WRAPPER_ONLY.
//
// The marker is required because this file names the journey step keys — including `evidence_bundle`,
// an engine-vocabulary token the Rust-first guard scans for. It computes NO verdict: every per-step
// pass/fail it gates on is produced by the Rust engines (operator-zero-core / banzai-operator-journey);
// the step keys here only MIRROR that engine vocabulary so the UI can order and lock the steps.
//
// PURE presentation/routing data + gating rules for the step-by-step Operador Zero journey inside
// BanzAI. NO engine here (ADR-037): every verdict still comes from Rust/WASM (operator-zero-core via
// runOperadorZeroE2E, and the per-step protocol engines). This module only answers three questions a
// component would otherwise answer inline, so they can be unit-tested and guarded:
//
//   1. Which button/label does each step show?  (STEP_ACTION_LABELS, START_* )
//   2. Which files does each step expose?        (STEP_FILES)
//   3. Is a step unlocked yet?                    (stepUnlocked)
//
// The journey is DELIBERATELY incremental: starting a session establishes only the demo operator's
// identity — it awards NO step. Each step is run explicitly, and a later step never unlocks before the
// previous one passes. This is the M2.14A fix for "load everything in one click".
//
// Operador Zero is a technical simulator — never a bank, PSP, wallet, licensed financial operator or a
// real/production operator; it never moves real money and is never certified. A PASS is local demo
// evidence, not certification.

/** The six scored journey steps, in strict order. `guia` is a visit (weight 0), not a scored step. */
export const JOURNEY_CLONE_ORDER = [
  "manifest",
  "conformidade",
  "trust",
  "federacao",
  "evidence_bundle",
  "traces",
] as const;
export type JourneyCloneStep = (typeof JOURNEY_CLONE_ORDER)[number];

/** A scenario the visitor can run a step with. `valid` demonstrates the passing path; `negativo`
 *  demonstrates a real blocker of the Operador Zero itself (never a competing generic example). */
export type ZeroScenario = "valid" | "negativo";

/** The single official example inside BanzAI. There are no loose generic examples — only Operador
 *  Zero scenarios. This exact sentence is asserted by make operator-zero-realistic-journey-check. */
export const SINGLE_OFFICIAL_EXAMPLE =
  "O Operador Zero é o único exemplo oficial de operador demo no BanzAI.";

/** The button that STARTS the journey. It creates a demo session (identity only) and does NOT
 *  complete any step — the whole point of M2.14A. Never labelled "Carregar Operador Zero". */
export const START_BUTTON_LABEL = "Iniciar jornada com Operador Zero";
export const START_SESSION_LEAD =
  "Cria uma sessão demo com o Operador Zero e percorre a jornada etapa por etapa — como qualquer operador que implementa o protocolo. Nada fica concluído de uma só vez.";
export const SESSION_STARTED_LABEL =
  "Operador Zero iniciado nesta sessão. Complete a jornada etapa por etapa para gerar evidência demo.";

/** The identity the start button establishes — no verdicts, just who the demo operator is. */
export const ZERO_SESSION_IDENTITY = {
  operator_id: "operator-zero",
  operator_display_name: "Operador Zero",
  demo_only: true,
  monetary_value: false,
  production_allowed: false,
  currency: "KZ_DEMO",
  real_money: false,
  certification: false,
} as const;

/** Per-step primary action label (Part 5) + the negative-scenario label. Neither is a generic
 *  "Carregar Operador Zero" — each names the step's real action for the demo operator. */
export const STEP_ACTION_LABELS: Record<JourneyCloneStep, { valid: string; negativo: string }> = {
  manifest: { valid: "Carregar manifest do Operador Zero", negativo: "Operador Zero — manifest inválido" },
  conformidade: { valid: "Executar conformidade do Operador Zero", negativo: "Operador Zero — conformidade com falha" },
  trust: { valid: "Validar trust demo", negativo: "Operador Zero — chave revogada" },
  federacao: { valid: "Simular federação demo", negativo: "Operador Zero — versão incompatível" },
  evidence_bundle: { valid: "Gerar evidence bundle demo", negativo: "Operador Zero — bundle incompleto" },
  traces: { valid: "Gerar relatório da sessão", negativo: "Operador Zero — percurso negativo" },
};

/** A file exposed by a step. `route` is the public zero.banza.network segment when one exists (the
 *  file is then clickable); otherwise the file is a scenario/schema shown by name only. No secrets,
 *  no private keys, no .env — every listed file is a public demo artifact. */
export interface StepFile {
  name: string;
  /** zero.banza.network public route segment, e.g. ".well-known/banza/operator" → https://zero.banza.network/.well-known/banza/operator.json */
  route?: string;
}

/** Per-step files (Part 7). Each step exposes ONLY its own files. */
export const STEP_FILES: Record<JourneyCloneStep, StepFile[]> = {
  manifest: [
    { name: "operator-zero.manifest.valid.json", route: ".well-known/banza/operator" },
    { name: "operator-zero.manifest.invalid.json" },
    { name: "operator-manifest schema/contrato" },
  ],
  conformidade: [
    { name: "conformance-pass.json", route: "conformance/evidence" },
    { name: "conformance-warn.json" },
    { name: "conformance-fail.json" },
  ],
  trust: [
    { name: "demo-key-manifest.json", route: "key-manifest" },
    { name: "demo-operator-root.public.json" },
    { name: "revocation-list.demo.json", route: "revocation-list" },
    { name: "trust-pass.json" },
    { name: "trust-revoked.json" },
  ],
  federacao: [
    { name: "federation-manifest.demo.json", route: "federation/metadata" },
    { name: "federation-pass.json" },
    { name: "federation-incompatible.json" },
    { name: "peer-zero-alpha / peer-zero-beta (peers demo)" },
  ],
  evidence_bundle: [
    { name: "evidence-bundle.complete.json", route: "evidence-bundle" },
    { name: "evidence-bundle.partial.json" },
    { name: "evidence-bundle.invalid.json" },
  ],
  traces: [
    { name: "full-e2e-trace.json", route: "traces/full-e2e" },
    { name: "failed-e2e-trace.json" },
    { name: "operator-zero-session-summary.json" },
  ],
};

/** The public URL for a step file's route (read-only demo endpoint on the subdomain). */
export function zeroFileHref(file: StepFile): string | null {
  return file.route ? `https://zero.banza.network/${file.route}.json` : null;
}

/**
 * Is `step` unlocked yet? A step is gated on the PREVIOUS scored step passing — never on anything
 * later, and never open before the session starts. `passed(step)` reports whether that step has a
 * PASSING engine verdict (report OR the explicitly-run demo scenario). This is the rule the guard and
 * the tests both exercise; the component only supplies `sessionStarted` and `passed`.
 */
export function stepUnlocked(
  step: string,
  sessionStarted: boolean,
  passed: (s: JourneyCloneStep) => boolean,
): boolean {
  if (step === "guia") return true;
  if (!sessionStarted) return false;
  const idx = (JOURNEY_CLONE_ORDER as readonly string[]).indexOf(step);
  if (idx < 0) return sessionStarted; // non-scored journey surfaces are open once the session exists
  if (idx === 0) return true; // manifest — first scored step, open as soon as the session starts
  return passed(JOURNEY_CLONE_ORDER[idx - 1]);
}

/** How many scored steps have passed, for honest progress (starts at 0 — never 6/6 from one click). */
export function artifactsReady(passed: (s: JourneyCloneStep) => boolean): number {
  return JOURNEY_CLONE_ORDER.filter((s) => passed(s)).length;
}
