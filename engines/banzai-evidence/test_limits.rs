use banzai_evidence::answer;

fn main() {
    let q = "SimB é obrigatório?";
    let a = answer(q);
    println!("Intent: {}", a.intent);
    println!("Kind: {}", a.kind);
    println!("Text: {}", a.text);
    if let Some(limits) = &a.limits {
        println!("Limits:");
        for l in limits {
            println!("  - {}", l);
        }
    }
}
