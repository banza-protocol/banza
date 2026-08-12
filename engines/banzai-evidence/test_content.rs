use banzai_evidence::answer;

fn main() {
    // Test 1: SimB PASS is not certification
    println!("=== Test 1: SimB PASS is NOT certificate ===");
    let a1 = answer("SimB PASS é certificado?");
    let t1_lower = a1.text.to_lowercase();
    
    assert!(t1_lower.contains("não é certificação"), "Should say it's NOT certification");
    assert!(t1_lower.contains("evidência técnica"), "Should say it's technical evidence");
    assert!(!t1_lower.contains("simb certifica o operador"), "Should NOT affirm SimB certifies");
    assert!(t1_lower.contains("banza ca"), "Should reference BANZA CA");
    println!("✓ SimB PASS answer correct");
    
    // Test 2: SimB is mandatory
    println!("\n=== Test 2: SimB is MANDATORY ===");
    let a2 = answer("SimB é obrigatório?");
    let t2_lower = a2.text.to_lowercase();
    
    assert!(t2_lower.contains("obrigat"), "Should say SimB is mandatory");
    assert!(t2_lower.contains("deve passar"), "Should say 'must pass'");
    assert!(t2_lower.contains("banza ca"), "Should reference BANZA CA");
    println!("✓ SimB mandatory message correct");
    
    // Test 3: Cannot skip SimB
    println!("\n=== Test 3: Cannot skip SimB ===");
    let a3 = answer("Posso ir para revisão sem SimB?");
    let t3_lower = a3.text.to_lowercase();
    
    assert!(t3_lower.contains("não deve avançar") || t3_lower.contains("sem um simb pass"), 
        "Should indicate cannot skip SimB");
    println!("✓ Cannot skip SimB message correct");
    
    // Test 4: SimB failure blocks advancement
    println!("\n=== Test 4: SimB failure blocks advancement ===");
    let a4 = answer("Se SimB falhar posso continuar?");
    let t4_lower = a4.text.to_lowercase();
    
    assert!(t4_lower.contains("bloqueado") || t4_lower.contains("falhas simb"), 
        "Should indicate SimB failure blocks advancement");
    println!("✓ SimB failure blocking message correct");
    
    println!("\n✓✓✓ All content checks passed!");
}
