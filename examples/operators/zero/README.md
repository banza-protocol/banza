# Operador Zero

**Implementação de referência canónica, só-leitura, do protocolo BANZA (ADR-041).**

> O Operador Zero é a única implementação de referência canónica do protocolo BANZA. A sua superfície
> pública expõe identidade, manifest, capabilities, endpoints, metadata, chaves públicas, relatórios,
> evidência e estado de certificação — e nada mais. Não corre simulação, não expõe ledger mutável, não
> executa conformidade/trust/federação, não constrói evidence bundles e não pratica qualquer acção de
> certificação. Responde a mensagens de protocolo e a testes externos; nunca se testa nem se certifica a
> si próprio.

> **Rust decide · Qwen explica.** O Operador Zero é validado exclusivamente no modo de validação do
> BanzAI: `/banzai?mode=validation&target=operator-zero&workflow=full`.

Decisão actual: [ADR-041](../../../decisions/adr/ADR-041-operator-zero-the-read-only-reference-implementation.md)
(implementação de referência só-leitura + validação no BanzAI). O ADR-041 **substitui o enquadramento
anterior** do
[ADR-041](../../../decisions/adr/ADR-041-operator-zero-the-read-only-reference-implementation.md) — cujo nome
de ficheiro conserva "simulator" apenas como identificador arquival estável — e do
[ADR-041](../../../decisions/adr/ADR-041-operator-zero-the-read-only-reference-implementation.md) (decisões anteriores).
Referência pública: [`/referencia/operador-zero`](https://banza.network/referencia/operador-zero).

---

## O que é

A única implementação de referência do protocolo: demonstra *como uma implementação se apresenta* —
identidade, manifest, capabilities, endpoints, metadata, chaves públicas, relatórios, evidência e estado
de certificação. A superfície canónica é `zero.banza.network` (servida a partir de `/oz`). Este
directório contém os artefactos de exemplo correspondentes.

## O que não é

Não é banco, não é PSP, não é carteira, não é operador financeiro e não movimenta dinheiro real. **Não é
um simulador**: não corre simulação nem ledger mutável e não se valida a si próprio. Nunca aparece em
`/operators` como operador real e nunca é participante de um scheme. É `NOT_CERTIFIED` e `PRE_PRODUCTION`
— um estado honesto, não uma falha.

## Como é validado

A validação não é uma aplicação nem uma rota separada: é um **modo nativo** do BanzAI, a interface humana
primária e transversal (ADR-042). As nove etapas — Discovery, Manifest, Keys, Conformance, Interoperability,
Trust, Federation, Evidence Bundle e Certification Readiness — são **iniciadas por uma pessoa** e
**executadas pelos motores Rust**; o modelo local apenas explica (`qwen_calls = 0`,
`external_model_calls = 0`). Cada etapa emite um OperationReceipt e a corrida sela um JourneyReceipt.
Certification readiness não é certificação emitida: sendo demo (`production_allowed=false`), o resultado é
honestamente `NOT_CERTIFIED`.

## Superfície de máquina (só-leitura)

Os endpoints GET (manifest, key-manifest, revogação, evidência de conformidade, metadata de federação,
evidence bundle, traces, examples) devolvem o payload demo; escritas devolvem `405`; desconhecido devolve
`404` JSON. Sem HTML nas rotas de máquina, sem segredos, sem PII (ADR-041 D-067-07).

## Chaves

Só material **público** vive aqui — ver [keys/README.md](keys/README.md). Nenhuma chave privada, seed,
mnemonic, PEM privado, token ou password é committada. A `Demo Operator Root` é demonstrativa e **não é a
Trust Root do protocolo BANZA**.

## Como validar localmente (fronteira demo)

```
make operator-zero-check      # a fronteira demo, imposta pelo motor Rust
```

O guard percorre a árvore em vez de listar ficheiros: um artefacto novo fica coberto no momento em que é
adicionado e não pode passar por omissão. Uma marca de operador de pagamentos real falha o guard em
qualquer superfície.

## Nota sobre estes artefactos

Este directório de exemplo antecede o ADR-041 e retém material demonstrativo anterior da fase ADR-041. O
modelo canónico actual é o do ADR-041: superfície **só-leitura**, sem ledger mutável e sem simulação. A
definição canónica vive na Referência (`/referencia/operador-zero`) e no ADR-041.
