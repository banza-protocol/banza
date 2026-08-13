//! `banza-fetcher` — the internal HTTP service (ADR-038 §4.7). `banzai-api` calls `POST /fetch` over
//! the internal Docker network; the service is never published to the host or reverse-proxy.
//!
//! Endpoints:
//! * `POST /fetch` — body = [`FetchRequest`], returns [`FetchResponse`] (always HTTP 200; success or
//!   typed failure is carried in the JSON `ok`/`reason_codes`). The strict [`FetchPolicy`] is always
//!   used here — the test relaxations are unreachable from the network.
//! * `GET /health` — liveness for the compose healthcheck.
//!
//! Bind address: `0.0.0.0:${FETCHER_PORT:-${PORT:-8092}}`.

use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Json, Router,
};
use banza_artifact_fetcher::audit::audit_line;
use banza_artifact_fetcher::{fetch, FetchPolicy, FetchRequest, FetchResponse};
use std::net::SocketAddr;
use std::sync::Arc;

use banza_artifact_fetcher::resolver::SystemResolver;

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("FETCHER_PORT")
        .or_else(|_| std::env::var("PORT"))
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8092);

    // `--healthcheck`: probe the local /health endpoint and exit 0/1. Used by the distroless
    // container HEALTHCHECK (no shell, no curl in the image). This path never touches the SSRF
    // fetch pipeline.
    if std::env::args().any(|a| a == "--healthcheck") {
        std::process::exit(run_healthcheck(port).await);
    }

    let resolver = Arc::new(SystemResolver);

    let app = Router::new()
        .route("/health", get(health))
        .route("/fetch", post(fetch_handler))
        // The request JSON is tiny; cap the inbound body defensively.
        .layer(DefaultBodyLimit::max(64 * 1024))
        .with_state(resolver);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|e| panic!("banza-fetcher: cannot bind {addr}: {e}"));
    eprintln!(
        "{}",
        serde_json::json!({
            "event": "startup",
            "service": "banza-artifact-fetcher",
            "version": env!("CARGO_PKG_VERSION"),
            "bind": addr.to_string(),
        })
    );
    axum::serve(listener, app)
        .await
        .expect("banza-fetcher: server error");
}

/// Minimal loopback liveness probe: open a TCP connection to `127.0.0.1:port`, issue `GET /health`
/// and confirm a `200` status line. Returns a process exit code (0 healthy, 1 unhealthy).
async fn run_healthcheck(port: u16) -> i32 {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    let addr = format!("127.0.0.1:{port}");
    let probe = async {
        let mut stream = tokio::net::TcpStream::connect(&addr).await.ok()?;
        stream
            .write_all(b"GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
            .await
            .ok()?;
        let mut buf = Vec::new();
        stream.read_to_end(&mut buf).await.ok()?;
        let head = String::from_utf8_lossy(&buf);
        if head.starts_with("HTTP/1.1 200") || head.starts_with("HTTP/1.0 200") {
            Some(())
        } else {
            None
        }
    };
    match tokio::time::timeout(std::time::Duration::from_secs(3), probe).await {
        Ok(Some(())) => 0,
        _ => 1,
    }
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "banza-artifact-fetcher",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn fetch_handler(
    axum::extract::State(resolver): axum::extract::State<Arc<SystemResolver>>,
    Json(req): Json<FetchRequest>,
) -> Json<FetchResponse> {
    let resp: FetchResponse = fetch(&req, resolver.as_ref(), &FetchPolicy::strict()).await;
    audit_line(&resp);
    Json(resp)
}
