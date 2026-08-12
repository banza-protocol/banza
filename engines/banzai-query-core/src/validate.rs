//! Post-response validator for BanzAI (ADR-037, ADR-044).
//!
//! Runs in Rust AFTER any language model (mock, hosted, or local Qwen via llama.cpp)
//! produces text. The prompt is the primary guardrail; this is the deterministic last
//! line of defence that blocks a completion which claims normative authority, invents
//! protocol state, leaks the system prompt / chain-of-thought, or emits key material.
//!
//! Matching runs on the retrieval `normalize` form (lowercase, accent-folded, ASCII,
//! punctuation→space, whitespace collapsed) so inter-word newlines/tabs/extra spaces
//! and punctuation cannot defeat a phrase check, and byte slicing can never split a
//! multibyte char. Affirmative claim rules are negation-aware, so BANZA's own correct
//! statements ("não existem operadores certificados", "o BANZA não aprova nem
//! certifica") are NOT blocked. Conservative: no network, no LLM, no state.

use crate::normalize;

/// Strip a leading echo of the question from a completion.
///
/// M2.11D (QA-3). The onboarding answer came back starting with a fragment of the question itself —
/// `"começo com o meu operador?  Segundo a documentação…"`. The prompt puts the question inside a
/// `<PERGUNTA>` block and, on paths with no output-shape instruction, a small instruct model
/// sometimes continues it instead of answering it. A prompt clause alone is probabilistic; every
/// other generation hazard here is defended twice (chain-of-thought has a prompt rule, a validator
/// and a client strip), so this gets a deterministic layer too.
///
/// The rule is deliberately narrow, because a greedy strip is worse than the echo:
///   * only the FIRST line is considered, and only when the answer has more content after it;
///   * that line must be a SUFFIX of the normalised question (the observed shape — the model
///     resumes mid-question), or the whole question;
///   * it must be short (<= 120 chars) — a long first line is prose, not an echo;
///   * the remainder must still be substantial (>= 40 chars), so nothing can strip an answer away.
///
/// Anything else is left exactly as generated.
pub fn strip_question_echo(answer: &str, question: &str) -> String {
    let trimmed = answer.trim();
    let nq = normalize(question);
    if nq.is_empty() {
        return trimmed.to_string();
    }

    // Split off the first line (or first sentence when the model ran it together on one line).
    let (head, rest) = match trimmed.split_once('\n') {
        Some((h, r)) => (h, r),
        None => return trimmed.to_string(),
    };
    let head_t = head.trim();
    if head_t.is_empty() || head_t.chars().count() > 120 {
        return trimmed.to_string();
    }

    let nh = normalize(head_t);
    if nh.is_empty() {
        return trimmed.to_string();
    }
    // The echo is the question, or its tail. `contains` alone would be far too permissive.
    let is_echo = nq == nh || nq.ends_with(&nh);
    if !is_echo {
        return trimmed.to_string();
    }

    let remainder = rest.trim();
    if remainder.chars().count() < 40 {
        // Whatever is left is too short to be the real answer — keep the original rather than
        // serve a fragment.
        return trimmed.to_string();
    }
    remainder.to_string()
}

/// Result of validating a completion: `ok=false` means the pipeline must NOT serve the
/// model text and must fall back to the deterministic grounded answer instead.
pub struct Verdict {
    pub ok: bool,
    pub reason: &'static str,
}

fn block(reason: &'static str) -> Verdict {
    Verdict { ok: false, reason }
}

fn any(hay: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| hay.contains(n))
}

/// True when a negation cue appears within `window` chars before byte position `at`.
/// `t` is ASCII (from `normalize`), so byte slicing is char-safe.
fn negated_before(t: &str, at: usize, window: usize) -> bool {
    let start = at.saturating_sub(window);
    let slice = &t[start..at];
    [
        "nao", "nunca", "sem", "nem", "nenhum", "jamais", "not", "never", "cannot",
    ]
    .iter()
    .any(|n| slice.contains(n))
}

/// True when `needle` occurs in `t` at least once WITHOUT a negation within `window`
/// chars before it (so negated forms are allowed).
fn affirmative(t: &str, needle: &str, window: usize) -> bool {
    let mut from = 0;
    while let Some(rel) = t[from..].find(needle) {
        let at = from + rel;
        if !negated_before(t, at, window) {
            return true;
        }
        from = at + needle.len().max(1);
    }
    false
}

fn affirmative_any(t: &str, needles: &[&str], window: usize) -> bool {
    needles.iter().any(|n| affirmative(t, n, window))
}

/// True when `a` and `b` both appear with `b` starting within `window` chars after `a`
/// ends. `t` is ASCII so slicing is char-safe; the end is clamped defensively anyway.
fn contains_near(t: &str, a: &str, b: &str, window: usize) -> bool {
    let mut from = 0;
    while let Some(rel) = t[from..].find(a) {
        let a_end = from + rel + a.len();
        let mut end = (a_end + window).min(t.len());
        while end > a_end && !t.is_char_boundary(end) {
            end -= 1;
        }
        if t[a_end..end].contains(b) {
            return true;
        }
        from = a_end;
    }
    false
}

/// Like `contains_near`, but only fires when the `a` anchor is NOT preceded by a
/// negation within 28 chars — so "não emito certificados" is allowed while
/// "emito o certificado" is blocked.
fn affirmative_near(t: &str, a: &str, b: &str, window: usize) -> bool {
    let mut from = 0;
    while let Some(rel) = t[from..].find(a) {
        let a_start = from + rel;
        let a_end = a_start + a.len();
        let mut end = (a_end + window).min(t.len());
        while end > a_end && !t.is_char_boundary(end) {
            end -= 1;
        }
        if t[a_end..end].contains(b) && !negated_before(t, a_start, 28) {
            return true;
        }
        from = a_end;
    }
    false
}

/// Negation-aware "subject + verb-stem" claim. `subject_padded` is a whole word wrapped
/// in spaces (e.g. " banza ") matched against a space-padded `tp`, so " banza " never
/// matches inside "banzai". Fires only when a stem follows the subject within `window`
/// and no negation precedes the verb.
fn claim(tp: &str, subject_padded: &str, stems: &[&str], window: usize) -> bool {
    let mut from = 0;
    while let Some(rel) = tp[from..].find(subject_padded) {
        let s_end = from + rel + subject_padded.len();
        let win_end = (s_end + window).min(tp.len());
        let region = &tp[s_end..win_end];
        for v in stems {
            if let Some(vrel) = region.find(v) {
                let v_abs = s_end + vrel;
                if !negated_before(tp, v_abs, 40) {
                    return true;
                }
            }
        }
        from = s_end;
    }
    false
}

/// M2.19G.5C (ADR-073) — true when the completion CONFLATES a conformance PASS with a certificate.
/// A PASS is verifiable evidence, never a certificate (ADR-050/054). Distinct from check #5 (first-person
/// issuance). It must NOT block the TRUE statement "PASS é evidência verificável, não certificado": that
/// sentence keeps words (and a negation) between "pass" and "certificado", so the affirmative equivalence
/// lead-ins below never match it, and the "com … PASS … certificado" branch skips any negated certificate.
/// `t` is the normalized ASCII form (lowercased, accent-folded, punctuation→space).
fn pass_is_certificate(t: &str) -> bool {
    // Direct equivalence lead-ins that immediately conflate a PASS with a certificate.
    if any(
        t,
        &[
            "pass equivale a certificad",
            "pass equivale a um certificad",
            "pass e um certificad",
            "pass e o certificad",
            "pass e certificad",
            "pass significa certificad",
            "pass significa um certificad",
            "pass e o mesmo que certificad",
            "pass corresponde a um certificad",
            "pass da direito a um certificad",
            "pass emite um certificad",
            "pass emite o certificad",
            "pass concede certificac",
            "um pass e um certificad",
        ],
    ) {
        return true;
    }
    // "com (um/o) PASS … está certificado" — certified BY HOLDING a pass. Skip any negated certificate.
    if (contains_near(t, "com pass", "certificad", 48)
        || contains_near(t, "com um pass", "certificad", 48)
        || contains_near(t, "com o pass", "certificad", 48))
        && !any(
            t,
            &["nao certificad", "nao esta certificad", "nao e certificad"],
        )
    {
        return true;
    }
    false
}

/// Validate a model completion. Returns the first violation found, else ok.
/// `raw` is checked directly for key material and thinking tags (accent/punct folding
/// would not help there); every claim is checked on the normalized ASCII form `t`.
pub fn validate_response(raw: &str) -> Verdict {
    // 1. Private key material (raw, case-insensitive marker).
    let up = raw.to_uppercase();
    if up.contains("BEGIN") && up.contains("PRIVATE KEY") {
        return block("key_material");
    }

    // 2. Chain-of-thought tags (normalize would strip < >).
    let low = raw.to_lowercase();
    if low.contains("<think>") || low.contains("</think>") {
        return block("chain_of_thought_leak");
    }

    let t = normalize(raw);
    let tp = format!(" {t} "); // whole-word matching for subjects/negation

    // 3. System-prompt leakage.
    if t.contains("es o banzai o agente nativo")
        || any(
            &t,
            &[
                "regras inviolaveis",
                "prompt de sistema",
                "system prompt",
                "as minhas instrucoes de sistema",
            ],
        )
    {
        return block("system_prompt_leak");
    }

    // 4. Chain-of-thought phrases.
    if any(
        &t,
        &[
            "chain of thought",
            "cadeia de raciocinio",
            "o meu raciocinio interno",
            "vou pensar passo a passo internamente",
        ],
    ) {
        return block("chain_of_thought_leak");
    }

    // 5. Claims to ISSUE a certificate ("emit*" near "certificad", negation-aware —
    //    "não emito certificados" is allowed; "emito o certificado L3" is blocked).
    if affirmative_near(&t, "emit", "certificad", 40) {
        return block("claims_to_issue_certificate");
    }

    // 6. Claims to certify (first person).
    if affirmative_any(&t, &["certifico", "certificamos"], 28) {
        return block("claims_to_certify");
    }

    // 7. Invents a "certified operator" (negation-aware — "não existem operadores certificados" is fine).
    if affirmative_any(
        &t,
        &[
            "operador certificado",
            "operadores certificados",
            "operador esta certificado",
            "certified operator",
        ],
        32,
    ) {
        return block("claims_certified_operator");
    }

    // 8. Claims LIVE certification / production status.
    if affirmative(&t, "oficialmente certificad", 32)
        || (contains_near(&t, "certificad", "em producao", 24) && affirmative(&t, "certificad", 24))
    {
        return block("claims_live_certification");
    }

    // 9. BanzAI as authority / decider / certifier / approver (subject "banzai", negation-aware).
    if claim(
        &tp,
        " banzai ",
        &["decid", "certific", "aprov", "autoriz", "licenci"],
        40,
    ) || affirmative_any(
        &t,
        &[
            "banzai e a autoridade",
            "banzai e fonte normativa",
            "banzai e normativo",
        ],
        32,
    ) {
        return block("claims_banzai_decides");
    }

    // 10. BANZA approves / authorizes / grants status (subject "banza", not "banzai").
    if claim(&tp, " banza ", &["aprov", "autoriz", "concede"], 40)
        || affirmative_any(&t, &["aprovado pelo banza", "autorizado pelo banza"], 32)
    {
        return block("claims_banza_approves");
    }

    // 11. BANZA licenses.
    if claim(&tp, " banza ", &["licenci"], 40) || affirmative(&t, "licenciado pelo banza", 32) {
        return block("claims_banza_licenses");
    }

    // 12. BANZA moves/holds funds or balances (protocol is not an operator/wallet).
    if affirmative_any(
        &t,
        &[
            "banza processa pagamentos",
            "banza guarda saldos",
            "banza movimenta dinheiro",
            "banza mantem saldos",
        ],
        40,
    ) || (contains_near(&t, "banza", "fundos", 40)
        && any(
            &t,
            &[
                "processa fundos",
                "move fundos",
                "movimenta fundos",
                "transfere fundos",
                "guarda fundos",
            ],
        ))
    {
        return block("claims_banza_handles_funds");
    }

    // 13. Claims to replace the conformance suite.
    if contains_near(&t, "substitu", "conformance suite", 40)
        || contains_near(&t, "substitu", "suite de conformidade", 40)
    {
        return block("claims_to_replace_conformance");
    }

    // 14. The model as a normative source.
    if affirmative_any(
        &t,
        &[
            "qwen e fonte normativa",
            "qwen e normativo",
            "qwen decide",
            "qwen certifica",
            "o modelo e fonte normativa",
            "o modelo decide as regras",
            "qwen define as regras",
        ],
        40,
    ) {
        return block("claims_model_normative");
    }

    // 15. Claims the PUBLIC infrastructure custodies private keys or performs signing.
    //     Boundary: root/issuing keys are offline (ceremony-controlled) and the public VM
    //     serves signed artifacts only — it does NOT hold private keys or sign. Negation-
    //     aware: the correct grounded answer ("a infraestrutura ... não guarda chaves
    //     privadas nem realiza assinatura", "root keys são offline", "nunca residem na VM")
    //     must PASS, so we anchor on the affirmative custody/signing verb-phrase (not on a
    //     bare "assina", which would false-positive on "artefactos públicos assinados").
    let infra_subject = any(
        &t,
        &[
            "infraestrutura",
            "vm publica",
            " vm ",
            "servidor publico",
            "maquina publica",
        ],
    );
    if infra_subject
        && (affirmative_any(
            &t,
            &[
                "guarda chaves privadas",
                "guarda a chave privada",
                "guarda root keys",
                "armazena chaves privadas",
                "detem chaves privadas",
                "mantem chaves privadas",
                "aloja chaves privadas",
                "guarda as chaves privadas",
            ],
            40,
        ) || affirmative_any(
            &t,
            &[
                "assina os artefactos",
                "assina artefactos",
                "assina os pacotes",
                "realiza assinatura",
                "realiza a assinatura",
                "faz assinatura",
                "faz a assinatura",
            ],
            40,
        ) || (contains_near(&t, "root key", "vm", 40) && affirmative(&t, "root key", 24)))
    {
        return block("claims_infra_custodies_keys");
    }

    // ── M2.19G.5C (ADR-073) — six negation-aware authority rules. Certification ≠ admission ≠
    // authorisation (ADR-059..063); BanzAI is non-decisive (ADR-054); a PASS/readiness is not a
    // certificate (ADR-050/064..066). Each ties the claim to its subject (whole-word `banza`/`banzai`/
    // `qwen`) and is negation-aware, so BANZA's own correct disclaimers PASS. ──

    // 16. Claims BANZA/BanzAI ADMITS an operator into the operational scheme (L3). Certification is
    //     never admission (ADR-059..063). The subject must drive the admission verb (via `claim`), so a
    //     true statement where another actor admits — or a negated "não admite" — is not blocked.
    let scheme_phrase = any(&t, &["esquema operacional", "operational scheme"]);
    if scheme_phrase
        && (claim(&tp, " banza ", &["admite", "integra", "inscreve"], 56)
            || claim(&tp, " banzai ", &["admite", "integra", "inscreve"], 56)
            || affirmative_any(
                &t,
                &[
                    "banza admite",
                    "banzai admite",
                    "admissao pelo banza",
                    "admissao pelo banzai",
                    "admissao pela banzai",
                ],
                40,
            ))
    {
        return block("claims_scheme_admission");
    }

    // 17. Claims BANZA/BanzAI grants REGULATORY authorisation, or that BANZA can operate real money.
    //     Certification is never authorisation and the real-money gate is external (ADR-059..063).
    //     Negation-aware — "BANZA não autoriza regulatoriamente" / "não pode operar dinheiro real" PASS.
    let reg_stems = [
        "autoriza regulatoria",
        "autoriza regulatoriamente",
        "concede autorizacao regulatoria",
        "autorizado a operar",
        "autorizado regulatoria",
        "pode operar dinheiro real",
    ];
    if claim(&tp, " banza ", &reg_stems, 48) || claim(&tp, " banzai ", &reg_stems, 48) {
        return block("claims_regulatory_authorisation");
    }

    // 18. Claims BanzAI/BANZA itself PUBLISHES/registers an operator in the Technical Registry. Anchored
    //     on the MODEL as the actor (subject + publication verb near the registry + an operator), so the
    //     TRUE deterministic statement — the REGISTRY publishes/holds state (registry as subject) — is
    //     NOT blocked, and a negated "não publica" PASSES.
    let registry_phrase = any(&t, &["registo tecnico", "technical registry"]);
    let operator_obj = any(&t, &["operador", "operadores", "operator", "implementacao"]);
    let pub_verbs = [
        "publica", "publico", "inscreve", "inscrevo", "lista", "listo", "adiciona", "adiciono",
    ];
    if registry_phrase
        && operator_obj
        && (claim(&tp, " banzai ", &pub_verbs, 56) || claim(&tp, " banza ", &pub_verbs, 56))
    {
        return block("claims_registry_publication");
    }

    // 19. Claims BanzAI/Qwen ALTERS, REVERSES, VOIDS or REVOKES a verdict/result/certificate/registry/
    //     status. BanzAI is non-decisive and never changes an outcome (ADR-054). Negation-aware.
    let alter_stems = [
        "altero", "altera", "reverto", "reverte", "anulo", "anula", "invalido", "invalida",
        "revogo", "revoga",
    ];
    let alter_obj = any(
        &t,
        &[
            "veredicto",
            "resultado",
            "verdict",
            "result",
            "certificad",
            "registo",
            "estatuto",
        ],
    );
    if alter_obj
        && (claim(&tp, " banzai ", &alter_stems, 48) || claim(&tp, " qwen ", &alter_stems, 48))
    {
        return block("claims_result_alteration_or_revocation");
    }

    // 20. Conflates a conformance PASS with a certificate (a PASS is verifiable evidence, never a
    //     certificate — ADR-050/054). Distinct from check #5 (first-person issuance). The TRUE
    //     "PASS é evidência verificável, não certificado" PASSES (see `pass_is_certificate`).
    if pass_is_certificate(&t) {
        return block("claims_pass_is_certificate");
    }

    // 21. Conflates certification READINESS with certification actually granted. A ready operator is not
    //     a certified one (ADR-064..066/059..063). Negation-aware.
    let readiness = any(
        &t,
        &[
            "prontidao de certificacao",
            "prontidao para certificacao",
            "certification readiness",
            "pronto para certificacao",
            "esta pronto para certificar",
        ],
    );
    let certification_conflate = any(
        &t,
        &[
            "certificacao concedida",
            "equivale a certificacao",
            "significa certificacao",
            "e o mesmo que certificacao",
            "ja esta certificado",
            "e uma certificacao concedida",
        ],
    );
    if readiness
        && certification_conflate
        && !any(
            &t,
            &[
                "nao e certificacao",
                "nao significa certificacao",
                "nao esta certificado",
                "nao equivale",
                "nao e o mesmo que",
                "nao e uma certificacao",
                "nao garante certificacao",
                "nao e certificad",
            ],
        )
    {
        return block("claims_readiness_is_certification");
    }

    Verdict {
        ok: true,
        reason: "",
    }
}

#[cfg(test)]
mod echo_tests {
    use super::*;

    const Q: &str = "como começo com o meu operador?";

    #[test]
    fn the_observed_echo_is_stripped() {
        // Exactly what the live site returned: a suffix of the question, then the real answer.
        let a = "começo com o meu operador?\nSegundo a documentação do BANZA, o processo de entrada de um operador envolve demonstrar conformidade com evidência verificável.";
        let out = strip_question_echo(a, Q);
        assert!(out.starts_with("Segundo a documentação"), "got: {out}");
        assert!(!out.contains("começo com o meu operador?"));
    }

    #[test]
    fn a_full_question_echo_is_stripped() {
        let a = "Como começo com o meu operador?\nO caminho começa por preparar o manifest do operador e validá-lo com o motor.";
        assert!(strip_question_echo(a, Q).starts_with("O caminho"));
    }

    // The dangerous direction: stripping real content. Every case below must be left ALONE.
    #[test]
    fn a_real_answer_is_never_stripped() {
        for a in [
            // First line is a genuine answer that merely shares words with the question.
            "O teu operador começa pelo manifest.\nDepois corre a conformidade L0 e recolhe a evidência técnica do resultado.",
            // Single line — nothing to split, nothing to strip.
            "começo com o meu operador?",
            // Echo present but the remainder is too short to be a real answer.
            "começo com o meu operador?\nSim.",
            // A long first line is prose, not an echo.
            "Começar com o teu operador significa preparar o manifest, validá-lo, e só depois avançar para a conformidade, o trust e a federação, por esta ordem.\nCada etapa produz evidência.",
        ] {
            assert_eq!(strip_question_echo(a, Q), a.trim(), "wrongly stripped: {a}");
        }
    }

    #[test]
    fn an_unrelated_first_line_is_never_stripped() {
        let a = "O protocolo BANZA é operator-neutral.\nQualquer operador certificado pode participar na federação sem depender de outro.";
        assert_eq!(strip_question_echo(a, Q), a.trim());
    }

    #[test]
    fn an_empty_question_is_safe() {
        let a = "Uma resposta qualquer.\nCom conteúdo suficiente para não ser considerada curta demais.";
        assert_eq!(strip_question_echo(a, ""), a.trim());
    }
}

// ── M2.19G.5C (ADR-073) — the six new authority rules (15..20 in the ADR; checks 16..21 in the file).
// Each has a positive (must reject with the exact typed reason), a negation case (must pass), and — for
// the registry-publication and PASS-is-a-certificate rules — the TRUE-statement case (must pass). ──
#[cfg(test)]
mod authority_tests {
    use super::*;

    fn reason(s: &str) -> &'static str {
        validate_response(s).reason
    }
    fn passes(s: &str) -> bool {
        validate_response(s).ok
    }

    // 16 — scheme admission (certificação ≠ admissão).
    #[test]
    fn scheme_admission_is_blocked() {
        assert_eq!(
            reason("O BANZA admite o operador no esquema operacional."),
            "claims_scheme_admission"
        );
    }
    #[test]
    fn scheme_admission_negation_passes() {
        assert!(passes(
            "O BANZA não admite operadores no esquema operacional; a certificação não é admissão."
        ));
        // A true statement where ANOTHER actor admits must also pass.
        assert!(passes(
            "O operador de referência admite operadores no esquema operacional, não o BANZA."
        ));
    }

    // 17 — regulatory authorisation (certificação ≠ autorização; real-money gate is external).
    #[test]
    fn regulatory_authorisation_is_blocked() {
        assert_eq!(
            reason("O BANZA pode operar dinheiro real."),
            "claims_regulatory_authorisation"
        );
    }
    #[test]
    fn regulatory_authorisation_negation_passes() {
        assert!(passes(
            "O BANZA não autoriza regulatoriamente nenhum operador."
        ));
        assert!(passes("O BANZA não pode operar dinheiro real."));
    }

    // 18 — Technical Registry publication BY THE MODEL (registry-as-subject must pass).
    #[test]
    fn registry_publication_by_model_is_blocked() {
        assert_eq!(
            reason("O BanzAI publica o operador no Registo Técnico."),
            "claims_registry_publication"
        );
    }
    #[test]
    fn registry_publication_negation_passes() {
        assert!(passes(
            "O BanzAI não publica o operador no Registo Técnico."
        ));
    }
    #[test]
    fn registry_as_subject_is_not_blocked() {
        // TRUE deterministic statement: the REGISTRY publishes/holds state.
        assert!(passes(
            "O Registo Técnico publica o estado verificável do operador."
        ));
    }

    // 19 — result alteration / revocation (BanzAI is non-decisive).
    #[test]
    fn result_alteration_is_blocked() {
        assert_eq!(
            reason("O BanzAI reverte o veredicto da validação."),
            "claims_result_alteration_or_revocation"
        );
    }
    #[test]
    fn result_alteration_negation_passes() {
        assert!(passes(
            "O BanzAI não reverte o veredicto nem anula o resultado."
        ));
    }

    // 20 — PASS-is-a-certificate conflation (the TRUE "PASS é evidência … não certificado" must pass).
    #[test]
    fn pass_is_certificate_is_blocked() {
        assert_eq!(
            reason("Um PASS equivale a um certificado."),
            "claims_pass_is_certificate"
        );
        assert_eq!(
            reason("Com um PASS está certificado."),
            "claims_pass_is_certificate"
        );
    }
    #[test]
    fn pass_is_evidence_not_certificate_passes() {
        assert!(passes("Um PASS é evidência verificável, não certificado."));
        assert!(passes("PASS é evidência verificável, não certificado."));
    }

    // 21 — readiness-is-certification conflation.
    #[test]
    fn readiness_is_certification_is_blocked() {
        assert_eq!(
            reason("A prontidão de certificação equivale a certificação concedida."),
            "claims_readiness_is_certification"
        );
    }
    #[test]
    fn readiness_is_certification_negation_passes() {
        assert!(passes(
            "A prontidão de certificação não é certificação concedida."
        ));
    }
}
