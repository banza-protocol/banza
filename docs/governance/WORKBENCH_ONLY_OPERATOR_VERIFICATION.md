# BanzAI-Only Operator Verification

**Status:** Current · **Decision:** M2.5 (Public Surface & BanzAI Simplification)

> **O BANZA adopta verificação guiada pelo BanzAI para operadores. Operadores não precisam instalar Python,
> correr Docker, configurar GitHub Actions ou executar scripts externos para demonstrar compatibilidade
> protocolar.**
>
> **As ferramentas internas de CI e os guards do repositório existem para maintainers do protocolo, não
> como interface operacional para operadores.**

## Decisão canónica

Para operadores, o ponto único de verificação é o **BanzAI**, o agente IA nativo do protocolo (ADR-042,
`docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md`), acedido na rota `/banzai`. BanzAI é a
interface pública para preparar manifests, validar conformidade, verificar trust, simular federação, gerar
evidence bundles e inspeccionar traces.

BanzAI guia, orquestra e explica; não aprova, não certifica, não licencia, não decide participação e não
cria regras — os engines determinísticos Rust/WASM verificam e a evidência prova. Dito de forma curta:
**BanzAI guia; os engines Rust/WASM verificam; a evidência prova.**

## Distinção obrigatória

Ferramentas internas de CI, guards, testes Rust e scripts de desenvolvimento podem continuar a existir para
**maintainers do protocolo**. Não devem ser apresentadas como caminho público recomendado para operadores.

## Regra de produto

Simplicidade é um princípio fundamental do protocolo BANZA. Um operador não deve precisar de instalar
Python, correr Docker, configurar GitHub Actions ou executar scripts externos para validar compatibilidade
protocolar.

## Motivação

- **Simplicidade** — o caminho do operador é uma interface, não uma cadeia de ferramentas de linha de
  comandos, imagens de contentor e pipelines de CI.
- **Menor dependência de ambiente local** — nada para instalar; a validação corre no navegador sobre os
  engines Rust/WASM do protocolo.
- **Segurança e redução de erro humano** — sem passos manuais de instalação, versões divergentes de
  ferramentas ou configuração de runners externos que possam produzir resultados inconsistentes.
- **Evidência gerada de forma consistente** — o mesmo motor determinístico produz a mesma evidência
  verificável para qualquer operador.

## Quem usa o quê

| Público | Ferramenta | Caminho |
|---|---|---|
| **Operadores / implementadores** | BanzAI (rota `/banzai`) | Guia → Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces |
| **Maintainers do protocolo** | CI, guards, testes Rust, scripts de dev | interno ao repositório; não é interface operacional |

Python, Docker e GitHub Actions **não são caminho público** de verificação de operadores. Onde existirem,
são ferramenta interna de maintainers.

## Fluxo do operador (BanzAI-only)

`Abrir BanzAI (/banzai) → Manifest → Conformidade → Trust → Federação → Evidence Bundle → Traces`

Para validar compatibilidade protocolar, o operador usa o BanzAI: prepara o manifest, executa as
validações de conformidade, verifica signed protocol metadata, avalia revocation/fail-closed e gera um
evidence bundle. BanzAI orquestra e explica cada passo; os engines Rust/WASM computam o resultado. Não é
necessário instalar Python, correr Docker ou configurar GitHub Actions.

## Relação com os engines

- **Conformidade** — a conformidade é executada via BanzAI sobre `banza-conformance` (Rust/WASM). O
  resultado é evidência verificável, não aprovação humana, licença ou certificação.
- **Trust Engine** — a validação de trust corre `banza-trust` (Rust/WASM) sobre signed protocol metadata,
  delegated signing keys, operator manifest, conformance evidence, public protocol registry e
  revocation/fail-closed. O status é calculado em Rust, nunca em TypeScript.
- **Evidence Bundle** — BanzAI agrega os relatórios num evidence bundle com hashes SHA-256 e versões de
  ferramenta, que o operador guarda e publica, e que qualquer terceiro reproduz.

BanzAI guia e orquestra sobre os engines Rust/WASM do protocolo no navegador; os engines computam o
resultado, que é determinístico e verificável, mas não é licença, certificação ou autorização.

## Fronteira

A verificação guiada pelo BanzAI **não** é aprovação, aceitação, certificação ou licença de operador. Produz
evidência verificável de conformidade e uma avaliação local de trust — nunca um estatuto conferido pela
BANZA. `/operators` permanece `[]`; `production_certificates` permanece `false`.
