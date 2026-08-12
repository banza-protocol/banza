# PHASE BX0 — BanzAI Workbench: Naming & Navigation Reframe

> **Status: COMPLETE.** `/banzai/chat` (the "Chat" demo) is reframed as the **BanzAI Workbench** — a
> serious, technical, operational interface with an 8-tab navigation, a canonical `/banzai/workbench`
> route, institutional status badges and authority-boundary copy. Naming/navigation/copy/structure
> only — no invented functionality; deeper tool execution stays clearly marked demo/fixture/skeleton.

**Date:** 2026-07-16 · **Repo:** `banza-protocol/banza` (website). banzai unchanged.
**Boundary (unchanged):** BanzAI runs/explains technical tools and prepares evidence; it does **not**
certify, approve or issue certificates, and does not alter `/operators` or `/certificates`.
**Pre-production:** mock provider, `llm_calls=0`, `external_model_called=false`, `/operators=[]`,
`production_certificates=false`.

---

## Part 1 — audit of the current UI (text → new text)

| Texto actual | Novo texto | Local | Alterar? |
|---|---|---|---|
| "Chat" (nav) | **Assistente** | sidebar nav / header | ✓ |
| "Assistente de Certificação" | **Conformidade** | nav / panel | ✓ |
| "Explorador RFC / ADR" | **RFC / ADR** | nav / panel | ✓ |
| "Explicador de Rastreabilidade" | **Traces** | nav / panel | ✓ |
| "Assistente de Programação" | **Programadores** | nav / panel | ✓ |
| "Pesquisa de Conhecimento" | (absorvido no **Assistente**) | nav | removido |
| "Grafo do Protocolo" | **Mapa do Protocolo** (secção dentro de RFC / ADR) | nav → RFC/ADR | movido |
| — | **Trust & BRL**, **SimB**, **Evidence Bundle** (novas abas) | nav | adicionado |
| "Sistema de Conhecimento do Protocolo" | **Ferramentas e conhecimento do protocolo** | sidebar subtitle | ✓ |
| "As ferramentas determinam a verdade. A IA explica a verdade." | **As ferramentas verificam. O BanzAI explica.** | sidebar footer / hero | ✓ |
| `pip install banza-conformance` | **`banza-conformance-rs` / `banza-trust` / `banza-simb`** | Programadores | ✓ (Rust-first) |
| page title "BanzAI Chat" | **BanzAI Workbench** | metadata (both routes) | ✓ |
| excess "Demo" badges | 4 institutional badges + per-tab `demo` chips only where honest | sidebar | ✓ |

## Part 2–8 — what shipped

- **Name & hero.** Sidebar header **"BanzAI Workbench"** + "Ferramentas e conhecimento do protocolo".
  Assistente empty-state hero = "BanzAI Workbench" + "Prepare, valide e compreenda operadores BANZA
  com ferramentas técnicas e referência citada." + the boundary line ("… a certificação continua a ser
  uma decisão da BANZA CA."). Short phrase **"As ferramentas verificam. O BanzAI explica."**
- **8-tab navigation:** Assistente · Conformidade · Trust & BRL · SimB · Evidence Bundle · RFC / ADR ·
  Traces · Programadores. Assistente is first and keeps the deterministic **Rust/WASM engine**
  (`banzai-evidence`), citations and limits; its input placeholder invites technical operations.
- **New tabs** (honestly marked): **Trust & BRL** (certificate / BRL / key-manifest / revocation — "…
  fixtures test-only"), **SimB** ("SimB não move fundos reais"), **Evidence Bundle** (expected content
  + schema; "Exportação em preparação … Não há download simulado"). Conformidade keeps L0–L4 with
  technical CTAs (Ver requisitos / Preparar / Correr demo) and "PASS técnico não é certificado."
- **Badges:** `Rust tools` · `Mock provider` · `No external calls` · `Pre-production` (sidebar + a
  STATUS card in the right panel), replacing the repeated "Demo" framing.
- **Right panel ("Fontes e contexto")** reacts to the tab: Assistente → citations; other tabs → an
  honest empty state ("Nenhum relatório técnico gerado ainda…") + a FRONTEIRA card + the status badges.
- **Authority copy present** (asserted by the unit test): "BanzAI não certifica, não aprova e não emite
  certificados.", "A certificação é uma decisão da BANZA CA.", "PASS é evidência técnica, não
  certificado.", pré-produção sem operadores/certificados de produção.

## Part 4 — routes

- **New canonical route `/banzai/workbench`** (200) renders `<BanzaiWorkbench/>`.
- **`/banzai/chat` still works** (200) — it renders the same Workbench (no redirect, so `?q=` deep
  links from `/decisoes` keep working). Its `canonical` points at `/banzai/workbench`.
- Internal links updated: top-nav BanzAI pill, `/banzai` landing CTA, footer ("Abrir o BanzAI
  Workbench"), `/decisoes` deep links, sitemap (adds `/banzai/workbench`).

## Part 10 — tests (added a harness)

The website had no test framework. Added **vitest** + `components/banzai/workbench.test.ts` (6 tests):
the 8-tab nav shape/order, institutional badges, required authority/boundary copy present, **forbidden
claims absent** (`A IA explica a verdade`, `Sistema de Conhecimento`, `IA certificadora`, `BanzAI
decide`, `pip install banza-conformance`, …), and **Rust-first dev commands** (no outdated pip). All
pass. Browser-verified: both routes render, the 8 tabs switch, the Assistente answers via WASM
("Um PASS… não é um certificado. O certificado é assinado pela BANZA CA") with citations, and the new
tabs show their honest demo/fixture notes.

## Part 12 — checks

`npm run test` (6/6) · `npm run type-check` (clean) · `npm run lint` (clean) · `npm run build`
(both `/banzai/workbench` and `/banzai/chat` build static). `make rust-rule-check` / `purity-check` /
`identity-check` / `invariant-check` / `reference-svg-check` unaffected (green). No engine changed;
`llm_calls=0`, mock provider, no external calls preserved.

## Scope note (honest)

BX0 is naming/navigation/copy/structure. The deeper **tool execution** (live conformance/trust/SimB/
trace in the browser, upload/operator-URL modes, real evidence-bundle export) is BX1 — each needs a
WASM engine port (only `banzai-evidence` is WASM today) and is clearly marked demo/fixture/em-preparação
here, not faked.

**Verdict:** `BANZA / BANZAI BX0 BanzAI Workbench Navigation COMPLETE`.
