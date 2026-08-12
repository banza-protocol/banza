# banza-artifact-fetcher (ADR-068 §4.7) — the ONLY BANZA component that reaches operator public
# endpoints. Internal service `banza-fetcher`; NEVER published to the host or the reverse-proxy.
#
# TLS uses rustls with the pure-Rust `ring` provider and Mozilla roots compiled in via `webpki-roots`,
# so the runtime image needs no OpenSSL and no `ca-certificates` package.

# ---- Stage 1: build ----
FROM rust:1.90-slim-bookworm AS builder
WORKDIR /build

# Copy the manifest set and sources. Cargo.lock is committed for a reproducible build.
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Build only the service binary (no dev-deps, no tests).
RUN cargo build --release --bin banza-fetcher \
    && strip target/release/banza-fetcher

# ---- Stage 2: runtime (distroless + glibc for ring/rustls; nonroot) ----
FROM gcr.io/distroless/cc-debian12:nonroot
WORKDIR /app

COPY --from=builder /build/target/release/banza-fetcher /usr/local/bin/banza-fetcher

# Internal port; overridable via FETCHER_PORT / PORT.
ENV FETCHER_PORT=8092
EXPOSE 8092

USER nonroot

# Distroless has no shell/curl: the binary self-probes /health (exec form).
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
    CMD ["/usr/local/bin/banza-fetcher", "--healthcheck"]

ENTRYPOINT ["/usr/local/bin/banza-fetcher"]
