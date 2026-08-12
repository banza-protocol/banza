fn normalize(s: &str) -> String {
    use unicode_normalization::UnicodeNormalization;
    s.nfd()
        .filter(|c| !('\u{0300}'..='\u{036F}').contains(c))
        .collect::<String>()
        .to_lowercase()
}

fn main() {
    let test_strings = vec![
        "simb é obrigatorio",
        "simb e obrigatorio",
        "SimB é obrigatório?",
        "simb obrigatorio",
    ];
    
    for s in test_strings {
        let n = normalize(s);
        println!("'{:<30}' -> '{}'", s, n);
    }
}
