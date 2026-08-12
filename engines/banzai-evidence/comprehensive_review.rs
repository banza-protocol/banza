use banzai_evidence::{answer, normalize};

fn main() {
    let sep = "=".repeat(80);
    println!("{}", sep);
    println!("BX1.4 SIMB-GATE COMPREHENSIVE REVIEW");
    println!("{}", sep);
    
    // TEST 1: Four required SimB questions return ANSWER (not uncertain)
    println!("\n[TEST 1] Four required SimB questions");
    let required_qs = vec![
        "SimB é obrigatório?",
        "Posso ir para revisão sem SimB?",
        "SimB PASS é certificado?",
        "Se SimB falhar posso continuar?",
    ];
    
    let mut test1_pass = true;
    for q in &required_qs {
        let a = answer(q);
        let is_answer = a.kind == "answer";
        let status = if is_answer { "✓" } else { "✗" };
        println!("  {} '{}' -> kind: {}", status, q, a.kind);
        test1_pass = test1_pass && is_answer;
    }
    assert!(test1_pass, "TEST 1 FAILED: Not all required questions are answered");
    println!("✓ TEST 1 PASSED");
    
    // TEST 2: Answers contain mandatory messages
    println!("\n[TEST 2] Answer content validation");
    let content_checks = vec![
        ("SimB é obrigatório?", "obrigat", "SimB is mandatory"),
        ("SimB PASS é certificado?", "não é certificação", "PASS is NOT certification"),
        ("Se SimB falhar posso continuar?", "bloqueado", "Failure blocks continuation"),
    ];
    
    let mut test2_pass = true;
    for (q, check_str, desc) in content_checks {
        let a = answer(q);
        let has_check = a.text.to_lowercase().contains(&check_str);
        let status = if has_check { "✓" } else { "✗" };
        println!("  {} '{}': contains '{}' ({})", status, q, check_str, desc);
        test2_pass = test2_pass && has_check;
    }
    assert!(test2_pass, "TEST 2 FAILED: Answer content missing required phrases");
    println!("✓ TEST 2 PASSED");
    
    // TEST 3: No ordering/keyword hijacking of unrelated queries
    println!("\n[TEST 3] Ordering/hijacking validation");
    let hijacking_checks = vec![
        ("Um PASS é certificado?", "pass_vs_certificate", "general PASS vs cert"),
        ("Este operador está certificado?", "operator_cert_state", "operator cert state"),
        ("certifica o meu operador", "certification_request_refusal", "cert request refusal"),
    ];
    
    let mut test3_pass = true;
    for (q, expected_intent, desc) in hijacking_checks {
        let a = answer(q);
        let matches = a.intent == expected_intent;
        let status = if matches { "✓" } else { "✗" };
        println!("  {} '{}' -> {} ({})", status, q, a.intent, desc);
        test3_pass = test3_pass && matches;
    }
    assert!(test3_pass, "TEST 3 FAILED: Keyword ordering is wrong");
    println!("✓ TEST 3 PASSED");
    
    // TEST 4: No forbidden affirmative claims
    println!("\n[TEST 4] Forbidden affirmative claims check");
    let forbidden = vec![
        "simb certifica o operador",
        "producao pronta",
        "valida manifestos",
    ];
    
    let mut test4_pass = true;
    for q in &required_qs {
        let a = answer(q);
        for f in &forbidden {
            let nt = normalize(&a.text);
            let nf = normalize(f);
            if let Some(pos) = nt.find(&nf) {
                let start = pos.saturating_sub(22);
                let negated = ["nao ", "sem ", "nenhum", "nunca"]
                    .iter()
                    .any(|n| nt[start..pos].contains(n));
                if !negated {
                    println!("  ✗ FORBIDDEN CLAIM found in '{}': '{}'", q, f);
                    test4_pass = false;
                }
            }
        }
    }
    if test4_pass {
        println!("  ✓ No forbidden affirmative claims");
    }
    assert!(test4_pass, "TEST 4 FAILED: Forbidden affirmative claims detected");
    println!("✓ TEST 4 PASSED");
    
    // TEST 5: All links are valid internal routes
    println!("\n[TEST 5] Citation validity check");
    let allowed = vec![
        "/referencia", "/referencia/banzai", "/referencia/certificacao",
        "/estado", "/operators", "/certificates", "/banzai/workbench", "/decisoes",
    ];
    
    let mut test5_pass = true;
    for q in &required_qs {
        let a = answer(q);
        for link in &a.links {
            let valid = allowed.contains(&link.href.as_str())
                || link.href.starts_with("/referencia/")
                || link.href.starts_with("/decisoes/");
            if !valid {
                println!("  ✗ Invalid link in '{}': {}", q, link.href);
                test5_pass = false;
            }
        }
    }
    if test5_pass {
        println!("  ✓ All citations are valid internal routes");
    }
    assert!(test5_pass, "TEST 5 FAILED: Invalid citations found");
    println!("✓ TEST 5 PASSED");
    
    // TEST 6: Deterministic (zero LLM calls)
    println!("\n[TEST 6] Deterministic response check");
    let mut test6_pass = true;
    for q in &required_qs {
        let a = answer(q);
        if a.llm_calls != 0 || a.external_model_called {
            println!("  ✗ '{}': llm_calls={}, external_model_called={}", 
                q, a.llm_calls, a.external_model_called);
            test6_pass = false;
        }
    }
    if test6_pass {
        println!("  ✓ All responses are deterministic (llm_calls=0, external_model_called=false)");
    }
    assert!(test6_pass, "TEST 6 FAILED: Non-deterministic responses detected");
    println!("✓ TEST 6 PASSED");
    
    println!("\n{}", sep);
    println!("✓✓✓ ALL TESTS PASSED - BX1.4 SIMB-GATE REVIEW COMPLETE");
    println!("{}", sep);
}
