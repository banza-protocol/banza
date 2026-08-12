use banzai_evidence::answer;

fn main() {
    let questions = vec![
        ("SimB é obrigatório?", "is SimB mandatory"),
        ("Posso ir para revisão sem SimB?", "can I go to review without SimB"),
        ("SimB PASS é certificado?", "is SimB PASS a certificate"),
        ("Se SimB falhar posso continuar?", "if SimB fails can I continue"),
    ];
    
    for (q, desc) in questions {
        let a = answer(q);
        println!("\n=== {} ===", desc);
        println!("Q: {}", q);
        println!("Intent: {}", a.intent);
        println!("Kind: {}", a.kind);
        
        // Check assertions
        assert_ne!(a.kind, "uncertain", "FAIL: kind is uncertain for: {}", q);
        assert_eq!(a.kind, "answer", "FAIL: kind is not 'answer' for: {}", q);
        
        let text_lower = a.text.to_lowercase();
        if desc.contains("certificate") {
            assert!(text_lower.contains("não é certificação") || text_lower.contains("evidência técnica"),
                "FAIL: doesn't state 'not certification' or 'technical evidence' for: {}", q);
        } else if desc.contains("mandatory") {
            assert!(text_lower.contains("obrigat"), "FAIL: doesn't state 'mandatory' for: {}", q);
        }
        
        assert!(!a.links.is_empty(), "FAIL: no citations for: {}", q);
        println!("✓ PASS");
    }
    println!("\n✓ All four required questions passed!");
}
