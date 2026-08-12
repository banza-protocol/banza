# Operador Zero — material de chave

**Só material público vive aqui.**

Nenhuma chave privada, seed, mnemonic, PEM privado, token ou password é committada neste
repositório — nem para o Operador Zero, nem para nada. As chaves públicas presentes são
*placeholders visíveis* (`zDEMO…`), não material utilizável: um teste falha se uma chave aqui não
parecer obviamente um placeholder.

## A Demo Operator Root

- é `demo_only`;
- **não é a Trust Root do protocolo BANZA**;
- não certifica operador;
- não autoriza produção;
- nunca deve ser usada em produção.

O vocabulário do trust demo é deliberadamente prefixado `demo_` (`demo_trust_valid`, …) para que um
veredicto demo não possa ser capturado num screenshot e passar por um resultado de trust do
protocolo.

## Se precisares de assinaturas reproduzíveis

Gera chaves efémeras em tempo de teste, ou usa uma fixture claramente marcada como não-pública.
Nunca committes material privado para tornar um teste mais simples.
