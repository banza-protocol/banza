# Whitepaper BANZA v1.0 — Consolidação Editorial Integral

**Data:** 2026-08-04 · **Branch:** `docs/whitepaper-pt-integral-editorial-consolidation`
**Âmbito:** revisão editorial da fonte canónica (estrutura dos parágrafos, coesão, tempos verbais).
**Não é** revisão conceptual, normativa, arquitectural, regulatória, jurídica, matemática ou institucional.
Nenhuma informação nova foi introduzida; nenhum conteúdo técnico foi eliminado.

> **Nota sobre âmbito de ficheiros (desvio consciente ao §28 da directiva, autorizado nas decisões do utilizador).**
> A directiva §28 limita commits à fonte PT + PDF + artefactos de compilação + relatório, e pede «não alterar
> website / Whitepaper inglês». Três decisões do utilizador sobrepõem-se a essa restrição para esta tarefa:
> (1) **consolidar o EN de forma idêntica** — obrigatório porque o guard exige paridade estrutural PT/EN ao
> nível de bloco; (2) **sobrescrever a v1.0 no lugar** e voltar a congelar as SHA-256; (3) **reparar o template
> Typst**. Em consequência, além da fonte PT são tocados: `content/en.json`, os dois `latex/*.tex`, o
> `typst/whitepaper.typ`, `tools/whitepaper-latex.py` (config de compilação reproduzível), o `manifest.json`,
> o `CHECKSUMS.txt`, os PDFs canónicos em `website/public/whitepaper/` (local que o guard valida) e a cópia
> espelho de conteúdo em `website/content/whitepaper/` (edição web de fonte única). Não se alterou a app do
> website (rotas, componentes, lógica), a Referência online, o runtime, os motores nem a API.

## 1. Objectivo e regra central

Eliminar a fragmentação em pequenos parágrafos: fundir blocos consecutivos que desenvolvem a mesma unidade
argumentativa em parágrafos científicos completos, preservando integralmente conteúdo técnico, matemático,
arquitectural, institucional, regulatório e bibliográfico. Cada separação corresponde a uma mudança real de
ideia; equações e figuras nunca são fundidas através dos parágrafos.

## 2. Motor de compilação (nota de reprodutibilidade)

O PDF canónico é produzido a partir de `docs/whitepaper/latex/whitepaper.<lang>.tex` (gerado por
`tools/whitepaper-latex.py` a partir do modelo de blocos) e compilado com **tectonic** (XeTeX → xdvipdfmx),
o mesmo motor da edição de lançamento congelada (`Producer: xdvipdfmx`). Para reproduzir exactamente a
convenção da edição congelada — `/Info` (incl. `CreationDate`) em texto simples e SHA-256 estável — o gerador
passou a emitir `\special{dvipdfmx:config z 0}` e a compilação usa `SOURCE_DATE_EPOCH=1785542400`
(2026-08-01T00:00:00Z), tornando o build determinístico. O template Typst (`typst/whitepaper.typ`) foi
reparado para consumir o modelo de blocos actual (caminho secundário; não produz o PDF de lançamento).

## 3. Verificação da fonte (directiva §3) — confirmada

- Fonte canónica PT: `docs/whitepaper/content/pt.json` (12 secções). PDF deriva desta fonte via `.tex` + tectonic.
- §2 possuía separadamente os cinco parágrafos indicados; §3 já em quatro parágrafos; frase de adopção no início da §4. ✔
- Sem segunda fonte concorrente na compilação canónica. ✔

## 4. Inventário dos parágrafos (§4 / §25 / §26) — PT

| Secção | Parágrafos antes → depois | 1 frase antes→depois | 2 frases antes→depois | Fusões | Conteúdo técnico alterado |
|---|---|---|---|---|---|
| Resumo | 1 → 1 | — | — | 0 | Não |
| 1 Introdução | 7 → 6 | 0→0 | 0→0 | 1 | Não |
| 2 Modelo | 9 → 6 | 0→0 | 3→2 | 3 | Não |
| 3 Arquitectura | 4 → 4 | 0→0 | 0→0 | 0 | Não |
| 4 Perfis | 6 → 5 | 1→0 | 1→1 | 1 | Não |
| 5 Descoberta | 5 → 4 | 0→0 | 0→1 | 1 | Não |
| 6 Validação | 10 → 7 | 0→0 | 1→0 | 3 | Não |
| 7 Evidência | 7 → 5 | 1→1 | 2→2 | 2 | Não |
| 8 Segurança | 6 → 5 | 1→0 | 3→2 | 1 | Não |
| 9 Governação | 6 → 4 | 0→0 | 0→0 | 2 | Não |
| 10 Limitações | 4 → 3 | 0→0 | 1→0 | 1 | Não |
| 11 Estado | 4 → 3 | 1→0 | 1→1 | 1 | Não |
| 12 Conclusões | 5 → 4 | 1→1 | 1→0 | 1 | Não |
| **TOTAL** | **73 → 56** | **5→2** | **13→9** | **17** | **Não** |

- **Palavras:** 4064 → 4063 (a diferença de 1 resulta da suavização de repetição imediata na §10).
- **Páginas:** 12 → 12 (consequência natural; nenhuma manipulação tipográfica — directiva §22).
- **EN:** estrutura idêntica (73 → 56 blocos-p; paridade de bloco confirmada pelo guard).
- Os 2 parágrafos de uma frase remanescentes têm função autónoma (introdução de recibos §7; abertura das Conclusões §12).

## 5. Tabela de fusões (por secção)

- **§1** — fundidos os dois parágrafos pós-equações que explicam as Equações (1a)/(1b) (padrões de crescimento + «grandezas diferentes» + Figura 1). Ressalva das grandezas diferentes preservada.
- **§2** — (5.1) três parágrafos → um (operador/implementação; delimitação do resultado; identificador + versão construída + resumo criptográfico). (5.2) dois parágrafos → um (âmbito + reprodutibilidade [8]). O parágrafo SHA-256 [5] permanece separado, antes da Figura 2. Equações (2)(3)(4), Figura 2, [5] e [8] intactos.
- **§3** — confirmados os quatro parágrafos (arquitectura+Camada 1; Camadas 2 e 3; neutralidade; BanzAI+Figura 3). Sem segunda reformulação.
- **§4** — frase de adopção fundida no parágrafo introdutório dos cinco níveis L0–L4 (cumulativos; evidência técnica, nunca certificação/autorização/aprovação). Nomes L0–L4, Figura 4 intactos.
- **§5** — Unidade A (origem+Manifesto+Registo+responsabilidade); Unidade B (identidade+raiz+chaves+rotação); Unidade C (revogação+frescura); Unidade D (obtenção segura+Figura 5). Referências [6] e [7] preservadas.
- **§6** — A (nove passos); B (estados+prontidão+fecho por omissão); C (decisão/explicação+Figura 6). Parágrafo da certificação técnica formal (prontidão≠certificação) mantido separado; exemplo A/B em dois parágrafos; parágrafo final da decisão do Operador A mantido separado. Figuras 6 e 7 preservadas.
- **§7** — cinco unidades (tipos+função; utilização independente; natureza temporal; Pacote de Evidências+fronteiras; publicação+Registo Técnico). «zero operadores de produção e zero certificações técnicas activas» e Figura 8 preservados.
- **§8** — fundidos os dois parágrafos iniciais de ameaças; repetição de SSRF/DNS rebinding reduzida. Mecanismos e Figura 9 preservados.
- **§9** — quatro parágrafos (ADR/RFC; semver+compatível; versões maiores+coexistência+migração+interpretação; depreciação+estado+separação). Figura 10 preservada.
- **§10** — introdução fundida no limite regulatório; três parágrafos (regulatório; observabilidade; experimental). Figura 11 preservada.
- **§11** — fundidos pré-produção+Registo+zero+dinheiro real desactivado+sem medições; preparação regulatória e Operador Zero mantidos separados. Figura 12 preservada.
- **§12** — fundidos os dois primeiros parágrafos (contribuição estrutural + quatro escolhas); fronteiras, trabalhos futuros e síntese final mantidos separados.

## 6. Controlo de integridade técnica (§23) — prova por conjunto de frases

Comparação do conjunto de frases HEAD vs. consolidado (PT e EN): as únicas frases removidas reaparecem
integralmente dentro das frases fundidas correspondentes (junção por pontuação/conectores das consolidações
mandatadas §2/§4) mais uma suavização na §10 («As garantias aqui descritas são técnicas» → «Estas garantias
são técnicas»). As fusões §1/§5–§12 preservam as frases verbatim (concatenação), pelo que não surgem no diff.
Confirmado: nenhuma condição, ressalva, fronteira de autoridade, possibilidade/obrigação, prontidão/certificação,
certificação/autorização, distinção operador/implementação, camadas/perfis, motores/BanzAI ou evidência/explicação
foi alterada; o estado de pré-produção permanece explícito.

## 7. Confirmação de elementos imutáveis (§21 / §24)

- Título, autores (Fidel R. Monteiro; Jesus R. Monteiro), afiliação (Banzami), nota da edição canónica — inalterados.
- 12 títulos de secção, numeração e ordem — inalterados.
- Equações (1a)(1b)(2)(3)(4) — notação, símbolos, variáveis e números inalterados.
- Figuras 1–12 — conteúdo, legendas e numeração inalterados; cada figura é citada antes de aparecer.
- Referências [1]–[8] — texto e numeração inalterados; todas citadas em corpo.
- Terminologia canónica, L0–L4, nomes dos nove passos, nomes dos recibos, estados, claims regulatórios, números de produção/certificação — inalterados.

## 8. Compilação e inspecção visual (§24)

- Compilação: **0 erros**, **0 referências indefinidas**, **0 citações indefinidas**, **0 overfull boxes** (PT e EN).
- Inspecção visual página a página (12 PT + 12 EN): sem páginas quase vazias, títulos órfãos, linhas viúvas/órfãs
  graves, texto cortado, figuras sobrepostas ou anomalias de paginação. Figuras 1–12 em ordem; Figura 2 associada
  ao parágrafo SHA-256; Figura 3 citada antes de aparecer; frase de adopção apenas na §4.

## 9. Revisão adversarial independente (§27)

Segunda leitura dirigida à perda de condições, alteração de autoridade/sujeito, transformação possibilidade↔obrigação,
prontidão↔certificação, certificação↔autorização, generalização de resultado, confusões operador/implementação,
camadas/perfis, motores/BanzAI, evidência/explicação, alteração de pré-produção, repetição residual, fragmentação
remanescente, parágrafos densos, frases longas, incoerência verbal, chamadas de figuras e referências deslocadas.
**Resultado: nenhum problema conceptual, normativo ou de autoridade encontrado.** Não permanecem sequências
injustificadas de pequenos parágrafos; cada parágrafo corresponde a uma unidade argumentativa completa (salvo
as duas excepções autónomas identificadas em §4).

## 10. Guard e manifesto

`bash tools/check-banza-whitepaper.sh` → **PASS** (13/13: autoria, estrutura 12 secções + paridade, tokens,
charter, loanwords PT, claims, BANZA na Web, PDFs 10–14 pp + data 2026, imutabilidade do manifesto, 24 SVGs,
dossier LaTeX, edição web). Manifesto v1.0 (released_at 2026-08-01) com SHA-256 re-congeladas e entrada de
histórico datada 2026-08-04. CHECKSUMS.txt actualizado.

| | pt | en |
|---|---|---|
| páginas | 12 | 12 |
| bytes | 636050 | 608483 |
| SHA-256 | c13925f3…  | d5f3cc55… |

---

## 11. Pipeline canónico (fecho antes do merge, 2026-08-04)

Motivação: os PDFs publicados são produzidos por LaTeX/tectonic, mas o script existente estava associado
ao caminho Typst (14 páginas) e a publicação final dependia de passos manuais — ambiguidade incompatível
com uma edição canónica reprodutível.

**Motor canónico (registado inequivocamente):** o motor de publicação do Whitepaper v1.0 é **LaTeX
compilado com tectonic (XeTeX → xdvipdfmx)**. O Typst permanece apenas como preview não canónico.

**Comando único:** `make whitepaper-release` (`tools/whitepaper-release.sh`) executa, falhando perante
qualquer divergência: validação + paridade PT/EN → geração dos `.tex` → compilação PT+EN com tectonic
(`SOURCE_DATE_EPOCH` do manifesto + `dvipdfmx z 0`) → verificação (12 pp, motor, data 2026, sem DRAFT, 0
indefinidas/overfull) → publicação em `website/public/whitepaper` + `docs/whitepaper/pdf` → sincronização
do espelho web → actualização de `manifest.json` + `CHECKSUMS.txt` (idempotente) → `banza-whitepaper-check`.

**Separação de papéis:** o Typst (`tools/whitepaper-build.sh` / `make whitepaper-preview`) escreve apenas
`docs/whitepaper/pdf/typst-preview/` (ignorado pelo Git, com marca de água); nunca publica, nunca toca no
manifesto/checksums/espelho web. Um novo check do guard (canonical-engine) verifica que **todos** os PDFs
publicados committed são LaTeX/xdvipdfmx e que nenhum output Typst está num caminho publicado.

**Prova determinística:** `tectonic` é byte-determinístico; dois worktrees limpos independentes produziram
`build1 = build2 = committed` (pt `c13925f3…`, en `d5f3cc55…`) com **0 diff Git pós-build** em cada;
`make whitepaper-release` é idempotente numa árvore inalterada; `make whitepaper-verify` reconstrói num
temp e **exige** identidade byte-a-byte com os PDFs committed (aborta na divergência, sem escrever). A
versão da tectonic é **imposta** (aborta se ≠ 0.17.x). Metadados: `Creator(LaTeX with hyperref)`,
`Producer(xdvipdfmx)`, `CreationDate(D:20260801000000)`.

**Métricas:** `canonical_whitepaper_build_command_present=true` · `engine=latex_tectonic` ·
`build_manual_steps=0` · `double_build_hash_divergences=0` · `post_build_git_diff=0` ·
`typst_can_publish_canonical_pdf=false` · `published_pdf_manifest_divergences=0`.

**Reconciliação de narrativa:** relatórios históricos em `docs/reports/` e dossiers de preparação que
descreviam o Typst como produtor da edição publicada receberam um aviso **SUPERSEDED (motor de build)**
apontando para `docs/whitepaper/BUILD.md`; o manifesto duplicado/antigo em `docs/reports/` foi anotado
como não canónico. Documentação canónica de build: `docs/whitepaper/BUILD.md`.

---

## 12. Fecho hermético do build + contrato de CI (2026-08-04)

**Toolchain fixada exactamente:** `tectonic` **0.17.0** (não `0.17.x`) — imposto pelo script (aborta noutra
versão); binário fixado por `sha256 = 8533d07f…a3b7` no job de CI; bundle TeX trancado à versão da tectonic
(não sobreposto). A verificação de SHA-256 do output é o contrato final de hermeticidade.

**Reprodutibilidade multi-plataforma comprovada:** a `tectonic 0.17.0` produz PDFs byte-idênticos em macOS
(arm64) e Linux (amd64, o runner de CI) — ambos coincidem com os PDFs committed (pt `c13925f3…`, en
`d5f3cc55…`), medido num container `linux/amd64` limpo.

**CI obrigatória:** novo job `whitepaper-hermetic-verify` (`.github/workflows/identity-guard.yml`) num
checkout limpo: instala a tectonic 0.17.0 verificada por SHA-256 → `make whitepaper-verify` (reconstrói PT+EN,
compara SHA-256 aos PDFs committed + manifesto + CHECKSUMS, confirma 12 pp, metadata LaTeX/xdvipdfmx, sem
Typst) → `git diff --exit-code`. Falha em qualquer divergência.

**`make whitepaper-verify`** ganhou verificação cruzada do manifesto + CHECKSUMS; a versão da tectonic passou
a exacta.

| Métrica | Valor |
|---|---|
| `canonical_whitepaper_engine` | latex_tectonic |
| `canonical_whitepaper_toolchain_exactly_pinned` | true (0.17.0) |
| `canonical_whitepaper_bundle_pinned` | true (trancado à versão + contrato SHA do output) |
| `canonical_whitepaper_network_variability` | 0 (bundle imutável; binário por checksum) |
| `canonical_whitepaper_build_manual_steps` | 0 |
| `canonical_whitepaper_verify_required_in_ci` | true (whitepaper-hermetic-verify) |
| `canonical_whitepaper_ci_hash_divergences` | 0 |
| `canonical_whitepaper_post_build_git_diff` | 0 |
| `published_typst_pdfs` | 0 |

---

## 13. Fixação offline do bundle (hermeticidade total, 2026-08-04)

O último implícito — o bundle TeX seleccionado pela tectonic — foi eliminado.

**Bundle identificado + fixado:**
- URL imutável: `https://data1.fullyjustified.net/tlextras-2022.0r0.tar` (a predefinição da 0.17.0,
  `relay.fullyjustified.net/default_bundle_v33.tar`, redirecciona para esta).
- Nome/versão: `tlextras-2022.0r0` (default bundle v33) · formato itar · 2 881 562 112 bytes · 2022-09-25.
- Digest de conteúdo tectonic (asserido no build): `6ffe055852f8faf66c0acbe1a7fb27f87b869a90bad1204f3bf4d9683f597c7c`.

**Uso:** o build passa sempre `--bundle <URL imutável>` (nunca o implícito). `WP_OFFLINE=1` acrescenta
`--only-cached` — zero rede durante a compilação. O `verify_bundle_digest` aborta se o digest resolvido em
`TECTONIC_CACHE_DIR` não for o fixado.

**Prova offline (comprovada):** com o slice do bundle pré-obtido, o rebuild com `--only-cached` reproduz
byte-a-byte os PDFs committed (pt `c13925f3…`, en `d5f3cc55…`) e o digest resolvido é `6ffe0558…597c7c`.
Na CI o job `whitepaper-hermetic-verify` faz: (1) instala a tectonic 0.17.0 (SHA-256), (2) aquece o slice do
bundle imutável e assere o digest, (3) rebuild **sem rede** (`unshare -rn` + `--only-cached`) exigindo
byte-identidade com committed + manifesto + CHECKSUMS, (4) `git diff --exit-code`.

| Métrica | Valor |
|---|---|
| `canonical_whitepaper_engine` | latex_tectonic |
| `canonical_whitepaper_tectonic_version` | 0.17.0 |
| `canonical_whitepaper_binary_sha_pinned` | true (8533d07f…a3b7) |
| `canonical_whitepaper_bundle_identifier_present` | true (tlextras-2022.0r0 · default_bundle_v33) |
| `canonical_whitepaper_bundle_sha_pinned` | true (digest 6ffe0558…597c7c) |
| `canonical_whitepaper_implicit_bundle_selection` | false (`--bundle` explícito) |
| `canonical_whitepaper_compile_network_access` | 0 (`--only-cached` + `unshare -rn`) |
| `canonical_whitepaper_offline_verify_pass` | true |
| `canonical_whitepaper_ci_hash_divergences` | 0 |
| `canonical_whitepaper_post_build_git_diff` | 0 |
