# Banzami Operational Scheme — Documento Canónico do Scheme

- **Status:** Canónico
- **Data:** 2026-07
- **Milestone:** M2.19C
- **Relacionado:** ADR-006 (Banzami Operational Scheme — operador designado), ADR-004 (arquitectura de
  três camadas), ADR-005 (certificação ≠ admissão ≠ autorização), ADR-007 (fronteira de estado
  regulatório + RealMoneyActivationGate), ADR-006 (conflito de interesses + separação), ADR-009 (licença
  & governação aberta — Banzami como criador/mantenedor inicial), ADR-035/053 (Operador Zero)

> **O BANZA é um protocolo financeiro aberto — e BANZA ≠ Banzami.** O protocolo (L1) e a certificação
> (L2) são neutros e não são propriedade, produto nem governação da Banzami. A Banzami é a **operadora
> designada** do primeiro scheme operacional construído sobre o BANZA (L3), condicionada à obtenção do
> enquadramento regulatório aplicável. Enquanto não existir evidência formal aplicável, os fundos reais,
> as carteiras reais, a liquidação real e os participantes reais permanecem **desactivados** (fail-closed).

Este documento é a forma canónica e legível da **ADR-006**. Complementa
[`BANZA_THREE_LAYER_ARCHITECTURE.md`](BANZA_THREE_LAYER_ARCHITECTURE.md) (a arquitectura) e
[`BANZA_REGULATORY_CLAIM_POLICY.md`](BANZA_REGULATORY_CLAIM_POLICY.md) (as afirmações públicas de estado
regulatório).

---

## 1. Propósito

A ADR-009 já nomeia a **Banzami — Tecnologia e Serviços, Lda.** como criadora e mantenedora
institucional inicial do protocolo aberto (um papel de governação/atribuição). A ADR-004 introduz uma
terceira camada institucional — o primeiro **scheme operacional** construído sobre o BANZA. Este
documento fixa quem opera esse scheme e, com igual importância, a fronteira que mantém o protocolo aberto
mesmo quando o seu criador é também o primeiro operador do scheme.

O risco a fechar é o colapso de três coisas distintas numa só marca: o **protocolo** (aberto, neutro), a
**certificação** (por implementação, não exclusiva) e o **scheme** (um operador, regulado). Se um leitor
concluir "BANZA = Banzami = o scheme = autorizado", perdem-se ao mesmo tempo a neutralidade do protocolo
e a fronteira regulatória.

## 2. O operador designado

**A Banzami — Tecnologia e Serviços, Lda. é a promotora, desenhadora, administradora pretendida e
operadora designada do Banzami Operational Scheme**, o primeiro scheme operacional construído sobre o
BANZA, condicionada à obtenção do enquadramento regulatório aplicável para operações com fundos reais.

Forma canónica: *"A Banzami é a operadora designada do Banzami Operational Scheme, condicionada à
obtenção do enquadramento regulatório necessário para operações com fundos reais."*

Esta designação **não** faz do BANZA um operador, **não** torna a certificação exclusiva do scheme e
**não** autoriza, por si só, qualquer operação com dinheiro real.

## 3. BANZA ≠ Banzami

O protocolo (L1) e o sistema de certificação (L2) são neutros e **não** são propriedade, produto nem
governação da Banzami. Nomear a Banzami como primeiro operador de scheme não faz do BANZA um
operador, um banco, um PSP ou um serviço financeiro; o BANZA continua a ser o que a ADR-001/003/059
define. A Banzami é um papel institucional/de scheme; não é apresentada como operador de pagamentos do
BANZA e não é adicionada ao conjunto de marcas normativas do protocolo.

## 4. Certificação não exclusiva do scheme

Uma implementação certificada pelo BANZA é certificada contra um perfil público e versionado (L2) —
nunca "certificada para o scheme da Banzami". Uma implementação pode ser certificada sem
alguma vez ser admitida a qualquer scheme, e a admissão ao scheme é uma determinação separada e posterior
(ADR-005). A certificação certifica uma **implementação**, nunca uma entidade.

## 5. Abertura a outros operadores e schemes

Outras entidades legalmente habilitadas podem adoptar o protocolo e operar schemes **independentes**. Forma canónica: *"A Banzami administra o primeiro scheme operacional baseado no BANZA. Outras
entidades legalmente habilitadas podem adoptar o protocolo e operar schemes independentes."*

A arquitectura **não pode** assumir que só existe, ou que só pode existir, um scheme ou um operador. A
existência do Banzami Operational Scheme é um facto do ecossistema, não uma exclusividade do protocolo.

## 6. Estado regulatório: `REGULATORY_AUTHORIZATION_IN_PROGRESS`

O estado interno da Banzami é `REGULATORY_AUTHORIZATION_IN_PROGRESS` (ADR-007). Este estado descreve
**preparação**, não conclusão.

**O que este estado significa:**

- a camada operacional (L3) encontra-se em **preparação regulatória**;
- a Banzami está a organizar-se internamente para, no futuro e mediante o enquadramento aplicável,
  operar um scheme com fundos reais.

**O que este estado NÃO significa** (nenhuma destas leituras é verdadeira hoje):

- que a autorização foi concedida;
- que existe aprovação do BNA ou de qualquer regulador;
- que uma licença está concluída;
- que existe reconhecimento regulatório;
- que existe operação financeira activa;
- que existe permissão para mover fundos ou liquidação real;
- que existem participantes reais activos.

## 7. Fail-closed de dinheiro real

Enquanto não existir evidência formal aplicável, todos os caminhos de dinheiro real permanecem **fechados
por omissão** (fail-closed), aplicado pelo RealMoneyActivationGate (ADR-007):

- **fundos reais** — desactivados;
- **carteiras reais** — desactivadas;
- **liquidação real** — desactivada;
- **participantes reais** — não activos;
- **clientes financeiros reais** — desactivados.

A activação de dinheiro real é uma decisão validada em Rust, condicionada a evidência formal aplicável;
nenhuma afirmação pública, nenhuma etapa técnica anterior e nenhuma explicação do modelo local a
desbloqueia. O Operador Zero é uma implementação de referência de demonstração (ADR-035/053) — nunca um
participante de scheme e nunca um caminho de dinheiro real.

## 8. Registo Técnico ≠ Directório de Participantes do Scheme

O **Registo Técnico do BANZA** (L2 — implementações, conformidade, interoperabilidade, certificação,
confiança, revogação, evidência) é distinto do **Directório de Participantes do Banzami Operational
Scheme** (L3). O registo técnico não depende do directório do scheme; a verificação pública
não requer conta na Banzami; e um item no registo técnico não implica participação em nenhum scheme.

## 9. Conflito de interesses (criador == primeiro operador)

Como a criadora do protocolo é também a primeira operadora de scheme, o conflito de interesses é tratado
**estruturalmente** e não por promessa (, ADR-006). A implementação própria da Banzami corre
exactamente o mesmo perfil público, as mesmas suites de conformidade e interoperabilidade, o mesmo motor
Rust, os mesmos reason codes, a mesma validade e a mesma revogação que qualquer outra implementação, e é
verificável de forma independente.

A Banzami **não** obtém:

- perfil reduzido;
- certificação privada;
- qualquer bypass;
- endpoint reservado;
- publicação sem evidência;
- override de FAIL→PASS;
- excepção secreta.

Os controlos detalhados de conflito de interesses e a separação de infraestrutura/chaves estão em
[`BANZA_THREE_LAYER_ARCHITECTURE.md`](BANZA_THREE_LAYER_ARCHITECTURE.md) (§8) e na ADR-006.

## 10. Continuidade do protocolo independente do scheme

Se o scheme da Banzami mudasse, pausasse ou cessasse comercialmente, o protocolo BANZA, as suas
especificações, motores, vectores, certificação e registo permaneceriam plenamente disponíveis a todos os
operadores. O critério de sobrevivência do ADR-001 aplica-se também à relação com o scheme: o
protocolo existe independentemente de qualquer operador, incluindo do operador designado do primeiro
scheme.

## 11. Frase pública prudente

A única fronteira pública admissível hoje, sobre o estado operacional, é prudente e afirma-se pela
preparação, não pela conclusão:

> *"A camada operacional encontra-se em preparação regulatória. Os pagamentos reais permanecem
> desactivados."*

A Banzami **não** deve ser apresentada, em nenhuma superfície pública, como já autorizada, licenciada ou
aprovada pelo regulador competente. As regras completas sobre o que pode e o que não pode ser afirmado
publicamente — incluindo o portão para uma futura afirmação de "em processo de autorização junto do BNA"
— estão em [`BANZA_REGULATORY_CLAIM_POLICY.md`](BANZA_REGULATORY_CLAIM_POLICY.md).

## 12. Referências

- ADR-006 (Banzami Operational Scheme) · ADR-004 (arquitectura de três camadas) · ADR-005 (certificação
  ≠ admissão ≠ autorização) · ADR-007 (fronteira de estado regulatório + RealMoneyActivationGate) ·
  ADR-006 (conflito de interesses + separação de infraestrutura/chaves) · ADR-009 (licença & governação
  aberta) · ADR-035/053 (Operador Zero)
- [`BANZA_THREE_LAYER_ARCHITECTURE.md`](BANZA_THREE_LAYER_ARCHITECTURE.md) ·
  [`BANZA_REGULATORY_CLAIM_POLICY.md`](BANZA_REGULATORY_CLAIM_POLICY.md) ·
  [`BANZA_REGULATORY_POSITIONING.md`](BANZA_REGULATORY_POSITIONING.md)
