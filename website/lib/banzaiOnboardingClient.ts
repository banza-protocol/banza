// Same-origin client for the BanzAI operator-onboarding backend (M2.19G.3, ADR-069).
//
// Mirrors lib/banzaiValidateClient.ts (POST JSON, AbortController timeout) but adds
// `credentials: "include"` so the __Host- session cookie set by /banzai/onboarding/otp/verify is sent
// on subsequent authenticated calls. Every security decision is made by the Rust backend; this file
// only shuttles JSON. It NEVER stores the OTP code or any token — the code goes to the operator's inbox
// and the session lives only in the HttpOnly cookie the browser holds.

const BASE = "/banzai/onboarding";
const TIMEOUT_MS = 15_000;

export type OtpRequestResult = { ok: boolean; challenge_id?: string; expires_at_ms?: number; digits?: number; error?: string; reason?: string; retry_after_ms?: number };
export type OtpVerifyResult = { ok: boolean; verdict?: string; email?: string; error?: string };
export type SessionResult = { authenticated: boolean; email?: string };
export type CandidateImpl = { candidate_implementation_id: string; implementation_name: string; canonical_domain: string; expected_protocol_version: string | null; expected_profile: string | null; expected_environment: string | null; origin_verification_state: string; validation_state: string };
export type Candidate = { candidate_id: string; operator_name: string; institutional_name: string | null; state: string; created_at?: string; last_activity_at?: string; published_operator_id: string | null; implementations: CandidateImpl[] };
export type OriginChallenge = { ok: boolean; challenge_id?: string; well_known_path?: string; publish_url?: string; challenge_document?: unknown; expires_at_ms?: number; reason?: string };
export type OriginVerifyResult = { ok: boolean; result?: string; reason_code?: string; receipt?: unknown; reason?: string };

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // send/receive the __Host- session cookie
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    return json as T;
  } catch {
    return { ok: false, error: "network_error" } as T;
  } finally {
    clearTimeout(timer);
  }
}

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" }, credentials: "include", signal: controller.signal });
    const json = await res.json().catch(() => ({}));
    return json as T;
  } catch {
    return {} as T;
  } finally {
    clearTimeout(timer);
  }
}

export const onboardingClient = {
  requestOtp: (email: string) => post<OtpRequestResult>("/otp/request", { email }),
  verifyOtp: (challenge_id: string, code: string) => post<OtpVerifyResult>("/otp/verify", { challenge_id, code }),
  session: () => get<SessionResult>("/session"),
  logout: () => post<{ ok: boolean }>("/logout", {}),
  listCandidates: () => get<{ candidates: Candidate[] }>("/candidates"),
  createCandidate: (operator_name: string, institutional_name: string) =>
    post<{ ok: boolean; candidate?: Candidate; error?: string }>("/candidate", { operator_name, institutional_name }),
  abandonCandidate: (candidate_id: string) => post<{ ok: boolean; state?: string; reason?: string }>("/candidate/abandon", { candidate_id }),
  createImplementation: (
    candidate_id: string,
    implementation_name: string,
    canonical_domain: string,
    profile: { expected_protocol_version: string; expected_profile: string; expected_environment: string },
  ) =>
    post<{ ok: boolean; implementation?: CandidateImpl; error?: string; reason?: string }>("/implementation", {
      candidate_id,
      implementation_name,
      canonical_domain,
      expected_protocol_version: profile.expected_protocol_version,
      expected_profile: profile.expected_profile,
      expected_environment: profile.expected_environment,
    }),
  issueOriginChallenge: (candidate_implementation_id: string) =>
    post<OriginChallenge>("/origin/challenge", { candidate_implementation_id }),
  verifyOrigin: (candidate_implementation_id: string) =>
    post<OriginVerifyResult>("/origin/verify", { candidate_implementation_id }),
};
