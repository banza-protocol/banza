//! Host resolution behind an injectable trait so tests can drive the IP-validation and DNS-rebinding
//! paths deterministically without touching real DNS.
//!
//! The production [`SystemResolver`] uses tokio's resolver. The fetch pipeline resolves the host
//! ONCE, validates every returned IP against [`crate::policy::classify_ip`], and then pins the
//! connection to the validated addresses (`reqwest`'s `resolve_to_addrs`) so no second, unvalidated
//! lookup can occur — that pinning, plus rejecting a set if any member is non-global, is the
//! DNS-rebinding defence.

use std::future::Future;
use std::io;
use std::net::IpAddr;
use std::pin::Pin;

/// A future returning the resolved IPs for a host. Owned inputs keep it `'static`.
pub type ResolveFuture = Pin<Box<dyn Future<Output = io::Result<Vec<IpAddr>>> + Send>>;

/// Resolve a hostname to a set of IPs. Injectable for tests.
pub trait HostResolver: Send + Sync {
    fn resolve(&self, host: String, port: u16) -> ResolveFuture;
}

/// Production resolver: tokio's system resolver.
#[derive(Debug, Default, Clone)]
pub struct SystemResolver;

impl HostResolver for SystemResolver {
    fn resolve(&self, host: String, port: u16) -> ResolveFuture {
        Box::pin(async move {
            let addrs = tokio::net::lookup_host((host.as_str(), port)).await?;
            Ok(addrs.map(|sa| sa.ip()).collect())
        })
    }
}

/// Test resolver returning a fixed set of IPs regardless of the host. Used to exercise the IP
/// blocklist and DNS-rebinding scenarios (e.g. a "public-looking" host that resolves to a private
/// IP, or a set mixing a public and a private IP).
#[derive(Debug, Clone)]
pub struct StaticResolver {
    pub ips: Vec<IpAddr>,
}

impl StaticResolver {
    pub fn new(ips: Vec<IpAddr>) -> Self {
        StaticResolver { ips }
    }
}

impl HostResolver for StaticResolver {
    fn resolve(&self, _host: String, _port: u16) -> ResolveFuture {
        let ips = self.ips.clone();
        Box::pin(async move { Ok(ips) })
    }
}
