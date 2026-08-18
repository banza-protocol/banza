use banzai_query_core::route::route;
use std::io::{BufRead, Write};
fn main() {
    let p = std::env::args().nth(1).unwrap();
    let f = std::fs::File::open(&p).unwrap();
    let o = std::io::stdout(); let mut w = std::io::BufWriter::new(o.lock());
    for l in std::io::BufReader::new(f).lines() {
        let q = l.unwrap(); if q.trim().is_empty() { continue; }
        let r = route(&q);
        writeln!(w, "{}\t{}\t{}", q, r.action, r.entry_id.as_deref().unwrap_or("")).unwrap();
    }
}
