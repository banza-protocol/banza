# BANZA Whitepaper — WP1.2 Bitcoin‑style rewrite (§28 final report)

**Status: CANDIDATE — built + validated, held at the human publication gate.** Nothing has been merged,
tagged or deployed. Awaiting `APROVADO PARA PUBLICAÇÃO`.

The BANZA whitepaper was restructured and rewritten as a compact, self‑contained **technical article** in the
editorial/structural/typographic style of *Bitcoin: A Peer‑to‑Peer Electronic Cash System* (used as a model
only — none of its text, arguments or diagrams were copied). Per your two decisions: it stays **v1.0**
("pré‑lançamento, sem bump") and becomes the **launch edition, replacing the prior v1.0** (this deliberately
overrides the earlier immutability freeze, which was your call); and it ships **PT (canonical) + EN
(official translation)** in structural parity. Toolchain moved to **LaTeX/Overleaf**.

## 1. Previous structure → new structure

| Before (prose v1.0, 8 sections, Typst, 10 pp) | Now (WP1.2, 12 sections, LaTeX, 12 pp) |
|---|---|
| 1 Motivação, trabalho relacionado e contribuição | **1 Introdução** (problema → integrações bilaterais → regras públicas → trabalho existente → proposta → contribuições) |
| 2 Modelo de sistema | **2 Modelo** |
| 3 Arquitectura em três camadas | **3 Arquitectura** (Banzami removido; sem L1/L2/L3 na figura; sem Camada 0) |
| — | **4 Perfis** (NOVA secção autónoma L0–L4) |
| 4 Descoberta, identidade e origem canónica | **5 Descoberta** |
| 5 Validação determinística | **6 Validação** (dois fluxogramas: nove passos + Operador A↔B) |
| 6 Evidência, recibos, confiança e o Registo Técnico | **7 Evidência** |
| 7 Segurança, governação, limitações e estado actual (título composto) | dividido em **8 Segurança · 9 Governação · 10 Limitações · 11 Estado** |
| 8 Discussão e conclusão | **12 Conclusões** (sem figura) |

Títulos compostos eliminados; cada secção tem um único conceito. Estrutura final: Resumo · 1–12 · Referências
· BANZA na Web. Uma figura por secção numerada **excepto Conclusões**; §6 tem duas.

## 2. Files changed (106 files, +3182 / −1077)

- **Conteúdo (fonte única):** `docs/whitepaper/content/{pt,en}.json` reescritos para o modelo de blocos
  (`section.blocks` = p|eq|fig; tokens inline `{{fig/eq/sec}}` + `\(math\)`); espelhados em
  `website/content/whitepaper/{pt,en}.json`.
- **LaTeX (dossier, novo):** `docs/whitepaper/latex/whitepaper.{pt,en}.tex`, `references.bib`,
  `figures/*.pdf` (24 vetoriais). Gerador `tools/whitepaper-latex.py` (JSON → .tex Overleaf‑ready).
- **Figuras (fonte única SVG):** gerador `tools/whitepaper-figures.py` → 24 SVG (12×2). Novas:
  fig2‑model, fig3‑three‑layers, fig4‑profiles, fig5‑discovery, fig6‑journey, fig7‑example, fig8‑evidence,
  fig9‑security, fig10‑governance, fig11‑limits, fig12‑state. Removidas (nomes antigos):
  fig2‑three‑layers, fig3‑canonical‑origin, fig4‑validation‑evidence. fig1‑bilateral‑vs‑protocol redesenhada.
- **PDFs publicados:** `website/public/whitepaper/banza-whitepaper-v1.0-{pt,en}.pdf` (substituídos) + 24 SVG
  em `website/public/whitepaper/figures/`.
- **Edição web (mesma fonte):** `website/lib/whitepaper.ts` (tipos do modelo de blocos + mapas de referência),
  `website/components/whitepaper/WhitepaperEdition.tsx` (renderer de blocos + resolução de tokens/matemática +
  bloco BANZA na Web), `website/app/whitepaper/page.tsx` (rótulos).
- **Guard reescrito:** `tools/check-banza-whitepaper.sh` (contrato WP1.2, 12 verificações).
- **Manifesto/integridade:** `docs/whitepaper/manifest.json` (+ cópia web), `CHECKSUMS.txt`; `CITATION.cff`
  já em v1.0/2026‑08‑01.
- **Repo‑guards:** `engines/banza-repo-guards/src/lib.rs` — allowlist de atribuição (Banzami) para os dois
  geradores.
- **Blueprint:** `docs/whitepaper/prep/WP1_2_BITCOIN_STYLE_BLUEPRINT.md`.

## 3. Figures (12; one per section except Conclusões; §6 has two)

1 integrações bilaterais vs protocolo comum · 2 operador/implementação→artefactos→resultado delimitado ·
3 três camadas + BanzAI transversal · 4 escada cumulativa L0–L4 · 5 origem canónica→Manifesto/chaves→obtenção
segura→motores · 6a fluxo dos nove passos (estados, motivos, fecho por omissão) · 6b Operador A↔B ·
7 artefactos→motores→resultados→recibos→Pacote→Registo (opcional) · 8 ameaça→mecanismo→resultado ·
9 versão→depreciação→coexistência→migração→fim de suporte · 10 fronteira (avalia/observa/fora do âmbito) ·
11 quadro do estado geral. Monocromáticas, vetoriais, PT/EN com geometria idêntica.

## 4. Equations (introduced before they appear; all cross‑referenced)

- **(1a)** R_bilateral(n)=n(n−1)/2 · **(1b)** I_comum(n)=n — símbolos distintos (contam objectos diferentes).
- **(2)** 𝓘=(o,i,v,p,e,u) — `\mathcal{I}` evita a confusão I/i. **(3)** A_t(𝓘)={a₁,…,aₙ}.
- **(4)** V_m(A_t(𝓘),S_{v,p})→(R,E,P) — clarificado que **R = resultados E códigos de motivo** (confirmado
  nos contratos: CertificationRecord tem `status` + `reason_code`).

## 5. References (8, all cited; none added, none removed)

ISO 20022 [1], ISO 8583 [2], EMV QR [3], ISO/IEC 9646 [4], NIST FIPS 180‑4/SHA‑256 [5], RFC 8032 EdDSA [6],
RFC 8615 well‑known [7], Peng 2011 reprodutibilidade [8]. O artigo do Bitcoin **não** é citado (é apenas
modelo editorial). Nenhuma referência ficou por citar.

## 6. Perfis L0–L4 — definitions found in canonical sources

Cumulativos (cada nível exige todos os inferiores), da base ao topo — fontes: ADR‑021,
`docs/governance/certification-boundary.md`, `conformance/README.md`, `contracts/production/*`:

- **L0 Protocol Sandbox** — instanciação segura em ambiente de testes, manifesto válido, MON‑001.
- **L1 Core Payment Capability** — pagamento de consumidor, aceitação de comerciante, transferência,
  rastreabilidade; livro‑razão de dupla entrada, idempotência.
- **L2 Payment Initiation Capability** — pedidos de pagamento / QR dinâmico, execução instantânea.
- **L3 Inter‑Operator Interoperability** — encaminhamento, liquidação inter‑operador, reconciliação; **limiar
  de federação** (evidência multi‑operador).
- **L4 External Interoperability** — integração com redes externas; **definido por perfil** (sem vetores de
  sandbox — fronteira de cobertura honesta). Runner de operador único atribui L0–L2.

Enquadramento exacto usado: são **níveis de conformidade** que produzem evidência técnica, nunca
certificação/autorização; um "Perfil de Certificação" (objecto ADR‑064) fixa exactamente um nível.

## 7. Gaps found in canonical sources (flagged; never invented)

1. "Perfil" canónico ≠ os cinco níveis (níveis vs objecto InteroperabilityCertificationProfile) — o texto
   distingue os dois.
2. `spec/overview.md` ainda descreve "cinco camadas conceptuais" (eixo técnico), superado pela arquitectura
   institucional de três camadas do ADR‑059 (usada em §3); sem mapa canónico entre os dois eixos.
3. Coexistem uma jornada de 7 passos (UI legada) e a de 9 passos canónica (ADR‑068 + schemas) — usada a de 9.
4. O formalismo 𝓘 / A_t / V_m só existe no próprio whitepaper (fundamentado elemento a elemento, mas a
   notação é uma construção do documento) — apresentado como tal.
5. "Confusão de origem" não é vocabulário canónico (host‑mismatch/substituição de alvo) — termo do WP.
6. Depreciação: coexistem "90 dias" (aviso) e "pelo menos um ciclo maior" (vida útil); janela de coexistência
   maior sem número — nenhum número inventado. "Mecanismo ainda não exercido" apresentado como inferência do
   estado de pré‑produção, não como citação.

## 8. Compilation, tests, page count, PDF paths

- **Compilação (Overleaf‑fiel):** compila sob **pdflatex + newtx** (Docker `texlive`, `SOURCE_DATE_EPOCH`
  fixo → data interna 2026‑08‑01) **e** sob **xelatex** (tectonic). Sem referências indefinidas; todas as
  figuras citadas antes de aparecerem; todas as equações enquadradas; todas as variáveis em modo matemático.
- **Páginas:** **PT 12 · EN 12** (artigo compacto).
- **PDFs:** `website/public/whitepaper/banza-whitepaper-v1.0-pt.pdf` — SHA-256 `7a45251211624f1d958ced8a8a4f18e3db6da392b78e259089b8ab87a86515f8` (12 pp);
  `…-en.pdf` — `7a45251211624f1d958ced8a8a4f18e3db6da392b78e259089b8ab87a86515f8` (12 pp).
  Fonte LaTeX no dossier: `docs/whitepaper/latex/whitepaper.{pt,en}.tex`.
- **Controlos:** whitepaper guard **PASS**; `make identity-check` **PASS** (só avisos pré‑existentes);
  `make repo-guards-rs-check` **PASS** (sem violações); website **tsc** limpo; **vitest 420/420**;
  **next build** OK (4 rotas /whitepaper prerender SSG); HTML prerenderizado sem tokens/refs por resolver.

## 9. Editorial decisions & deviations from the proposed structure

- **§1 revisão:** contribuições reordenadas pela ordem das secções (§2→§3→§5→§6→§7); as duas que viviam em §6 (validação determinística + separação decisão/IA) foram fundidas — **cinco** contribuições, cada secção referida uma vez. Resumo: «obtêm-nos» → «obtêm esses artefactos». Figuras ancoradas com `float`/`[H]` (deixam de partir parágrafos).

- **Primeira página (revisão do autor):** removidas as duas linhas de metadata (versão/data/estado + licença/URL canónica); a 1ª página passa a mostrar apenas o **Website oficial: https://banza.network**. O bloco «BANZA na Web» da última página foi removido e o **link GitHub retirado** do documento (mantém-se no rodapé global do site).

- Fonte única mantida (JSON → LaTeX + web); o `.tex` é **gerado** a partir do JSON canónico — decisão para
  conciliar o charter (Overleaf/LaTeX) com a disciplina de fonte única do repositório. Cada `.tex` é
  auto‑contido e abre/compila no Overleaf.
- Referências via `thebibliography` numérica (ordem da lista, [1]–[8]) em vez de `\cite`+BibTeX, para preservar
  a numeração fixa sem passo BibTeX; ships também um `references.bib` de cortesia (charter §25 "quando
  compatível").
- Palavras‑chave removidas (§4). Resumo reescrito por último, curto, sem enumerar secções.
- Sem desvios à ordem das 12 secções propostas.

## 10. Completion gate (§28 — no violation present)

Sem erros de compilação · sem figuras em falta · sem referências indefinidas · Perfis definidos apenas por
fontes canónicas · URLs verificadas (banza.network, github.com/banza-protocol/banza) · conteúdo técnico
fundamentado · controlos documentais a passar · sem problemas visuais nas figuras.

**Held at the human gate. On `APROVADO PARA PUBLICAÇÃO`:** branch → PR → CI verde → admin‑merge → re‑apontar a
tag `banza-whitepaper-v1.0` para o commit final → deploy VPS (rebuild da imagem website + force‑recreate) →
QA de public‑edge (hashes servidos, 12 páginas, data interna 2026, rotas 200, varredura de strings proibidas).
