# Fase M2.3 — Redesenho do trust model do reference e supersessão de ADRs (2026-07)

Relatório da fase que remove BANZA CA, certificado de operador e aprovação humana do **modelo de protocolo
profundo** — o reference público e os ADR-022/026/027 — e os substitui por um modelo de trust baseado em
evidência.

---

## 1. Decisão arquitectural

> **BANZA é um protocolo financeiro aberto. A participação de operadores não depende de uma autoridade
> humana central, certificado emitido pela BANZA ou aprovação humana. Operadores independentes implementam
> o protocolo, publicam manifests, expõem endpoints compatíveis e produzem evidência verificável de
> conformidade. O trust do protocolo é baseado em signed protocol metadata, conformance evidence, public
> protocol registry, trust root, delegated signing keys e revocation/fail-closed.**

M2.2 removeu a BANZA CA da **arquitectura activa**. M2.3 remove-a do **modelo de protocolo**: era lá que o
certificado não era linguagem, era **maquinaria**.

## 2. O que estava errado — e porquê era protocolar, não redaccional

O reference definia o encaminhamento de federação assim:

> ~~Verificação Tripla = Registo Público + certificado válido + ausência do BRL~~

Três defeitos independentes:

1. **O encaminhamento dependia de um artefacto que a BANZA emitia.** Um operador só podia federar se a
   BANZA lhe tivesse emitido um certificado — isto é permissão central, escrita como criptografia.
2. **A cadeia de assinatura afirmava um *estatuto de participante*.** «Este operador é aceitável» é um
   juízo; um protocolo aberto só pode afirmar «este material é autêntico e actual».
3. **Lia-se como autorização regulatória.** «Certificado pela BANZA» sugere permissão para prestar serviços
   financeiros — que o BANZA não pode dar e nunca deu.

E o ADR-026 dizia-o à letra: *«there is a mandatory human approval step at BANZA»*.

## 3. O modelo novo — Open Trust Evaluation

Dez verificações **conjuntivas**, corridas **localmente** por quem encaminha, sobre material que o **próprio
operador publica**, todas **fail-closed**:

| # | Verificação | Prova | **Não** prova |
|---|---|---|---|
| 1 | operator manifest válido | o operador declarou o que implementa | que alguém o aceitou |
| 2 | versão de protocolo compatível | compatibilidade | autorização |
| 3 | signed protocol metadata | o material do protocolo é autêntico | que o operador está autorizado |
| 4 | conformance evidence válida | o que a implementação faz | aprovação |
| 5 | assinatura trust root / chave delegada | a cadeia resolve até à raiz activa | estatuto do participante |
| 6 | ausência da revocation list | sem sinal de segurança activo | licença |
| 7 | capabilities compatíveis | cobre a interacção | permissão |
| 8 | contrato de endpoint compatível | os endpoints satisfazem o contrato | certificação |
| 9 | frescura da evidência dentro da política | a evidência é actual | validade perpétua |
| 10 | fail-closed em material ausente/inválido/expirado/revogado/incompatível | nunca há passagem por defeito | — |

**Nenhum passo é aprovação humana, licença ou certificação de operador.** O resultado é uma decisão local
sobre **uma interacção** — nunca um juízo sobre a entidade. A frescura da evidência faz, sem emissor, o que
a expiração de certificados a ≤90 dias fazia.

## 4. ADR-first — a mudança nasceu em ADR

| ADR | Título | Papel |
|---|---|---|
| **ADR-038** | Open Protocol Trust Model Without CA | a decisão; supersede ADR-022 (parte de trust/certificado), ADR-026 (integral), ADR-027 (parte CA/human-gated) |
| **ADR-039** | Operator Self-Publication and Machine-Verifiable Conformance | como o operador demonstra compatibilidade sem ninguém o aceitar |
| **ADR-040** | Federation Trust Evaluation Without Certificates | as dez verificações, fail-closed, frescura |

**ADR-022/026/027**: corpo **intacto**, `Status:` marcado superseded, banner de supersessão, `Superseded
by:` coerente, espelhados em `website/content/decisions/adr/`. História registada, não apagada. A
arquitectura da chave raiz do ADR-027 **mantém-se** — só a parte CA/human-gated caiu.

## 5. O que mudou

### Engine novo — `engines/banza-reference-trust-model`

`validate_reference_trust_model` calcula o estado **em Rust** e detecta estruturalmente: dependência da
autoridade removida, **trust baseado em certificado**, aprovação humana, a **verificação tripla legacy** e
afirmação de rede permissionada. 12 estados, 11 fixtures, **31 testes**, WASM, job de CI, fail-closed.

A **supersessão dos ADRs é uma condição verificada por máquina**, não uma afirmação em prosa: um ADR
marcado sem nomear o que o substitui bloqueia o modelo. As dez verificações de federação são igualmente
verificadas — largar uma é `INCOMPLETE`.

Duas isenções (`deprecated_terms_inventory`, `adr_supersession_summary`) são aplicadas **só no topo** —
aninhar a chave não compra isenção (regressão da M2.2 pinada em teste).

### Reference público

`website/content/BANZA_REFERENCIA.md` (canónico PT, 3004→3063 linhas) redesenhado secção a secção: §6
*Certificação* → **Conformidade e Evidência**; §5 *Certificados de Operador* → **Metadata de Protocolo
Assinada**; §8 *Regra de Verificação Tripla* → **Avaliação Aberta de Confiança**; Registo reframed como
índice verificável gerado por regras públicas, replicável, sem adição/remoção discricionária; BRL como sinal
de segurança. Espelho `docs/reference/pt/completa.md` sincronizado (2 diffs intencionais). EN
`docs/reference/en/complete.md` em paridade (1476→1658). `README.md` perde o papel «BANZA CA =
Certification Authority». `manifesto`/`overview`/`getting-started`/`conformance`/`BANZA_TERMINOLOGY_PT`
alinhados — a terminologia passa a **mapear** os termos removidos.

Dois anchors partidos **antes** desta fase foram reparados de passagem.

### Docs, schemas, SVGs, Evidence Bundle, Assistente

`FEDERATION_TRUST_MODEL.md`, `PUBLIC_PROTOCOL_REGISTRY.md`, inventário M2.3;
`LEGACY_CERTIFICATES_ROUTE_COMPATIBILITY.md` endurecido (`production_certificates=false` como permanente,
não transitório). Schema novo `federation-trust-evaluation.production.schema.json` (as dez verificações +
`outcome: ROUTING_ALLOWED|FAIL_CLOSED` + fronteira). Evidence Bundle aceita `reference_trust_model_report`.
Assistente ganha `reference_trust_model`, `registry_and_revocation`, `adr_supersession` + 4 casos fixados.
Workbench: secção **M2.3 · Reference Trust Model**. 4 SVGs (SVG-P-063..066).

### Guard — a pendência de M2.2 fecha aqui

`tools/check-open-governance.sh` passa a cobrir **o reference (PT canónico + espelho + EN), o README e os
docs de referência** — exactamente o que M2.2 listou como pendente. Regra nova para a Verificação Tripla.

Fora de âmbito **por desenho**, com razão registada no cabeçalho: `decisions/adr/` (um ADR superseded
preserva o modelo antigo como história; um ADR que supersede tem de descrever o que substitui — e a
supersessão é verificada pelo motor, o que um grep não faria) e `engines/` (deny-lists; os outputs reais são
pinados por cargo tests, que valem mais do que um grep sobre a fonte).

---

## 6. Bugs encontrados durante a fase

| # | Bug | Impacto | Correcção |
|---|---|---|---|
| 1 | O espelho PT (`docs/reference/pt/completa.md`) **não foi sincronizado** — o agente só editou o canónico. | O espelho publicado manteria 47 ocorrências do modelo antigo enquanto o canónico dizia o contrário. | Sincronizado do canónico, com os 2 diffs locais restaurados. |
| 2 | O allowlist do guard era **só português**; o reference agora é bilingue. | «not by central human approval» (a frase mandatada!) e «not with a gatekeeper» liam-se como afirmações. | Negações inglesas (`not`, `no`, `nobody`) + marcadores de contraste (`unlike`, `face a`, `diferença`). |
| 3 | **Brackets multibyte no allowlist** (`substitu[ií]d`, `hist[óo]ric`, `ningu[ée]m`, `ao contr[áa]rio`) — mortos sob BSD grep (macOS), vivos sob GNU grep (CI). | A mesma armadilha que mordeu M2.2 duas vezes: eu tinha corrigido os *padrões* e deixado o *allowlist*. Divergência local/CI. | Todas as formas acentuadas passaram a alternações completas. |
| 4 | Janela de negação de 45 chars curta demais. | «The former rule gated routing on a Public Registry entry plus a valid certificate» (~55) reportava. | 90 chars. |
| 5 | `superseded` e `substituíd` não eram marcadores de depreciação. | O registo de supersessão do próprio reference reportava. | Adicionados — mantendo `substitui` (presente) **fora**, que é o que fechou o buraco da M2.2. |
| 6 | A **cópia mandatada do Workbench** nomeia «BANZA CA» numa negação; a regra CA é negação-agnóstica por desenho. | O meu próprio guard bloqueava o meu próprio texto. | A frase mandatada mantém-se, com marcador de remoção inline — mais exacto e legível por máquina. |
| 7 | Colisão de IDs SVG: quatro agentes paralelos leram o mesmo `next free` obsoleto. | Dois diagramas reclamavam SVG-P-066. | Resolvida pelos próprios agentes (063–066); verificado: cada ID tem exactamente um dono. |

## 7. Testes

- **Rust**: 19/19 engines verdes. `banza-reference-trust-model` **31** (fixture→estado, as cinco detecções,
  supersessão de ADRs, as dez verificações, precedência, fail-closed, flags, determinismo/hash, schema).
  Regressões dos fail-opens da M2.2 pinadas: strings soltas em arrays, isenção aninhada, summaries vazios.
- **Website**: 143 vitest, tsc limpo, `next build` OK.
- **Guards**: open-governance (já com o reference em âmbito), private-key-leak, regulatory, identity,
  purity, invariant, rust-rule, rust-engine, rust-final-closure, conformance-rs, simb-rs, reference-svg.
- Guard verificado nos dois sentidos: apanha 3 regressões injectadas **no reference** (5 categorias), passa
  quando limpo, e sai 2 se a própria lógica se partir.

## 8. Confirmações negativas

Não criou operador, não aceitou/aprovou/certificou operador, não emitiu certificado nem licença, não activou
federação nem integração externa, não processou pagamentos, não liquidou nem movimentou fundos, não deteve
fundos. `/operators` permanece `[]`. `production_certificates` permanece `false`. Nenhuma private key real.
Sem `.env`/DNS/Cloudflare/TLS/Postgres/secrets. Provider mock; sem Qwen, sem DeepSeek. `llm_calls = 0`,
`external_model_called = false`. Deploy website-only.

O BANZA permanece protocolo financeiro aberto: não aceita, aprova ou certifica operadores, não emite
licença, não presta serviços financeiros e não movimenta fundos.
