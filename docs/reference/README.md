# Referência do BANZA

A Referência é o documento descritivo que organiza e explica a superfície normativa do protocolo.

| Edição | Ficheiro | Estatuto |
|---|---|---|
| Português | [`pt/BANZA_REFERENCIA.md`](pt/BANZA_REFERENCIA.md) | **Referência canónica** |
| Inglês | [`en/BANZA_REFERENCE.md`](en/BANZA_REFERENCE.md) | Tradução oficial |

Em caso de divergência não intencional entre as duas edições, prevalece a portuguesa.

## Modelo de autoridade

```
Manifesto Normativo + especificações, contratos e registos indexados   ← autoridade normativa
                              ↓
                  Referência canónica (PT)                             ← autoridade descritiva
                              ↓
                 Tradução oficial (EN)
                              ↓
        ┌─────────────────────┼─────────────────────┐
     GitHub                 Sítio                 BanzAI               ← consumo e derivação
```

A autoridade corre num só sentido. A Referência **descreve** o que os artefactos normativos
**definem**; onde as duas divirjam, prevalece o artefacto normativo. O sítio e o BanzAI consomem ou
derivam das duas edições acima e não possuem cópia editorial própria — uma superfície de publicação
não é uma autoridade editorial.

## Como actualizar

1. A alteração normativa acontece primeiro, pela governação normativa própria.
2. A Referência **portuguesa** é reconciliada com a verdade normativa resultante.
3. A tradução **inglesa** é reconciliada a partir da portuguesa — nunca a partir de uma edição inglesa
   anterior, que não é fonte independente.
4. Os artefactos derivados são **gerados**, não editados: `make website-reference-mirror`.
5. Os guards verificam a paridade estrutural e a ligação à fonte.

Editar directamente um espelho gerado é um erro que o guard de fronteira de fonte apanha.

## Superfícies derivadas

O sítio é construído com o directório `website/` como contexto Docker, pelo que não consegue ler
`docs/` durante o build. Por isso as edições são espelhadas deterministicamente para
`website/content/reference/{pt,en}.md` por `tools/gen-website-reference-mirror.py`. Esses ficheiros
declaram no cabeçalho que são gerados, identificam a fonte e não devem ser editados à mão;
`make website-reference-source-boundary-check` regenera para um directório temporário e falha se o
espelho versionado divergir da geração fresca.

## Diagramas

`diagrams/` contém os SVG citados pelas duas edições.
