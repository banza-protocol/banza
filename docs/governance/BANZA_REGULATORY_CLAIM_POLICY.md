# BANZA — Política de Afirmações Regulatórias

- **Status:** Canónico
- **Data:** 2026-07
- **Milestone:** M2.19C
- **Relacionado:** ADR-062 (fronteira de estado regulatório + RealMoneyActivationGate), ADR-060 (Banzami
  Operational Scheme), ADR-059 (arquitectura de três camadas), ADR-061 (certificação ≠ admissão ≠
  autorização), ADR-063 (conflito de interesses + separação)

> **O BANZA é um protocolo financeiro aberto e não precisa — nem pode — de licença como prestador de
> serviços de pagamento.** Qualquer licença, autorização ou enquadramento regulatório pertence ao
> operador que presta serviços financeiros reais, perante o regulador competente. Esta política governa,
> especificamente, o que pode e o que não pode ser afirmado publicamente sobre o **estado regulatório da
> Banzami** enquanto operadora designada da camada operacional (L3).

Este documento é a política canónica sobre afirmações regulatórias. Deriva da ADR-062 e complementa
[`BANZAMI_OPERATIONAL_SCHEME.md`](BANZAMI_OPERATIONAL_SCHEME.md),
[`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md) e
[`BANZA_THREE_LAYER_ARCHITECTURE.md`](BANZA_THREE_LAYER_ARCHITECTURE.md). O guard
`banza-regulatory-state-claim-check` (M2.19C) faz cumprir esta política sobre as superfícies públicas.

---

## 1. Âmbito e propósito

Esta política aplica-se a **todas as superfícies públicas** — website, Reference, respostas do BanzAI,
material institucional — sempre que se refira ao estado regulatório da camada operacional (L3) ou da
Banzami como operadora designada. O seu propósito é impedir que o projecto afirme, sugira ou dê a
entender um estado regulatório que **não existe hoje**.

A política **não** altera o posicionamento do protocolo: o BANZA continua a ser um protocolo aberto que
não é PSP, não processa, não liquida e não movimenta fundos (ver
[`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md)). Esta política acrescenta a
disciplina de linguagem específica da camada operacional.

## 2. Princípio: prudência regulatória

O estado regulatório afirma-se pela **positiva e pela preparação**, nunca pela conclusão presumida. Nada
sobre autorização, licença ou aprovação é afirmado sem **evidência formal aplicável**. Na ausência de
tal evidência, a única leitura admissível é: a camada operacional está em preparação, e o dinheiro real
está desactivado.

## 3. O estado interno

O estado interno da Banzami é `REGULATORY_AUTHORIZATION_IN_PROGRESS` (ADR-062). Este estado descreve
preparação. **Não** significa: autorização concedida; aprovação do BNA; licença concluída;
reconhecimento regulatório; operação financeira activa; permissão para mover fundos; liquidação real; ou
participantes reais activos. Enquanto não existir evidência formal aplicável, todos os caminhos de
dinheiro real permanecem fechados por omissão (RealMoneyActivationGate, ADR-062).

## 4. Frases proibidas

Nenhuma superfície pública pode afirmar, sugerir ou dar a entender qualquer uma das seguintes leituras.
Estas frases são **proibidas** porque descrevem um estado que não existe:

| Categoria | Frase proibida (exemplo) | Porquê é proibida |
|---|---|---|
| Autorização concedida | «a Banzami já está autorizada» · «autorização concluída» | a autorização não foi concedida |
| Aprovação do regulador | «aprovada pelo BNA» · «com aval do BNA» · «reconhecida pelo BNA» | não existe aprovação do BNA |
| Licenciamento | «licenciada» · «Banzami, operador licenciado» · «com licença de PSP» | não existe licença |
| Reconhecimento regulatório | «reconhecida pelo regulador» · «entidade regulada» | não existe reconhecimento aplicável |
| Operação activa | «pagamentos reais disponíveis» · «carteiras a operar» · «liquidação em produção» | o dinheiro real está desactivado (fail-closed) |
| Participantes reais | «operadores/participantes reais na rede» | não existem participantes reais activos |
| Símbolo/insígnia | qualquer selo, símbolo ou marca que implique aprovação do BNA | implicaria aprovação que não existe |

Também é proibido apresentar a **certificação técnica** (L2) como se fosse licença, admissão ao scheme ou
autorização regulatória (ADR-061), e apresentar o **BANZA** como necessitando de licença ou como operador
(ver [`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md)).

## 5. Frase permitida (prudente)

A frase pública prudente admissível hoje sobre o estado operacional é:

> *"A camada operacional encontra-se em preparação regulatória. Os pagamentos reais permanecem
> desactivados."*

São igualmente admissíveis formulações equivalentes que afirmem preparação e a desactivação do dinheiro
real, sem sugerir autorização, aprovação, licença ou reconhecimento.

## 6. O portão para uma futura afirmação "em processo de autorização junto do BNA"

Uma afirmação pública de que a Banzami está **"em processo de autorização junto do BNA"** só é admissível
se **todas** as condições seguintes se verificarem em simultâneo. Enquanto **qualquer uma** falhar, a
afirmação é proibida.

| # | Condição | Estado hoje |
|---|---|---|
| G-1 | Existe **evidência documental aplicável** do processo junto do BNA. | não existe |
| G-2 | Existe **autorização dos fundadores** para publicar a afirmação. | não existe |
| G-3 | O texto foi **revisto** (redacção específica revista antes de publicar). | não existe |
| G-4 | A afirmação **não contém informação confidencial**. | não aplicável enquanto G-1 falha |
| G-5 | A afirmação **não é legível como autorização já concedida** — descreve processo, nunca conclusão. | não aplicável enquanto G-1 falha |

**Nenhuma destas condições existe hoje.** Por conseguinte, **não publicar qualquer linguagem de "BNA"**:
não afirmar, sugerir ou dar a entender qualquer relação, processo, aprovação ou aval do BNA. Até que as
cinco condições se verifiquem, mantém-se apenas a frase prudente da §5.

Mesmo quando admissível, uma afirmação "em processo de autorização" descreve **preparação/processo** —
nunca autorização concedida (G-5) — e não desbloqueia dinheiro real, que continua governado pelo
RealMoneyActivationGate (ADR-062) independentemente de qualquer afirmação pública.

## 7. Desacoplamento de dinheiro real

Nenhuma afirmação regulatória, admissível ou não, activa dinheiro real. A activação de fundos reais,
carteiras reais, liquidação real e participantes reais é governada exclusivamente pelo
RealMoneyActivationGate (ADR-062), validado em Rust e condicionado a evidência formal aplicável. Afirmação
pública e activação técnica são planos separados: uma nunca implica a outra.

## 8. Quem decide

- **Rust valida antes de publicar.** O estado regulatório e as afirmações públicas são validados pelos
  motores Rust antes de qualquer publicação; um estado ou afirmação que não cumpra esta política é
  bloqueado (ADR-037/059).
- **A decisão de publicar uma afirmação regulatória nova requer autorização dos fundadores** (G-2), além
  de todas as demais condições da §6.
- **O Qwen local nunca decide nem publica.** Explica uma vez, em linguagem natural; nunca altera o estado
  regulatório, nunca publica uma afirmação e nunca substitui o regulador.

## 9. Enforcement

Esta política é sujeita a enforcement automático (M2.19C):

- `banza-regulatory-state-claim-check` — verifica que as superfícies públicas não afirmam autorização,
  aprovação do BNA, licenciamento ou reconhecimento inexistentes;
- `make regulatory-check` — mantém o BANZA posicionado como protocolo aberto, não como PSP/operador
  licenciado, nas superfícies renderizadas ao público;
- os guards de contaminação/identidade mantêm a separação BANZA ≠ Banzami e barram marcas de operador de
  pagamentos.

## 10. Referências

- ADR-062 (fronteira de estado regulatório + RealMoneyActivationGate) · ADR-060 (Banzami Operational
  Scheme) · ADR-059 (arquitectura de três camadas) · ADR-061 (certificação ≠ admissão ≠ autorização) ·
  ADR-063 (conflito de interesses + separação)
- [`BANZAMI_OPERATIONAL_SCHEME.md`](BANZAMI_OPERATIONAL_SCHEME.md) ·
  [`BANZA_THREE_LAYER_ARCHITECTURE.md`](BANZA_THREE_LAYER_ARCHITECTURE.md) ·
  [`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md) ·
  [`BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md)
