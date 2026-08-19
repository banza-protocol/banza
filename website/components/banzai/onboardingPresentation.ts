// Block E2 / Q5 — the reader-facing copy of operator onboarding.
//
// Onboarding is a hosted BanzAI service, not a protocol rule: the email authenticates the person, the
// domain confirms the origin, the endpoints supply the artifacts, and Rust verifies. Everything it
// REPORTS is decided outside the browser — the candidature's stage, whether the origin proof verified,
// which protocol versions/profiles/environments the registry considers canonical, and the reason an
// attempt failed. None of it is translated.
//
// What is the reader's own is the wording: the step names, the field labels and hints, the calls to
// action, and the honest sentences that explain what a candidature is NOT. Those last ones matter most —
// a candidature is not a published operator, not an active participant and not a certified entity — so
// they are authored in full in both editions rather than softened in either.

import type { Locale } from "@/lib/i18n";

const L = (pt: string, en: string): Readonly<Record<Locale, string>> => ({ pt, en });

export const ONBOARDING_SURFACE_COPY = {
  "modeLabel": L("Onboarding de operador", "Operator onboarding"),
  "header": L("Onboarding de operador", "Operator onboarding"),
  "intro": L(
    "Registe uma candidatura para preparar a validação técnica da sua implementação. A autenticação é sem palavra-passe: recebe um código de acesso no seu email. A candidatura fica guardada e pode ser recuperada a qualquer momento com o mesmo email.",
    "Register a candidature to prepare your implementation's technical validation. Authentication is passwordless: you receive an access code by email. The candidature is saved and can be recovered at any time with the same email address.",
  ),
  "boundary": L(
    "Uma candidatura não é um operador publicado, um participante activo nem uma entidade certificada. O onboarding é um serviço do BanzAI, não uma regra do protocolo: o email autentica a pessoa, o domínio confirma a origem, os endpoints fornecem os artefactos e o Rust verifica. Não movimenta fundos, não concede autorização regulatória e não admite em nenhum scheme.",
    "A candidature is not a published operator, not an active participant and not a certified entity. Onboarding is a BanzAI service, not a protocol rule: the email authenticates the person, the domain confirms the origin, the endpoints supply the artifacts, and Rust verifies. It moves no funds, grants no regulatory authorisation and admits into no scheme.",
  ),
  "scope": L(
    "Âmbito inicial: Angola (AOA). Sem recolha de dados de jurisdição neste passo.",
    "Initial scope: Angola (AOA). No jurisdiction data is collected at this step.",
  ),
  "paths.published.title": L("Consultar operador publicado", "Consult a published operator"),
  "paths.published.desc": L(
    "Ver o registo técnico público e as implementações de referência.",
    "See the public technical registry and the reference implementations.",
  ),
  "paths.submit.title": L("Submeter novo operador", "Submit a new operator"),
  "paths.submit.desc": L(
    "Criar uma candidatura e declarar a implementação e a sua origem canónica.",
    "Create a candidature and declare the implementation and its canonical origin.",
  ),
  "paths.recover.title": L("Continuar candidatura", "Continue a candidature"),
  "paths.recover.desc": L(
    "Recuperar uma candidatura existente com o email já verificado.",
    "Recover an existing candidature with the email already verified.",
  ),
  "email.label": L("Email institucional", "Institutional email"),
  "email.placeholder": L("operador@exemplo.ao", "operator@example.ao"),
  "email.cta": L("Enviar código de acesso", "Send access code"),
  "email.hint": L(
    "Enviamos um código de 6 dígitos, válido por alguns minutos e de uso único. Nunca pedimos palavra-passe.",
    "We send a 6-digit code, valid for a few minutes and single-use. We never ask for a password.",
  ),
  "otp.label": L("Código de acesso", "Access code"),
  "otp.placeholder": L("000000", "000000"),
  "otp.cta": L("Confirmar código", "Confirm code"),
  "otp.resend": L("Reenviar código", "Resend code"),
  "otp.hint": L(
    "Introduza o código de 6 dígitos que enviámos para o seu email.",
    "Enter the 6-digit code we sent to your email.",
  ),
  "origin.title": L("Prova de controlo da origem canónica", "Proof of control of the canonical origin"),
  "origin.intro": L(
    "Publique o documento abaixo em .well-known no domínio canónico da implementação. O backend obtém-no de forma segura e o Rust confirma o controlo da origem.",
    "Publish the document below under .well-known on the implementation's canonical domain. The backend fetches it securely and Rust confirms control of the origin.",
  ),
  "origin.verifyCta": L("Verificar origem", "Verify origin"),
  "origin.verified": L(
    "Origem verificada — controlo do domínio canónico confirmado.",
    "Origin verified — control of the canonical domain confirmed.",
  ),
  "sessionNotice": L(
    "A sua candidatura fica guardada no Registo de Candidaturas privado. A sessão é protegida por um cookie de sessão; termine sessão para a encerrar.",
    "Your candidature is kept in the private Candidate Registry. The session is protected by a session cookie; sign out to end it.",
  ),

  // ── The component's own surface ────────────────────────────────────────────────────────────────
  "stage.inValidation": L("Em validação", "In validation"),
  "stage.validationComplete": L("Validação concluída", "Validation complete"),
  "stage.eligibleForPublication": L("Elegível para publicação", "Eligible for publication"),
  "stage.publishedInRegistry": L("Publicada no registo técnico", "Published in the technical registry"),
  "stage.originVerificationFailed": L("Verificação de origem falhou", "Origin verification failed"),
  "step.authentication": L("Autenticação", "Authentication"),
  "step.implementation": L("Implementação", "Implementation"),
  "step.canonicalOrigin": L("Origem canónica", "Canonical origin"),
  "step.validationPrep": L("Preparação para validação", "Preparation for validation"),
  "aria.sequence": L("Sequência de onboarding do operador", "Operator onboarding sequence"),
  "session.signedInAs": L("Sessão iniciada como", "Signed in as"),
  "session.signOut": L("Terminar sessão", "Sign out"),
  "candidature.none": L("Ainda não tem candidaturas. Crie uma abaixo.", "You have no candidatures yet. Create one below."),
  "candidature.oneOperator": L(
    "Um operador; cada implementação declara a sua própria versão, perfil e ambiente e prova a sua própria origem.",
    "One operator; each implementation declares its own version, profile and environment, and proves its own origin.",
  ),
  "field.implementationName": L("Nome da implementação", "Implementation name"),
  "field.canonicalDomain": L("Domínio canónico", "Canonical domain"),
  "field.canonicalDomainPlaceholder": L("Domínio canónico (ex.: op.exemplo.ao)", "Canonical domain (e.g. op.example.ao)"),
  "field.protocolVersion": L("Versão do protocolo", "Protocol version"),
  "field.protocolVersionPlaceholder": L("Versão do protocolo…", "Protocol version…"),
  "options.loading": L(
    "A carregar as opções canónicas do protocolo…",
    "Loading the canonical protocol options…",
  ),
  "action.addImplementation": L("Adicionar implementação", "Add implementation"),
  "action.prepareOriginProof": L("Preparar prova de origem", "Prepare origin proof"),
  "action.publishAt": L("Publicar em:", "Publish at:"),
  "action.goToValidate": L("Ir para Validar operador", "Go to Validate operator"),

  // Failure reasons. WHICH one is reported is decided by the backend; only the sentence is the reader's.
  "error.codeSent": L("Código enviado. Verifique o seu email.", "Code sent. Check your email."),
  "error.emailSendFailed": L(
    "Não foi possível enviar o email. Verifique o endereço e tente novamente.",
    "The email could not be sent. Check the address and try again.",
  ),
  "error.emailInvalid": L(
    "Email inválido ou serviço indisponível. Tente novamente.",
    "Invalid email, or the service is unavailable. Try again.",
  ),
  "error.codeExpired": L(
    "Código expirado ou já usado. Peça um novo código.",
    "The code has expired or was already used. Request a new one.",
  ),
  "error.tooManyAttempts": L(
    "Demasiadas tentativas. Peça um novo código.",
    "Too many attempts. Request a new code.",
  ),
  "error.codeIncorrect": L(
    "Código incorrecto. Verifique e tente novamente.",
    "Incorrect code. Check it and try again.",
  ),
  "error.candidatureFailed": L("Não foi possível criar a candidatura.", "The candidature could not be created."),
  "error.invalidDomain": L("Domínio inválido.", "Invalid domain."),
  "error.nonCanonicalOption": L(
    "Versão/perfil/ambiente têm de ser um valor canónico suportado.",
    "Version/profile/environment must be a supported canonical value.",
  ),
  "error.addImplementationFailed": L(
    "Não foi possível adicionar a implementação.",
    "The implementation could not be added.",
  ),
  "error.challengeFailed": L(
    "Não foi possível emitir o desafio de origem.",
    "The origin challenge could not be issued.",
  ),
  "error.documentUnreachable": L(
    "Não foi possível obter o documento no domínio. Confirme que está publicado e acessível por HTTPS.",
    "The document could not be fetched from the domain. Confirm it is published and reachable over HTTPS.",
  ),
  "error.originMismatch": L(
    "A origem ainda não confere. Confirme o documento publicado e tente novamente.",
    "The origin does not match yet. Confirm the published document and try again.",
  ),
  "state.emailPending": L("Email por confirmar", "Email not yet confirmed"),
  "state.emailVerified": L("Email confirmado", "Email confirmed"),
  "state.draft": L("Rascunho", "Draft"),
  "state.originPending": L("Origem por verificar", "Origin not yet verified"),
  "state.originVerified": L("Origem verificada", "Origin verified"),
  "state.blocked": L("Bloqueada", "Blocked"),
  "state.expired": L("Expirada", "Expired"),
  "state.originChallengeIssued": L("Desafio de origem emitido", "Origin challenge issued"),
  "state.notStarted": L("Por iniciar", "Not started"),
  "step.candidature": L("Candidatura", "Candidature"),
  "step.proofOfControl": L("Prova de controlo", "Proof of control"),
} as const;

export type OnboardingCopyId = keyof typeof ONBOARDING_SURFACE_COPY;

/** Ids whose two editions are legitimately identical: a numeric placeholder and the product's own name. */
export const ONBOARDING_IDENTICAL_ACROSS_EDITIONS: OnboardingCopyId[] = ["otp.placeholder"];

/** Read one reader-facing string. `locale` is required; a missing realization throws. */
export function onboardingCopy(id: OnboardingCopyId, locale: Locale): string {
  const entry = ONBOARDING_SURFACE_COPY[id];
  if (!entry) throw new Error(`onboardingCopy: unknown id "${id}"`);
  const text = entry[locale];
  if (!text) throw new Error(`onboardingCopy: no ${locale} realization for "${id}"`);
  return text;
}

export function onboardingCopyIds(): OnboardingCopyId[] {
  return Object.keys(ONBOARDING_SURFACE_COPY) as OnboardingCopyId[];
}

/**
 * The onboarding copy in one edition, in the nested shape the surface reads. Built per render from the
 * flat catalogue, so there is exactly one definition of each sentence and the structure stays readable
 * at the call site.
 */
export function onboardingPresentation(locale: Locale) {
  const t = (id: OnboardingCopyId) => onboardingCopy(id, locale);
  return {
    modeLabel: t("modeLabel"),
    header: t("header"),
    intro: t("intro"),
    boundary: t("boundary"),
    scope: t("scope"),
    paths: {
      published: { title: t("paths.published.title"), desc: t("paths.published.desc") },
      submit: { title: t("paths.submit.title"), desc: t("paths.submit.desc") },
      recover: { title: t("paths.recover.title"), desc: t("paths.recover.desc") },
    },
    email: { label: t("email.label"), placeholder: t("email.placeholder"), cta: t("email.cta"), hint: t("email.hint") },
    otp: {
      label: t("otp.label"),
      placeholder: t("otp.placeholder"),
      cta: t("otp.cta"),
      resend: t("otp.resend"),
      hint: t("otp.hint"),
    },
    origin: {
      title: t("origin.title"),
      intro: t("origin.intro"),
      verifyCta: t("origin.verifyCta"),
      verified: t("origin.verified"),
    },
    sessionNotice: t("sessionNotice"),
  } as const;
}
