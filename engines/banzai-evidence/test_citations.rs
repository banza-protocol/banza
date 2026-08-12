use banzai_evidence::answer;

const ALLOWED: &[&str] = &[
    "/referencia",
    "/referencia/banzai",
    "/referencia/certificacao",
    "/estado",
    "/operators",
    "/certificates",
    "/banzai/workbench",
    "/decisoes",
];

fn main() {
    let simb_queries = vec![
        "SimB é obrigatório?",
        "SimB PASS é certificado?",
        "Se SimB falhar posso continuar?",
    ];
    
    for q in simb_queries {
        let a = answer(q);
        println!("\nQ: {}", q);
        println!("  Intent: {}", a.intent);
        
        for link in &a.links {
            let valid = ALLOWED.contains(&link.href.as_str()) 
                || link.href.starts_with("/referencia/")
                || link.href.starts_with("/decisoes/");
            
            let status = if valid { "✓" } else { "✗ INVALID" };
            println!("  {} {}: {}", status, link.label, link.href);
        }
    }
}
