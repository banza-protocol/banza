// M2.13D — link-safety allowlist for BanzAI answer rendering. Pure (no React), so it is unit-tested
// directly. A link is safe only if it is an internal same-origin path, or an https link to a known
// BANZA host (and, for GitHub, only within the protocol's own repositories). Everything else —
// `javascript:`, `data:`, `mailto:`, http:, or an arbitrary external host — is refused (returns null),
// so the caller renders the text without a live link.
export function safeHref(raw: unknown): string | null {
  const h = String(raw ?? "").trim();
  if (!h) return null;
  if (h.startsWith("/") && !h.startsWith("//")) return h; // internal, same-origin
  let u: URL;
  try {
    u = new URL(h);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null; // no http:, javascript:, data:, mailto:
  const host = u.hostname.toLowerCase();
  const OK =
    host === "github.com" ||
    host === "banza.network" ||
    host === "zero.banza.network" ||
    host.endsWith(".banza.network");
  if (!OK) return null;
  if (host === "github.com" && !u.pathname.startsWith("/banza-protocol/")) return null;
  return u.toString();
}

// react-markdown urlTransform hook (defence-in-depth alongside the custom `a` renderer).
export function urlTransform(url: string): string {
  return safeHref(url) ?? "";
}
