import { NextResponse } from "next/server";
import { ARTIFACT_ROUTES, artifactForRoute, readArtifact } from "@/lib/operadorZero";

// The canonical Operador Zero demo JSON artifacts. Served at the subdomain root
// (zero.banza.network/<artifact>.json) via the host-aware middleware, which rewrites onto this
// internal /oz handler. There is no apex surface any more (ADR-052, M2.12G: /operador-zero is 410).
//
// Static: every payload is a bundled constant (operadorZeroArtifacts.generated.ts, vendored from the
// canonical tree). No runtime filesystem access — the website image is built from website/ alone, so
// examples/operators/zero/ is not present at runtime and a disk read would 500. No database, no
// per-visitor state, nothing to leak between users.
export const dynamic = "force-static";
export const dynamicParams = false;

// The public URLs end in `.json` — they are artifacts, and a reader pasting one into a terminal
// should get JSON without having to know Next's routing. The suffix lives in the route segment, and
// is stripped before the lookup.
export function generateStaticParams() {
  return ARTIFACT_ROUTES.map((a) => ({ artifact: `${a.route}.json`.split("/") }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ artifact: string[] }> }) {
  const { artifact } = await ctx.params;
  const entry = artifactForRoute(artifact.join("/").replace(/\.json$/, ""));
  if (!entry) {
    return NextResponse.json(
      { error: "not_found", operator_id: "operator-zero", demo_only: true },
      { status: 404 },
    );
  }
  return NextResponse.json(readArtifact(entry.route), {
    headers: { "cache-control": "public, max-age=300" },
  });
}

// The simulator accepts no writes. There is no state to persist and no per-visitor storage; an
// endpoint that looked writable would look like an operator API, which is exactly the impression the
// whole demo boundary exists to prevent.
const REFUSED = () =>
  NextResponse.json(
    {
      error: "method_not_allowed",
      detail: "O Operador Zero serve apenas artefactos demonstrativos em leitura.",
      operator_id: "operator-zero",
      operator_display_name: "Operador Zero",
      demo_only: true,
      monetary_value: false,
      production_allowed: false,
    },
    { status: 405, headers: { allow: "GET" } },
  );

export const POST = REFUSED;
export const PUT = REFUSED;
export const PATCH = REFUSED;
export const DELETE = REFUSED;
