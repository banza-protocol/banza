# BANZA — Arquitectura Multilíngue (Fase Futura)

**Document ID:** BANZA-MULTILINGUAL-ARCH-001  
**Data:** 2026-06-01  
**Estado:** Rascunho — Arquitectura Futura  
**Autoridade:** BANZA-LANGUAGE-POLICY-001

---

## Sumário

Este documento define a arquitectura para o suporte multilíngue futuro do website BANZA. **Nenhuma implementação é necessária agora.** O objectivo é estabelecer a estrutura para que a adição de `/en` (e eventualmente outras línguas) seja uma extensão limpa da arquitectura actual, sem quebrar URLs canónicas portuguesas.

---

## Princípio de Design

**A estrutura URL canónica é em português.**

```
/                          → Homepage (pt — canónico)
/certificacao              → Secção de certificação (pt)
/federacao                 → Secção de federação (pt)
/confianca                 → Secção de confiança (pt)
/reference                 → Referência completa (pt)
```

**As traduções habitam sub-caminhos de língua.**

```
/en/                       → Homepage (en — tradução oficial)
/en/certification          → Certification section (en)
/en/federation             → Federation section (en)
/en/trust                  → Trust section (en)
/en/reference              → Full reference (en)
```

Regra: URLs canónicas portuguesas **nunca mudam**. Adicionar suporte a inglês não altera nenhuma URL existente.

---

## Estrutura de Implementação Futura

### Opção A — `next-intl` (Recomendado)

```
website/
  app/
    [locale]/              ← novo parâmetro de rota dinâmica
      page.tsx             ← homepage localizada
      [section]/
        page.tsx           ← secções localizadas
      reference/
        page.tsx
      ...
  messages/
    pt.json               ← strings de UI portuguesas (canónicas)
    en.json               ← strings de UI inglesas (tradução)
  middleware.ts            ← detecção de língua + redireccionamento
```

O português é a língua por defeito — sem prefixo de caminho. O inglês tem prefixo `/en`.

```typescript
// middleware.ts
const locales = ['pt', 'en']
const defaultLocale = 'pt'

// / → serve pt
// /en → serve en
// /en/certification → serve en
```

### Opção B — Rotas Paralelas (Sem Dependências Externas)

```
website/
  app/
    page.tsx               ← homepage portuguesa (canónica)
    en/
      page.tsx             ← homepage inglesa
      certification/
        page.tsx
      ...
    [section]/
      page.tsx             ← secções portuguesas
```

Mais simples. Sem biblioteca de internacionalização. Duplicação de código mas estrutura explícita.

---

## Ficheiro de Fonte de Conteúdo

| Língua | Fonte | Estado |
|--------|-------|--------|
| Português (canónico) | `docs/reference/pt/completa.md` | v1.0 — Oficial |
| Inglês (tradução) | `docs/reference/en/complete.md` | v1.0 — Tradução oficial |

As secções do website em português são sempre derivadas de `docs/reference/pt/completa.md`. As secções em inglês são derivadas de `docs/reference/en/complete.md`. Nunca o contrário.

---

## Tags `hreflang`

Quando implementado, cada página deve incluir tags `hreflang`:

```html
<link rel="alternate" hreflang="pt" href="https://banza.network/certificacao" />
<link rel="alternate" hreflang="en" href="https://banza.network/en/certification" />
<link rel="alternate" hreflang="x-default" href="https://banza.network/certificacao" />
```

O `x-default` aponta sempre para a versão portuguesa canónica.

---

## URL Canónica para SEO

```html
<!-- Em qualquer página PT -->
<link rel="canonical" href="https://banza.network/certificacao" />

<!-- Em qualquer página EN -->
<link rel="canonical" href="https://banza.network/en/certification" />
```

---

## Mapeamento de Slugs PT → EN

| Português (canónico) | Inglês (tradução) |
|----------------------|-------------------|
| `/introducao` | `/en/introduction` |
| `/por-que-o-banza-existe` | `/en/why-banza-exists` |
| `/principios-fundamentais` | `/en/core-principles` |
| `/certificacao` | `/en/certification` |
| `/federacao` | `/en/federation` |
| `/confianca` | `/en/trust` |
| `/banzai` | `/en/banzai` |
| `/operadores` | `/en/operators` |
| `/recursos-para-programadores` | `/en/developer-resources` |
| `/governacao` | `/en/governance` |
| `/roteiro` | `/en/roadmap` |
| `/perguntas-frequentes` | `/en/faq` |

---

## Pré-Requisitos para Implementação

1. `docs/reference/en/complete.md` deve estar sincronizado com `docs/reference/pt/completa.md` em conteúdo e estrutura
2. O sistema de ficheiros `reference.ts` precisa de suportar selecção por língua
3. As strings de UI devem ser extraídas de todos os componentes para `messages/pt.json`
4. Decisão sobre biblioteca: `next-intl` (Opção A) vs. rotas paralelas (Opção B)

---

## O Que Não Mudar

- Slugs de URL portugueses nunca são renomeados para inglês
- `docs/reference/pt/completa.md` mantém-se como fonte canónica
- `lang="pt"` mantém-se como atributo HTML raiz para URLs sem prefixo
- A metadata SEO primária permanece em português

---

## Autoridade

BANZA-LANGUAGE-POLICY-001 — Português é a língua canónica do BANZA v1.0. Esta arquitectura estende essa decisão para o suporte a línguas adicionais sem comprometer a canonicalidade do português.
