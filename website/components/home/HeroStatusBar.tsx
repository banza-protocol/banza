"use client";

import { useEffect, useState } from "react";
import { PROTOCOL_VERSION, PROTOCOL_PHASE, REGISTRY_SUMMARY } from "@/lib/protocolStatus";
import { homeCopy } from "@/components/home/homePresentation";
import type { Locale } from "@/lib/i18n";

// M2.19G.2 (§13) — honest public status bar. Every value is sourced, none is decorative:
//   1. PROTOCOLO v1.0 · PRÉ-PRODUÇÃO      ← canonical protocol version (protocolStatus)
//   2. última verificação pública há X     ← elapsed since the REAL build/deploy verification timestamp
//                                            (protocolStatus.LAST_VERIFIED_AT), computed client-side from
//                                            a real base value — not a browser-seeded counter.
//   3. 0 certificações técnicas activas          ← Technical Registry (REGISTRY_SUMMARY)
// No node/member counts, no issued-certificate counters, no active-protocol banner, no
// reference-implementation counter (that lives in the registry section, not the status bar).

const F_MONO = "var(--font-mono), monospace";

function relTime(fromIso: string, now: number): string {
  const t = Date.parse(fromIso);
  if (!Number.isFinite(t) || t <= 0) return "—";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

const Dot = () => <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: "50%", background: "#C9BEAB", flex: "none" }} />;

export function HeroStatusBar({ lastVerifiedAt, locale }: { lastVerifiedAt: string; locale: Locale }) {
  const t = (id: Parameters<typeof homeCopy>[0]) => homeCopy(id, locale);
  // Base the elapsed label on the real timestamp. Before mount, render the base value so SSR and the first
  // client paint agree; after mount, refresh from Date.now() each minute (still a real elapsed time).
  const base = Date.parse(lastVerifiedAt) || 0;
  const [now, setNow] = useState<number>(base);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const activeCerts = REGISTRY_SUMMARY.activeCertifications;

  return (
    <div data-rise style={{ marginTop: "clamp(12px,1.4vw,18px)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px clamp(18px,2.4vw,34px)", paddingTop: "clamp(10px,1.2vw,16px)", borderTop: "1px solid rgba(184,152,96,0.28)", fontFamily: F_MONO, fontSize: 12, letterSpacing: "0.04em", color: "#7A7263" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "#B8985F", flex: "none" }} />{t("statusbar.protocol")} v{PROTOCOL_VERSION} · {PROTOCOL_PHASE}</span>
        <Dot />
        <span>{t("statusbar.lastVerified")} <span suppressHydrationWarning>{relTime(lastVerifiedAt, now)}</span>{t("statusbar.lastVerified.suffix")}</span>
        <Dot />
        <span>{activeCerts} {t("statusbar.activeCertifications")}</span>
      </div>
    </div>
  );
}
