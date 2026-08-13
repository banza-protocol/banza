# BANZA — Sucessão e Sobrevivência do Protocolo

> Define como o protocolo financeiro aberto BANZA continua a existir, a ser verificável e a ser evoluído sem a equipa que o criou.

---

## 0. Decisão arquitectural canónica

> "BANZA é um protocolo financeiro aberto. A participação de operadores no ecossistema não depende de uma autoridade humana central. Operadores independentes implementam o protocolo, publicam manifests e produzem evidência verificável de conformidade. A governação humana existe para manter e evoluir o protocolo, não para autorizar, certificar ou aceitar operadores."

Este documento é a consequência directa dessa decisão. Se a participação não depende de uma autoridade humana central, então a **continuidade do protocolo também não pode depender de uma equipa humana específica** — incluindo a equipa fundadora.

---

## 1. Princípio de sobrevivência

**Um protocolo financeiro aberto bem desenhado não deve depender da equipa que o criou para continuar a existir.**

A pergunta que este documento responde não é "o que acontece se a equipa fundadora sair?" — é a pergunta mais dura: **"o que é que, no BANZA, deixa de funcionar se toda a equipa fundadora desaparecer amanhã?"**

A resposta pretendida é: **nada de essencial**. As especificações permanecem legíveis, os testes de conformidade permanecem executáveis, os schemas permanecem verificáveis, a evidência produzida pelos operadores permanece independentemente validável, e o protocolo permanece bifurcável (*forkable*) por qualquer terceiro.

O que se perde com a saída da equipa fundadora é **capacidade de manutenção e de evolução** — não a existência, a verificabilidade nem a utilidade do protocolo. Essa distinção é deliberada e é a espinha dorsal de todo o desenho abaixo.

### 1.1 Teste de sobrevivência

Qualquer alteração ao protocolo tem de passar este teste:

| Pergunta | Resposta exigida |
|---|---|
| Um terceiro consegue ler a regra sem falar connosco? | Sim — a especificação é pública e versionada. |
| Um terceiro consegue executar a verificação sem nos pedir acesso? | Sim — a Conformance Automation é pública e executável localmente. |
| Um terceiro consegue verificar evidência sem um serviço nosso? | Sim — a Conformance Evidence é auto-contida e verificável offline. |
| Um terceiro consegue continuar o protocolo sem nós? | Sim — a licença e o repositório permitem o fork. |
| Um operador precisa da nossa autorização para operar? | **Não.** Ver §16. |

Se uma alteração falhar qualquer uma destas perguntas, a alteração está errada — não o teste.

---

## 2. O que tem de sobreviver

A sobrevivência não é uma propriedade abstracta: é uma lista finita de artefactos que têm de continuar a existir, a ser legíveis e a ser executáveis.

| Camada | Artefacto | Sobrevive porque |
|---|---|---|
| Regras | Versioned Specifications (`contracts/`, `decisions/adr/`, `spec/`) | São texto público, versionado, sob licença aberta. |
| Evolução | RFC Process (`decisions/rfc/`) | O processo está escrito; qualquer grupo o pode executar. |
| Verificação | Conformance Automation (`conformance/`, `engines/`) | É código aberto, executável localmente, sem serviço central. |
| Prova | Conformance Evidence / Evidence Bundle | É auto-contida e verificável offline. |
| Declaração | Operator Manifest | É publicado pelo próprio operador, no domínio do operador. |
| Confiança | Trust Root, Delegated Signing Keys, Revocation List | O material público e o procedimento de rotação estão especificados. |
| Descoberta | Public Protocol Registry | É um artefacto assinado e replicável, não um serviço proprietário. |
| Pessoas | Protocol Maintainers, Emergency Maintainers | São papéis substituíveis, não pessoas insubstituíveis. |

**Regra:** nenhum destes artefactos pode ter como dependência a existência de uma empresa, de um servidor específico, de uma pessoa nomeada ou de um contrato privado.

> **BanzAI (agente nativo do protocolo, ADR-042) fora do caminho crítico de sobrevivência.** O BANZA é um protocolo financeiro aberto acompanhado por um agente IA nativo — o **BanzAI** — que guia operadores, simula fluxos, invoca as ferramentas verificáveis, explica resultados e ajuda a preparar evidência. O BanzAI é uma camada de **orientação e orquestração**: aumenta a implementabilidade do protocolo sem introduzir um guardião do portão, humano ou de IA. O BanzAI **não** aparece nesta tabela porque **nada de essencial depende dele**: as especificações, os schemas, os testes de conformidade, os motores Rust/WASM e a evidência permanecem legíveis, executáveis e verificáveis sem o BanzAI. O BanzAI é **subordinado à Referência BANZA e aos motores determinísticos**; não aprova, não certifica, não licencia, não decide participação, não cria regras e não adiciona decisões arquitecturais. Se o BanzAI — ou o provedor que o serve — desaparecer, o protocolo continua a existir, a ser verificável e a ser bifurcável exactamente como descrito neste documento.

---

## 3. Especificações públicas e versionadas

As Versioned Specifications são a fonte de verdade do protocolo.

- **Públicas.** Nenhuma regra normativa está sob NDA, acordo de acesso, portal fechado ou canal privado. Se uma regra não é pública, não é uma regra do protocolo.
- **Versionadas.** Cada release do protocolo é publicada num *tag* imutável, com número de versão explícito (ver `VERSION` e §12). Uma implementação declara a versão que implementa; a versão declarada é verificável contra o texto publicado.
- **Auto-contidas.** A especificação tem de ser suficiente para implementar o protocolo do zero, sem conhecimento tácito, sem "perguntar à equipa" e sem ler código de nenhum operador.
- **Legíveis por humanos e por máquinas.** As regras existem em prosa normativa (`docs/`, `decisions/adr/`) **e** em artefactos executáveis (`contracts/`, `conformance/`). A prosa nunca é a única forma de uma regra.

> **Invariante:** conhecimento que só existe na cabeça da equipa fundadora não é protocolo — é dívida de sobrevivência. Deve ser escrito ou eliminado.

---

## 4. Open source

O repositório do protocolo é distribuído sob **Apache License 2.0** (ver `LICENSE` e `NOTICE`).

Isto é uma decisão de sobrevivência, não de marketing:

- **Direito de uso perpétuo e irrevogável.** Ninguém — incluindo a equipa fundadora ou qualquer sucessor da governação — pode retirar a licença já concedida sobre as versões publicadas.
- **Direito de modificação e redistribuição.** Qualquer entidade pode manter a sua própria linha do protocolo (ver §11, Forkability).
- **Concessão explícita de patentes.** A Apache-2.0 inclui concessão de patentes, o que remove o risco de captura por via de propriedade intelectual sobre a implementação de referência.
- **Sem cláusula de retorno de controlo.** Não existe nenhum mecanismo pelo qual a governação recupere controlo exclusivo sobre código já publicado.

A licença aplica-se à especificação, aos schemas, aos vectores de conformidade, ao tooling e às implementações oficiais dos motores. Tudo o que é preciso para implementar e verificar o protocolo é aberto.

---

## 5. RFC Process

O RFC Process (`decisions/rfc/`, ver `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md`) é o mecanismo de evolução do protocolo. É deliberadamente **um processo escrito**, não um hábito de equipa.

Um RFC é a única via para alterar uma regra do protocolo. O processo:

1. **Proposta.** Qualquer pessoa ou entidade pode submeter um RFC — não é preciso ser Protocol Maintainer, não é preciso ser operador, não é preciso pedir permissão prévia.
2. **Discussão pública.** A discussão decorre em canal público e fica arquivada com o RFC. Discussões privadas não vinculam o protocolo.
3. **Análise de impacto.** Todo o RFC declara impacto em invariantes financeiros (`INV-*`), contratos, vectores de conformidade e compatibilidade de versões.
4. **Decisão registada.** A aceitação ou rejeição é registada com fundamentação escrita. Um RFC rejeitado permanece no repositório — a rejeição é parte do registo público.
5. **Materialização.** Um RFC aceite só está concluído quando existe artefacto correspondente em `contracts/` e vectores em `conformance/`. Prosa sozinha não fecha um RFC.

**Porque é que isto sobrevive:** o processo não depende de quem o preside. Qualquer grupo de mantenedores competente consegue lê-lo e executá-lo. Os RFCs históricos servem de precedente e de treino para mantenedores futuros.

---

## 6. Testes de conformidade públicos

A Conformance Automation é o coração da sobrevivência do BANZA, porque substitui julgamento humano por verificação determinística.

- **Públicos.** Os vectores de conformidade (`conformance/`) e os motores de verificação (`engines/`, Rust por ADR-043) são abertos.
- **Executáveis localmente.** Um operador executa a conformidade na sua própria infraestrutura. Não existe um serviço central obrigatório contra o qual seja preciso "submeter" nada, nem uma fila de espera humana.
- **Determinísticos.** O mesmo input produz o mesmo resultado, em qualquer máquina, hoje ou daqui a dez anos. Um resultado de conformidade não depende de quem o executou.
- **Sem juízo humano no caminho crítico.** A conformidade é uma propriedade computável da implementação, não uma opinião de um comité.

Isto significa que, mesmo sem nenhum mantenedor activo, um operador consegue: (a) executar a suite, (b) obter um resultado, (c) publicar a evidência, (d) ser verificado por qualquer terceiro. **A verificação de conformidade não tem dependência humana.**

> Ver `docs/governance/certification-boundary.md` e `docs/governance/EVIDENCE_BUNDLE.md`.

---

## 7. Schemas públicos

Os schemas (`contracts/`) são a interface máquina-a-máquina do protocolo e são publicados como artefactos versionados.

- Cobrem OpenAPI, webhooks, eventos, payloads QR, Operator Manifest, Conformance Evidence, Evidence Bundle, material de confiança e Revocation List.
- São **normativos**: em caso de divergência entre prosa e schema, o schema prevalece na parte que especifica.
- São **estáveis por versão**: uma alteração incompatível exige nova versão do protocolo (§12), nunca uma edição silenciosa de um schema já publicado.
- São **auto-descritivos**: um implementador consegue validar os seus artefactos contra o schema sem contactar ninguém.

Um schema publicado num *tag* é imutável. Corrigir um schema publicado faz-se com uma nova versão e uma errata — nunca reescrevendo a história.

---

## 8. Tooling público

O tooling que produz e verifica artefactos do protocolo é aberto e reprodutível:

- **Motores oficiais em Rust** (ADR-043) — conformidade, verificação de confiança e da Revocation List, verificação de invariantes, geração de Evidence Bundle.
- **Sem dependência de infraestrutura proprietária.** As ferramentas correm numa máquina comum; não exigem um serviço nosso, uma chave de API nossa, nem uma conta connosco.
- **Reprodutíveis.** Builds com versões fixas, para que um verificador independente obtenha byte-a-byte o mesmo resultado.
- **Verificação offline.** A verificação de evidência e de assinaturas não requer rede. Um auditor sem ligação a nenhum sistema nosso consegue verificar tudo o que importa.

> **Invariante:** se a única forma de verificar algo é através de um serviço que nós operamos, esse mecanismo é um ponto único de falha e tem de ser redesenhado.

---

## 9. Protocol Maintainers

Os Protocol Maintainers mantêm e evoluem o protocolo. **Não autorizam, não certificam e não aceitam operadores** — esse papel não existe nesta arquitectura (§17).

**Responsabilidades**
- Rever e integrar RFCs.
- Manter as Versioned Specifications, os schemas e os vectores de conformidade coerentes.
- Preparar e publicar releases (§12).
- Manter a Conformance Automation e o tooling.
- Custodiar o procedimento (não o poder) da Trust Root, das Delegated Signing Keys e da Revocation List.

**Propriedades de sobrevivência**
- **Papel, não pessoa.** Um mantenedor é substituível por definição. Nenhum documento do protocolo nomeia uma pessoa como dependência.
- **Pluralidade obrigatória.** Nenhuma acção crítica (release, rotação de chaves, revogação) pode depender de um único mantenedor. O controlo é sempre de quórum.
- **Entrada aberta.** A entrada de novos mantenedores faz-se por contribuição pública demonstrada e decisão registada — não por convite privado.
- **Saída sem dano.** A saída de um mantenedor não retira conhecimento ao protocolo, porque o conhecimento está escrito, não confiado.

**Sinal de alarme institucional:** se, num dado momento, a remoção de uma única pessoa bloquear um release, uma rotação de chave ou uma revogação, isso é um **defeito de arquitectura de governação** e tem de ser tratado com a mesma seriedade que um defeito num invariante financeiro.

---

## 10. Emergency Maintainers

Os Emergency Maintainers existem para o cenário que este documento leva a sério: **a governação normal deixa de funcionar** — por saída em bloco, por incapacidade, por perda de acesso, ou por qualquer evento que torne o quórum normal inatingível.

**Desenho**
- **Conjunto pré-designado e público.** As posições de emergência são designadas antecipadamente e o facto da sua existência é público. A designação é feita pela governação em vigor, com registo escrito.
- **Poderes estritamente limitados.** Um Emergency Maintainer pode: publicar uma actualização da Revocation List; publicar uma errata de segurança; iniciar a rotação da Trust Root (§13); restaurar a capacidade de publicação de releases.
- **Poderes que NÃO tem.** Não pode alterar invariantes financeiros. Não pode alterar as regras de conformidade. Não pode aprovar RFCs de fundo. Não pode autorizar operadores (esse poder não existe para ninguém). Não pode mover fundos — o protocolo não move fundos.
- **Quórum e prazo.** Actua sob quórum e por período limitado, com o único mandato de repor a governação normal.
- **Registo obrigatório.** Toda a acção de emergência é publicada com fundamentação. Uma acção de emergência não registada é inválida por definição.

**Activação.** O modo de emergência activa-se quando a governação normal não consegue reunir quórum dentro do prazo definido para uma acção crítica de segurança. A activação é declarada publicamente.

**Desactivação.** Termina quando a governação normal é reposta ou quando o mandato expira — o que ocorrer primeiro. O modo de emergência não pode tornar-se estado permanente.

---

## 11. Divulgação de segurança

A capacidade de receber e tratar relatos de segurança tem de sobreviver à equipa fundadora, porque é a única via de correcção de falhas graves.

- **Canal público e institucional.** O canal de relato está publicado em `SECURITY.md` e é um endereço **institucional**, nunca pessoal. Endereços pessoais não sobrevivem a pessoas.
- **Divulgação coordenada.** Recepção, acuse, prazo acordado, correcção, publicação. O processo está escrito e não depende de quem o executa.
- **Múltiplos receptores.** O canal é recebido por mais do que um Protocol Maintainer, para que nenhuma ausência individual silencie um relato.
- **Continuidade em emergência.** Se não houver mantenedores activos, os Emergency Maintainers assumem o canal (§10).
- **Fallback público.** Se o canal institucional deixar de funcionar de todo, o relato público no repositório é o mecanismo de último recurso. Um protocolo aberto prefere uma falha conhecida a uma falha silenciada.

---

## 12. Processo de release

O release é a operação que transforma trabalho em protocolo publicado. Está governado em `docs/governance/PROTOCOL_RELEASE_GOVERNANCE.md` e resume-se assim para efeitos de sobrevivência:

- **Estados explícitos.** `DRAFT` → `REVIEW` → `RELEASE_CANDIDATE` → `APPROVED_FOR_PROTOCOL_PUBLICATION` → `PUBLISHED`.
- **Publicação de protocolo não é autorização de serviço financeiro.** Publicar uma versão torna a especificação disponível. Não autoriza, não licencia e não activa nenhum operador; não processa pagamentos; não movimenta fundos.
- **Versionamento explícito e imutável.** Cada release é um *tag*. Um *tag* publicado nunca é reescrito.
- **Assinatura.** Os artefactos de release são assinados por chaves cujo caminho remonta à Trust Root (§13), para que qualquer terceiro verifique a autenticidade de uma versão sem confiar no canal de distribuição.
- **Reprodutibilidade.** Um terceiro consegue reconstruir os artefactos do release a partir do repositório no *tag*.
- **Quórum, não pessoa.** A aprovação de publicação exige quórum de Protocol Maintainers.

**Sobrevivência:** um release já publicado, assinado e reproduzível continua verificável para sempre, independentemente de quem o publicou ainda existir.

---

## 13. Rotação da Trust Root

A Trust Root assina **apenas o Manifesto de Chaves**, que endossa as Delegated Signing Keys; são estas que assinam metadados do protocolo, releases e revogações (ADR-027).

**A Trust Root NÃO:**
- não autoriza pagamentos;
- não cria operadores;
- não emite licenças;
- não certifica operadores;
- não movimenta fundos;
- não é um árbitro de participação no ecossistema.

É um mecanismo de **integridade e autenticidade de artefactos do protocolo** — nada mais. Esta limitação é o que a torna substituível sem drama institucional.

**Rotação**

- **A rotação é normal, não excepcional.** A Trust Root é rodada por calendário e não apenas por incidente. Um mecanismo de rotação que só é exercido em crise não é fiável na crise.
- **Sobreposição.** A nova raiz é publicada e assinada pela raiz anterior enquanto esta ainda é válida, criando um caminho de confiança contínuo e verificável.
- **Rotação sem antecessora.** Se a raiz anterior estiver indisponível (perda, comprometimento, ausência de custódios), a nova raiz é estabelecida por acto público e verificável de governação — publicação multi-canal, quórum, e registo escrito. Nesse cenário, os verificadores adoptam a nova raiz por decisão explícita e informada, não por confiança implícita.
- **Custódia distribuída.** A custódia é sempre multi-custódio e multi-localização, para que nenhuma saída individual perca a raiz.
- **Chaves fora da infraestrutura de serviço** (ADR-029). Material privado nunca vive em servidores de produção. Nenhum sistema em linha detém a capacidade de assinar como raiz.
- **Delegated Signing Keys de vida curta.** O uso operacional faz-se com chaves delegadas, rodadas com frequência. A raiz é usada raramente. Isto reduz a exposição da raiz e torna a perda de uma chave delegada um evento recuperável e rotineiro.

**Cenário-limite:** perda total do material da Trust Root **não destrói o protocolo**. As especificações, os schemas, os testes e a evidência continuam válidos e verificáveis. O que se perde é a cadeia de autenticidade dos artefactos futuros — que é restaurável por nova raiz publicada por governação (ou por um fork, §14). A confiança no BANZA reside nas regras verificáveis, não numa chave insubstituível.

---

## 14. Continuidade da revogação

**A revogação é um mecanismo de segurança do protocolo. Não é uma sanção regulatória. Não é uma licença. Não é um juízo sobre um operador.**

A Revocation List declara que **material criptográfico** (uma chave delegada, um artefacto assinado, uma raiz comprometida) deixou de ser confiável. Diz *"esta chave já não vale"*, não *"esta entidade não pode operar"*. Um operador cuja chave é revogada não fica "proibido" de nada pela BANZA: publica novo material e continua. As consequências legais ou regulatórias, quando existam, pertencem às entidades competentes, nunca ao protocolo.

**Continuidade**
- **Artefacto, não serviço.** A Revocation List é um ficheiro assinado, publicado, com validade e versão. Um ficheiro sobrevive ao seu editor; um serviço não.
- **Replicável.** Pode ser espelhada por qualquer entidade e verificada offline contra o caminho de confiança. Um verificador não precisa de nos alcançar para saber se um material foi revogado.
- **Frescura explícita.** Cada lista declara o seu momento de emissão e a sua validade, para que um consumidor distinga *"nada foi revogado"* de *"a lista está velha"*. **Esta distinção é obrigatória** — é o que impede que a paragem da equipa fundadora seja lida como "está tudo bem".
- **Falha segura e informada.** Perante uma lista expirada, um verificador não deve fingir estado desconhecido como estado bom. Deve sinalizar a incerteza.
- **Emissão em emergência.** Se os mantenedores normais não puderem emitir, os Emergency Maintainers emitem (§10).
- **Continuidade em fork.** Um fork mantém a sua própria raiz e a sua própria lista de revogação; a continuidade da revogação segue a linha que os verificadores escolherem seguir (§14).

---

## 15. Forkability

A bifurcação (*fork*) não é uma ameaça ao BANZA — é a **garantia final** de que o BANZA não pode ser capturado, nem por nós, nem por ninguém.

**O que torna o fork real (e não retórico)**
- **Licença permissiva** (Apache-2.0), incluindo concessão de patentes — §4.
- **Ausência de dependências fechadas.** Nada de essencial exige um serviço, uma chave ou um contrato nosso.
- **Especificação auto-contida.** Um fork consegue ser implementado a partir do texto publicado.
- **Testes e tooling incluídos.** Um fork herda a capacidade de verificação, não só as regras.
- **Confiança substituível.** Um fork estabelece a sua própria Trust Root e a sua própria Revocation List. A confiança segue o fork que a comunidade e os verificadores adoptarem — não a marca.

**Consequência institucional:** se a governação do BANZA se tornar captora, negligente ou inactiva, a comunidade tem uma saída legítima e tecnicamente viável. Isto disciplina a governação de forma permanente. **A melhor defesa contra a captura é a existência credível da alternativa.**

**Não-conflito com a identidade.** Um fork tem de usar identidade própria e não pode declarar-se BANZA; a distinção é de nome e de confiança, não de direito de uso. O protocolo continua aberto; a marca não é o protocolo.

---

## 16. Governação comunitária

A governação humana existe para **manter e evoluir** o protocolo — não para autorizar, certificar ou aceitar operadores.

**Propriedades**
- **Aberta.** Qualquer entidade pode propor (RFC), discutir, contribuir e tornar-se mantenedora por contribuição demonstrada.
- **Registada.** Decisões existem em ADRs e RFCs públicos, com fundamentação. Uma decisão não registada não é uma decisão do protocolo.
- **Plural.** Nenhuma acção crítica depende de uma pessoa. Todo o poder crítico é de quórum.
- **Limitada.** A governação **não** decide quem pode participar no ecossistema. Não tem esse poder porque esse poder não existe nesta arquitectura.
- **Substituível.** A composição da governação muda ao longo do tempo por processo escrito. A rotação é esperada, não excepcional.

**Transição da equipa fundadora.** A trajectória pretendida é a diluição deliberada: a equipa fundadora começa como mantenedora maioritária e move-se activamente para minoritária, à medida que outros mantenedores demonstram contribuição. Este movimento é objectivo declarado, não concessão relutante. Um protocolo cuja equipa fundadora conserva controlo permanente é, na prática, um produto proprietário com documentação pública.

---

## 17. Independência dos operadores

Este é o ponto onde a sobrevivência do protocolo e a arquitectura da participação se encontram.

**Os operadores são independentes.** A participação de um operador no ecossistema **não depende de nenhuma autoridade humana central** — não depende de nós, não depende dos Protocol Maintainers, não depende da governação, e não depende da existência continuada de nenhuma organização.

**Como funciona a participação**
1. O operador implementa as Versioned Specifications.
2. O operador executa a Conformance Automation na sua própria infraestrutura.
3. O operador produz Conformance Evidence / Evidence Bundle.
4. O operador publica o seu Operator Manifest no seu próprio domínio.
5. Qualquer terceiro — contraparte, auditor, regulador, outro operador — verifica a evidência de forma independente.

Não existe passo de aprovação humana. Não existe fila. Não existe guardião do portão. **Não existe ninguém a quem pedir permissão** — e, por isso mesmo, não existe ninguém cuja saída bloqueie a participação de outros.

**Enquadramento legal e regulatório.** Cada operador independente assume o seu próprio enquadramento legal, regulatório e financeiro. Quando aplicável, é autorizado pelas **entidades competentes** — nunca pela BANZA. A BANZA é um protocolo financeiro aberto: não presta serviços de pagamento, não processa transacções, não liquida valores e não movimenta fundos. Qualquer licença ou autorização pertence ao operador que presta serviços financeiros reais usando o protocolo.

**Consequência de sobrevivência:** se a equipa fundadora desaparecer, o Operador A, o Operador B e o Operador C continuam a operar, continuam a produzir evidência verificável, e continuam a ser verificáveis entre si. Nada no caminho crítico da participação passa por nós.

---

## 18. Cenários de sucessão

| Cenário | O que acontece | O que NÃO acontece |
|---|---|---|
| Um mantenedor sai | O quórum restante continua; entra novo mantenedor por processo escrito. | Nenhuma interrupção; nenhum conhecimento perdido. |
| A equipa fundadora sai em bloco | Os Protocol Maintainers restantes ou os Emergency Maintainers asseguram releases, revogação e segurança. | O protocolo não deixa de existir; os operadores não param. |
| Governação inactiva (sem releases) | As especificações publicadas continuam válidas e verificáveis; a conformidade continua executável; a comunidade pode assumir a manutenção ou bifurcar. | O protocolo não deixa de ser verificável nem utilizável. |
| Trust Root comprometida | Revogação da raiz + rotação (§13); os verificadores adoptam a nova raiz por acto público. | As regras, os schemas e os testes não são afectados. |
| Trust Root perdida | Nova raiz por acto público de governação, ou fork. | A evidência de conformidade já produzida não deixa de ser verificável quanto ao seu conteúdo. |
| Governação captora ou negligente | Fork legítimo (§14); a confiança segue a linha adoptada pelos verificadores. | A comunidade não fica refém. |
| Um operador cessa actividade | Os restantes operadores não são afectados; o protocolo é indiferente. | O protocolo não depende de nenhum operador (incluindo o de referência). |
| Todos os operadores cessam actividade | A especificação, a conformidade e o tooling permanecem disponíveis para novos operadores. | O protocolo não morre com os seus implementadores. |
| BanzAI (ou o provedor que o serve) indisponível | Perde-se orientação e orquestração assistida; a implementação, a conformidade, os motores e a verificação de evidência continuam pela especificação e pelo tooling públicos. | O protocolo não deixa de ser implementável, verificável nem bifurcável; nenhuma participação fica bloqueada. |

---

## 19. Anti-padrões de sobrevivência

Padrões que reintroduzem dependência humana central e que são **proibidos**:

- Uma regra que exista apenas em prosa, sem artefacto executável.
- Uma verificação que exija um serviço nosso no caminho crítico.
- Uma chave ou um segredo detido por uma única pessoa.
- Um passo de participação que exija juízo humano nosso.
- Um endereço pessoal como canal institucional.
- Conhecimento operacional não escrito ("a equipa sabe como se faz").
- Um artefacto de confiança publicado num único canal não replicável.
- Uma lista de revogação sem indicação de frescura.
- Um mecanismo de emergência sem prazo, sem quórum e sem registo.

---

## 20. Invariantes de sobrevivência

Estas afirmações são vinculativas e uma alteração que as viole é um defeito:

- `INV-SURV-SPEC` — Toda a regra normativa é pública, versionada e auto-contida.
- `INV-SURV-EXEC` — Toda a regra verificável tem verificação executável localmente, sem serviço central.
- `INV-SURV-OFFLINE` — Toda a evidência e toda a assinatura são verificáveis offline.
- `INV-SURV-QUORUM` — Nenhuma acção crítica depende de uma única pessoa.
- `INV-SURV-ROLE` — Nenhum documento do protocolo nomeia uma pessoa como dependência.
- `INV-SURV-FORK` — O protocolo é sempre bifurcável, com licença, especificação, testes e tooling incluídos.
- `INV-SURV-NOGATE` — Nenhum passo de participação de um operador depende de juízo humano da BANZA.
- `INV-SURV-ROTATE` — A Trust Root e as Delegated Signing Keys são rotáveis por procedimento escrito e exercitado.
- `INV-SURV-REVOKE` — A revogação continua emissível e verificável mesmo com a governação normal indisponível.
- `INV-SURV-FRESH` — Estado desconhecido nunca é apresentado como estado bom.

---

## 21. Referências

- `docs/governance/CLAUDE_BASE.md` — regras operacionais partilhadas
- `docs/governance/PROTOCOL_RELEASE_GOVERNANCE.md` — governação de releases
- `docs/governance/BANZA_PROTOCOL_BOUNDARY.md` — fronteira do protocolo
- `docs/governance/BANZA_REGULATORY_POSITIONING.md` — posicionamento regulatório
- `docs/governance/EVIDENCE_BUNDLE.md` — Evidence Bundle
- `docs/governance/OPERATOR_MANIFEST_VALIDATION.md` — validação do Operator Manifest
- `docs/governance/certification-boundary.md` — fronteira da verificação de conformidade
- `docs/governance/OPEN_PROTOCOL_GOVERNANCE.md` — RFC Process
- `decisions/adr/ADR-001-open-financial-protocol.md` — protocolo financeiro aberto
- `decisions/adr/ADR-001-operator-separation.md` — separação de operadores
- `decisions/adr/ADR-029-keys-never-on-serving-infrastructure.md` — chaves fora da infraestrutura de serviço
- `decisions/adr/ADR-043-rust-first-official-engines.md` — motores oficiais em Rust
- `decisions/adr/ADR-042-banzai-native-protocol-agent.md` — BanzAI como agente nativo do protocolo
- `docs/governance/BANZAI_NATIVE_PROTOCOL_AGENT.md` — BanzAI: agente nativo de orientação e orquestração
- `SECURITY.md` — divulgação de segurança
- `LICENSE` · `NOTICE` — Apache-2.0

---

**BANZA é um protocolo financeiro aberto.** O protocolo existe independentemente de qualquer operador — e independentemente da equipa que o criou.
