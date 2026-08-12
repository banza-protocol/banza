//! Inference-queue POLICY (M2.14E) — pure, deterministic, testable.
//!
//! The QUEUE RUNTIME (promises, timers, the in-flight map, the lifetime of an open HTTP request)
//! lives in the Node banzai-api (`services/banzai-api/src/concurrency.js`). That is fine async
//! orchestration, not an algorithmic engine. The POLICY that decides HOW a model-bound request is
//! treated is here, in Rust: the request PRIORITY, whether a request is SAFE to de-duplicate, and
//! the SAFE public message shown under backpressure / timeout / unavailability.
//!
//! Keeping these in one Rust place makes the central guarantee enforceable: the public messages can
//! NEVER contain "um pedido de cada vez" or "a inferência corre localmente", and priority/dedup are
//! unit-tested rather than hand-tuned in glue. Nothing here calls a model, touches the network, or
//! holds state.

/// Request scheduling priority for the inference queue.
///
/// A short, focused question is cheap and latency-sensitive → HIGH; a long, exploratory prompt is
/// expensive → LOW; everything else NORMAL. Priority only REORDERS the waiting set; it never lets a
/// request skip safety, cache, admission limits or the concurrency cap.
pub fn priority(question: &str) -> &'static str {
    let q = question.trim().to_lowercase();
    if q.is_empty() {
        return "normal";
    }
    let tokens = q.split_whitespace().count();
    // Exploratory / long-form markers → LOW (they cost the most model time).
    const LOW_MARKERS: &[&str] = &[
        "explica em detalhe",
        "detalhadamente",
        "em detalhe",
        "passo a passo",
        "tutorial",
        "compara ",
        "comparação",
        "comparacao",
        "vantagens e desvantagens",
        "prós e contras",
        "pros e contras",
        "explain in detail",
        "step by step",
        "in detail",
        "walk me through",
        "deep dive",
    ];
    if tokens > 40 || LOW_MARKERS.iter().any(|m| q.contains(m)) {
        return "low";
    }
    // Short, focused question → HIGH.
    if tokens <= 8 {
        return "high";
    }
    "normal"
}

/// Whether a model-bound request is SAFE to de-duplicate against an identical in-flight request.
///
/// Only a PLAIN question (no conversation context, no guided-journey step, no explicit document,
/// no uploaded artifacts) is deduped: each of those inputs makes an otherwise-identical question
/// resolve to a different answer, so they must never share one in-flight result. A deduped answer
/// depends only on the question + the protocol corpus (no per-user data), so sharing it across two
/// callers who asked the very same plain question never crosses users' information.
pub fn should_dedup(
    has_context: bool,
    has_journey: bool,
    has_document: bool,
    has_uploads: bool,
) -> bool {
    !(has_context || has_journey || has_document || has_uploads)
}

/// The SAFE public message for a queue / availability condition — the SINGLE SOURCE OF TRUTH for
/// what the end user is allowed to see. Deliberately operator-neutral; it NEVER exposes internal
/// architecture (workers, locks, semaphores, llama, one-request-at-a-time, CPU, slots, queues).
pub fn public_message(kind: &str) -> &'static str {
    match kind {
        // The bounded queue is full — professional retry, no internal detail.
        "busy" | "queue_full" => {
            "O BanzAI está a processar muitos pedidos neste momento. Tenta novamente dentro de alguns segundos."
        }
        // The request waited, or ran, longer than the budget.
        "timeout" | "queue_timeout" | "inference_timeout" => {
            "A resposta demorou mais do que o esperado. Tenta novamente ou reformula a pergunta."
        }
        // Per-client rate limit.
        "rate_limited" => "Muitos pedidos em pouco tempo. Aguarda alguns segundos e tenta novamente.",
        // The request is accepted and being prepared (the UI in-flight state).
        "processing" | "queued" => "O BanzAI está a preparar a resposta.",
        // Genuine outage / anything else — safe default.
        _ => "O BanzAI está temporariamente indisponível. Tenta novamente dentro de instantes.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Phrases that must NEVER reach the end user (the central rule of M2.14E).
    const FORBIDDEN: &[&str] = &[
        "um pedido de cada vez",
        "a inferência corre localmente",
        "inferencia corre localmente",
        "one request at a time",
        "semaphore",
        "worker",
        "llama",
        "lock",
        "slot",
    ];

    #[test]
    fn priority_short_is_high() {
        assert_eq!(priority("o que é ADR"), "high");
        assert_eq!(priority("PASS certifica?"), "high");
    }

    #[test]
    fn priority_long_or_exploratory_is_low() {
        assert_eq!(
            priority("explica em detalhe como funciona a federação entre operadores"),
            "low"
        );
        assert_eq!(
            priority("compara a abordagem A com a abordagem B por favor"),
            "low"
        );
        let long = "palavra ".repeat(50);
        assert_eq!(priority(&long), "low");
    }

    #[test]
    fn priority_mid_is_normal() {
        assert_eq!(
            priority("como é que um operador publica o manifesto de conformidade hoje"),
            "normal"
        );
    }

    #[test]
    fn priority_empty_is_normal() {
        assert_eq!(priority("   "), "normal");
    }

    #[test]
    fn dedup_only_for_plain_questions() {
        assert!(should_dedup(false, false, false, false));
        assert!(!should_dedup(true, false, false, false));
        assert!(!should_dedup(false, true, false, false));
        assert!(!should_dedup(false, false, true, false));
        assert!(!should_dedup(false, false, false, true));
    }

    #[test]
    fn public_messages_are_safe_and_present() {
        for kind in [
            "busy",
            "queue_full",
            "timeout",
            "queue_timeout",
            "inference_timeout",
            "rate_limited",
            "processing",
            "queued",
            "unavailable",
            "anything-else",
        ] {
            let m = public_message(kind).to_lowercase();
            assert!(!m.is_empty(), "message for {kind} is empty");
            for bad in FORBIDDEN {
                assert!(
                    !m.contains(bad),
                    "message for {kind} leaks forbidden phrase: {bad}"
                );
            }
        }
    }

    #[test]
    fn public_message_kinds_are_distinct_where_expected() {
        assert_ne!(public_message("busy"), public_message("timeout"));
        assert_ne!(public_message("rate_limited"), public_message("busy"));
        assert_ne!(public_message("processing"), public_message("unavailable"));
    }
}
