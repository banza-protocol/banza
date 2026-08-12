// M2.19G.3 — onboarding is a SEQUENCE. The stepper's current phase is derived from the real backend
// state (auth → candidature → implementation → canonical origin → proof of control → validation
// readiness). This locks that derivation so the numbered header stays faithful to where the operator is.
import { describe, it, expect } from "vitest";
import { computeOnboardingPhase } from "@/components/banzai/BanzaiOnboardingMode";
import type { Candidate } from "@/lib/banzaiOnboardingClient";

const impl = (origin_verification_state: string): Candidate["implementations"][number] =>
  ({ origin_verification_state } as unknown as Candidate["implementations"][number]);
const cand = (implementations: Candidate["implementations"]): Candidate =>
  ({ implementations } as unknown as Candidate);

describe("computeOnboardingPhase — the 6-phase onboarding sequence", () => {
  it("phase 1 (Autenticação) before sign-in", () => {
    for (const s of ["loading", "paths", "email", "otp"] as const) {
      expect(computeOnboardingPhase(s as never, [])).toBe(1);
    }
  });
  it("phase 2 (Candidatura) once authenticated with no candidature", () => {
    expect(computeOnboardingPhase("authed" as never, [])).toBe(2);
  });
  it("phase 3 (Implementação) with a candidature but no implementation", () => {
    expect(computeOnboardingPhase("authed" as never, [cand([])])).toBe(3);
  });
  it("phase 4 (Origem canónica) once an implementation exists, before a challenge", () => {
    expect(computeOnboardingPhase("authed" as never, [cand([impl("ORIGIN_PENDING")])])).toBe(4);
  });
  it("phase 5 (Prova de controlo) once an origin challenge is issued", () => {
    expect(computeOnboardingPhase("authed" as never, [cand([impl("ORIGIN_CHALLENGE_ISSUED")])])).toBe(5);
  });
  it("phase 6 (Preparação para validação) once the origin is verified", () => {
    expect(computeOnboardingPhase("authed" as never, [cand([impl("ORIGIN_VERIFIED")])])).toBe(6);
  });
});
