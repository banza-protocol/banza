// Canonical-JSON serialisation + SHA-256 for the durable validation receipt store (ADR-076 §D-076-08).
// A receipt's digest must be STABLE and reproducible: keys are emitted in sorted order at every level so
// the same logical receipt always hashes to the same value, and the digest is recomputed and re-verified
// on read. No free model text ever enters a receipt payload (enforced by the callers + a guard).

import { createHash } from "node:crypto";

// Deterministic canonical JSON: objects get their keys sorted recursively; arrays keep order; scalars as-is.
// Rejects non-finite numbers (they would serialise ambiguously) and functions/undefined inside objects.
export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(v) {
  if (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
    if (typeof v === "number" && !Number.isFinite(v)) {
      throw new Error("canonicalJson: non-finite number");
    }
    return v;
  }
  if (Array.isArray(v)) return v.map(canonicalize);
  if (typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      const cv = v[k];
      if (cv === undefined || typeof cv === "function") continue; // never seal undefined/functions
      out[k] = canonicalize(cv);
    }
    return out;
  }
  throw new Error(`canonicalJson: unsupported value type ${typeof v}`);
}

// 'sha256:<hex>' over the canonical JSON of `value`.
export function canonicalSha256(value) {
  return "sha256:" + createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

// Verify a stored receipt: recompute the canonical digest and constant-time-compare to the stored one.
export function verifyReceiptDigest(receipt, storedSha256) {
  const recomputed = canonicalSha256(receipt);
  return { ok: timingSafeEqualStr(recomputed, storedSha256), recomputed };
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
