# Operador Zero / Workbench — Security (M2.19E/F)

- **Deep-link safety:** `banzaiValidation.ts` — closed target registry (`operator-zero` only) + closed
  workflow allowlist; no caller-supplied URL is ever fetched → SSRF / path-traversal / injection impossible
  by construction (unit-tested, 6 cases).
- **Read-only surfaces:** machine endpoints GET-only (write→405, unknown→404 JSON); no writes, no PII,
  no secrets; in-memory only (no localStorage/sessionStorage/IndexedDB/cookies).
- **Authority boundary:** Rust decides every verdict; `qwen_calls:0`/`external_calls:0` fixed in every
  receipt by construction; no CERTIFIED status is fabricated.
- **Cross-host:** the Zero apex is a rewrite (200), never a permanent redirect (guard-enforced).
