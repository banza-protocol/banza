// Email delivery for onboarding OTPs (M2.19G.3, ADR-040). SECRET_STAYS_IN_HEADER.
//
// One narrow capability: deliver a numeric access code to a person's inbox. Two implementations behind
// one interface:
//   * MockEmailDeliveryProvider — offline default; sends nothing, captures messages in memory so
//     tests (and only tests) can read the code. Never logs the code.
//   * ResendEmailDeliveryProvider — production; POSTs to api.resend.com over node:https with the
//     RESEND_API_KEY in the Authorization header ONLY. The key is never logged, never returned, never
//     placed in the body/subject/URL. No SMTP, no webhooks, no open/click tracking.
//
// The verified sending domain is auth.banza.network; the sender is "BanzAI <acesso@auth.banza.network>"
// with Reply-To contact@banza.network (both configurable, non-secret).

import https from "node:https";

// The email body. Deliberately minimal: the code, its validity, and a "you can ignore this" line. No
// links to click (passwordless by code, not magic-link), no tracking pixels, no marketing.
function renderOtpEmail({ code, minutes }) {
  const subject = `O seu código de acesso BanzAI: ${code}`;
  const text = [
    `O seu código de acesso ao BanzAI é: ${code}`,
    ``,
    `Introduza este código na página de onboarding para continuar. O código é válido por ${minutes} minutos e só pode ser usado uma vez.`,
    ``,
    `Se não pediu este código, ignore este email — nenhuma ação é necessária.`,
    ``,
    `— BanzAI · banza.network`,
  ].join("\n");
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#1A1512;line-height:1.6">` +
    `<p>O seu código de acesso ao BanzAI é:</p>` +
    `<p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${esc(code)}</p>` +
    `<p>Introduza este código na página de onboarding para continuar. É válido por ${esc(minutes)} minutos e só pode ser usado uma vez.</p>` +
    `<p style="color:#6b6b6b">Se não pediu este código, ignore este email — nenhuma ação é necessária.</p>` +
    `<p style="color:#8B1428">— BanzAI · banza.network</p>` +
    `</div>`;
  return { subject, text, html };
}

// ── Mock (offline default) ────────────────────────────────────────────────────────────────────────
export class MockEmailDeliveryProvider {
  constructor() {
    this.name = "mock";
    this.sent = []; // in-memory, test-only; holds {to, code} so a test can complete the flow
  }
  async send({ to, code, minutes }) {
    // Capture for tests; log delivery WITHOUT the code (never a plaintext OTP in logs).
    this.sent.push({ to, code, at: Date.now() });
    console.log(JSON.stringify({ level: "info", msg: "onboarding otp email (mock)", to_domain: String(to).split("@")[1] || "", provider: "mock" }));
    return { ok: true, messageId: `mock-${this.sent.length}` };
  }
}

// ── Resend (production) ─────────────────────────────────────────────────────────────────────────────
export class ResendEmailDeliveryProvider {
  constructor({ apiKey, from, replyTo }) {
    this.name = "resend";
    this._apiKey = apiKey; // held only for the Authorization header; never logged/returned
    this.from = from;
    this.replyTo = replyTo;
  }
  async send({ to, code, minutes }) {
    if (!this._apiKey) return { ok: false, error: "resend_key_missing" };
    const { subject, text, html } = renderOtpEmail({ code, minutes });
    const payload = JSON.stringify({
      from: this.from,
      to: [to],
      subject,
      text,
      html,
      reply_to: this.replyTo,
    });
    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: "api.resend.com",
          port: 443,
          path: "/emails",
          method: "POST",
          headers: {
            // The ONLY place the key appears. Never logged.
            Authorization: `Bearer ${this._apiKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
          timeout: 10_000,
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              let id = null;
              try {
                id = JSON.parse(body).id || null;
              } catch {
                /* body may be empty on success */
              }
              resolve({ ok: true, messageId: id });
            } else {
              // Log status only — never the key, never the code.
              console.error(JSON.stringify({ level: "error", msg: "resend send failed", status: res.statusCode }));
              resolve({ ok: false, error: `resend_http_${res.statusCode}` });
            }
          });
        }
      );
      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "resend_timeout" });
      });
      req.on("error", (err) => {
        console.error(JSON.stringify({ level: "error", msg: "resend request error", error: err.message }));
        resolve({ ok: false, error: "resend_request_error" });
      });
      req.write(payload);
      req.end();
    });
  }
}

// Factory: pick the provider from config. Falls back to mock if resend is selected without a key
// (fail safe: the service treats a failed send as a soft error and never leaks that the key is absent).
export function createEmailProvider(cfg) {
  if (cfg.email.provider === "resend") {
    return new ResendEmailDeliveryProvider({
      apiKey: cfg.email.resendApiKey,
      from: cfg.email.from,
      replyTo: cfg.email.replyTo,
    });
  }
  return new MockEmailDeliveryProvider();
}
