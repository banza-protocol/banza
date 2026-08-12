use banzai_evidence::{answer, normalize};

fn main() {
    let forbidden_claims = vec![
        "banzai certifica",
        "banzai aprova",
        "simb certifica o operador",
        "producao pronta",
        "production-ready",
        "certificados de producao activos",
        "valida manifestos",
        "aprova manifestos",
    ];
    
    let simb_queries = vec![
        "SimB é obrigatório?",
        "Posso ir para revisão sem SimB?",
        "SimB PASS é certificado?",
        "Se SimB falhar posso continuar?",
    ];
    
    let mut violations = Vec::new();
    
    for q in simb_queries {
        let a = answer(q);
        let nt = normalize(&a.text);
        
        for forbidden in &forbidden_claims {
            if let Some(pos) = nt.find(&normalize(forbidden)) {
                let start = pos.saturating_sub(22);
                let negated = ["nao ", "sem ", "nenhum", "nunca"]
                    .iter()
                    .any(|n| nt[start..pos].contains(n));
                
                if !negated {
                    violations.push(format!(
                        "FORBIDDEN CLAIM in '{}': '{}'",
                        q, forbidden
                    ));
                }
            }
        }
    }
    
    if violations.is_empty() {
        println!("✓ No forbidden affirmative claims found in SimB answers");
    } else {
        println!("✗ VIOLATIONS FOUND:");
        for v in violations {
            println!("  {}", v);
        }
    }
}
