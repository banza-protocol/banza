//! SSRF policy (ADR-068 §19). Pure, synchronous, fully unit-testable. No I/O, no network, no clock.
//!
//! The policy is split into:
//! * [`preflight`] — URL/scheme/userinfo/host/port checks decided before any DNS or socket work;
//! * [`classify_ip`] — the IPv4/IPv6 blocklist applied to EVERY resolved address (defeats DNS
//!   rebinding by rejecting a set if any member is non-global);
//! * [`media_type_allowed`] / [`content_encoding_ok`] — response-header checks;
//! * [`FetchPolicy`] — knobs. Production uses [`FetchPolicy::strict`]. The relaxations
//!   (`allow_http`, `allow_loopback`) exist ONLY for deterministic loopback tests and are never
//!   reachable from the HTTP `/fetch` endpoint, which always constructs a strict policy.

use crate::types::ReasonCode;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use url::Url;

/// Policy knobs. `FetchPolicy::strict()` is the only policy the service binary uses.
#[derive(Debug, Clone)]
pub struct FetchPolicy {
    /// Allow the `http` scheme. STRICT = false. Test-only.
    pub allow_http: bool,
    /// Skip the loopback/private/link-local/etc. IP blocklist. STRICT = false. Test-only —
    /// lets a loopback mock server exercise the streaming/size/media-type/redirect pipeline.
    pub allow_loopback: bool,
}

impl FetchPolicy {
    /// The production policy: HTTPS only, full IP blocklist enforced.
    pub fn strict() -> Self {
        FetchPolicy {
            allow_http: false,
            allow_loopback: false,
        }
    }

    /// Test-only policy that permits plaintext HTTP against a loopback mock server so the transport
    /// pipeline (streaming, size cap, media-type, redirect, content-encoding) can be exercised
    /// deterministically without a public host. NEVER used by the service binary.
    #[doc(hidden)]
    pub fn loopback_test() -> Self {
        FetchPolicy {
            allow_http: true,
            allow_loopback: true,
        }
    }
}

impl Default for FetchPolicy {
    fn default() -> Self {
        FetchPolicy::strict()
    }
}

/// A validated plan produced by [`preflight`]: the URL to fetch, its host and its port.
#[derive(Debug, Clone)]
pub struct PreflightPlan {
    pub url: Url,
    pub host: String,
    pub port: u16,
}

/// Pre-DNS URL policy: scheme, userinfo, host==expected_host, port allowlist. Returns the validated
/// plan or the first violated [`ReasonCode`]. Does NOT resolve DNS or open sockets.
pub fn preflight(
    canonical_origin: &str,
    path: &str,
    expected_host: &str,
    allowed_ports: &[u16],
    policy: &FetchPolicy,
) -> Result<PreflightPlan, ReasonCode> {
    let expected = expected_host.trim().to_ascii_lowercase();
    if expected.is_empty()
        || expected.contains('/')
        || expected.contains(':')
        || expected.contains(' ')
    {
        return Err(ReasonCode::InvalidExpectedHost);
    }

    // Join origin + path into a single absolute URL. `path` is treated as a path, never as a full URL.
    let base = Url::parse(canonical_origin).map_err(|_| ReasonCode::InvalidUrl)?;
    let url = base.join(path).map_err(|_| ReasonCode::InvalidUrl)?;

    // Scheme: https only (http permitted only under the test policy).
    let scheme = url.scheme();
    let scheme_ok = scheme == "https" || (policy.allow_http && scheme == "http");
    if !scheme_ok {
        return Err(ReasonCode::SchemeNotHttps);
    }

    // Userinfo (`user:pass@host`) is forbidden outright.
    if !url.username().is_empty() || url.password().is_some() {
        return Err(ReasonCode::UserinfoInUrl);
    }

    // Host must be present and must equal the registry-supplied expected_host.
    let host = match url.host_str() {
        Some(h) if !h.is_empty() => h.to_ascii_lowercase(),
        _ => return Err(ReasonCode::InvalidUrl),
    };
    if host != expected {
        return Err(ReasonCode::HostMismatch);
    }

    // Port: explicit or scheme default; must be in the allowlist.
    let port = url
        .port_or_known_default()
        .ok_or(ReasonCode::PortNotAllowed)?;
    if !allowed_ports.contains(&port) {
        return Err(ReasonCode::PortNotAllowed);
    }

    Ok(PreflightPlan { url, host, port })
}

/// Classify a resolved IP against the SSRF blocklist. Returns `Some(reason)` if the address must be
/// refused, `None` if it is an acceptable public/global target. Checks the most specific rule first
/// (cloud metadata before link-local) and unwraps IPv4-mapped IPv6 so `::ffff:127.0.0.1` cannot slip
/// past the IPv4 rules.
pub fn classify_ip(ip: IpAddr) -> Option<ReasonCode> {
    match ip {
        IpAddr::V4(v4) => classify_v4(v4),
        IpAddr::V6(v6) => {
            // IPv4-mapped / IPv4-compatible addresses are classified as their embedded IPv4.
            if let Some(mapped) = v6.to_ipv4_mapped() {
                return classify_v4(mapped);
            }
            if let Some(compat) = ipv4_compatible(v6) {
                return classify_v4(compat);
            }
            // NAT64 well-known 64:ff9b::/96 and 6to4 2002::/16 EMBED an arbitrary IPv4 — classify the
            // embedded address so a private/metadata target reached via translation is still blocked
            // (a public embedded IPv4 stays allowed). Defeats an SSRF via a translation prefix.
            if let Some(embedded) = nat64_wellknown_v4(v6) {
                return classify_v4(embedded);
            }
            if let Some(embedded) = sixtofour_v4(v6) {
                return classify_v4(embedded);
            }
            classify_v6(v6)
        }
    }
}

/// NAT64 well-known prefix 64:ff9b::/96 (RFC 6052) — the last 32 bits are the embedded IPv4.
fn nat64_wellknown_v4(v6: Ipv6Addr) -> Option<Ipv4Addr> {
    let s = v6.segments();
    if s[0] == 0x0064 && s[1] == 0xff9b && s[2] == 0 && s[3] == 0 && s[4] == 0 && s[5] == 0 {
        return Some(Ipv4Addr::new(
            (s[6] >> 8) as u8,
            (s[6] & 0xff) as u8,
            (s[7] >> 8) as u8,
            (s[7] & 0xff) as u8,
        ));
    }
    None
}

/// 6to4 2002::/16 (RFC 3056) — the embedded IPv4 is segments 1–2 (2002:AABB:CCDD::/48).
fn sixtofour_v4(v6: Ipv6Addr) -> Option<Ipv4Addr> {
    let s = v6.segments();
    if s[0] == 0x2002 {
        return Some(Ipv4Addr::new(
            (s[1] >> 8) as u8,
            (s[1] & 0xff) as u8,
            (s[2] >> 8) as u8,
            (s[2] & 0xff) as u8,
        ));
    }
    None
}

/// IPv4-compatible IPv6 (`::a.b.c.d`, deprecated) — excluding `::` and `::1`.
fn ipv4_compatible(v6: Ipv6Addr) -> Option<Ipv4Addr> {
    let s = v6.segments();
    if s[0] == 0 && s[1] == 0 && s[2] == 0 && s[3] == 0 && s[4] == 0 && s[5] == 0 {
        let v4 = Ipv4Addr::new(
            (s[6] >> 8) as u8,
            (s[6] & 0xff) as u8,
            (s[7] >> 8) as u8,
            (s[7] & 0xff) as u8,
        );
        // Skip :: (unspecified) and ::1 (loopback) — handled by the v6 path.
        if v4.is_unspecified() || v4 == Ipv4Addr::new(0, 0, 0, 1) {
            return None;
        }
        return Some(v4);
    }
    None
}

fn classify_v4(v4: Ipv4Addr) -> Option<ReasonCode> {
    // Cloud metadata (most specific) first.
    if v4 == Ipv4Addr::new(169, 254, 169, 254) {
        return Some(ReasonCode::MetadataBlocked);
    }
    if v4.is_unspecified() {
        return Some(ReasonCode::UnspecifiedBlocked);
    }
    if v4.is_broadcast() {
        return Some(ReasonCode::BroadcastBlocked);
    }
    if v4.is_loopback() {
        return Some(ReasonCode::LoopbackBlocked);
    }
    if v4.is_link_local() {
        return Some(ReasonCode::LinkLocalBlocked);
    }
    if v4.is_multicast() {
        return Some(ReasonCode::MulticastBlocked);
    }
    // Private (10/8, 172.16/12, 192.168/16) + CGNAT (100.64/10).
    if v4.is_private() || is_cgnat(v4) {
        return Some(ReasonCode::PrivateIpBlocked);
    }
    // Otherwise-reserved / non-global ranges (documentation, benchmarking, 0/8, 240/4, …).
    if is_reserved_v4(v4) {
        return Some(ReasonCode::ReservedIpBlocked);
    }
    None
}

/// 100.64.0.0/10 — carrier-grade NAT (RFC 6598).
fn is_cgnat(v4: Ipv4Addr) -> bool {
    let o = v4.octets();
    o[0] == 100 && (o[1] & 0xc0) == 64
}

/// Reserved / non-global IPv4 ranges not covered by the more specific rules above.
fn is_reserved_v4(v4: Ipv4Addr) -> bool {
    let o = v4.octets();
    // 0.0.0.0/8 "this network"
    if o[0] == 0 {
        return true;
    }
    // 240.0.0.0/4 reserved for future use (includes 255.x but broadcast handled earlier)
    if o[0] >= 240 {
        return true;
    }
    // IETF protocol assignments 192.0.0.0/24
    if o[0] == 192 && o[1] == 0 && o[2] == 0 {
        return true;
    }
    // Documentation: 192.0.2.0/24 (TEST-NET-1), 198.51.100.0/24 (TEST-NET-2), 203.0.113.0/24 (TEST-NET-3)
    if o[0] == 192 && o[1] == 0 && o[2] == 2 {
        return true;
    }
    if o[0] == 198 && o[1] == 51 && o[2] == 100 {
        return true;
    }
    if o[0] == 203 && o[1] == 0 && o[2] == 113 {
        return true;
    }
    // Benchmarking 198.18.0.0/15
    if o[0] == 198 && (o[1] == 18 || o[1] == 19) {
        return true;
    }
    // 6to4 relay anycast 192.88.99.0/24 (RFC 3068/7526)
    if o[0] == 192 && o[1] == 88 && o[2] == 99 {
        return true;
    }
    false
}

fn classify_v6(v6: Ipv6Addr) -> Option<ReasonCode> {
    // Cloud metadata (AWS IMDS over IPv6) first.
    if v6 == Ipv6Addr::new(0xfd00, 0x0ec2, 0, 0, 0, 0, 0, 0x0254) {
        return Some(ReasonCode::MetadataBlocked);
    }
    if v6.is_unspecified() {
        return Some(ReasonCode::UnspecifiedBlocked);
    }
    if v6.is_loopback() {
        return Some(ReasonCode::LoopbackBlocked);
    }
    if v6.is_multicast() {
        return Some(ReasonCode::MulticastBlocked);
    }
    let seg0 = v6.segments()[0];
    // Link-local unicast fe80::/10
    if (seg0 & 0xffc0) == 0xfe80 {
        return Some(ReasonCode::LinkLocalBlocked);
    }
    // Unique-local fc00::/7
    if (seg0 & 0xfe00) == 0xfc00 {
        return Some(ReasonCode::UniqueLocalBlocked);
    }
    // Documentation 2001:db8::/32
    if v6.segments()[0] == 0x2001 && v6.segments()[1] == 0x0db8 {
        return Some(ReasonCode::ReservedIpBlocked);
    }
    // RFC 8215 local-use NAT64 64:ff9b:1::/48 — a translation prefix embedding an arbitrary IPv4 under
    // RFC 6052's /48 layout. Rather than decode that layout, block the whole prefix (SSRF-conservative);
    // the well-known 64:ff9b::/96 is decoded and classified in classify_ip.
    let s = v6.segments();
    if s[0] == 0x0064 && s[1] == 0xff9b && s[2] == 0x0001 {
        return Some(ReasonCode::ReservedIpBlocked);
    }
    None
}

/// True if `content_type` (its media type before any `;` parameters) is in `allowlist`
/// (case-insensitively). A missing/empty content type is refused.
pub fn media_type_allowed(content_type: Option<&str>, allowlist: &[String]) -> bool {
    let ct = match content_type {
        Some(c) if !c.trim().is_empty() => c,
        _ => return false,
    };
    let media = ct
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase();
    if media.is_empty() {
        return false;
    }
    allowlist
        .iter()
        .any(|a| a.trim().to_ascii_lowercase() == media)
}

/// Decompression-bomb guard: the response must carry no `Content-Encoding` (or `identity`). The
/// client never negotiates compression and never decompresses, so a compressed body is refused
/// outright — a small compressed payload can never expand past the size cap after the fact.
pub fn content_encoding_ok(content_encoding: Option<&str>) -> bool {
    match content_encoding {
        None => true,
        Some(v) => {
            let v = v.trim().to_ascii_lowercase();
            v.is_empty() || v == "identity"
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ports() -> Vec<u16> {
        vec![443]
    }

    // ---- preflight (URL policy) ----

    #[test]
    fn https_valid_preflight_passes() {
        let plan = preflight(
            "https://zero.banza.network",
            "/manifest.json",
            "zero.banza.network",
            &ports(),
            &FetchPolicy::strict(),
        )
        .expect("valid https must pass preflight");
        assert_eq!(plan.host, "zero.banza.network");
        assert_eq!(plan.port, 443);
        assert_eq!(
            plan.url.as_str(),
            "https://zero.banza.network/manifest.json"
        );
    }

    #[test]
    fn http_blocked() {
        let r = preflight(
            "http://zero.banza.network",
            "/manifest.json",
            "zero.banza.network",
            &ports(),
            &FetchPolicy::strict(),
        );
        assert_eq!(r.unwrap_err(), ReasonCode::SchemeNotHttps);
    }

    #[test]
    fn non_https_scheme_blocked() {
        for origin in [
            "ftp://zero.banza.network",
            "ws://zero.banza.network",
            "file://zero.banza.network",
        ] {
            let r = preflight(
                origin,
                "/manifest.json",
                "zero.banza.network",
                &ports(),
                &FetchPolicy::strict(),
            );
            assert_eq!(r.unwrap_err(), ReasonCode::SchemeNotHttps, "{origin}");
        }
    }

    #[test]
    fn userinfo_url_blocked() {
        let r = preflight(
            "https://user:pass@zero.banza.network",
            "/manifest.json",
            "zero.banza.network",
            &ports(),
            &FetchPolicy::strict(),
        );
        assert_eq!(r.unwrap_err(), ReasonCode::UserinfoInUrl);
    }

    #[test]
    fn host_mismatch_blocked() {
        let r = preflight(
            "https://evil.example.com",
            "/manifest.json",
            "zero.banza.network",
            &ports(),
            &FetchPolicy::strict(),
        );
        assert_eq!(r.unwrap_err(), ReasonCode::HostMismatch);
    }

    #[test]
    fn port_not_allowed_blocked() {
        let r = preflight(
            "https://zero.banza.network:8443",
            "/manifest.json",
            "zero.banza.network",
            &ports(),
            &FetchPolicy::strict(),
        );
        assert_eq!(r.unwrap_err(), ReasonCode::PortNotAllowed);
    }

    #[test]
    fn empty_expected_host_blocked() {
        let r = preflight(
            "https://zero.banza.network",
            "/manifest.json",
            "",
            &ports(),
            &FetchPolicy::strict(),
        );
        assert_eq!(r.unwrap_err(), ReasonCode::InvalidExpectedHost);
    }

    #[test]
    fn path_cannot_smuggle_a_full_url() {
        // A "path" that is actually an absolute URL to another host must NOT redirect the fetch:
        // Url::join treats an absolute URL as replacing the base, so host-mismatch catches it.
        let r = preflight(
            "https://zero.banza.network",
            "https://evil.example.com/manifest.json",
            "zero.banza.network",
            &ports(),
            &FetchPolicy::strict(),
        );
        assert_eq!(r.unwrap_err(), ReasonCode::HostMismatch);
    }

    // ---- classify_ip (IP blocklist) ----

    #[test]
    fn loopback_v4_blocked() {
        assert_eq!(
            classify_ip("127.0.0.1".parse().unwrap()),
            Some(ReasonCode::LoopbackBlocked)
        );
    }

    #[test]
    fn private_ip_blocked() {
        for ip in ["10.0.0.5", "172.16.9.9", "192.168.1.1"] {
            assert_eq!(
                classify_ip(ip.parse().unwrap()),
                Some(ReasonCode::PrivateIpBlocked),
                "{ip}"
            );
        }
    }

    #[test]
    fn cgnat_blocked() {
        assert_eq!(
            classify_ip("100.64.0.1".parse().unwrap()),
            Some(ReasonCode::PrivateIpBlocked)
        );
        // Just outside 100.64/10 is public.
        assert_eq!(classify_ip("100.128.0.1".parse().unwrap()), None);
    }

    #[test]
    fn link_local_v4_blocked() {
        assert_eq!(
            classify_ip("169.254.1.1".parse().unwrap()),
            Some(ReasonCode::LinkLocalBlocked)
        );
    }

    #[test]
    fn metadata_v4_blocked_before_link_local() {
        assert_eq!(
            classify_ip("169.254.169.254".parse().unwrap()),
            Some(ReasonCode::MetadataBlocked)
        );
    }

    #[test]
    fn unspecified_broadcast_multicast_reserved_v4_blocked() {
        assert_eq!(
            classify_ip("0.0.0.0".parse().unwrap()),
            Some(ReasonCode::UnspecifiedBlocked)
        );
        assert_eq!(
            classify_ip("255.255.255.255".parse().unwrap()),
            Some(ReasonCode::BroadcastBlocked)
        );
        assert_eq!(
            classify_ip("224.0.0.1".parse().unwrap()),
            Some(ReasonCode::MulticastBlocked)
        );
        assert_eq!(
            classify_ip("240.0.0.1".parse().unwrap()),
            Some(ReasonCode::ReservedIpBlocked)
        );
        assert_eq!(
            classify_ip("192.0.2.5".parse().unwrap()),
            Some(ReasonCode::ReservedIpBlocked)
        );
    }

    #[test]
    fn loopback_and_ula_and_ll_v6_blocked() {
        assert_eq!(
            classify_ip("::1".parse().unwrap()),
            Some(ReasonCode::LoopbackBlocked)
        );
        assert_eq!(
            classify_ip("fe80::1".parse().unwrap()),
            Some(ReasonCode::LinkLocalBlocked)
        );
        assert_eq!(
            classify_ip("fc00::1".parse().unwrap()),
            Some(ReasonCode::UniqueLocalBlocked)
        );
        assert_eq!(
            classify_ip("fd12:3456::1".parse().unwrap()),
            Some(ReasonCode::UniqueLocalBlocked)
        );
        assert_eq!(
            classify_ip("::".parse().unwrap()),
            Some(ReasonCode::UnspecifiedBlocked)
        );
    }

    #[test]
    fn metadata_v6_blocked() {
        assert_eq!(
            classify_ip("fd00:ec2::254".parse().unwrap()),
            Some(ReasonCode::MetadataBlocked)
        );
    }

    #[test]
    fn ipv4_mapped_v6_classified_as_embedded_v4() {
        // ::ffff:127.0.0.1 must be blocked as loopback, not slip past the v6 rules.
        assert_eq!(
            classify_ip("::ffff:127.0.0.1".parse().unwrap()),
            Some(ReasonCode::LoopbackBlocked)
        );
        // ::ffff:169.254.169.254 must be blocked as metadata.
        assert_eq!(
            classify_ip("::ffff:169.254.169.254".parse().unwrap()),
            Some(ReasonCode::MetadataBlocked)
        );
    }

    #[test]
    fn nat64_and_6to4_embedded_v4_classified() {
        // NAT64 64:ff9b::/96 embedding a private/metadata IPv4 must be blocked as that IPv4.
        assert_eq!(
            classify_ip("64:ff9b::a00:1".parse().unwrap()), // 10.0.0.1
            Some(ReasonCode::PrivateIpBlocked)
        );
        assert_eq!(
            classify_ip("64:ff9b::a9fe:a9fe".parse().unwrap()), // 169.254.169.254
            Some(ReasonCode::MetadataBlocked)
        );
        // NAT64 embedding a PUBLIC IPv4 (8.8.8.8) stays allowed.
        assert_eq!(classify_ip("64:ff9b::808:808".parse().unwrap()), None);
        // RFC 8215 local-use NAT64 64:ff9b:1::/48 is blocked wholesale.
        assert_eq!(
            classify_ip("64:ff9b:1::1".parse().unwrap()),
            Some(ReasonCode::ReservedIpBlocked)
        );
        // 6to4 2002::/16 embedding a private IPv4 (10.0.0.1) must be blocked.
        assert_eq!(
            classify_ip("2002:a00:1::1".parse().unwrap()), // 2002:0a00:0001::/48 → 10.0.0.1
            Some(ReasonCode::PrivateIpBlocked)
        );
        // 6to4 relay anycast 192.88.99.1 is reserved.
        assert_eq!(
            classify_ip("192.88.99.1".parse().unwrap()),
            Some(ReasonCode::ReservedIpBlocked)
        );
    }

    #[test]
    fn public_ips_allowed() {
        assert_eq!(classify_ip("93.184.216.34".parse().unwrap()), None);
        assert_eq!(classify_ip("2606:2800:220:1::1".parse().unwrap()), None);
    }

    // ---- header checks ----

    #[test]
    fn media_type_allowlist_matches_ignoring_params_and_case() {
        let allow = vec!["application/json".to_string()];
        assert!(media_type_allowed(Some("application/json"), &allow));
        assert!(media_type_allowed(
            Some("Application/JSON; charset=utf-8"),
            &allow
        ));
        assert!(!media_type_allowed(Some("text/html"), &allow));
        assert!(!media_type_allowed(None, &allow));
        assert!(!media_type_allowed(Some(""), &allow));
    }

    #[test]
    fn content_encoding_guard() {
        assert!(content_encoding_ok(None));
        assert!(content_encoding_ok(Some("identity")));
        assert!(!content_encoding_ok(Some("gzip")));
        assert!(!content_encoding_ok(Some("br")));
        assert!(!content_encoding_ok(Some("deflate")));
    }
}
