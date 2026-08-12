use banzai_evidence::answer;

fn main() {
    let test_queries = vec![
        "SimB é obrigatório?",
        "simb é obrigatorio?",
        "simb obrigatorio",
        "simb é obrigatorio",
    ];
    
    for q in test_queries {
        let a = answer(q);
        println!("Q: '{}' -> Intent: {}, Kind: {}", q, a.intent, a.kind);
    }
}
