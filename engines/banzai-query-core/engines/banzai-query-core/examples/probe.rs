use banzai_query_core::route::route;
fn main() {
    for q in ["o que significa certificar uma implementacao","what does certifying an implementation mean",
              "quem certifica uma implementacao","como demonstrar conformidade"] {
        let r = route(q);
        println!("  {:<48} {:<14} {}", q, r.action, r.entry_id.as_deref().unwrap_or("-"));
    }
}
