// BANZA verification-api — HTTP server.
//
// Serves the canonical machine routes as read-only JSON. No framework: the Node
// http module keeps the dependency surface tiny (only `pg`). All public routes are
// GET-only; any write verb is refused. Machine routes never return HTML.

import http from "node:http";
import * as routes from "./routes.js";

const PORT = Number(process.env.PORT || 8090);

// Exact-path GET routing table.
const TABLE = {
  "/health": routes.health,
  "/.well-known/banza/root.json": routes.rootManifest,
  "/.well-known/banza/key-manifest.json": routes.keyManifest,
  "/operators": routes.operators,
  "/federation/revocation-list.json": routes.revocationList,
  "/conformance/evidence": routes.conformanceEvidence,
};

function sendJson(res, code, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/"; // tolerate trailing slash

  // Public routes are strictly read-only. Reject writes with JSON (never HTML).
  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "method_not_allowed", allow: "GET", path });
  }

  const handler = TABLE[path];
  if (!handler) {
    return sendJson(res, 404, {
      error: "not_found",
      path,
      hint: "Canonical machine routes: /health, /.well-known/banza/root.json, /.well-known/banza/key-manifest.json, /operators, /federation/revocation-list.json, /conformance/evidence",
    });
  }

  try {
    const { code, body } = await handler();
    return sendJson(res, code, body);
  } catch (err) {
    // Last-resort safety net: still JSON, never a stack trace to the client.
    console.error(JSON.stringify({ level: "error", path, error: err.message }));
    return sendJson(res, 500, { error: "internal_error", path });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "info", msg: "verification-api listening", port: PORT, phase: process.env.PROTOCOL_PHASE || "pre-production" }));
});

// Graceful shutdown so the container stops cleanly.
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
