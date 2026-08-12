import { NextRequest, NextResponse } from "next/server";
import { resolveZeroRoute } from "@/lib/zeroSubdomain";

// Host-aware routing for zero.banza.network (ADR-052, M2.12E/F/G). Strict pass-through on the apex —
// the decision lives in the pure resolveZeroRoute() (unit-tested). On the dedicated subdomain it
// rewrites `/` and the demo JSON endpoints onto the internal /oz route (the standalone lab, no BANZA
// chrome) and sends /banzai to the apex. The retired apex surface /operador-zero is 410 Gone on every
// host (never redirected); the internal /oz name is 404 at the apex. No storage, no database, no
// secrets — routing only.
const GONE_HTML = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Descontinuado · Operador Zero</title>
<style>html{color-scheme:dark}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0b;color:#e6e6ea;font:15px/1.6 system-ui,-apple-system,sans-serif}main{max-width:34rem;padding:2rem;text-align:center}h1{font-size:1.15rem;margin:0 0 .6rem}p{color:#9a9aa0;margin:.4rem 0}a{color:#fff}</style>
</head><body><main><h1>Esta superfície foi descontinuada.</h1>
<p>O Operador Zero está disponível apenas em <a href="https://zero.banza.network/">https://zero.banza.network/</a>.</p>
</main></body></html>`;

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const { nextUrl } = req;
  const decision = resolveZeroRoute(host, nextUrl.pathname, nextUrl.search);

  switch (decision.type) {
    case "rewrite": {
      const url = nextUrl.clone();
      url.pathname = decision.to;
      return NextResponse.rewrite(url);
    }
    case "redirect":
      return NextResponse.redirect(decision.to, 307);
    case "gone":
      return decision.format === "json"
        ? NextResponse.json(
            {
              error: "gone",
              detail: "Esta superfície foi descontinuada. O Operador Zero está disponível apenas em https://zero.banza.network/.",
              moved_to: "https://zero.banza.network/",
            },
            { status: 410 },
          )
        : new NextResponse(GONE_HTML, { status: 410, headers: { "content-type": "text/html; charset=utf-8" } });
    case "notfound":
      return new NextResponse("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    default:
      return NextResponse.next();
  }
}

// Run on everything except Next internals and common static files. The apex path is an immediate
// pass-through inside middleware(); this matcher only bounds the overhead.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
