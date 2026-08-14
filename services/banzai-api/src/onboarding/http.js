// HTTP helpers for onboarding (M2.19G.3, ADR-040): cookie parse/serialise, CSRF Origin check, and a
// bounded JSON body reader. Kept separate from server.js so the onboarding surface owns its own cookie
// and CSRF discipline. The session cookie is __Host- prefixed (Secure + Path=/ + no Domain),
// HttpOnly and SameSite=Strict — invisible to JS, sent only on same-site requests.

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// Serialise a Set-Cookie value. `secure` controls the Secure attribute (and the __Host- prefix is only
// valid with Secure + Path=/ + no Domain — the config enforces the name accordingly).
export function serializeCookie(name, value, { maxAgeMs, secure = true, sameSite = "Strict" } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=/`, `HttpOnly`, `SameSite=${sameSite}`];
  if (secure) parts.push("Secure");
  if (maxAgeMs != null) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  return parts.join("; ");
}

export function clearCookie(name, { secure = true, sameSite = "Strict" } = {}) {
  const parts = [`${name}=`, `Path=/`, `HttpOnly`, `SameSite=${sameSite}`, `Max-Age=0`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

// CSRF defence in depth: when the browser sends an Origin (it does for all fetch POSTs), require it to
// be allowlisted. Absent Origin is tolerated (some same-origin navigations omit it) because the
// SameSite=Strict cookie already blocks cross-site credentialed requests. Returns true if allowed.
export function originAllowed(req, allowedOrigins) {
  const origin = req.headers["origin"];
  if (!origin) return true; // rely on SameSite=Strict
  return allowedOrigins.includes(String(origin));
}

// Bounded JSON body reader. Rejects oversized payloads and malformed JSON.
export function readJsonBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      data += c;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

// A conservative email sanity check + normalisation (trim + lowercase). Not RFC-complete on purpose:
// it rejects the obviously invalid and caps length; Resend is the real deliverability check.
export function normalizeEmail(raw) {
  const e = String(raw || "").trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

// Safe free-text field: removes control chars, collapses whitespace, trims, caps length. Hyphens,
// letters and punctuation in operator/institutional names are preserved.
export function safeText(raw, max = 200) {
  let out = "";
  for (const ch of String(raw || "")) {
    const code = ch.codePointAt(0);
    out += code < 32 || code === 127 ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, max);
}

// A canonical domain (host only): lowercased, no scheme, no path, no port, valid label shape.
export function safeDomain(raw) {
  let d = String(raw || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d)) return null;
  return d.slice(0, 253);
}
