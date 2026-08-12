/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone server output for the production Docker image (node server.js).
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  // Real build/deploy timestamp, inlined at build. The Home status bar renders the elapsed time relative
  // to this real value ("última verificação pública há X") — a sourced timestamp, not a browser counter.
  env: {
    NEXT_PUBLIC_BANZA_BUILD_TIME: new Date().toISOString(),
  },

  async redirects() {
    // Preserve inbound links from the previous site's slugs (and EN/legacy
    // aliases) by redirecting them to this site's canonical pt-PT routes.
    return [
      // Previous PT canonical → new canonical (the introductory definition is the reference chapter 1)
      { source: "/o-que-e-o-banza", destination: "/referencia/o-que-e", permanent: true },
      { source: "/por-que-o-banza-existe", destination: "/porque-existe", permanent: true },
      { source: "/principios-fundamentais", destination: "/arquitectura", permanent: true },
      { source: "/recursos-para-programadores", destination: "/referencia/programadores", permanent: true },
      { source: "/perguntas-frequentes", destination: "/referencia/faq", permanent: true },
      { source: "/reference", destination: "/referencia", permanent: true },
      { source: "/validacao", destination: "/certificacao", permanent: true },
      // /governanca is now a real public governance page (M2.7M); no longer an alias.

      // EN aliases → PT canonical
      { source: "/introduction", destination: "/referencia/o-que-e", permanent: true },
      { source: "/why-banza-exists", destination: "/porque-existe", permanent: true },
      { source: "/core-principles", destination: "/arquitectura", permanent: true },
      { source: "/certification", destination: "/certificacao", permanent: true },
      { source: "/federation", destination: "/federacao", permanent: true },
      { source: "/trust", destination: "/confianca", permanent: true },
      // NOTE: /operators is intentionally NOT redirected — it is the protocol's
      // canonical machine route for the Public Operator Registry (banza.network/operators).
      // It must never redirect to the human HTML page (/operadores). In pre-production it
      // 404s (registry publication depends on the public production conditions). The PT human page stays at /operadores.
      { source: "/developer-resources", destination: "/referencia/programadores", permanent: true },
      { source: "/governance", destination: "/governanca", permanent: true },
      // The standalone /roteiro surface is retired (ADR-080-adjacent public-surface
      // reconciliation): the single canonical explanation of protocol evolution is the
      // reference chapter §14 "Evolução do Protocolo" at /referencia/roteiro. /roteiro
      // and the older /roadmap alias both permanent-redirect straight to that canon —
      // no chain, no second evolution narrative.
      { source: "/roteiro", destination: "/referencia/roteiro", permanent: true },
      { source: "/roadmap", destination: "/referencia/roteiro", permanent: true },
    ];
  },
};

export default nextConfig;
