fn main() {
    let out = std::env::args().nth(1).expect("out dir");
    let w = |p: &str, v: &serde_json::Value| {
        let path = format!("{out}/{p}");
        std::fs::create_dir_all(std::path::Path::new(&path).parent().unwrap()).unwrap();
        std::fs::write(
            &path,
            format!("{}\n", serde_json::to_string_pretty(v).unwrap()),
        )
        .unwrap();
    };
    w(
        "ledger/demo-accounts.json",
        &operator_zero_core::ledger::Ledger::demo().to_json(),
    );
    w(
        "traces/full-e2e-trace.json",
        &operator_zero_core::sim::run_e2e(true),
    );
    w(
        "traces/failed-e2e-trace.json",
        &operator_zero_core::sim::run_e2e(false),
    );
    let t = operator_zero_core::sim::run_e2e(true);
    w(
        "traces/operator-zero-session-summary.json",
        &serde_json::json!({
            "operator_id": "operator-zero", "operator_display_name": "Operador Zero",
            "demo_only": true, "monetary_value": false, "production_allowed": false,
            "currency": "KZ_DEMO",
            "summary": operator_zero_core::safe_summary(&t),
            "evidence_status": t["evidence_status"].clone(),
            "next_action": t["next_action"].clone(),
            "note": "Resumo seguro para o BanzAI: apenas slugs e contagens.",
        }),
    );
    println!("generated");
}
