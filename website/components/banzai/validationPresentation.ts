// Block E2 / Q5 — the reader-facing copy of the operator-validation surface.
//
// This is the largest reader owner in the workspace, and the one where the distinction matters most.
// Everything the surface REPORTS is decided by the Rust engines and the technical registry: the step
// verdicts and their statuses, the reason codes, the receipts, the endpoint queried, the resolved host,
// the HTTP status, the SHA-256 hashes, the signature status, the evidence references, the profile, the
// environment, the operator and implementation ids, the persistence status, the reproduction outcome and
// every count. None of it is translated, and none of it may be: a validation that read differently in
// English would be a second, contradictory verdict about the same implementation.
//
// What IS the reader's own is the frame — the words that name those facts, the actions, the empty and
// loading states, and the question the "explain this result" control sends to BanzAI. That question is
// composed in the reader's language AROUND the engine's facts, so it never becomes a Portuguese sentence
// with English values spliced into it.
//
// The protocol vocabulary the engines themselves emit — "Reason codes", "Evidence Bundle", "HTTP status",
// "canonical origin", "receipt sha" — is deliberately identical in both editions. It names a field in a
// contract; inventing a Portuguese or English variant would describe something the contract does not have.

import type { Locale } from "@/lib/i18n";

const L = (pt: string, en: string): Readonly<Record<Locale, string>> => ({ pt, en });

export const VALIDATION_SURFACE_COPY = {
  "persistence.persisted": L(
    "Persistido",
    "Persisted",
  ),
  "persistence.persisted.sub": L(
    "Arquivo durável — o resultado é consultável, comparável e reproduzível.",
    "Durable archive — the result is queryable, comparable and reproducible.",
  ),
  "persistence.disabled": L(
    "Arquivo desativado",
    "Archive disabled",
  ),
  "persistence.disabled.sub": L(
    "O arquivo durável não está ativo neste ambiente. O resultado do motor continua válido, mas não fica arquivado.",
    "The durable archive is not active in this environment. The engine's result remains valid, but it is not archived.",
  ),
  "persistence.failed": L(
    "Resultado disponível · não persistido",
    "Result available · not persisted",
  ),
  "persistence.failed.sub": L(
    "A gravação no arquivo falhou. O resultado do motor é válido, mas ainda não é durável, consultável, comparável nem reproduzível.",
    "Writing to the archive failed. The engine's result is valid, but it is not yet durable, queryable, comparable or reproducible.",
  ),
  "persistence.pending": L(
    "Resultado disponível · persistência pendente",
    "Result available · persistence pending",
  ),
  "persistence.pending.sub": L(
    "A gravação no arquivo ainda não confirmou. O resultado do motor é válido; a durabilidade pode ser reconfirmada sem repetir a validação.",
    "Writing to the archive has not confirmed yet. The engine's result is valid; durability can be reconfirmed without repeating the validation.",
  ),
  "persistence.noArchiveRef": L(
    "sem referência de arquivo",
    "no archive reference",
  ),
  "persistence.archivePrefix": L(
    "arquivo: {id}",
    "archive: {id}",
  ),
  "persistence.retrying": L(
    "A reconfirmar…",
    "Reconfirming…",
  ),
  "persistence.retry": L(
    "Reconfirmar persistência",
    "Reconfirm persistence",
  ),
  "persistence.heading": L(
    "Persistência da jornada",
    "Journey persistence",
  ),
  "publication.published": L(
    "Publicado no registo técnico",
    "Published in the technical registry",
  ),
  "publication.draft": L(
    "Rascunho",
    "Draft",
  ),
  "publication.withdrawn": L(
    "Retirado",
    "Withdrawn",
  ),
  "publication.suspended": L(
    "Suspenso",
    "Suspended",
  ),
  "tab.summary": L(
    "Resumo",
    "Summary",
  ),
  "tab.receipts": L(
    "Receipts",
    "Receipts",
  ),
  "tab.artifacts": L(
    "Artefactos",
    "Artifacts",
  ),
  "tab.traces": L(
    "Traces",
    "Traces",
  ),
  "tab.reports": L(
    "Relatórios",
    "Reports",
  ),
  "tab.evidenceBundle": L(
    "Evidence Bundle",
    "Evidence Bundle",
  ),
  "tab.executions": L(
    "Execuções",
    "Executions",
  ),
  "action.explainResult": L(
    "Explicar este resultado",
    "Explain this result",
  ),
  "setup.step1": L(
    "1 · Operador",
    "1 · Operator",
  ),
  "setup.step2": L(
    "2 · Implementação",
    "2 · Implementation",
  ),
  "setup.registryError": L(
    "Não foi possível carregar o registo técnico neste momento. Actualize a página para tentar novamente — o registo é a fonte de verdade e nunca é substituído por dados locais.",
    "The technical registry could not be loaded right now. Refresh the page to try again — the registry is the source of truth and is never replaced by local data.",
  ),
  "setup.noOperators": L(
    "O registo técnico não lista operadores elegíveis neste momento.",
    "The technical registry lists no eligible operators right now.",
  ),
  "setup.publicationState": L(
    "estado de publicação",
    "publication state",
  ),
  "setup.implementations": L(
    "implementações",
    "implementations",
  ),
  "setup.technicalRegistry": L(
    "registo técnico",
    "technical registry",
  ),
  "setup.environment": L(
    "ambiente",
    "environment",
  ),
  "setup.profile": L(
    "perfil",
    "profile",
  ),
  "setup.yes": L(
    "sim",
    "yes",
  ),
  "setup.version": L(
    "versão",
    "version",
  ),
  "setup.protocolVersion": L(
    "versão do protocolo",
    "protocol version",
  ),
  "setup.canonicalOrigin": L(
    "origem canónica",
    "canonical origin",
  ),
  "setup.registryState": L(
    "estado no registo",
    "registry state",
  ),
  "setup.eligible": L(
    "elegível",
    "eligible",
  ),
  "setup.no": L(
    "não",
    "no",
  ),
  "setup.targetSelected": L(
    "Alvo seleccionado. A jornada avalia esta implementação através dos endpoints públicos declarados. Comece pela etapa 1.",
    "Target selected. The journey evaluates this implementation through the public endpoints it declares. Start at step 1.",
  ),
  "setup.selectPrompt": L(
    "Seleccione um operador e uma implementação para activar a jornada. O registo é fechado — sem operadores fictícios.",
    "Select an operator and an implementation to activate the journey. The registry is closed — no fictitious operators.",
  ),
  "setup.selectImplementation": L(
    "Seleccione uma implementação",
    "Select an implementation",
  ),
  "header.implementation": L(
    "implementação",
    "implementation",
  ),
  "header.resetConfirm": L(
    "Reiniciar a sessão de validação? Isto limpa apenas o estado efémero desta jornada (veredictos e recibos em memória). Nada publicado é alterado.",
    "Restart the validation session? This clears only this journey's ephemeral state (in-memory verdicts and receipts). Nothing published is changed.",
  ),
  "receipt.endpointQueried": L(
    "endpoint consultado",
    "endpoint queried",
  ),
  "receipt.canonicalOrigin": L(
    "canonical origin",
    "canonical origin",
  ),
  "receipt.resolvedHost": L(
    "resolved host",
    "resolved host",
  ),
  "receipt.httpStatus": L(
    "HTTP status",
    "HTTP status",
  ),
  "receipt.contentType": L(
    "content type",
    "content type",
  ),
  "receipt.contentLength": L(
    "content length",
    "content length",
  ),
  "receipt.outputHash": L(
    "hash (output)",
    "hash (output)",
  ),
  "receipt.signatureStatus": L(
    "signature status",
    "signature status",
  ),
  "action.cancel": L(
    "Cancelar",
    "Cancel",
  ),
  "action.viewSummary": L(
    "Ver resumo",
    "View summary",
  ),
  "action.viewResults": L(
    "Ver Resultados",
    "View Results",
  ),
  "action.exportJourneyReceipt": L(
    "Exportar JourneyReceipt",
    "Export JourneyReceipt",
  ),
  "action.runAgain": L(
    "Executar novamente",
    "Run again",
  ),
  "action.viewBlock": L(
    "Ver bloqueio",
    "View block",
  ),
  "action.consultDocs": L(
    "Consultar documentação",
    "Consult the documentation",
  ),
  "action.viewReceipt": L(
    "Ver receipt",
    "View receipt",
  ),
  "action.runFullJourney": L(
    "Executar jornada completa",
    "Run the full journey",
  ),
  "action.runFirstStep": L(
    "Executar primeira etapa",
    "Run the first step",
  ),
  "action.runThisStep": L(
    "Executar esta etapa",
    "Run this step",
  ),
  "action.runFromHere": L(
    "Executar a partir daqui",
    "Run from here",
  ),
  "step.engineResult": L(
    "Resultado do motor",
    "Engine result",
  ),
  "step.notEvaluated": L(
    "Ainda não avaliado — execute esta etapa para obter o veredicto do motor Rust.",
    "Not evaluated yet — run this step to obtain the Rust engine's verdict.",
  ),
  "step.reasonCodes": L(
    "Reason codes",
    "Reason codes",
  ),
  "step.verifiableEvidence": L(
    "Evidência verificável",
    "Verifiable evidence",
  ),
  "step.receiptFromEndpoint": L(
    "recibo com origem no endpoint",
    "receipt originating at the endpoint",
  ),
  "step.evidenceReferences": L(
    "Evidence references",
    "Evidence references",
  ),
  "step.evidenceHint": L(
    "A evidência verificável (origem consultada, host, HTTP, hash SHA-256, artefactos e assinatura) aparece aqui depois de executar esta etapa.",
    "The verifiable evidence (origin queried, host, HTTP, SHA-256 hash, artifacts and signature) appears here once you run this step.",
  ),
  "step.banzaiExplanation": L(
    "Explicação do BanzAI",
    "BanzAI explanation",
  ),
  "step.doesNotDecide": L(
    "não decide",
    "does not decide",
  ),
  "step.banzaiHint": L(
    "O BanzAI explica em linguagem clara o resultado já calculado pelos motores Rust — o que significa e o que o operador deve publicar.",
    "BanzAI explains, in plain language, the result the Rust engines already computed — what it means and what the operator must publish.",
  ),
  "step.explainWithBanzai": L(
    "Explicar com o BanzAI",
    "Explain with BanzAI",
  ),
  "ctx.steps": L(
    "ETAPAS",
    "STEPS",
  ),
  "ctx.certificationReadiness": L(
    "Prontidão de Certificação:",
    "Certification Readiness:",
  ),
  "ctx.certificationState": L(
    "Estado de Certificação:",
    "Certification State:",
  ),
  "ctx.nextAction": L(
    "PRÓXIMA ACÇÃO",
    "NEXT ACTION",
  ),
  "ctx.running": L(
    "Jornada em execução. Pode cancelar com segurança — nada é publicado.",
    "Journey running. You can cancel safely — nothing is published.",
  ),
  "ctx.allEvaluated": L(
    "Todas as etapas foram avaliadas. Veja o Resumo em Resultados.",
    "Every step has been evaluated. See the Summary under Results.",
  ),
  "ctx.selectedEndpoint": L(
    "ENDPOINT SELECCIONADO",
    "SELECTED ENDPOINT",
  ),
  "ctx.openStep": L(
    "Abrir etapa →",
    "Open step →",
  ),
  "ctx.noBlocks": L(
    "Sem bloqueios registados nesta sessão.",
    "No blocks recorded in this session.",
  ),
  "action.exportJson": L(
    "Exportar (JSON)",
    "Export (JSON)",
  ),
  "repro.equivalent": L(
    "Semanticamente equivalente",
    "Semantically equivalent",
  ),
  "repro.notEquivalent": L(
    "Não equivalente",
    "Not equivalent",
  ),
  "repro.inputsUnavailable": L(
    "Inputs originais indisponíveis",
    "Original inputs unavailable",
  ),
  "repro.engineVersionUnavailable": L(
    "Versão do motor indisponível",
    "Engine version unavailable",
  ),
  "repro.blocked": L(
    "Reprodução bloqueada",
    "Reproduction blocked",
  ),
  "exec.openFailed": L(
    "Não foi possível abrir a execução (arquivo indisponível).",
    "The execution could not be opened (archive unavailable).",
  ),
  "exec.compareFailed": L(
    "Não foi possível comparar as execuções.",
    "The executions could not be compared.",
  ),
  "exec.replayFailed": L(
    "Não foi possível iniciar a reprodução.",
    "The reproduction could not be started.",
  ),
  "exec.selectPrefix": L(
    "Selecione um operador e uma implementação em",
    "Select an operator and an implementation under",
  ),
  "exec.selectSuffix": L(
    "para consultar o histórico de execuções persistidas (arquivo durável, append-only e imutável).",
    "to consult the history of persisted executions (durable, append-only, immutable archive).",
  ),
  "exec.comparing": L(
    "A comparar…",
    "Comparing…",
  ),
  "exec.refresh": L(
    "Actualizar",
    "Refresh",
  ),
  "exec.loading": L(
    "A carregar o histórico de execuções…",
    "Loading the execution history…",
  ),
  "exec.retry": L(
    "Tentar novamente",
    "Try again",
  ),
  "exec.emptyPrefix": L(
    "Ainda não há execuções persistidas para esta implementação. Execute a jornada completa em",
    "There are no persisted executions for this implementation yet. Run the full journey under",
  ),
  "exec.emptySuffix": L(
    "para criar um arquivo durável.",
    "to create a durable archive.",
  ),
  "exec.start": L(
    "início",
    "start",
  ),
  "exec.profileEnvironment": L(
    "perfil · ambiente",
    "profile · environment",
  ),
  "exec.receiptSha": L(
    "receipt sha",
    "receipt sha",
  ),
  "exec.open": L(
    "Abrir",
    "Open",
  ),
  "exec.replaying": L(
    "A reproduzir…",
    "Replaying…",
  ),
  "exec.opening": L(
    "A abrir a execução…",
    "Opening the execution…",
  ),
  "exec.certification": L(
    "certificação",
    "certification",
  ),
  "exec.matrix9": L(
    "Matriz de 9 etapas",
    "9-step matrix",
  ),
  "exec.evidenceBundleLabel": L(
    "Evidence Bundle:",
    "Evidence Bundle:",
  ),
  "exec.export": L(
    "Exportar",
    "Export",
  ),
  "exec.comparison": L(
    "Comparação de execuções",
    "Execution comparison",
  ),
  "exec.changed": L(
    "alterou",
    "changed",
  ),
  "exec.archiveNote": L(
    "O arquivo é append-only e imutável: preserva os recibos e nunca recalcula um veredicto. A reprodução cria uma nova execução e compara-a com a original.",
    "The archive is append-only and immutable: it preserves the receipts and never recomputes a verdict. A reproduction creates a new execution and compares it with the original.",
  ),
  "results.title": L(
    "Resultados",
    "Results",
  ),
  "results.intro": L(
    "Uma única área para o resultado da validação de operador: resumo, recibos, relatórios, artefactos obtidos, traces e o Evidence Bundle.",
    "A single area for the operator validation result: summary, receipts, reports, fetched artifacts, traces and the Evidence Bundle.",
  ),
  "results.emptyPrefix": L(
    "Ainda não há resultados na sessão atual. Abra",
    "There are no results in the current session yet. Open",
  ),
  "results.emptySuffix": L(
    ", seleccione um operador e uma implementação, e execute a jornada (ou uma etapa) para obter recibos com origem verificável.",
    ", select an operator and an implementation, and run the journey (or a step) to obtain receipts with verifiable origin.",
  ),
  "results.journeySummary": L(
    "Resumo da jornada",
    "Journey summary",
  ),
  "results.readiness": L(
    "Prontidão de Certificação",
    "Certification Readiness",
  ),
  "results.certificationState": L(
    "Estado de Certificação",
    "Certification State",
  ),
  "results.viewReceipts": L(
    "Ver receipts",
    "View receipts",
  ),
  "results.journeyReceipt": L(
    "JourneyReceipt",
    "JourneyReceipt",
  ),
  "results.rustVerdicts": L(
    "Veredictos Rust por etapa",
    "Rust verdicts per step",
  ),
  "results.noArtifacts": L(
    "Nenhum artefacto obtido ainda. Execute a jornada para obter os artefactos publicados e os seus hashes.",
    "No artifact fetched yet. Run the journey to fetch the published artifacts and their hashes.",
  ),
  "results.tracesTitle": L(
    "Traces / evidence references (read-only)",
    "Traces / evidence references (read-only)",
  ),
  "results.tracesHint": L(
    "As referências de evidência (traces e ligações) aparecem aqui à medida que executa etapas.",
    "The evidence references (traces and links) appear here as you run steps.",
  ),
  "results.bundleFetched": L(
    "Evidence Bundle obtido",
    "Evidence Bundle fetched",
  ),
  "results.exportReceipt": L(
    "Exportar recibo (JSON)",
    "Export receipt (JSON)",
  ),
  "results.bundleHint": L(
    "O Evidence Bundle publicado é obtido e validado na etapa 8 da jornada. Execute-a para ver o bundle obtido, os seus hashes e o estado de assinatura.",
    "The published Evidence Bundle is fetched and validated at step 8 of the journey. Run it to see the fetched bundle, its hashes and its signature status.",
  ),
  "results.evidenceNote": L(
    "Evidência técnica verificável, obtida do endpoint público. Não é certificado nem aprovação.",
    "Verifiable technical evidence, fetched from the public endpoint. It is neither a certificate nor an approval.",
  ),
  "results.askBundle": L(
    "Explica o que é o Evidence Bundle e a Prontidão de Certificação na validação de operador do protocolo BANZA.",
    "Explain what the Evidence Bundle and Certification Readiness are in BANZA protocol operator validation.",
  ),
  "explain.opening": L(
    "Explica este resultado da etapa \"{title}\" da validação de operador no BanzAI (motor {engine}).",
    "Explain this result from the \"{title}\" step of operator validation in BanzAI (engine {engine}).",
  ),
  "explain.identity": L(
    "Operador: {operator}. Implementação: {implementation}.",
    "Operator: {operator}. Implementation: {implementation}.",
  ),
  "explain.status": L(
    "Estado: {status}.",
    "State: {status}.",
  ),
  "explain.endpoint": L(
    "Endpoint consultado: {endpoint}.",
    "Endpoint queried: {endpoint}.",
  ),
  "explain.fetchedAt": L(
    "Obtido em: {at}.",
    "Fetched at: {at}.",
  ),
  "explain.reasonCodes": L(
    "Reason codes: {codes}.",
    "Reason codes: {codes}.",
  ),
  "explain.evidence": L(
    "Evidência: {refs}.",
    "Evidence: {refs}.",
  ),
  "explain.closing": L(
    "O que significa e o que o operador deve publicar? Nota: o Qwen apenas explica — não altera o estado, o reason nem o recibo já calculados pelos motores Rust.",
    "What does it mean and what must the operator publish? Note: Qwen only explains — it does not change the state, the reason or the receipt the Rust engines already computed.",
  ),
  "step.evidenceHintFull": L(
    "A evidência verificável (origem consultada, host, HTTP, hash SHA-256, artefactos e assinatura) aparece aqui depois de executar a etapa. É obtida pelo backend a partir do endpoint público — nunca pelo navegador.",
    "The verifiable evidence (origin queried, host, HTTP, SHA-256 hash, artifacts and signature) appears here once you run the step. It is fetched by the backend from the public endpoint — never by the browser.",
  ),
  "step.banzaiHintFull": L(
    "O BanzAI explica em linguagem clara o resultado já calculado pelos motores Rust — o que significa e o que o operador deve publicar. Não altera o estado, os reason codes nem o recibo, e nunca certifica.",
    "BanzAI explains, in plain language, the result the Rust engines already computed — what it means and what the operator must publish. It changes neither the state, nor the reason codes, nor the receipt, and it never certifies.",
  ),
  "exec.archiveNoteFull": L(
    "O arquivo é append-only e imutável: preserva os recibos e nunca recalcula um veredicto. A reprodução cria uma NOVA execução a partir das referências e hashes originais — nunca sobrescreve o original.",
    "The archive is append-only and immutable: it preserves the receipts and never recomputes a verdict. A reproduction creates a NEW execution from the original references and hashes — it never overwrites the original.",
  ),
  "results.introFull": L(
    "Uma única área para o resultado da validação de operador: resumo, recibos, relatórios, artefactos obtidos, traces e o Evidence Bundle. Tudo com origem nos endpoints públicos da implementação.",
    "A single area for the operator validation result: summary, receipts, reports, fetched artifacts, traces and the Evidence Bundle. All of it originating at the implementation's public endpoints.",
  ),
  "results.emptyMiddle": L(
    ", seleccione um operador e uma implementação, e execute a jornada (ou uma etapa) para obter recibos com origem nos endpoints públicos. O histórico persistido de execuções anteriores está em ",
    ", select an operator and an implementation, and run the journey (or a step) to obtain receipts originating at the public endpoints. The persisted history of earlier executions is under ",
  ),
  "results.bundleHintFull": L(
    "O Evidence Bundle publicado é obtido e validado na etapa 8 da jornada. Execute-a para ver o bundle obtido, os seus artefactos e a integridade SHA-256.",
    "The published Evidence Bundle is fetched and validated at step 8 of the journey. Run it to see the fetched bundle, its artifacts and its SHA-256 integrity.",
  ),
  "setup.phase0": L(
    "Fase 0 · contexto",
    "Phase 0 · context",
  ),
  "setup.loadingOperators": L(
    "A carregar operadores do registo técnico…",
    "Loading operators from the technical registry…",
  ),
  "header.changeTarget": L(
    "Alterar alvo",
    "Change target",
  ),
  "header.resetSession": L(
    "Reiniciar sessão",
    "Restart session",
  ),
  "header.resetConfirmFull": L(
    "Reiniciar a sessão de validação? Isto limpa apenas o estado efémero desta jornada (veredictos e recibos em memória). Não altera endpoints, o registo, os artefactos remotos, a evidência, a Certificação nem a implementação.",
    "Restart the validation session? This clears only this journey's ephemeral state (in-memory verdicts and receipts). It changes neither the endpoints, the registry, the remote artifacts, the evidence, the Certification, nor the implementation.",
  ),
  "results.askConcepts": L(
    "Explicar estes conceitos no BanzAI →",
    "Explain these concepts in BanzAI →",
  ),
  "ctx.certificationStateInline": L(
    ". Estado de Certificação: ",
    ". Certification State: ",
  ),
  "ctx.readinessInline": L(
    "Prontidão de Certificação:",
    "Certification Readiness:",
  ),
  "ctx.readinessNote": L(
    ". A Prontidão agrega os veredictos das etapas técnicas — não é um Registo de Certificação e nunca devolve CERTIFIED (ADR-034 §4.10).",
    ". Readiness aggregates the verdicts of the technical steps — it is not a Certification Record and never returns CERTIFIED (ADR-034 §4.10).",
  ),
  "setup.registryErrorFull": L(
    "Não foi possível carregar o registo técnico neste momento. Actualize a página para tentar novamente — o registo é a única fonte de operadores; nenhum operador é assumido.",
    "The technical registry could not be loaded right now. Refresh the page to try again — the registry is the only source of operators; no operator is assumed.",
  ),
  "setup.targetSelectedFull": L(
    "Alvo seleccionado. A jornada avalia esta implementação através dos endpoints públicos declarados. Comece pela primeira etapa ou execute a jornada completa.",
    "Target selected. The journey evaluates this implementation through the public endpoints it declares. Start at the first step or run the full journey.",
  ),
  "setup.selectPromptFull": L(
    "Seleccione um operador e uma implementação para activar a jornada. O registo é fechado — sem operadores fictícios, sem URLs arbitrários.",
    "Select an operator and an implementation to activate the journey. The registry is closed — no fictitious operators, no arbitrary URLs.",
  ),
  "ask.unblock": L(
    "o protocolo sobre a etapa \"{title}\" da validação de operador (motor {engine}) e os reason codes {codes}. O que é preciso publicar para desbloquear?",
    "the protocol about the \"{title}\" step of operator validation (engine {engine}) and the reason codes {codes}. What must be published to unblock it?",
  ),
  "ask.unblock.fallback": L(
    "do bloqueio",
    "of the block",
  ),
  "step.title.discovery": L(
    "Discovery",
    "Discovery",
  ),
  "step.title.manifest": L(
    "Manifest",
    "Manifest",
  ),
  "step.title.keys": L(
    "Keys",
    "Keys",
  ),
  "step.title.conformance": L(
    "Conformidade",
    "Conformance",
  ),
  "step.title.interoperability": L(
    "Interoperabilidade",
    "Interoperability",
  ),
  "step.title.trust": L(
    "Confiança",
    "Trust",
  ),
  "step.title.federation": L(
    "Federação",
    "Federation",
  ),
  "step.title.evidence": L(
    "Evidence Bundle",
    "Evidence Bundle",
  ),
  "step.title.certification": L(
    "Prontidão de certificação",
    "Certification Readiness",
  ),
  "step.blurb.discovery": L(
    "Resolve a implementação no registo técnico fechado e obtém o documento de discovery da sua origem canónica. O motor Rust decide se a superfície pública é reconhecível.",
    "Resolves the implementation in the closed technical registry and fetches the discovery document from its canonical origin. The Rust engine decides whether the public surface is recognisable.",
  ),
  "step.blurb.manifest": L(
    "Obtém o operator manifest publicado no endpoint declarado e valida campos obrigatórios, tipos, endpoints e a invariante de segurança. Estado VALID/INCOMPLETE/INVALID/MALFORMED calculado em Rust.",
    "Fetches the operator manifest published at the declared endpoint and validates required fields, types, endpoints and the safety invariant. VALID/INCOMPLETE/INVALID/MALFORMED state computed in Rust.",
  ),
  "step.blurb.keys": L(
    "Obtém a signed metadata, o key manifest e a lista de revogação publicados e avalia o material de chaves real: assinatura, chave delegada e revogação. O veredicto corre em Rust.",
    "Fetches the published signed metadata, key manifest and revocation list and evaluates the real key material: signature, delegated key and revocation. The verdict runs in Rust.",
  ),
  "step.blurb.conformance": L(
    "Obtém e verifica a evidência de conformidade publicada pela implementação, incluindo as invariantes financeiras do protocolo. PASS/FAIL técnico calculado em Rust.",
    "Fetches and verifies the conformance evidence published by the implementation, including the protocol's financial invariants. Technical PASS/FAIL computed in Rust.",
  ),
  "step.blurb.interoperability": L(
    "Obtém os artefactos de pagamento/refund, ledger e traces publicados e valida o fluxo, a idempotência, o double-entry e o settlement (L2 readiness). Estado calculado em Rust.",
    "Fetches the published payment/refund artifacts, ledger and traces and validates the flow, the idempotency, the double-entry and the settlement (L2 readiness). State computed in Rust.",
  ),
  "step.blurb.trust": L(
    "Avalia o trust do protocolo a partir da signed metadata publicada: chaves delegadas, manifest, evidência de conformidade, registo e revogação. O estado de trust corre em Rust.",
    "Evaluates protocol trust from the published signed metadata: delegated keys, manifest, conformance evidence, registry and revocation. The trust state runs in Rust.",
  ),
  "step.blurb.federation": L(
    "Obtém a metadata e o manifest de federação publicados e os traces cross-operator e prepara a interoperabilidade entre operadores (L3 readiness). Estado calculado em Rust.",
    "Fetches the published federation metadata and manifest and the cross-operator traces, and prepares operator-to-operator interoperability (L3 readiness). State computed in Rust.",
  ),
  "step.blurb.evidence": L(
    "Obtém o Evidence Bundle publicado pela implementação e valida artefactos obrigatórios/em falta e a integridade SHA-256. Tudo calculado em Rust a partir do bundle obtido.",
    "Fetches the Evidence Bundle published by the implementation and validates required/missing artifacts and SHA-256 integrity. All computed in Rust from the fetched bundle.",
  ),
  "step.blurb.certification": L(
    "Agrega em Rust os veredictos das oito etapas técnicas numa Prontidão de Certificação (READY/BLOCKED). Não emite um Registo de Certificação e nunca devolve CERTIFIED (ADR-034 §4.10).",
    "Aggregates, in Rust, the verdicts of the eight technical steps into a Certification Readiness (READY/BLOCKED). It issues no Certification Record and never returns CERTIFIED (ADR-034 §4.10).",
  ),
  "stepStatus.NOT_EVALUATED": L(
    "Não avaliado",
    "Not evaluated",
  ),
  "stepStatus.PENDING": L(
    "Pendente",
    "Pending",
  ),
  "stepStatus.VERIFIED": L(
    "Verificado",
    "Verified",
  ),
  "stepStatus.FAILED": L(
    "Falhou",
    "Failed",
  ),
  "stepStatus.BLOCKED": L(
    "Bloqueado",
    "Blocked",
  ),
  "stepStatus.NOT_APPLICABLE": L(
    "Não aplicável",
    "Not applicable",
  ),
  "progress.running": L(
    "A executar a jornada…",
    "Running the journey…",
  ),
  "progress.notStarted": L(
    "Jornada por iniciar",
    "Journey not started",
  ),
  "progress.partial": L(
    "{evaluated}/{total} etapas avaliadas",
    "{evaluated}/{total} steps evaluated",
  ),
  "progress.doneOneBlocker": L(
    "Jornada concluída com um bloqueio",
    "Journey complete with one blocker",
  ),
  "progress.doneAllVerified": L(
    "Jornada concluída · todas as etapas verificadas",
    "Journey complete · every step verified",
  ),
  "progress.donePrefix": L(
    "Jornada concluída",
    "Journey complete",
  ),
  "progress.count.verified.one": L(
    "{n} verificada",
    "{n} verified",
  ),
  "progress.count.verified.many": L(
    "{n} verificadas",
    "{n} verified",
  ),
  "progress.count.pending.one": L(
    "{n} pendente",
    "{n} pending",
  ),
  "progress.count.pending.many": L(
    "{n} pendentes",
    "{n} pending",
  ),
  "progress.count.failed.one": L(
    "{n} falhada",
    "{n} failed",
  ),
  "progress.count.failed.many": L(
    "{n} falhadas",
    "{n} failed",
  ),
  "progress.count.blocked.one": L(
    "{n} bloqueada",
    "{n} blocked",
  ),
  "progress.count.blocked.many": L(
    "{n} bloqueadas",
    "{n} blocked",
  ),
  "ctx.step": L(
    "etapa",
    "step",
  ),
  "ctx.journey": L(
    "jornada",
    "journey",
  ),
} as const;

export type ValidationCopyId = keyof typeof VALIDATION_SURFACE_COPY;

/**
 * Ids whose two editions are legitimately identical: contract field names and protocol vocabulary the
 * engines emit verbatim. Declared so the completeness property can insist every OTHER id is realized twice.
 */
export const VALIDATION_IDENTICAL_ACROSS_EDITIONS: ValidationCopyId[] = [
  "step.title.discovery",
  "step.title.manifest",
  "step.title.keys",
  "step.title.evidence",

  "tab.receipts",
  "tab.traces",
  "tab.evidenceBundle",
  "receipt.canonicalOrigin",
  "receipt.resolvedHost",
  "receipt.httpStatus",
  "receipt.contentType",
  "receipt.contentLength",
  "receipt.outputHash",
  "receipt.signatureStatus",
  "step.reasonCodes",
  "step.evidenceReferences",
  "exec.receiptSha",
  "exec.evidenceBundleLabel",
  "results.journeyReceipt",
  "results.tracesTitle",
  "explain.reasonCodes",
];

/** Read one reader-facing string. `locale` is required; a missing realization throws. */
export function validationCopy(
  id: ValidationCopyId,
  locale: Locale,
  params?: Readonly<Record<string, string>>,
): string {
  const entry = VALIDATION_SURFACE_COPY[id];
  if (!entry) throw new Error(`validationCopy: unknown id "${id}"`);
  const template = entry[locale];
  if (!template) throw new Error(`validationCopy: no ${locale} realization for "${id}"`);
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = params?.[key];
    if (value === undefined || value === "") throw new Error(`validationCopy: "${id}" needs parameter "${key}"`);
    return value;
  });
}

export function validationCopyIds(): ValidationCopyId[] {
  return Object.keys(VALIDATION_SURFACE_COPY) as ValidationCopyId[];
}

/**
 * Label a publication-status enum for a reader. The STATUS is registry data and is unchanged; an unknown
 * value passes through verbatim rather than being invented in either language.
 */
export function publicationStatusLabelFor(status: string, locale: Locale): string {
  const id = `publication.${status}` as ValidationCopyId;
  if (!(id in VALIDATION_SURFACE_COPY)) return status;
  return validationCopy(id, locale);
}

/**
 * Name a reproduction OUTCOME for a reader. The outcome is the archive's verdict on whether a replay was
 * semantically equivalent; it is unchanged, and an unrecognised one passes through verbatim.
 */
export function reproOutcomeLabel(outcome: string, locale: Locale): string {
  const id = REPRO_OUTCOME_ID[outcome];
  return id ? validationCopy(id, locale) : outcome;
}

const REPRO_OUTCOME_ID: Readonly<Record<string, ValidationCopyId>> = {
  SEMANTICALLY_EQUIVALENT: "repro.equivalent",
  NOT_EQUIVALENT: "repro.notEquivalent",
  INPUTS_UNAVAILABLE: "repro.inputsUnavailable",
  ENGINE_VERSION_UNAVAILABLE: "repro.engineVersionUnavailable",
  BLOCKED: "repro.blocked",
};

/**
 * Name a step's VERDICT for a reader. The status is the engine's; this only says it in the reader's
 * language, and an unrecognised status passes through verbatim rather than being invented.
 */
export function stepStatusLabel(status: string, locale: Locale): string {
  const id = `stepStatus.${status}` as ValidationCopyId;
  if (!(id in VALIDATION_SURFACE_COPY)) return status;
  return validationCopy(id, locale);
}

/** A step's reader-facing name and description, bound by its stable id — never by its position. */
export function stepTitle(stepId: string, locale: Locale): string {
  return validationCopy(`step.title.${stepId}` as ValidationCopyId, locale);
}
export function stepBlurb(stepId: string, locale: Locale): string {
  return validationCopy(`step.blurb.${stepId}` as ValidationCopyId, locale);
}

/**
 * The journey's progress, as the engine's counters describe it — decided once in `validationJourney`,
 * with no locale in scope. Realizing it is the only thing that differs between editions: the KIND, the
 * counts and which counters are non-zero are the same facts for every reader.
 */
export type ProgressResult =
  | Readonly<{ kind: "running" }>
  | Readonly<{ kind: "notStarted" }>
  | Readonly<{ kind: "partial"; evaluated: number; total: number }>
  | Readonly<{ kind: "doneOneBlocker" }>
  | Readonly<{ kind: "doneAllVerified" }>
  | Readonly<{ kind: "doneWithCounts"; verified: number; pending: number; failed: number; blocked: number }>;

const COUNT_ORDER = ["verified", "pending", "failed", "blocked"] as const;

/** Realize a progress result. The branch was already taken; this only chooses the words. */
export function realizeProgress(result: ProgressResult, locale: Locale): string {
  switch (result.kind) {
    case "running":
      return validationCopy("progress.running", locale);
    case "notStarted":
      return validationCopy("progress.notStarted", locale);
    case "partial":
      return validationCopy("progress.partial", locale, {
        evaluated: String(result.evaluated),
        total: String(result.total),
      });
    case "doneOneBlocker":
      return validationCopy("progress.doneOneBlocker", locale);
    case "doneAllVerified":
      return validationCopy("progress.doneAllVerified", locale);
    default: {
      // Singular/plural is decided per edition from the SAME counts, never ported from Portuguese.
      const parts = COUNT_ORDER.filter((k) => result[k] > 0).map((k) =>
        validationCopy(`progress.count.${k}.${result[k] === 1 ? "one" : "many"}` as ValidationCopyId, locale, {
          n: String(result[k]),
        }),
      );
      return [validationCopy("progress.donePrefix", locale), ...parts].join(" · ");
    }
  }
}
