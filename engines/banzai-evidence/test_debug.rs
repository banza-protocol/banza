use banzai_evidence::answer;

fn main() {
    let q = "SimB é obrigatório?";
    let a = answer(q);
    
    let mut t = a.text.to_lowercase();
    if let Some(l) = &a.limits {
        t.push(' ');
        t.push_str(&l.join(" ").to_lowercase());
    }
    
    println!("Query: {}", q);
    println!("Intent: {}", a.intent);
    println!("Kind: {}", a.kind);
    println!("Text: {}", a.text);
    println!("Limits: {:?}", a.limits);
    println!("\nCombined text for checking:");
    println!("{}", t);
    
    println!("\nChecks:");
    println!("  Contains 'obrigat': {}", t.contains("obrigat"));
    println!("  Contains 'banza ca': {}", t.contains("banza ca"));
    println!("  Contains 'não é certificação': {}", t.contains("não é certificação"));
    println!("  Contains 'evidência técnica': {}", t.contains("evidência técnica"));
}
