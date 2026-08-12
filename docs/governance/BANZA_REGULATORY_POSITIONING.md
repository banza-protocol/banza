# BANZA — Regulatory Positioning

> **BANZA é um protocolo financeiro aberto. O BANZA não é operador financeiro, não é PSP, não presta
> serviços de pagamento, não processa transacções, não liquida valores, não movimenta fundos e não detém
> fundos. Os serviços financeiros são prestados por operadores autorizados que implementam o protocolo.**

Este documento fixa a posição regulatória canónica do BANZA. Complementa
[`BANZA_PROTOCOL_BOUNDARY.md`](BANZA_PROTOCOL_BOUNDARY.md) (linguagem canónica) e
[`certification-boundary.md`](certification-boundary.md) (fronteira da certificação).

## Permanent Protocol Identity

O posicionamento do BANZA é **permanente** e afirma-se pela positiva: o BANZA **é e continuará a ser** um
protocolo financeiro aberto. O BANZA **não é** operador financeiro, PSP, banco, carteira nem prestador de
serviços financeiros; **não** processa, **não** liquida, **não** movimenta e **não** detém fundos; **não**
presta serviços financeiros ao público; **não** emite licença e **não** substitui o regulador. A
conformidade do protocolo é demonstrada por evidência verificável, não por autorização regulatória. Os
operadores autorizados são **entidades
separadas** que implementam o protocolo e assumem os serviços financeiros que prestam. Esta natureza não é
uma fase — é a identidade do projecto. Não a descreva como algo que se deva «evitar transformar»: prefira
**preservar a natureza do BANZA como protocolo financeiro aberto** e **manter a fronteira protocolo/
operador**.

## Posição

- **O BANZA é um protocolo financeiro aberto** para interoperabilidade, conformidade e evidência em
  pagamentos.
- **O BANZA não é prestador de serviços de pagamento.** Não é PSP, banco, carteira, emissor de moeda
  electrónica nem adquirente.
- **O BANZA não presta serviços financeiros** ao público.
- **O BANZA não processa, não liquida, não movimenta nem detém fundos.** Não gere saldos e não executa
  transacções reais. O protocolo não tem qualquer componente na trajectória do dinheiro.
- **O BANZA não é uma entidade licenciada como PSP.** O protocolo, enquanto especificação aberta, não
  precisa — e não pode — de licença como prestador de serviços de pagamento.
- **Os operadores que implementam o BANZA para prestar serviços financeiros reais podem estar sujeitos a
  licença/autorização.** O enquadramento regulatório é do operador, perante o regulador competente.
- **O operador de referência, se e quando prestar serviços financeiros reais, deve tratar do seu próprio
  enquadramento** (licença/autorização) — separadamente do protocolo.
- **A conformidade do protocolo não substitui o regulador.** A demonstração de conformidade do protocolo
  é técnica; não é autorização financeira.
- **O evidence bundle não é licença.** É evidência técnica reproduzível.
- **A readiness não é aprovação.** `L0`/`L1`/`L2`/`L3` são preparação/conformance, não produção.

## O que este documento NÃO afirma

Para evitar leituras incorrectas, este documento **não** afirma — e o projecto **não deve** afirmar — que:

- o BANZA precisa de licença;
- o BANZA será submetido a autorização como PSP;
- o BANZA é operador de sistema de pagamentos;
- o BANZA gere uma rede de pagamentos real;
- o BANZA autoriza operadores financeiros;
- a conformidade do protocolo substitui o regulador.

## Onde a licença/autorização se aplica

| Entidade | Enquadramento |
|---|---|
| **Protocolo BANZA** (esta especificação) | Nenhuma licença de PSP — é um protocolo aberto. |
| **Operador** que presta serviços financeiros reais | Licença/autorização do regulador competente, da responsabilidade do operador. |
| **Bancos / PSPs / instituições autorizadas** | O seu próprio enquadramento regulatório. |
| **Conformidade do protocolo** | Demonstração técnica de conformidade — não autorização regulatória. |

> **Regra obrigatória.** Qualquer licença, autorização ou enquadramento regulatório pertence ao operador
> que presta serviços financeiros reais usando o protocolo, não ao protocolo BANZA em si.

## Estado actual

Pré-produção: `/operators = []` (nenhum operador com evidência de conformidade publicada e indexada),
`production_certificates = false`, marcos M2/M3 pendentes, provider mock, sem chamadas externas por
defeito. Nenhum operador tem evidência de conformidade publicada, `production_certificates` permanece
`false` e nenhum fundo é movido pelo protocolo.
