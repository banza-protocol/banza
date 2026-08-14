# BANZA — Manifesto do Protocolo

**Versão:** 1.0  
**Data:** 2026-06-01  
**Estado:** Oficial  
**Autoridade:** ADR-001, ADR-001, ADR-001

---

## O Problema: Angola Tem as Peças

Angola tem bancos. Vinte e três instituições financeiras licenciadas. Um sistema nacional de liquidação interbancária — o EMIS. Redes de caixas automáticos. Aplicações de homebanking. O Multicaixa. Dezasseis milhões de pessoas com telemóvel.

Angola tem as peças. O que Angola não tem é a camada que as liga.

### O que existe não é suficiente

Para integrar pagamentos, uma empresa tem de estabelecer um acordo bilateral com um banco. O processo pode demorar meses. A documentação é privada. As condições são negociadas caso a caso. O acesso é discricionário — não existe um conjunto de regras públicas que qualquer entidade possa ler e implementar.

Para processar pagamentos de forma independente, uma fintech tem de se tornar banco. Para que carteiras de operadores diferentes comuniquem entre si, não existe mecanismo — cada rede é fechada sobre si mesma.

### Os sintomas visíveis

**Comprovativo por WhatsApp.** Capturas de ecrã de transferências bancárias como prova de pagamento — porque não existe alternativa com garantia de protocolo.

**Integração fechada.** Uma empresa integra-se com o sistema de um banco específico. Essa integração não funciona com outro banco. Não existe uma interface padrão que qualquer banco respeite — porque não existe um protocolo que o exija.

**Exclusão da pequena empresa.** Um terminal POS exige contrato de aquisição, hardware e taxas mensais. Uma mercearia de bairro não tem condições.

**Dependência de redes proprietárias.** Cada plataforma funciona segundo as suas próprias regras. Um operador pode alterar taxas, desligar funcionalidades, ou encerrar sem aviso.

**Ausência de garantias de protocolo.** A liquidação instantânea é uma promessa contratual — não um invariante verificável por auditores independentes.

### A causa raiz

Angola tem rails de liquidação — o EMIS move dinheiro entre bancos. O EMIS não resolve: quem pode aceder ao sistema de pagamentos, em que condições, e segundo que regras verificáveis.

Esta camada tem um nome: **camada de protocolo**.

> O BANZA preenche este vazio. Não como banco. Não como produto fintech. Como protocolo.

---

## A Camada que Falta

Uma camada de protocolo não é um produto. Não é uma aplicação. Não é uma empresa. É um conjunto de regras abertas — definidas por um processo de governação, publicadas para qualquer entidade ler, implementáveis por qualquer entidade que produza evidência de conformidade verificável.

### Dois modelos: fechado vs. aberto

**O modelo fechado: M-Pesa**

O M-Pesa pertence à Safaricom. As regras são do operador. Quando a Safaricom decide alterar preços, todos os utilizadores ficam sujeitos. Uma startup que quer construir sobre o M-Pesa precisa de um acordo nas condições que o operador decidir.

O M-Pesa é um produto extraordinário. Mas é um produto — não um protocolo. A rede pertence ao operador. Se a Safaricom saísse de um país amanhã, o serviço saía com ela.

**O modelo aberto: Pix e UPI**

O Banco Central do Brasil não criou um produto — criou um protocolo. O Nubank implementa o Pix. O Itaú implementa o Pix. O Google Pay implementa o Pix. Centenas de entidades implementam o Pix — cada uma com o seu produto, a sua experiência, o seu modelo de negócio — mas todas segundo as mesmas regras abertas. Nenhuma delas é dona do Pix.

Em menos de dois anos, o Pix tornou-se o método de pagamento mais utilizado no Brasil. A Índia seguiu o mesmo modelo com o UPI em 2016. Em 2024, o UPI processava mais de 15 mil milhões de transacções mensais.

| | M-Pesa | Pix / UPI | BANZA |
|---|---|---|---|
| **Quem define as regras** | O operador | Entidade de governação | Protocolo aberto (RFCs e ADRs) |
| **Quem pode participar** | Entidades com acordo bilateral | Qualquer entidade autorizada pelo regulador | Qualquer entidade que implemente o protocolo e publique evidência verificável |
| **Um terceiro pode tornar-se operador independente?** | Não | Sim | Sim |
| **O que acontece se um operador desaparece?** | O sistema desaparece | Os outros continuam | Os outros continuam |

### O teste definitivo

No modelo fechado: se o operador principal desaparece, o sistema desaparece.

No modelo aberto: se um operador desaparece, os outros continuam. O Pix não pertence ao Nubank. Se o Nubank desaparecesse amanhã, o Pix continuaria.

**O BANZA segue o modelo aberto.**

As regras do protocolo BANZA são públicas. O operador de referência é a implementação de referência do protocolo — e um operador independente como qualquer outro — mas não é o dono do protocolo. Actualmente o Public Protocol Registry não publica metadata de nenhum operador (`/operators` devolve `[]`) e `production_certificates` mantém-se `false`. Mesmo que um operador cessasse operações amanhã, as regras do protocolo continuariam a existir, qualquer outro operador conforme continuaria a operar, e a infraestrutura permaneceria.

Esta não é uma propriedade acidental. É uma decisão arquitectónica deliberada.

---

## O Que é o BANZA

O BANZA é o **protocolo financeiro aberto de infraestrutura para Angola** — as regras, os contratos e o modelo de conformidade verificável que qualquer operador pode implementar para processar pagamentos, e que qualquer operador conforme pode usar para trocar pagamentos com qualquer outro operador conforme.

### Quatro propriedades concretas

**Regras públicas.** A especificação do BANZA — os RFCs, os ADRs, a suite de conformidade — está disponível para qualquer programador ler, qualquer operador implementar, e qualquer auditor inspeccionar. Nenhuma documentação está fechada atrás de um acordo de confidencialidade.

**Participação aberta.** BANZA é um protocolo financeiro aberto. A participação de operadores é demonstrada por conformidade protocolar verificável, não por aprovação humana central. Qualquer entidade que implemente o protocolo publica o seu manifesto, expõe endpoints compatíveis e produz evidência de conformidade assinada — e qualquer contraparte verifica esse material por si própria. Não existe candidatura, fila de espera, acreditação discricionária nem acordo bilateral com o BANZA: a participação é definida pelas regras do protocolo — nada mais. Hoje, em pré-produção, nenhum operador publicou metadata no registo.

**Invariantes verificáveis.** As propriedades financeiras são definidas pelo protocolo e verificáveis por qualquer auditor independentemente de qualquer operador. A liquidação em T+0 é um invariante do protocolo: nenhuma implementação conforme pode completar uma transacção que viole esta propriedade.

**Federação.** Operadores conformes podem encaminhar pagamentos entre si sem acordos bilaterais — porque ambos implementam o mesmo protocolo aberto. A confiança é criptográfica e avaliada pela **Avaliação Aberta de Confiança** (*Open Trust Evaluation*): manifesto válido, versão de protocolo compatível, metadata de protocolo assinada, evidência de conformidade presente e válida, assinatura da trust root ou de chave delegada válida, ausência da lista de revogação, capacidades compatíveis, contrato de endpoint compatível, frescura da evidência dentro da política — e falha fechada (*fail-closed*) perante material de confiança em falta, inválido, expirado, revogado ou incompatível. Nenhum destes passos envolve um humano a decidir. O encaminhamento é definido pelo protocolo. A liquidação é gerida por compensação bilateral.

### O que o BANZA não é

| O BANZA não é | Porquê a distinção importa |
|---|---|
| Um banco | O BANZA define regras que operadores seguem. Não detém fundos. Não tem licença bancária. |
| Um produto fintech | Um produto pertence ao seu operador. O protocolo pertence à infraestrutura. |
| Uma API fechada | A especificação BANZA é pública. Nenhum operador pode alterá-la unilateralmente. |
| Uma plataforma proprietária | O BANZA não captura valor. É o plano de construção — não o edifício. |

---

## Os Princípios Fundamentais

**A correcção financeira não é negociável.** Cada decisão de engenharia é avaliada segundo: "Isto preserva a correcção financeira?" A liquidação instantânea, a imutabilidade do livro-razão, e o equilíbrio de débitos e créditos não são funcionalidades — são invariantes que nenhum operador pode anular.

**O protocolo é o produto.** Os operadores provam que o protocolo funciona. Não são o protocolo. O operador de referência é a implementação de referência — demonstra todas as capacidades do protocolo. Mas não é o dono do protocolo, da mesma forma que o Nubank não é o dono do Pix.

**O núcleo implementa o protocolo. Os operadores implementam a política.** O núcleo BANZA impõe os invariantes financeiros. Os operadores aplicam as suas próprias políticas de negócio dentro dos constrangimentos que o núcleo impõe. Estas duas camadas nunca se fundem.

**Rastreabilidade por defeito.** Cada evento financeiro tem um `trace_id`. Cada cadeia causal é reconstituível. Nenhum dinheiro se move sem um lançamento no livro-razão. Qualquer auditor pode reconstituir qualquer pagamento a partir do seu `trace_id` — sem depender de nenhum operador.

**Acesso aberto.** A participação é determinada por evidência de conformidade verificável — não pelo acesso institucional, não por acordos bilaterais, não por volumes mínimos, não pela decisão de nenhuma autoridade humana central. Um PASS da suite é evidência técnica assinada, verificável por qualquer contraparte sem pedir nada ao BANZA. Os operadores são independentes e assumem a sua própria responsabilidade legal, regulatória e financeira: qualquer autorização para operar vem do regulador competente, nunca do BANZA.

**Independência do protocolo.** O protocolo existe independentemente de qualquer operador. Nenhum operador singular pode encerrá-lo, modificar as suas regras, ou restringir o acesso a ele.

---

## O Estado Actual

**Fase actual: pré-produção.** A especificação v1.0 está congelada e verificável; a produção do protocolo depende dos marcos M2/M3. Nenhum operador publicou metadata no Public Protocol Registry.

**M1 — Especificação do Núcleo do Protocolo: CONCLUÍDA (2026-06-01)**

| Componente | Estado |
|------------|--------|
| Invariantes financeiros definidos (partidas dobradas, idempotência, atomicidade) | Concluído |
| Protocolo de federação (ADR-025 — avaliação de confiança de federação sem certificados) | Concluído — 79/79 testes |
| Modelo de conformidade verificável L0–L4 (ADR-031 — auto-publicação e conformidade verificável por máquina) | Concluído |
| Modelo de confiança aberto: trust root, chaves delegadas, revogação (ADR-025 — modelo de confiança de protocolo aberto sem CA) | Concluído |
| Suite de conformidade (14/14 cenários de interoperabilidade) | Concluído |
| Agente do Protocolo BanzAI | Concluído |
| Contratos públicos (OpenAPI, webhooks, QR, eventos) | Concluído |
| Website público em português | Concluído |
| Referência do protocolo em português | Concluído |

**M2 — Próximo marco (por iniciar):** cerimónia da chave raiz. A trust root assina apenas o Manifesto de Chaves; as chaves delegadas assinam metadados do protocolo, releases e revogações. Ela não autoriza operadores, não emite licença e não autoriza pagamentos. Só depois de M2/M3 poderá existir metadata de protocolo assinada em produção e o BanzAI com modelo real activo.

---

## A Hierarquia do Ecossistema

```
     Operadores   (qualquer operador conforme e independente)
         ↑
       BanzAI    (Agente do Protocolo)
         ↑
       BANZA     (o protocolo — esta definição)
```

A dependência flui numa única direcção. O BANZA e o BanzAI nunca dependem dos operadores. Esta direcção é permanente e não negociável.

O operador de referência — a primeira implementação de referência do protocolo — tem o mesmo estatuto perante o protocolo que qualquer outro operador presente ou futuro. É avaliado exactamente pelas mesmas dez verificações que qualquer outro. O protocolo não tem operadores favorecidos.

---

## O Nome

**Banza** é uma palavra enraizada nas tradições linguísticas bantu de Angola — no universo Kikongo, *mbanza* designa um lugar de encontro, um centro de vida comunitária. Um nome distintamente angolano para uma infraestrutura distintamente angolana.

---

## Declaração de Visão

O ecossistema de pagamentos digitais de Angola será construído sobre o protocolo BANZA — não sobre o produto de um único operador.

O ecossistema tem sucesso quando:

- Qualquer programador pode construir sobre o protocolo sem acordo bilateral
- Qualquer operador pode demonstrar conformidade pela suite, sem pedir permissão a ninguém
- Qualquer angolano pode transaccionar, independentemente de qual operador usa
- Qualquer auditor pode verificar qualquer pagamento sem depender de nenhum operador

**O protocolo é o que fica.**

Os operadores mudam. Os produtos evoluem. O que o BANZA garante é que as regras permaneçam abertas, a demonstração de conformidade permaneça acessível a qualquer entidade, e a infraestrutura permaneça de Angola.

> **O BANZA é o protocolo. O protocolo existe independentemente de qualquer operador.**

---

**Referências:**

- [docs/reference/pt/completa.md](pt/completa.md) — Referência canónica do protocolo (português)
- [docs/reference/en/complete.md](en/complete.md) — Tradução oficial (inglês)
- [docs/governance/README.md](../governance/README.md) — Modelo de governação do protocolo
- [docs/governance/certification-boundary.md](../governance/certification-boundary.md) — Enquadramento de conformidade
- ADR-001 — Hierarquia canónica do ecossistema
- ADR-001 — Núcleo financeiro aberto
- ADR-001 — Separação de operadores
- ADR-025 — Modelo de confiança de protocolo aberto sem CA (trust root offline, chaves delegadas, manifesto de chaves assinado)
- ADR-031 — Auto-publicação de operadores e conformidade verificável por máquina
- ADR-025 — Avaliação de confiança de federação sem certificados
