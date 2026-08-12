# PostgreSQL — Estado Protocolar do BANZA

- **Estado:** Canónico
- **Data:** 2026-07-19
- **Decisão de referência:** [ADR-042](../../decisions/adr/ADR-042-postgresql-as-protocol-state-store.md)
  (ver também [ADR-034](../../decisions/adr/ADR-034-dedicated-postgresql-and-backups.md))
- **Auditoria:** [M2_7K_POSTGRESQL_RUNTIME_SCHEMA_AUDIT.md](M2_7K_POSTGRESQL_RUNTIME_SCHEMA_AUDIT.md)
- **Fonte de verdade do schema:** `infra/banza-network/postgres/init/001_schema.sql`

---

## Decisão canónica

> **O PostgreSQL do BANZA é uma base de estado protocolar verificável. Não é base financeira, não é ledger de pagamentos, não é core bancário, não é carteira digital e não é base de dados de operador.**

> **A base PostgreSQL do BANZA guarda estado do protocolo, não valor financeiro.**

> **A base de dados do BANZA não é um livro-razão de pagamentos, uma carteira, um core bancário nem uma
> base de dados de operador.**

> **Nenhuma chave privada, fundo, saldo ou transacção de pagamento real pode ser guardada na base de dados do protocolo BANZA.**

---

## 1. Porque é que o protocolo tem uma base de dados

O BANZA é um protocolo financeiro aberto. Para ser **inspeccionável** e **verificável**, o protocolo
precisa de guardar, de forma durável:

1. **Artefactos públicos assinados** — o manifesto raiz, o manifesto de chaves (apenas chaves públicas),
   referências a metadados de protocolo assinados, o registo público de operadores, a lista de
   revogação e os *hashes* de evidência de conformidade.
2. **Um índice do próprio texto de referência** para o agente nativo (BanzAI) poder recuperar e explicar
   o protocolo.
3. **Um registo de auditoria** append-only das escritas governadas.
4. **Marcadores de estado** do protocolo (fase).

Nada disto é valor financeiro. É **estado do protocolo**: aquilo que torna o protocolo público,
auditável e reproduzível por qualquer parte.

## 2. O que a base guarda

| Classe | Tabelas | Conteúdo |
|---|---|---|
| Confiança (assinado) | `root_manifest`, `key_manifest`, `brl_snapshot`, `brl_entry` | manifestos assinados, **chaves públicas** e *fingerprints*, lista de revogação |
| Registo público | `operators`, `certificates` | registo auto-publicado por operadores; emissão de produção condicionada às condições públicas de produção (ambas vazias hoje) |
| Evidência | `conformance_evidence` | **hashes** de relatórios (`report_sha256`) e marcador de resultado |
| Auditoria | `protocol_audit` | registo append-only de escritas governadas |
| Índice do agente | `banzai_document`, `banzai_chunk`, `banzai_answer_cache` | índice do texto **público** de referência e *embeddings* pgvector para recuperação |
| Estado | `protocol_state` | fase (`pre-production`), nota de fronteira |

## 3. O que a base nunca guarda

Nunca — nem em schema, nem em runtime, nem em cópias de segurança:

- Saldos, valores de carteira ou qualquer quantia representada como valor detido.
- Fundos, dinheiro, transacções de pagamento reais, liquidação, contas bancárias, IBANs, cartões,
  PAN ou CVV.
- KYC/AML real, dados pessoais de utilizadores, clientes ou comerciantes finais.
- Chaves privadas, *seed phrases* / mnemónicas, material de chave raiz privada, segredos de custódia.
- Conteúdo de `.env`, passwords, tokens ou chaves de API privadas.

Estes dados pertencem — quando existem — ao runtime **regulado do operador**, nunca à base de dados
neutra do protocolo. O livro-razão de partidas dobradas, os saldos de carteira e a liquidação descritos
pelo protocolo são **responsabilidade do operador**, sujeitos aos invariantes do protocolo e
demonstrados através de evidência de conformidade. A base do protocolo guarda a *evidência de que um
operador se comporta correctamente* (hashes, metadados assinados, auditoria) — nunca os dados
financeiros do operador.

## 4. Como a fronteira é imposta

A fronteira não é um princípio de prosa; é imposta em três camadas:

1. **Schema** — `001_schema.sql` é a fonte de verdade e contém apenas as tabelas acima.
2. **Papéis de privilégio mínimo** — `banza_ro` serve rotas públicas só de leitura; `banza_gov` faz
   escritas governadas e auditadas em confiança/registo; `banzai_rw` só pode escrever o índice de
   documentos do BanzAI — nunca confiança, registo nem certificados. Nenhum papel de serviço é
   superutilizador. A base nunca é publicada no host nem na Internet (rede Docker interna).
3. **Verificação automática** — `make postgres-data-boundary-check` (job de CI em cada *push* e *pull
   request*) analisa o schema activo em busca de nomes de coluna/tabela financeiros, de dados pessoais
   ou de segredos, e falha a build se algum aparecer.

> **Se for introduzida uma tabela capaz de guardar dados financeiros ou pessoais, tem de falhar as
> verificações de governança e de fronteira, a menos que seja explicitamente justificada fora do
> runtime do protocolo.**

## 5. Relação com os invariantes financeiros

Os invariantes `INV-LEDGER-*`, `INV-WALLET-*`, `INV-SETTLE-*`, `INV-IDEM-*` e `INV-RECON-*` descrevem
como o livro-razão de um **operador conforme** se deve comportar. São a régua que o protocolo aplica aos
operadores. Este documento é ortogonal: afirma que a *própria* base de dados da régua não é, ela mesma,
um livro-razão. **O protocolo mede livros-razão; não mantém um.**

## 6. Estado actual (auditado)

Em auditoria (2026-07-19, só leitura): `operators` vazia (`/operators = []`), `certificates` vazia
(`production_certificates = false`), índice do BanzAI vazio, `protocol_state` com os marcadores de
pré-produção. Detalhe completo em
[M2_7K_POSTGRESQL_RUNTIME_SCHEMA_AUDIT.md](M2_7K_POSTGRESQL_RUNTIME_SCHEMA_AUDIT.md).
