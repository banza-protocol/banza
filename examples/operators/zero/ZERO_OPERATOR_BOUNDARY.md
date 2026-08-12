# Operador Zero — fronteira

> O Operador Zero não é banco, não é PSP, não é carteira, não é operador financeiro licenciado e não
> movimenta dinheiro real. É a implementação de referência canónica, **só de leitura**, do protocolo
> BANZA: expõe identidade, manifest, chaves públicas, metadata, evidência e estado — e nada mais.

## Porque esta página existe

A implementação de referência publica manifest, chaves, evidência de conformidade, metadata de federação
e evidence bundle, e é servida no domínio do próprio protocolo. Essa semelhança é o risco. O perigo real
não é alguém confundir hoje a referência com um operador real — a marcação é pesada. É a **erosão**: uma
fase futura acrescenta uma conveniência, a marcação falha numa superfície, e a coisa deixa discretamente
de parecer uma implementação de referência só de leitura.

`make operator-zero-check` existe para isso, e falha fechado.

## O que é garantido, e por quem

| Garantia | Quem a impõe |
|---|---|
| Todo artefacto tem `demo_only: true`, `monetary_value: false`, `production_allowed: false` | `boundary.rs` + o guard |
| A única moeda é `KZ_DEMO` — unidade de demonstração, sem valor real | `ledger.rs` recusa qualquer outra; o guard varre a árvore |
| Nenhuma chave privada, seed ou token é committada | `boundary.rs` + o guard |
| Nenhum artefacto se diz certificado, aprovado, licenciado ou autorizado | `boundary.rs`, a olhar para valores string com negação |
| A referência nunca aparece em `/operators` como operador real | o guard |
| A superfície é só de leitura: não corre simulação nem tem ledger mutável | ADR-067; a copy nunca diz outra coisa |
| Uma validação é evidência técnica local | ADR-067; a copy nunca diz outra coisa |

## O que uma validação significa

Que os motores Rust verificaram algo verificável, localmente, quando uma pessoa a inicia no modo de
validação do BanzAI (`/banzai?mode=validation&target=operator-zero&workflow=full`). Não é certificação,
não é aprovação, não é licença e não confere estatuto a ninguém. A distinção é a mesma que o protocolo já
faz para a conformance suite.

## A referência e o operador real

> **O Operador Zero prova como uma implementação do protocolo BANZA se apresenta.**
>
> A fronteira é esta: é uma implementação de referência — nunca um operador real, publicado ou
> autorizado. Não é participante do scheme operacional (Camada 3) e nunca aparece em `/operators` como operador
> real. O modelo canónico actual está no
> [ADR-067](../../../decisions/adr/ADR-067-operador-zero-read-only-reference-and-banzai-validation-workbench.md).

São coisas separadas e devem continuar a sê-lo. O Operador Zero é uma implementação de referência sem
enquadramento legal porque não precisa de nenhum — não move dinheiro e não corre um ledger mutável. Um
operador real terá a sua própria questão de licenciamento e o seu próprio risco. Confundir os dois seria
a leitura mais danosa desta arquitectura.

O enquadramento anterior — em que o Operador Zero foi descrito de outra forma — está no
[ADR-052](../../../decisions/adr/ADR-052-operador-zero-reference-payment-operator-simulator.md), cujo nome
de ficheiro conserva "simulator" apenas como identificador arquival estável; esse enquadramento foi
**substituído pelo ADR-067**. A comparação institucional, com os nomes, vive apenas no ADR-052, por
decisão explícita: o nome de um operador comercial não entra em artefactos, endpoints, UI, runtime,
workspace clonado nem `/operators`.
