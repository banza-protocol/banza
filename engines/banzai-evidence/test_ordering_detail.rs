use banzai_evidence::answer;

fn main() {
    // These should match the SimB blocks, not earlier certification blocks
    let simb_specific = vec![
        "simb certifica",       // Should match simb_pass_not_certificate
        "simb aprova",          // Should match simb_pass_not_certificate
        "simb e certificado",   // Should match simb_pass_not_certificate
    ];
    
    // These should match earlier certification blocks
    let cert_general = vec![
        "certifica o meu operador",     // Should match certification_request_refusal
        "aprova este operador",          // Should match certification_request_refusal
    ];
    
    println!("=== SimB specific (should match SimB blocks) ===");
    for q in simb_specific {
        let a = answer(q);
        println!("{:<30} -> {}", q, a.intent);
        assert!(a.intent.contains("simb"), "Should match SimB block");
    }
    
    println!("\n=== General certification (should NOT match SimB) ===");
    for q in cert_general {
        let a = answer(q);
        println!("{:<30} -> {}", q, a.intent);
        assert_ne!(a.intent, "simb_pass_not_certificate", "Should NOT match SimB block");
        assert_ne!(a.intent, "simb_pre_review_gate", "Should NOT match SimB block");
    }
    
    println!("\n✓ Ordering is correct!");
}
