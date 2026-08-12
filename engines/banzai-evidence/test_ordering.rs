use banzai_evidence::answer;

fn main() {
    let potentially_risky_queries = vec![
        // Queries that might accidentally match "sem simb" (without SimB)
        ("É sem simb passar?", "Should clarify, not fall into SimB gate"),
        // Queries about certification that have "simb" in them
        ("Como simb certifica?", "Should NOT match simb_pass_not_certificate"),
        // Queries about "antes" (before) that don't mention SimB
        ("Antes da revisão o que fazer?", "Should NOT match SimB gate"),
        // General certification questions that might have overlapping keywords
        ("Este operador está certificado?", "Should match operator_cert_state"),
        ("Um PASS é certificado?", "Should match pass_vs_certificate"),
        // Test "revisa" vs "revisão" normalization
        ("Revisao sem simb", "Should match SimB gate"),
        ("Preciso antes da revisão?", "Should match SimB gate if has 'preciso'"),
    ];
    
    for (q, expectation) in potentially_risky_queries {
        let a = answer(q);
        println!("\nQ: '{}' [{}]", q, expectation);
        println!("  Intent: {}", a.intent);
        println!("  Kind: {}", a.kind);
    }
}
