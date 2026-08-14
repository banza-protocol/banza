//! # banza-artifact-fetcher (ADR-038, ADR-034 §4.7 / §18–§20; M2.19G.1)
//!
//! The **only** BANZA component that reaches operator public endpoints. It performs ALL official
//! artifact retrieval for BanzAI's endpoint-originated operator-validation journey (ADR-034). The
//! no-network protocol engines (`banza-operator-manifest`, `banza-trust`, `banza-conformance`,
//! `banza-l2/l3-readiness`, `banza-evidence-bundle`, …) stay no-network: they receive already-fetched
//! content from this component and decide the verdicts.
//!
//! It ships as **both**:
//! * a **library** — the unit-testable SSRF policy ([`policy`]) plus the fetch pipeline ([`fetch`]);
//! * a **service binary** (`banza-fetcher`, axum) — `POST /fetch`, called by `banzai-api` over the
//!   internal Docker network and never exposed via the reverse-proxy.
//!
//! ## SSRF policy (ADR-034 §19), each a distinct [`types::ReasonCode`]
//! HTTPS-only (no http/other schemes, no userinfo); host+port from the caller's registry input with a
//! port allowlist (443 by default); resolve the host and validate EVERY IPv4/IPv6 against a blocklist
//! (private, loopback, link-local, unique-local, CGNAT, cloud metadata, unspecified/broadcast/
//! multicast/reserved); connect to a validated IP while preserving Host/SNI and never do a second
//! unvalidated lookup (rebinding defence); zero redirects; hard size cap (declared + streamed);
//! reject non-identity `Content-Encoding` (decompression-bomb guard); connect+total timeout;
//! media-type allowlist; TLS validation on. Every fetch emits a `request_id` and an audit line.

pub mod audit;
pub mod fetch;
pub mod policy;
pub mod resolver;
pub mod types;

pub use fetch::fetch;
pub use policy::{classify_ip, media_type_allowed, preflight, FetchPolicy, PreflightPlan};
pub use resolver::{HostResolver, StaticResolver, SystemResolver};
pub use types::{FetchRequest, FetchResponse, ReasonCode};
