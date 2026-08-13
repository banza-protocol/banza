// Host-aware routing for the Operador Zero dedicated subdomain (ADR-041, M2.12E/F/G).
//
// zero.banza.network is the SINGLE, dedicated public surface for the Operador Zero interactive lab.
// As of M2.12G the apex route /operador-zero is RETIRED (410 Gone) — the subdomain is the only place
// the lab and its demo JSON artifacts live. There is no duplication: the middleware maps the
// subdomain's clean root paths onto one internal route (/oz) and its handler, and BanzAI stays on the
// apex (banza.network/banzai); the subdomain only links to it.
//
// This is PURE logic (no Next imports) so it is unit-tested directly; middleware.ts is a thin wrapper.
// No storage, no database, no private keys — routing only.

export const ZERO_HOST = "zero.banza.network";

// Internal route that renders the standalone lab. It is NEVER a public URL: the public entry on the
// subdomain is `/`, and this segment is blocked (404) on the apex so the lab has one surface only.
export const ZERO_LAB_ROUTE = "/oz";

// The retired apex surface. Gone (410) on every host, never redirected — the subdomain is canonical.
export const RETIRED_APEX_ROUTE = "/operador-zero";

// The fourteen demo artifacts, at the subdomain root, mapped onto the internal /oz handler. Kept in
// sync with ARTIFACT_ROUTES by make zero-subdomain-routing-check (single source of truth).
export const ZERO_ENDPOINTS = [
  ".well-known/banza/operator",             // ADR-037: canonical discovery manifest (was /manifest.json)
  "key-manifest",
  "revocation-list",
  "conformance/evidence",
  "federation/metadata",
  "evidence-bundle",
  "traces/full-e2e",
  "ledger/demo",
  "payments/demo-qr",
  "payments/demo-refund",
  "discovery",
  "capabilities",
  ".well-known/banza/signed-protocol-metadata", // ADR-037: canonical signed metadata (was /signed-metadata.json)
  "federation-metadata",
] as const;

const ENDPOINT_SET = new Set(ZERO_ENDPOINTS.map((e) => `/${e}.json`));

export type ZeroRoute =
  | { type: "next" }
  | { type: "rewrite"; to: string }
  | { type: "redirect"; to: string }
  | { type: "gone"; format: "html" | "json" } // 410 — the retired apex surface
  | { type: "notfound" }; // 404 — the internal /oz name, never public at the apex

/** Normalise a Host header to a bare lowercase hostname (drop any :port). */
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

export function isZeroHost(host: string | null | undefined): boolean {
  return normalizeHost(host) === ZERO_HOST;
}

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Decide what a request to `host` for `pathname` (with `search`) should do.
 *
 *   - /operador-zero, /operador-zero/*  → 410 Gone (retired; every host; never redirected)
 *   - /oz, /oz/*                        → apex: 404 (internal name, never public); zero host: next
 *   - zero host /                       → rewrite to /oz (the standalone lab)
 *   - zero host /<endpoint>.json        → rewrite to /oz/<endpoint>.json (405 on write, 404 on unknown)
 *   - zero host /banzai*               → redirect to the apex (BanzAI lives on the apex)
 *   - everything else                   → next (apex is a strict pass-through)
 */
export function resolveZeroRoute(host: string | null | undefined, pathname: string, search = ""): ZeroRoute {
  // 1. The retired apex surface is gone on EVERY host — no redirect to the subdomain.
  if (isUnder(pathname, RETIRED_APEX_ROUTE)) {
    return { type: "gone", format: pathname.endsWith(".json") ? "json" : "html" };
  }

  const zero = isZeroHost(host);

  // 2. The internal lab route is never a public URL. Block it at the apex (one surface only); on the
  //    subdomain a direct hit is harmless (same content as `/`), so let it through.
  if (isUnder(pathname, ZERO_LAB_ROUTE)) {
    return zero ? { type: "next" } : { type: "notfound" };
  }

  if (!zero) return { type: "next" };

  // zero host — the standalone lab surface:
  if (pathname === "/" || pathname === "") return { type: "rewrite", to: ZERO_LAB_ROUTE };

  // Any *.json path is delegated to the internal [...artifact] handler, which returns the demo payload
  // (200), refuses writes (405) and 404s an unknown artifact — so unknown → 404 is preserved.
  if (pathname.endsWith(".json")) {
    return { type: "rewrite", to: `${ZERO_LAB_ROUTE}${pathname}` };
  }
  void ENDPOINT_SET; // the explicit list documents the contract the guard checks; matching is by suffix

  // BanzAI stays on the apex. Redirect there (absolute) so the subdomain never tries to host it.
  if (pathname === "/banzai" || pathname.startsWith("/banzai/") || pathname.startsWith("/banzai?")) {
    return { type: "redirect", to: `https://banza.network${pathname}${search}` };
  }

  return { type: "next" };
}
