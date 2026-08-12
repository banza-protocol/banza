# BanzAI — Session State & Safe Context

> The operator journey keeps state **only in the browser's memory**. It is never persisted, and only a
> sanitized summary ever reaches the backend.

- **Governing decision:** [ADR-049](../../decisions/adr/ADR-049-banzai-protocol-agent-core.md)
- **Milestones:** M2.9B (session) · M2.9C (uploaded artifacts)
- **Status:** implemented and deployed

> **BanzAI guia; os motores verificam; a evidência prova; a governança decide.**

---

## 1. In-memory only

The journey session (current step, per-tool reports, uploaded artifacts) lives in React state in
`website/components/banzai/BanzaiAgent.tsx`. It:

- persists as the operator moves between menus and steps;
- **disappears on reload** (and on **Limpar sessão**);
- uses **no** `localStorage`, `sessionStorage`, `IndexedDB` or cookies;
- is **never** written to the backend or PostgreSQL;
- never stores uploaded files on the server.

There is no server-side session store. This is enforced by
`make banzai-operator-journey-check` and `make banzai-upload-copy-check`.

## 2. Safe context to `/banzai/ask`

The browser sends only a **safe, Rust-built** summary alongside a question:

- `current_step` + per-step statuses + next recommended action + a slug-only `session_state_summary`
  (built by the journey engine's `safe_context`); and
- `uploaded_artifacts_summary` — **step + file name + size only**, never the raw file body.

The backend **re-derives** its own journey view server-side through the same Rust node WASM
(`services/banzai-api/src/journey.js` → `deriveJourney`) and **never trusts** the browser copy. Uploaded
summaries are sanitized (`sanitizeUploadedArtifacts`: known step, safe basename, bounded size, capped
list). No prompts, chain-of-thought, keys, secrets or raw payloads are ever forwarded.

## 3. What crosses the boundary

| Stays in the browser (memory) | Sent to `/ask` (safe summary) | Never sent |
|---|---|---|
| raw uploaded JSON, tool reports, drafts | current step, step statuses, next action, file name + size | raw file body, secrets, keys, prompts |

The result: the journey is useful and continuous within a session, but leaves no trace on reload and
never exposes sensitive material.
