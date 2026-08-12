# Whitepaper BANZA v1.0 — Build & Governança da Fonte Canónica

## Regra principal (governança editorial permanente)

> **Toda alteração de conteúdo começa primeiro na edição portuguesa canónica do Overleaf.**
> Depois de revista e aprovada: **Overleaf PT aprovado → importação para o repositório → outputs PT →
> tradução oficial EN → outputs EN → publicação online.** O repositório **deriva** outputs da edição
> portuguesa canónica; **não cria uma edição editorial alternativa.**

### Fonte de verdade

- **Fonte editorial canónica:** `docs/whitepaper/latex/whitepaper.pt.tex` — o dossier LaTeX importado
  do projecto Overleaf aprovado (classe `copernicus`; a **composição aprovada faz parte da edição
  canónica**, não apenas o texto).
- **A edição inglesa NÃO é fonte independente** — é a tradução oficial, derivada semanticamente do PT.
- **`content/pt.json` NÃO é fonte editorial primária** — é a derivação para a edição web
  (`tools/whitepaper-pt-content.py`).
- **HTML/React NÃO é fonte editorial.** **PDF NÃO é fonte editável.**

### Direcção de derivação (unidireccional)

```text
Overleaf PT aprovado
        ↓
LaTeX PT canónico no repo  (docs/whitepaper/latex/whitepaper.pt.tex)
        ↓
        ├── PDF PT                       (tectonic)
        ├── conteúdo web PT              (tools/whitepaper-pt-content.py → content/pt.json → espelho web)
        │
        └── tradução oficial EN          (content/en.json, reconciliada do PT)
                    ↓  (tools/whitepaper-en-dossier.py)
                    ├── LaTeX EN gerado → PDF EN
                    └── conteúdo web EN
```

Nunca: `HTML → PT` · `EN → PT` · `content/pt.json → reconstruir editorialmente o Whitepaper` ·
`PDF antigo → nova fonte`.

### Classificação de alterações

| Classe | O que muda | Onde nasce |
|---|---|---|
| **EDITORIAL** | o que o documento diz (texto, figuras, equações, estrutura, layout aprovado) | **Overleaf PT** — nunca directamente no repo |
| **DERIVATION** | tradução/transformação da fonte aprovada (EN, web JSONs) | repo (ferramentas de derivação) |
| **BUILD** | compilação sem mudar semântica/composição aprovada (motor, encoding, labels do renderer) | repo |
| **PUBLICATION** | deploy, cache, headers, downloads | repo/infra |

Um erro textual encontrado live **não** se corrige silenciosamente no website ou no `.tex`:
**a correcção editorial regressa à fonte portuguesa canónica** (Overleaf) e segue o fluxo completo.

### Patches de integração de motor (BUILD, não EDITORIAL)

Os únicos desvios face ao export Overleaf são patches de **compatibilidade de compilação** fora do
Overleaf (pdflatex → tectonic/XeTeX), documentados em comentário no próprio `.tex`/gerador:

- `\PassOptionsToPackage{table}{xcolor}` antes da classe (clash de opções sob XeTeX);
- restauro das captions PT (`Resumo`/`Referências`/`Figura`/`Tabela`) **depois** de
  `\selectlanguage` (o babel ini-based do tectonic não fornece estas captions);
- na edição EN gerada: rótulo `Correspondence:` (o `.cls` partilhado traz o rótulo PT hardcoded),
  separador de autores ` and ` (`\Authand`) e captions EN.

Estes patches **não alteram conteúdo editorial nem composição aprovada**.

### Figuras

As figuras fazem parte da edição canónica — não mudam sem decisão editorial explícita. A fonte real é
`tools/whitepaper-figures.py` (gera os 24 SVG; `rsvg-convert` produz os PDF de `latex/figures/`):
uma alteração manual apenas no SVG/PDF gerado é drift e é detectável. Estado congelado da Figura 4:
PT `configuração segura · MON-001` · EN `secure configuration · MON-001` (paridade protegida por guard).

### FROZEN — semântica

**FROZEN identifica a edição construída actualmente aprovada; não impede futuras revisões que
regressem primeiro à fonte portuguesa canónica.** Os hashes e a contagem de páginas do baseline
identificam **esta build**, não são regra editorial eterna: uma futura importação aprovada regenera
outputs, hashes e baseline **conscientemente** (regra stale-guard: actualiza-se o guard/baseline;
nunca se deforma o documento para satisfazer um guard antigo — e nunca se muda o baseline só porque
um renderer produziu inesperadamente outro número).

Baseline congelado actual (v1.0, edição Overleaf fiel):

| Edição | PDF | Páginas | SHA-256 |
|---|---|---|---|
| PT (canónica) | `banza-whitepaper-v1.0-pt.pdf` | 12 | `974c4783864977b1f9a35a9afda216edac098e1331ddef2995069bfae7bb5d6e` |
| EN (tradução oficial) | `banza-whitepaper-v1.0-en.pdf` | 12 | `a09ad7af20d851746c25bbf9bbf9a76d3916a8482f87dae68cca1e527ff39ede` |

Wording congelado da edição activa: PT contém «configuração segura do protocolo»; zero
«instanciação segura» e zero «instantâneo de observação» (âmbito: Whitepaper activo — não repo-wide).
A Equação (3) mantém exactamente o wording aprovado actual.

### Regra de release

> **release → inspecção → commit → verify.**

O `verify` constrói em directório temporário e **nunca** faz `git checkout`/restore destrutivo sobre
a fonte canónica (o incidente histórico em que um caminho de falha revertia `docs/whitepaper/latex`
foi eliminado; o guard de fronteira assegura que não regressa). `CHECKSUMS.txt` e `manifest.json`
são derivados automaticamente pelo release — nunca editados à mão.

### Regra de CI (absoluta)

> **Nenhum PR do Whitepaper é merged com CI failing ou pending — sem excepção**, mesmo que a falha
> pareça tooling/runner/ambiente (`pdfinfo`, rede, etc.). **Admin-merge não é mecanismo para
> contornar um CI vermelho conhecido**: corrige-se a infraestrutura ou re-executa-se, e só com
> `0 failing · 0 pending` se faz merge. Workflows que dependem de `pdfinfo` instalam
> `poppler-utils` explicitamente.

### Hash gate de publicação

Cada publicação futura reporta e exige `candidate = origin = edge`:

| Stage | PT | EN |
|---|---|---|
| candidate | sha256 | sha256 |
| deployed origin | sha256 | sha256 |
| public edge | sha256 | sha256 |

**Origin primeiro, edge depois:** se o edge está errado, verificar primeiro se o origin tem os bytes
correctos; só depois investigar CDN/cache/browser. Filenames públicos preservados
(`banza-whitepaper-v1.0-{pt,en}.pdf`) salvo decisão explícita; cache-busting só por mecanismo
controlado.

### Checklist para uma futura revisão editorial

- [ ] alterar/rever no Overleaf PT → aprovação → exportar projecto
- [ ] importar o PT canónico para `docs/whitepaper/latex/` (dossier tal-e-qual)
- [ ] comparar com a edição anterior (diff classificado)
- [ ] aplicar apenas patches gráficos explicitamente aprovados que não estejam no export
- [ ] `make whitepaper-release` (deriva pt.json + EN, compila, publica, manifest/checksums)
- [ ] QA visual PT página a página (título, autores, afiliação, resumo, equações, Figuras 1–12,
      captions, bibliografia, quebras, última página) — automação não substitui QA visual
- [ ] reconciliar `content/en.json` (tradução oficial) → EN gerado → QA visual EN
- [ ] actualizar conscientemente o baseline (páginas/wording) no guard, se a edição mudou
- [ ] `make whitepaper-verify` em árvore limpa · testes · PR · **CI 0/0** · merge
- [ ] deploy → hash no origin → hash no edge → browser QA

---

## Build — mecânica

## Motor canónico

**O motor canónico de publicação do Whitepaper BANZA v1.0 é LaTeX compilado com `tectonic` (XeTeX +
`xdvipdfmx`).** É o único fluxo que produz os PDFs publicados, o manifesto e os checksums.

O **Typst** (`docs/whitepaper/typst/whitepaper.typ`, via `tools/whitepaper-build.sh`) é apenas um
**preview não canónico / renderer experimental / verificação estrutural**. Produz uma composição
diferente (número de páginas e paginação distintos) e **nunca** publica, nunca escreve um caminho
publicado, nunca actualiza o manifesto nem os checksums. Não deve ser apresentado como produtor da
edição publicada.

## Comando único de publicação

```bash
make whitepaper-release      # = bash tools/whitepaper-release.sh
```

Executa, por ordem e falhando perante qualquer divergência:

1. valida `docs/whitepaper/content/pt.json` e `en.json`;
2. confirma a paridade estrutural PT/EN (secções, blocos, figuras, equações);
3. deriva `content/pt.json` (edição web) e o dossier EN (`whitepaper.en.tex`) do **dossier canónico português** (`docs/whitepaper/latex/whitepaper.pt.tex`, a edição Overleaf aprovada — classe copernicus) via `tools/whitepaper-pt-content.py` + `tools/whitepaper-en-dossier.py`;
4. compila PT e EN com `tectonic`;
5. aplica `SOURCE_DATE_EPOCH` derivado de `manifest.released_at` (2026-08-01 → `1785542400`);
6. composição fiel do dossier Overleaf (sem reescrita de layout); metadata verificada via `pdfinfo`;
7. produz os PDFs canónicos de **12 páginas** (verifica páginas, metadata, ausência de DRAFT, 0 referências/citações indefinidas, 0 overfull boxes, motor `xdvipdfmx`/`LaTeX`, ausência de `Typst`);
8. copia os PDFs para `website/public/whitepaper/` e `docs/whitepaper/pdf/`;
9. sincroniza a edição web (`website/content/whitepaper/{pt,en}.json`);
10. actualiza `docs/whitepaper/manifest.json` (SHA-256/bytes/páginas — idempotente; o histórico não é tocado) + espelho web;
11. actualiza `docs/whitepaper/CHECKSUMS.txt`;
12. executa `bash tools/check-banza-whitepaper.sh` (contrato + imutabilidade do manifesto + motor canónico);
13. falha perante qualquer divergência.

## Verificação de reprodutibilidade (sem escrever)

```bash
make whitepaper-verify       # = bash tools/whitepaper-release.sh --verify
```

Reconstrói PT+EN num directório temporário e **exige** que os SHA-256 sejam idênticos aos dos PDFs
committed; confirma também que os `.tex` committed estão em sincronia com `content/*.json`. **Não escreve
nada** e **aborta perante qualquer divergência**. É o comando seguro para CI e para um clone novo (ao
contrário de `whitepaper-release`, que reescreve os artefactos publicados). O `whitepaper-release` produz
e congela; o `whitepaper-verify` prova, sem alterar.

## Figuras

```bash
make whitepaper-figures      # = python3 tools/whitepaper-figures.py  (precisa de rsvg-convert)
```

As 24 figuras vectoriais (`docs/whitepaper/latex/figures/*.pdf`) são geradas a partir das SVG de fonte
única (`docs/whitepaper/figures/*.svg`) e são **activos committed**. Correr este comando apenas quando uma
SVG mudar; depois correr `make whitepaper-release`.

## Preview Typst (não canónico)

```bash
make whitepaper-preview      # = bash tools/whitepaper-build.sh
```

Escreve apenas para `docs/whitepaper/pdf/typst-preview/` (ignorado pelo Git), com marca de água DRAFT.
Nunca publica.

## Toolchain fixada (hermética)

- **tectonic — versão EXACTA `0.17.0`** (não `0.17.x`). `whitepaper-release`/`--verify` **abortam** se a
  `tectonic` não for exactamente `0.17.0`: o bundle TeX por omissão está trancado à versão do binário, pelo
  que qualquer outra versão pode mudar metadata, compressão, ordenação de objectos, fontes incorporadas ou o
  comportamento do `xdvipdfmx` — e portanto os hashes.
- **Binário fixado por SHA-256** — o job de CI `whitepaper-hermetic-verify` instala o binário oficial
  `tectonic-0.17.0-x86_64-unknown-linux-musl.tar.gz` e verifica
  `sha256 = 8533d07f9ccbd7a65824b9e0459041bca34af1eb33daba48f59215593753a3b7` antes de o usar.
- **Bundle TeX fixado explicitamente (não o implícito do binário)** — o build usa sempre
  `--bundle <URL imutável>`:
  - **URL imutável:** `https://data1.fullyjustified.net/tlextras-2022.0r0.tar`
    (a predefinição da tectonic 0.17.0, `relay.fullyjustified.net/default_bundle_v33.tar`, redirecciona para esta).
  - **Nome/versão:** `tlextras-2022.0r0` (default bundle v33) · **formato:** itar (tar indexado) ·
    **tamanho:** 2 881 562 112 bytes · **obtido:** 2022-09-25 (`ETag 0x8DA9F46055D4B6A`).
  - **Digest de conteúdo da tectonic (fixado + asserido):** `6ffe055852f8faf66c0acbe1a7fb27f87b869a90bad1204f3bf4d9683f597c7c`.
    O `whitepaper-release`/`--verify` **abortam** se o digest resolvido em `TECTONIC_CACHE_DIR` não for este.
  - **Offline:** `WP_OFFLINE=1` acrescenta `--only-cached` — nenhum acesso à rede durante a compilação
    (usa apenas o slice do bundle já em cache). O digest + o SHA-256 do output são o contrato de conteúdo:
    qualquer variação de bundle muda os bytes e falha o build.
- **Reprodutibilidade multi-plataforma comprovada** — a mesma `tectonic 0.17.0` produz PDFs byte-idênticos em
  macOS (arm64) e Linux (amd64, o runner de CI), incluindo um build **offline** (`--only-cached`); os hashes
  coincidem com os PDFs committed.

### Política de actualização do bundle/toolchain

Qualquer alteração de `tectonic` (versão/SHA) **ou** do bundle (URL/digest) é uma **alteração explícita da
toolchain**, nunca uma actualização transparente: exige actualizar os pins em `tools/whitepaper-release.sh`
+ `.github/workflows/identity-guard.yml` + este documento, correr `make whitepaper-release` (re-freeze das
SHA-256) e rever o diff. O bundle nunca é seleccionado implicitamente pelo binário nem obtido por uma URL
mutável/`latest`.
- **python3** — `tools/whitepaper-pt-content.py` + `tools/whitepaper-en-dossier.py` (derivações) + validação/serialização do manifesto.
- **rsvg-convert** — apenas `make whitepaper-figures`.
- **typst 0.12.0** — apenas o preview não canónico (opcional).

## Contrato de CI (obrigatório)

O job **`whitepaper-hermetic-verify`** (`.github/workflows/identity-guard.yml`) corre em cada push/PR sobre um
checkout limpo: instala a `tectonic 0.17.0` verificada por SHA-256, executa `make whitepaper-verify`
(reconstrói PT+EN, compara SHA-256 aos PDFs committed + manifesto + CHECKSUMS, confirma 12 páginas, metadata
LaTeX/xdvipdfmx e ausência de Typst) e termina com `git diff --exit-code`. Falha se um PDF committed não for
reproduzível, se um hash divergir, se o build alterar a árvore de trabalho, ou se a toolchain não corresponder.
O job `banza-whitepaper` (contrato + imutabilidade + motor canónico) corre em paralelo.

## Reprodutibilidade determinística

O build é byte-determinístico: `SOURCE_DATE_EPOCH` fixa `/CreationDate`/`/ModDate`; `z 0` remove a
compressão não determinística; `tectonic` empacota as fontes. Duas execuções em directórios limpos
distintos produzem SHA-256 idênticas, iguais às dos PDFs committed. Re-executar `make whitepaper-release`
numa árvore inalterada não cria diff no Git (idempotente).

### Verificar os hashes

```bash
make whitepaper-release          # reconstrói tudo
git status --porcelain           # deve ficar vazio (zero diff)
shasum -a 256 website/public/whitepaper/banza-whitepaper-v1.0-*.pdf
cat docs/whitepaper/CHECKSUMS.txt
```

Os SHA-256 impressos devem coincidir com `CHECKSUMS.txt` e com `docs/whitepaper/manifest.json`.

## Re-freeze de uma correcção (v1.0 mantida)

Editar `docs/whitepaper/content/{pt,en}.json`, correr `make whitepaper-release` (regenera PDFs +
manifesto + checksums) e cometer o resultado. `manifest.version` permanece `1.0` e
`manifest.released_at` permanece `2026-08-01`; adicionar uma entrada em `manifest.history` para
documentar o re-freeze. Uma alteração de conteúdo maior deve, em vez disso, incrementar a versão
(v1.0.1 / v1.1).

## Origem dos artefactos

- Conteúdo (fonte única): `docs/whitepaper/content/{pt,en}.json` (modelo de blocos).
- Figuras (fonte única): `docs/whitepaper/figures/*.svg` → PDFs vectoriais em
  `docs/whitepaper/latex/figures/*.pdf` (via `tools/whitepaper-figures.py`).
- `.tex` gerados: `docs/whitepaper/latex/whitepaper.{pt,en}.tex` + `references.bib`.
- PDFs publicados: `website/public/whitepaper/` (validados pelo guard) + `docs/whitepaper/pdf/`.
- Edição web: `website/content/whitepaper/` (espelho da fonte única).
