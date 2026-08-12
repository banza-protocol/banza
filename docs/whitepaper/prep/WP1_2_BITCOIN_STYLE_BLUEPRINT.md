# WP1.2 — Bitcoin-style rewrite blueprint (v1.0, no bump)

Foundational, non-normative. Portuguese canonical + official English translation. LaTeX/Overleaf
toolchain (article, A4, amsmath/mathtools, cleveref, booktabs, newtx on pdflatex / TeX Gyre Termes on
xelatex). Single source: `docs/whitepaper/content/{pt,en}.json` → LaTeX generator (`.tex` in the dossier)
**and** the web edition. Figures: monochrome SVG single source → vector PDF via `rsvg-convert`.

This edition replaces the current v1.0 in place (user decision "pré-lançamento, sem bump"), overriding
the earlier immutability freeze; the guard re-freezes at the new hashes.

## Structure (charter §3) — 12 numbered sections, each with ≥1 figure except Conclusões

| # | Título | Figura | Fonte canónica principal |
|---|--------|--------|--------------------------|
| — | Resumo | — | (revisto no fim) |
| 1 | Introdução | Fig 1 — integrações bilaterais vs protocolo comum | WP atual §1; ISO/EMV refs |
| 2 | Modelo | Fig 2 — operador/implementação/versão/perfil/ambiente/origem→artefactos→resultado delimitado | ADR-064/068; implementation-record |
| 3 | Arquitectura | Fig 3 — três camadas + BanzAI transversal | ADR-059/061/063; NÃO nomear Banzami |
| 4 | Perfis | Fig 4 — escada cumulativa L0→L4 | ADR-021; certification-boundary; conformance/README |
| 5 | Descoberta | Fig 5 — implementação→origem canónica→Manifesto/chaves→obtenção segura→motores | ADR-038/068; discovery-document; banza-artifact-fetcher |
| 6 | Validação | Fig 6a — fluxo nove passos (estados, motivos, fecho por omissão, prontidão); Fig 6b — Operador A↔B | ADR-068; verdict.rs; FEDERATION_TRUST_MODEL |
| 7 | Evidência | Fig 7 — artefactos→motores→resultados→recibos→Pacote→Registo (opcional) | ADR-065; operation/journey/origin receipts; evidence-bundle |
| 8 | Segurança | Fig 8 — ameaça→mecanismo→resultado esperado | THREAT_MODEL; banza-artifact-fetcher; ADR-038 |
| 9 | Governação | Fig 9 — versão→depreciação→coexistência→migração→fim de suporte (aditivo vs incompatível) | RFC/ADR README; PROTOCOL_RELEASE_GOVERNANCE; protocol-version.json |
| 10 | Limitações | Fig 10 — fronteira: avalia / observa / fora do âmbito / o que um resultado não representa | WP atual; ADR-061/062 |
| 11 | Estado | Fig 11 — quadro compacto do estado geral | ADR-062/065/067; protocolStatus.ts; NÃO nomear Banzami |
| 12 | Conclusões | — (sem figura) | síntese |
| — | Referências | — | 8 refs auditadas |
| — | BANZA na Web | — | banza.network + github.com/banza-protocol/banza |

12 figuras (Fig 1–11, com 6a/6b em §6), cada uma PT+EN. Conclusões sem figura (charter §17/§19).

## Equações (charter §6, §7, §21) — introduzidas ANTES de aparecerem, nunca logo após título

- **(1a)** `R_{\text{bilateral}}(n) = \dfrac{n(n-1)}{2}` — relações técnicas bilaterais (§1)
- **(1b)** `I_{\text{comum}}(n) = n` — implementações do protocolo comum (§1)
- **(2)** `\mathcal{I} = (o, i, v, p, e, u)` — tuplo da implementação (§2, `\mathcal{I}` evita I/i)
- **(3)** `A_t(\mathcal{I}) = \{a_1, a_2, \dots, a_n\}` — artefactos observados no instante t (§2)
- **(4)** `V_m(A_t(\mathcal{I}), S_{v,p}) \to (R, E, P)` — validação (§2); **R = resultados E códigos de motivo** (confirmado: certification-record status+reason_code); E = evidência; P = recibos; m = versão do motor; S = perfil de certificação público para (v,p)

Formalismo é construção do whitepaper (não está em nenhum ADR/contrato) — apresentar como tal. Todas as
variáveis em modo matemático no corpo (o,i,v,p,e,u,t,m,n,R,E,P) via tokens `\(...\)`.

## Content JSON model (single source → LaTeX + web)

Cada secção: `{ id, number, title, label:"sec:<id>", blocks:[...] }`. Blocos ordenados:
- `{"t":"p","text":"…"}` — parágrafo curto (2–4 frases). Tokens inline: `{{fig:ID}}`, `{{eq:LABEL}}`,
  `{{sec:ID}}` (→ `\cref` no LaTeX; "Figura N"/"Equação (n)"/"secção N" no web). Math inline `\(x\)`.
- `{"t":"eq","items":[{"n":"1a","label":"eq:bilateral","latex":"…","html":"…"}, …]}` — grupo `align`.
- `{"t":"fig","id":"fig-…"}` — figura (colocada logo após o parágrafo que a menciona).

Top-level: `figures:[{id,n,file_pt,file_en,label,title,caption,alt}]`, `references:[…]` (+ `references.bib`),
`web_block:{website,github}`. Keywords removidas (charter §4).

## Perfis L0–L4 (grounded — ADR-021 / certification-boundary / conformance/README)

Cumulativos/aditivos (cada nível exige todos os inferiores). Nomes canónicos:
- **L0 — Protocol Sandbox**: instanciação segura em ambiente de testes, manifesto válido, `simulated=true`, MON-001 (dinheiro em inteiros). Atribuído pelo runner sandbox de operador único.
- **L1 — Core Payment Capability**: pagamento de consumidor, aceitação de comerciante, transferência, rastreabilidade; livro-razão de dupla entrada, idempotência.
- **L2 — Payment Initiation Capability**: pedidos de pagamento / QR dinâmico, execução instantânea (T+0). (sandbox runner atribui L0–L2.)
- **L3 — Inter-Operator Interoperability**: encaminhamento entre operadores, liquidação inter-operador, reconciliação automática — **limiar de elegibilidade para federação**; exige evidência multi-operador (não é auto-atribuído).
- **L4 — External Interoperability**: integração com redes de pagamento externas; **definido por perfil**, exige evidência de integração externa — sem vetores de sandbox (fronteira de cobertura honesta, não defeito).

Enquadramento exato: são **níveis de conformidade** que produzem **evidência técnica**, nunca certificação/autorização. "Perfil de Certificação" (InteroperabilityCertificationProfile, ADR-064) é objeto distinto que fixa exatamente um nível + capacidades. MON-001 é universal (todos os níveis). Nomes de tipo-de-operador (Sandbox/Payment/Settlement/Federation/Infrastructure Operator) são DEPRECADOS (só crosswalk).

## Gaps to flag in §28 (never invented)

1. "Perfil" canónico ≠ os cinco níveis (níveis vs objeto InteroperabilityCertificationProfile).
2. `spec/overview.md` "cinco camadas conceptuais" superado por ADR-059 (três camadas institucionais); sem mapa canónico entre eixos.
3. Journey 7-passos (banzai-operator-journey/OPERATOR_JOURNEY.md) vs 9-passos canónico (ADR-068+schemas) — usar 9.
4. Formalismo I/A_t/V_m só existe no whitepaper (grounded elemento a elemento, notação é do WP).
5. "origin confusion" não é vocabulário canónico (host_mismatch/target substitution) — termo-guarda-chuva do WP.
6. RFC-0005 (.well-known/DNS discovery) é Draft/futuro — descoberta de produção é resolvida pelo Registo.
7. Depreciação: 90 dias (aviso) + "pelo menos um ciclo MAJOR" (vida útil) coexistem; janela de coexistência MAJOR sem número — não inventar.
8. "mecanismo de depreciação ainda não exercido" = inferência do estado pré-produção, não citação.
9. Divergência de enum de ambiente (validação sandbox|demo vs perfil sandbox|staging|production).
10. Sem `engine_version` como campo do certification-record (só nos recibos ADR-068 §4.8).

## Toolchain / build

- Local verify: `tectonic -X compile` (XeLaTeX, TeX Gyre Termes por nome de OTF). Cross-check pdflatex+newtx em Docker `texlive` (daemon UP).
- Figuras: `rsvg-convert -f pdf` (vetorial). `.tex` gerado é Overleaf-compatível (iftex: newtx no pdflatex).
- Guardar no dossier: `docs/whitepaper/latex/whitepaper.pt.tex`, `whitepaper.en.tex`, `preamble.tex`, `references.bib`, figuras `.pdf`.
