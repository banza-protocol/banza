use banzai_evidence::answer;

// We need to access the normalize function. Let's test through the answer function
fn main() {
    // Test exact keywords from the code
    let keywords = vec![
        "simb e obrigatorio",
        "simb é obrigatorio",  // With accent
        "simb obrigatorio",
    ];
    
    // The input has the accent
    let input = "SimB é obrigatório?";
    let a = answer(input);
    println!("Input: '{}' -> Intent: {}, Kind: {}", input, a.intent, a.kind);
    
    // Without accent
    let input2 = "simb e obrigatorio";
    let a2 = answer(input2);
    println!("Input: '{}' -> Intent: {}, Kind: {}", input2, a2.intent, a2.kind);
}
