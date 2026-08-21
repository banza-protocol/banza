"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";
import type { Locale } from "@/lib/i18n";

// Chromeless routes render no global BANZA footer:
//   - /banzai   — a dedicated full-height chat app (no editorial content below it);
//   - /oz       — the Operador Zero standalone surface (zero.banza.network), which carries its OWN
//                 footer, not the BANZA institutional one (ADR-035, M2.12G).
// Route-specific logic (usePathname), evaluated during SSR and on the client, so the footer is never
// in the DOM on these routes.
export function SiteFooterGate({ locale = "pt" }: { locale?: Locale }) {
  const pathname = usePathname();
  // Compared on the edition-independent path. Being chromeless is a property of the SURFACE, not of the
  // language it is read in: the English edition serves the same single-page app at /en/banzai, and a gate
  // written against the Portuguese spelling alone let the institutional footer through underneath it —
  // editorial chrome below an app that is meant to fill the viewport.
  const surface = pathname.startsWith("/en/") ? pathname.slice(3) : pathname === "/en" ? "/" : pathname;
  if (surface === "/banzai" || surface.startsWith("/banzai/")) return null;
  // Operador Zero standalone surface: gated by the internal /oz path (SSR, via the rewrite) and by the
  // subdomain host (client, where the browser path is "/"). Both yield null → hydration-safe.
  const onZeroSurface =
    pathname === "/oz" || pathname.startsWith("/oz/") ||
    (typeof window !== "undefined" && window.location.hostname === "zero.banza.network");
  if (onZeroSurface) return null;
  return <SiteFooter locale={locale} />;
}
