# Phase 7W — Final Website and GitHub Public-Surface Hardening + M2 Readiness Gate (2026-07)

**Base:** `main` `57fd980` · **Branch:** `fix/phase-7w-final-website-public-surface-hardening-2026-07`
**Status:** public-surface hardening + M2 readiness gate. **No** protocol version, contract,
conformance-vector, OpenAPI, schema, service, runtime, VM-runtime or secrets change.

## Objective

Close the final public surface of BANZA before M2 planning. Make the public website, the reference
routes, the GitHub README/metadata, the VM-deployed website, the machine routes and the headers 100%
coherent with an honest pre-production posture. **This phase does not activate M2, create an operator
or certificate, change the protocol v1.0, or change VERSION or the financial runtime.**

## Initial audit

A live audit (`curl` of the rendered HTML per route, via the VM) scoped the work: the homepage,
`/estado`, `/banzai` and the machine routes were already strong, but `/certificacao`, `/programadores`,
`/confianca`, `/operadores`, `/federacao` and the reference routes (`/referencia`, `/referencia/completa`,
`/referencia/confianca`) still carried absolute or operational public phrasing.

## Methodology

A parallel read-only mapping workflow (one agent per page source) produced verbatim classified
find/replace maps; the maps were a **cross-check only**. Direct grep-in-context found additional
residues the agents missed (certificacao L101/L141 absolute "não por acordos bilaterais / não por
volumes mínimos"; the confianca "sem acordos prévios" tail; and — importantly — the **reference body**,
which renders on `/referencia/*` and carried the same operational residues). Every edit was reviewed
and applied byte-exact. A built-HTML sweep (`.next/server/app`) confirmed the render, not just the
source. (Per the 7S/7T lesson, the sweep tooling was validated with self-tests before trusting a "0".)

## Corrections by page

- **/certificacao** — de-absoluted the lede ("critérios técnicos … ao nível técnico … não substituem
  obrigações legais/regulatórias/bancárias/KYC-KYB/AML-CFT"); "conformidade técnica e determinística,
  não por avaliação discricionária; a certificação de produção é um passo separado de governação"; the
  open-access paragraph → candidate-entity submits evidence when M2/M3 open, with the full legal caveat.
- **/programadores** — `/wallets`, `/wallets/{id}`, `/payments` relabelled "Superfície de contrato …
  exposta pelo operador; o BANZA não opera wallets / não detém saldos / não processa pagamentos nem
  executa liquidação"; "Executar pagamento com liquidação T+0" → "modelar fluxo … finalidade T+0 como
  invariante protocolar"; the OpenAPI contract list annotated "superfícies de contrato … não serviços
  operados pelo BANZA" (`reference-operator` kept as a real filename, contextualised).
- **/confianca** — "em milissegundos" → "verificações criptográficas determinísticas definidas pelo
  protocolo … sem acordos bilaterais prévios"; "o pagamento avança com todas as garantias financeiras
  do protocolo" and "processem pagamentos com garantias financeiras completas" → "a implementação
  candidata pode prosseguir … O BANZA não movimenta fundos, não detém saldos nem executa liquidação" /
  "verifiquem mutuamente a identidade … a execução e a finalização … dependem da conformidade e das
  obrigações legais/regulatórias/bancárias/AML-CFT"; "Em produção, cada operador certificado recebe …"
  → "Quando a certificação de produção estiver aberta (M2/M3), cada operador certificado receberá …".
- **/operadores** — metadata + lede → "Uma entidade candidata … submeter evidência de conformidade
  técnica. A eventual certificação e participação em federação dependem do processo de governação/
  certificação aplicável e não eliminam requisitos legais/regulatórios/bancários/KYC-KYB/AML-CFT";
  "A liquidação T+0 significa que o dinheiro se move …" → "A finalidade T+0, como invariante protocolar,
  … a execução é responsabilidade do operador, não do BANZA"; federation benefit → future/M2-M3 conditional.
- **/federacao** — investor line "A federação transforma o BANZA … numa rede de pagamentos unificada" →
  "Quando operadores certificados entrarem em produção (M2/M3), a federação transformará … O BANZA não
  movimenta fundos, não detém saldos nem executa liquidação"; "A federação está pronta …" (×2) → "A
  especificação de federação está pronta … (M2/M3)" / "… a federação de produção não está activa …".
- **/referencia + /referencia/completa + /referencia/confianca** — the reference body
  (`website/content/BANZA_REFERENCIA.md`, mirrored to `docs/reference/pt/completa.md`) carried the same
  residues: L13 "qualquer entidade qualificada pode implementar para processar pagamentos digitais …
  sem acordos bilaterais" → "implementações candidatas podem usar … para preparar interoperabilidade e
  evidência de conformidade … A eventual participação em produção depende do processo de governação/
  certificação aplicável e de obrigações legais/regulatórias/bancárias/KYC-KYB/AML-CFT"; trust narrative
  "em milissegundos" (×2) → determinístico/offline; "o pagamento pode avançar com todas as garantias
  financeiras do protocolo" and "processem pagamentos com garantias financeiras completas" → candidate-
  may-proceed + "BANZA não movimenta/detém/liquida"; endpoint table "/payments · Executar pagamento com
  liquidação T+0" → "Superfície de contrato … finalidade T+0 como invariante; operador, não BANZA".
  Applied byte-identically to the PT canonical (parity preserved: differs only by 2 pre-existing
  depth-corrected links).

## GitHub README raw/rendered/cache check

`gh api contents README.md?ref=main` == local; all old-copy residues absent
("Products are built by independent certified operators", "Any entity that implements the contracts",
"Certification is issued by BANZA CA", "certification test vectors", "qualquer entidade poderá entrar"
= 0); new prudent phrasing present. **README is correct on main — no change.** A stale rendered README
would be a browser/CDN cache, not a repo issue (git/API/raw authoritative).

## Sweeps

- **Source sweep (5 pages + reference):** 0 residual NEEDS_FIX after edits.
- **Built-HTML sweep (`.next/server/app`):** 0 of "em milissegundos", "garantias financeiras do
  protocolo", "Executar pagamento com liquidação", "processem pagamentos com garantias financeiras",
  "qualquer entidade jurídica que cumpra", "poderá obtê-la", "apenas à verificação de conformidade".
- Accepted remaining "garantias financeiras" (reference L343/L1363/L1670/L2421) describe the protocol's
  financial invariants (OK_TECHNICAL).

## Checks

`reference-svg-check` 27/27 · `purity-check` · `identity-check` · `invariant-check` ·
`validate-compose.sh` · `validate-security-headers.sh` · broken relative links = 0 ·
JSON/YAML/OpenAPI valid · website build 79/79.

## Deploy plan

`website/content` + website pages changed → website-only rebuild + redeploy on the VM
(`banza-website:rollback-pre-7w`), recreating only the website container; reverse-proxy /
verification-api / banzai-api / postgres preserved. No `.env`/certs/DNS/Cloudflare/TLS/Postgres change.

## Scope & confirmations

This phase **closes the public surface before M2**. It does **not** activate M2, does **not** create
an operator, does **not** create a certificate, does **not** change the protocol v1.0, does **not**
change the financial runtime. The website stays in **honest pre-production**: `/operators=[]`,
`production_certificates=false`, BanzAI mock, M2/M3 pending, production federation not active. **M2 may
only begin planning/preflight after this gate** (see `M2_READINESS_HANDOFF_2026_07.md`).

## Remaining risk

None in the public surfaces. The M2 handoff enumerates the human decisions and legal/regulatory gates
that remain before any production activation.

## Verdict

The public website, GitHub public surface, raw/API, and reference routes no longer contain absolute or
operational-runtime claims; BANZA reads as an honest pre-production open financial-interoperability
protocol. Ready to present for M2 planning/preflight — **without activating M2**.
