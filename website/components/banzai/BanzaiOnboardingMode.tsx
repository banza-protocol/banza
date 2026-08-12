"use client";

// BanzAI operator onboarding — Phase 0 (M2.19G.3, ADR-069). A single in-shell mode with three paths
// (consult a published operator · submit a new operator · continue a candidature), passwordless
// email-OTP login, a private Candidate Registry (recovery), and .well-known origin proof. Every
// security decision is made by the Rust backend (banzai-onboarding) reached same-origin under
// /banzai/onboarding/*; this component only renders state and shuttles JSON. It never stores the OTP
// code or a session token — the code goes to the operator's inbox and the session lives in an HttpOnly
// cookie. A candidate is never a published operator, an active participant nor a certified entity.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ico, CARD } from "@/components/banzai/banzaiUi";
import { ONBOARDING_COPY as C } from "@/components/banzai/banzai-agent";
import type { WbMode } from "@/components/banzai/banzai-agent";
import { onboardingClient, type Candidate } from "@/lib/banzaiOnboardingClient";
import { fetchOptions, type ValidationOptions } from "@/lib/banzaiValidateClient";

type Step = "loading" | "paths" | "email" | "otp" | "authed";

// Human-readable PT labels for the backend state enums (M2.19G.3B — never show a raw enum code to the
// operator). Unknown values fall through verbatim (faithful, never invented).
const CANDIDATE_STATE_LABEL: Record<string, string> = {
  EMAIL_PENDING: "Email por confirmar",
  EMAIL_VERIFIED: "Email confirmado",
  DRAFT: "Rascunho",
  ORIGIN_PENDING: "Origem por verificar",
  ORIGIN_VERIFIED: "Origem verificada",
  VALIDATING: "Em validação",
  BLOCKED: "Bloqueada",
  VALIDATION_COMPLETED: "Validação concluída",
  PUBLICATION_ELIGIBLE: "Elegível para publicação",
  PUBLISHED: "Publicada no registo técnico",
  EXPIRED: "Expirada",
};
const ORIGIN_STATE_LABEL: Record<string, string> = {
  ORIGIN_PENDING: "Origem por verificar",
  ORIGIN_CHALLENGE_ISSUED: "Desafio de origem emitido",
  ORIGIN_VERIFIED: "Origem verificada",
  ORIGIN_FAILED: "Verificação de origem falhou",
};
const VALIDATION_STATE_LABEL: Record<string, string> = {
  NOT_STARTED: "Por iniciar",
  VALIDATING: "Em validação",
  VALIDATION_COMPLETED: "Validação concluída",
  BLOCKED: "Bloqueada",
};
function labelFor(map: Record<string, string>, v: string | null | undefined): string {
  const k = String(v || "");
  return map[k] || k;
}

// M2.19G.3 — the onboarding is a clear SEQUENCE, not one big form. These are the six ordered phases; the
// current phase is derived from the real backend state (auth → candidature → implementation → canonical
// origin → proof of control → validation readiness), so the header reads as a stepper, not a wall of forms.
const ONBOARDING_PHASES = [
  "Autenticação",
  "Candidatura",
  "Implementação",
  "Origem canónica",
  "Prova de controlo",
  "Preparação para validação",
] as const;

export function computeOnboardingPhase(step: Step, candidates: Candidate[]): number {
  if (step !== "authed") return 1;
  if (candidates.length === 0) return 2;
  const impls = candidates.flatMap((c) => c.implementations || []);
  if (impls.length === 0) return 3;
  if (impls.some((i) => i.origin_verification_state === "ORIGIN_VERIFIED")) return 6;
  if (impls.some((i) => i.origin_verification_state === "ORIGIN_CHALLENGE_ISSUED")) return 5;
  return 4;
}

function OnboardingStepper({ current }: { current: number }) {
  return (
    <ol aria-label="Sequência de onboarding do operador" className="mt-4 flex flex-wrap items-center gap-x-[8px] gap-y-[8px]">
      {ONBOARDING_PHASES.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "upcoming";
        return (
          <li key={label} aria-current={state === "active" ? "step" : undefined} className="flex items-center gap-[7px]">
            <span
              className={`flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
                state === "done"
                  ? "bg-[rgba(44,99,73,0.14)] text-[#2C6349]"
                  : state === "active"
                    ? "bg-bordo text-creme-high"
                    : "border border-black/15 bg-white text-ink-5"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={`text-[11.5px] ${state === "active" ? "font-semibold text-ink" : "text-ink-4"}`}>{label}</span>
            {n < ONBOARDING_PHASES.length && <span aria-hidden className="mx-[1px] hidden h-px w-[12px] bg-black/15 sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

const LABEL = "font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-5";
const INPUT =
  "w-full rounded-[9px] border border-black/[0.12] bg-white px-[13px] py-[10px] text-[14px] text-ink outline-none transition-colors focus:border-bordo/50 focus-visible:ring-2 focus-visible:ring-bordo/25";
const SELECT = INPUT + " appearance-none bg-[right_10px_center] pr-[30px]";
const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-[9px] bg-bordo px-[16px] py-[10px] text-[13.5px] font-semibold text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.22)] transition-colors hover:bg-bordo/90 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-[9px] border border-black/[0.12] bg-white px-[14px] py-[9px] text-[13px] font-medium text-ink-3 transition-colors hover:border-bordo/30 disabled:opacity-50";

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "ok" | "warn" }) {
  const map = {
    info: "border-bordo/20 bg-tint-bordo text-pend",
    ok: "border-[rgba(44,99,73,0.3)] bg-[rgba(44,99,73,0.08)] text-[#2C6349]",
    warn: "border-[rgba(190,148,64,0.35)] bg-[rgba(190,148,64,0.10)] text-[#8E6A28]",
  } as const;
  return <div className={`rounded-[10px] border px-[13px] py-[10px] text-[12.5px] leading-[1.55] ${map[tone]}`}>{children}</div>;
}

export function BanzaiOnboardingMode({ onSwitchMode }: { onSwitchMode?: (m: WbMode) => void }) {
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // On mount, resume an existing session (recovery without re-login).
  useEffect(() => {
    let alive = true;
    onboardingClient.session().then((s) => {
      if (!alive) return;
      if (s.authenticated && s.email) {
        setSessionEmail(s.email);
        setStep("authed");
      } else {
        setStep("paths");
      }
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (step === "authed") void refreshCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function refreshCandidates() {
    const r = await onboardingClient.listCandidates();
    setCandidates(Array.isArray(r.candidates) ? r.candidates : []);
  }

  async function sendCode() {
    setError(null); setInfo(null); setBusy(true);
    const r = await onboardingClient.requestOtp(email.trim());
    setBusy(false);
    if (r.ok && r.challenge_id) {
      setChallengeId(r.challenge_id);
      setStep("otp");
      setInfo("Código enviado. Verifique o seu email.");
    } else if (r.reason === "rate_limited" || r.reason === "reissue_too_soon") {
      setError("Demasiados pedidos. Aguarde um momento e tente novamente.");
    } else if (r.reason === "email_delivery_failed") {
      setError("Não foi possível enviar o email. Verifique o endereço e tente novamente.");
    } else {
      setError("Email inválido ou serviço indisponível. Tente novamente.");
    }
  }

  async function confirmCode() {
    setError(null); setInfo(null); setBusy(true);
    const r = await onboardingClient.verifyOtp(challengeId, code.trim());
    setBusy(false);
    if (r.ok && r.email) {
      setSessionEmail(r.email);
      setCode("");
      setStep("authed");
    } else if (r.verdict === "expired" || r.verdict === "already_used") {
      setError("Código expirado ou já usado. Peça um novo código.");
    } else if (r.verdict === "too_many_attempts") {
      setError("Demasiadas tentativas. Peça um novo código.");
    } else {
      setError("Código incorrecto. Verifique e tente novamente.");
    }
  }

  async function logout() {
    await onboardingClient.logout();
    setSessionEmail(null); setCandidates([]); setEmail(""); setChallengeId(""); setCode("");
    setStep("paths");
  }

  // ── header (shared) ──────────────────────────────────────────────────────────────────────────────
  const Header = (
    <>
      <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-5">
        <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-tint-bordo text-bordo"><Ico name="route" size={13} /></span>
        Fase 0 · onboarding
      </div>
      <h2 className="m-0 mt-2 font-serif text-[clamp(19px,2.2vw,24px)] font-semibold leading-[1.2] text-ink">{C.header}</h2>
      <p className="m-0 mt-3 max-w-[64ch] text-[13.5px] leading-[1.6] text-ink-3">{C.intro}</p>
      <p className="m-0 mt-2 max-w-[64ch] text-[12px] leading-[1.55] text-ink-4">{C.boundary}</p>
    </>
  );

  return (
    <div className="mx-auto max-w-[860px]">
      <div className={`p-[18px] ${CARD}`}>
        {Header}

        {/* The six ordered phases, driven by the real backend state — the onboarding is a sequence. */}
        <OnboardingStepper current={computeOnboardingPhase(step, candidates)} />

        {error && <div className="mt-4"><Notice tone="warn">{error}</Notice></div>}
        {info && !error && <div className="mt-4"><Notice tone="ok">{info}</Notice></div>}

        {step === "loading" && <p className="mt-6 text-[13px] text-ink-4">A carregar…</p>}

        {/* ── three paths ── */}
        {step === "paths" && (
          <div className="mt-5 grid gap-[10px] sm:grid-cols-3">
            <Link href="/registo-tecnico" className={`flex flex-col gap-[6px] rounded-[10px] border border-black/[0.08] bg-white p-[14px] no-underline transition-colors hover:border-bordo/30`}>
              <span className="text-[13.5px] font-semibold text-ink">{C.paths.published.title}</span>
              <span className="text-[12px] leading-[1.5] text-ink-4">{C.paths.published.desc}</span>
            </Link>
            <button type="button" onClick={() => { setError(null); setInfo(null); setStep("email"); }} className={`flex flex-col gap-[6px] rounded-[10px] border border-bordo/40 bg-tint-bordo p-[14px] text-left transition-colors hover:border-bordo/60`}>
              <span className="text-[13.5px] font-semibold text-ink">{C.paths.submit.title}</span>
              <span className="text-[12px] leading-[1.5] text-ink-4">{C.paths.submit.desc}</span>
            </button>
            <button type="button" onClick={() => { setError(null); setInfo(null); setStep("email"); }} className={`flex flex-col gap-[6px] rounded-[10px] border border-black/[0.08] bg-white p-[14px] text-left transition-colors hover:border-bordo/30`}>
              <span className="text-[13.5px] font-semibold text-ink">{C.paths.recover.title}</span>
              <span className="text-[12px] leading-[1.5] text-ink-4">{C.paths.recover.desc}</span>
            </button>
          </div>
        )}
        {step === "paths" && <p className="mt-4 text-[11.5px] leading-[1.5] text-ink-5">{C.scope}</p>}

        {/* ── email step ── */}
        {step === "email" && (
          <div className="mt-5 max-w-[440px]">
            <label className={LABEL} htmlFor="onb-email">{C.email.label}</label>
            <input id="onb-email" type="email" autoComplete="email" value={email} placeholder={C.email.placeholder}
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && email) sendCode(); }}
              className={`mt-2 ${INPUT}`} />
            <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-5">{C.email.hint}</p>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={sendCode} disabled={busy || !email.trim()} className={BTN_PRIMARY}>
                <Ico name="send" size={15} /> {C.email.cta}
              </button>
              <button type="button" onClick={() => setStep("paths")} className={BTN_GHOST}>Voltar</button>
            </div>
          </div>
        )}

        {/* ── otp step ── */}
        {step === "otp" && (
          <div className="mt-5 max-w-[440px]">
            <label className={LABEL} htmlFor="onb-code">{C.otp.label}</label>
            <input id="onb-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} placeholder={C.otp.placeholder}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) confirmCode(); }}
              className={`mt-2 font-mono tracking-[0.4em] ${INPUT}`} />
            <p className="mt-2 text-[11.5px] leading-[1.5] text-ink-5">{C.otp.hint}</p>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={confirmCode} disabled={busy || code.length !== 6} className={BTN_PRIMARY}>
                <Ico name="shield" size={15} /> {C.otp.cta}
              </button>
              <button type="button" onClick={sendCode} disabled={busy} className={BTN_GHOST}>{C.otp.resend}</button>
            </div>
          </div>
        )}

        {/* ── authenticated dashboard ── */}
        {step === "authed" && (
          <AuthedDashboard
            email={sessionEmail}
            candidates={candidates}
            onRefresh={refreshCandidates}
            onLogout={logout}
            onSwitchMode={onSwitchMode}
          />
        )}
      </div>
    </div>
  );
}

// ── authenticated dashboard: candidates, implementations, origin proof ────────────────────────────────
function AuthedDashboard({
  email, candidates, onRefresh, onLogout, onSwitchMode,
}: {
  email: string | null;
  candidates: Candidate[];
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onSwitchMode?: (m: WbMode) => void;
}) {
  const [opName, setOpName] = useState("");
  const [instName, setInstName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Canonical protocol option sets (versão/perfil/ambiente) from the Rust registry — fetched once and
  // shared by every implementation form. The backend re-validates against the same source (fail-closed).
  const [options, setOptions] = useState<ValidationOptions | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchOptions(ctrl.signal).then(setOptions).catch(() => setOptions(null));
    return () => ctrl.abort();
  }, []);

  async function createCandidate() {
    setErr(null); setCreating(true);
    const r = await onboardingClient.createCandidate(opName.trim(), instName.trim());
    setCreating(false);
    if (r.ok) { setOpName(""); setInstName(""); await onRefresh(); }
    else setErr("Não foi possível criar a candidatura.");
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-black/[0.08] bg-paper-2 px-[13px] py-[10px]">
        <span className="text-[12.5px] text-ink-3">Sessão iniciada como <strong className="text-ink">{email}</strong></span>
        <button type="button" onClick={onLogout} className={BTN_GHOST}>Terminar sessão</button>
      </div>
      <p className="mt-3 text-[11.5px] leading-[1.5] text-ink-5">{C.sessionNotice}</p>

      {/* Recovery: existing candidatures */}
      <div className="mt-5 flex items-center justify-between">
        <span className={LABEL}>As suas candidaturas</span>
        <button type="button" onClick={() => void onRefresh()} className="text-[12px] text-bordo hover:underline">Actualizar</button>
      </div>
      <div className="mt-2 flex flex-col gap-[10px]">
        {candidates.length === 0 && <Notice>Ainda não tem candidaturas. Crie uma abaixo.</Notice>}
        {candidates.map((c) => (
          <CandidateCard key={c.candidate_id} candidate={c} options={options} onRefresh={onRefresh} onSwitchMode={onSwitchMode} />
        ))}
      </div>

      {/* Submit a new operator (candidature) */}
      <div className="mt-6 rounded-[10px] border border-black/[0.08] bg-white p-[14px]">
        <span className={LABEL}>{C.paths.submit.title}</span>
        <div className="mt-2 grid gap-[8px] sm:grid-cols-2">
          <input value={opName} onChange={(e) => setOpName(e.target.value)} placeholder="Nome do operador" className={INPUT} />
          <input value={instName} onChange={(e) => setInstName(e.target.value)} placeholder="Nome institucional (opcional)" className={INPUT} />
        </div>
        {err && <div className="mt-2"><Notice tone="warn">{err}</Notice></div>}
        <div className="mt-3">
          <button type="button" onClick={createCandidate} disabled={creating || !opName.trim()} className={BTN_PRIMARY}>
            <Ico name="route" size={15} /> Criar candidatura
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-[1.5] text-ink-5">{C.scope}</p>
      </div>
    </div>
  );
}

function CandidateCard({
  candidate, options, onRefresh, onSwitchMode,
}: {
  candidate: Candidate;
  options: ValidationOptions | null;
  onRefresh: () => Promise<void>;
  onSwitchMode?: (m: WbMode) => void;
}) {
  const [implName, setImplName] = useState("");
  const [domain, setDomain] = useState("");
  const [protocolVersion, setProtocolVersion] = useState("");
  const [profile, setProfile] = useState("");
  const [environment, setEnvironment] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const complete = implName.trim() && domain.trim() && protocolVersion && profile && environment;

  async function addImpl() {
    if (!complete) return;
    setErr(null); setAdding(true);
    const r = await onboardingClient.createImplementation(candidate.candidate_id, implName.trim(), domain.trim(), {
      expected_protocol_version: protocolVersion,
      expected_profile: profile,
      expected_environment: environment,
    });
    setAdding(false);
    if (r.ok) { setImplName(""); setDomain(""); setProtocolVersion(""); setProfile(""); setEnvironment(""); await onRefresh(); }
    else if (r.error === "invalid_domain") setErr("Domínio inválido.");
    else if (r.error === "invalid_option") setErr("Versão/perfil/ambiente têm de ser um valor canónico suportado.");
    else setErr("Não foi possível adicionar a implementação.");
  }

  return (
    <div className="rounded-[10px] border border-black/[0.08] bg-white p-[14px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-ink">{candidate.operator_name}</span>
        <span className="rounded-[5px] border border-black/[0.07] bg-paper-2 px-[7px] py-[2px] text-[11px] font-medium text-ink-4">{labelFor(CANDIDATE_STATE_LABEL, candidate.state)}</span>
      </div>
      {candidate.institutional_name && <div className="mt-1 text-[12px] text-ink-4">{candidate.institutional_name}</div>}
      <p className="mt-1 text-[11px] leading-[1.5] text-ink-5">Um operador; cada implementação declara a sua própria versão, perfil e ambiente e prova a sua própria origem.</p>

      {candidate.implementations.length > 0 && (
        <div className="mt-3 flex flex-col gap-[8px]">
          {candidate.implementations.map((impl) => (
            <ImplementationRow key={impl.candidate_implementation_id} impl={impl} onRefresh={onRefresh} onSwitchMode={onSwitchMode} />
          ))}
        </div>
      )}

      {/* Add implementation — version/profile/environment come from the canonical Rust option sets. */}
      <div className="mt-3 grid gap-[8px] sm:grid-cols-2">
        <input value={implName} onChange={(e) => setImplName(e.target.value)} placeholder="Nome da implementação" aria-label="Nome da implementação" className={INPUT} />
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Domínio canónico (ex.: op.exemplo.ao)" aria-label="Domínio canónico" className={INPUT} />
      </div>
      <div className="mt-2 grid gap-[8px] sm:grid-cols-3">
        <select value={protocolVersion} onChange={(e) => setProtocolVersion(e.target.value)} aria-label="Versão do protocolo" className={SELECT}>
          <option value="">Versão do protocolo…</option>
          {(options?.supported_protocol_versions ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={profile} onChange={(e) => setProfile(e.target.value)} aria-label="Perfil" className={SELECT}>
          <option value="">Perfil…</option>
          {(options?.supported_profiles ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={environment} onChange={(e) => setEnvironment(e.target.value)} aria-label="Ambiente" className={SELECT}>
          <option value="">Ambiente…</option>
          {(options?.supported_environments ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {!options && <p className="mt-1 text-[11px] text-ink-5">A carregar as opções canónicas do protocolo…</p>}
      {err && <div className="mt-2"><Notice tone="warn">{err}</Notice></div>}
      <div className="mt-2">
        <button type="button" onClick={addImpl} disabled={adding || !complete} className={BTN_GHOST}>
          <Ico name="code" size={14} /> Adicionar implementação
        </button>
      </div>
    </div>
  );
}

function ImplementationRow({
  impl, onRefresh, onSwitchMode,
}: {
  impl: Candidate["implementations"][number];
  onRefresh: () => Promise<void>;
  onSwitchMode?: (m: WbMode) => void;
}) {
  const [challengeDoc, setChallengeDoc] = useState<string | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"info" | "ok" | "warn">("info");
  const verified = impl.origin_verification_state === "ORIGIN_VERIFIED";

  async function issue() {
    setBusy(true); setMsg(null);
    const r = await onboardingClient.issueOriginChallenge(impl.candidate_implementation_id);
    setBusy(false);
    if (r.ok && r.challenge_document) {
      setChallengeDoc(JSON.stringify(r.challenge_document, null, 2));
      setPublishUrl(r.publish_url || null);
      setMsg(C.origin.intro); setMsgTone("info");
    } else {
      setMsg("Não foi possível emitir o desafio de origem."); setMsgTone("warn");
    }
  }

  async function verify() {
    setBusy(true); setMsg(null);
    const r = await onboardingClient.verifyOrigin(impl.candidate_implementation_id);
    setBusy(false);
    if (r.ok && r.result === "verified") { setMsg(C.origin.verified); setMsgTone("ok"); await onRefresh(); }
    else if (r.result === "unreachable") { setMsg("Não foi possível obter o documento no domínio. Confirme que está publicado e acessível por HTTPS."); setMsgTone("warn"); }
    else { setMsg("A origem ainda não confere. Confirme o documento publicado e tente novamente."); setMsgTone("warn"); }
  }

  return (
    <div className="rounded-[9px] border border-black/[0.07] bg-paper-2 p-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink">{impl.implementation_name}</span>
        <span className={`rounded-[5px] px-[7px] py-[2px] text-[10.5px] font-medium ${verified ? "bg-[rgba(44,99,73,0.1)] text-[#2C6349]" : "bg-white text-ink-4 border border-black/[0.07]"}`}>{labelFor(ORIGIN_STATE_LABEL, impl.origin_verification_state)}</span>
      </div>
      <div className="mt-1 font-mono text-[11px] text-ink-4">{impl.canonical_domain}</div>
      {(impl.expected_protocol_version || impl.expected_profile || impl.expected_environment) && (
        <div className="mt-1 flex flex-wrap gap-[5px]">
          {impl.expected_protocol_version && <code className="rounded-[5px] border border-black/[0.07] bg-white px-[6px] py-[2px] font-mono text-[10px] text-ink-4">protocolo {impl.expected_protocol_version}</code>}
          {impl.expected_profile && <code className="rounded-[5px] border border-black/[0.07] bg-white px-[6px] py-[2px] font-mono text-[10px] text-ink-4">perfil {impl.expected_profile}</code>}
          {impl.expected_environment && <code className="rounded-[5px] border border-black/[0.07] bg-white px-[6px] py-[2px] font-mono text-[10px] text-ink-4">{impl.expected_environment}</code>}
          <span className="rounded-[5px] px-[6px] py-[2px] text-[10px] text-ink-5">{labelFor(VALIDATION_STATE_LABEL, impl.validation_state)}</span>
        </div>
      )}

      {!verified && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={issue} disabled={busy} className={BTN_GHOST}>Preparar prova de origem</button>
          {challengeDoc && <button type="button" onClick={verify} disabled={busy} className={BTN_PRIMARY}><Ico name="shield" size={14} /> {C.origin.verifyCta}</button>}
        </div>
      )}

      {msg && <div className="mt-2"><Notice tone={msgTone}>{msg}</Notice></div>}

      {challengeDoc && !verified && (
        <div className="mt-2">
          {publishUrl && <div className="mb-1 font-mono text-[11px] text-ink-4">Publicar em: <span className="text-ink-3">{publishUrl}</span></div>}
          <pre className="overflow-x-auto rounded-[8px] border border-black/[0.08] bg-white p-[10px] font-mono text-[11px] leading-[1.5] text-ink-3">{challengeDoc}</pre>
        </div>
      )}

      {verified && onSwitchMode && (
        <div className="mt-2">
          <button type="button" onClick={() => onSwitchMode("validation")} className={BTN_GHOST}>
            <Ico name="medal" size={14} /> Ir para Validar operador
          </button>
        </div>
      )}
    </div>
  );
}
