// Canonical route map and shared constants for the BANZA website.
// M2.19G.2 — public navigation cleanup:
//   Header (§7): exactly three destinations — the Technical Registry, BanzAI, and the reference entry
//     point. "Ler a referência" points DIRECTLY at /referencia (no redirect, never /o-que-e).
//   Footer (§26): three groups — Protocolo · Implementar e validar · Governança — plus the institutional
//     line and boundary note (rendered by SiteFooter). The single canonical introductory definition of
//     BANZA is the reference chapter /referencia/o-que-e; the standalone /o-que-e route was removed.

export const GITHUB_URL = "https://github.com/banza-protocol/banza";
export const BANZAI_GITHUB_URL = "https://github.com/banza-protocol/banza/tree/main/services/banzai-api";
export const SITE_DOMAIN = "banza.network";

export type NavItem = { href: string; label: string; key: string; external?: boolean; github?: boolean; feature?: boolean; email?: boolean; cta?: boolean };

// Global navigation: exactly THREE distinct public destinations, no dropdowns/submenus.
//   Registo técnico   → the closed public Technical Registry (/registo-tecnico) — operators,
//                        implementations, profiles, results, evidence and certification states.
//   BanzAI            → the protocol's transversal interface (/banzai)
//   Ler a referência  → the reference entry point (/referencia, direct — never /o-que-e)
// Array order is the exact left→right desktop order and the top→bottom mobile order.
export const navPrimary: NavItem[] = [
  { href: "/registo-tecnico", label: "Registo técnico", key: "registo" },
  { href: "/banzai", label: "BanzAI", key: "banzai", feature: true },
  { href: "/referencia", label: "Ler a referência", key: "referencia", cta: true },
];

// Footer columns (§26): three groups. The `key` selects the footer pictogram (SiteFooter.FooterIcon) and
// may repeat across items — SiteFooter uses a positional React key, so icon keys are free to reuse.
export const footerColumns: { title: string; items: NavItem[] }[] = [
  {
    // Protocolo — the introductory definition (reference chapter 1), the architecture chapter, the
    // reference entry point and the verifiable public state.
    title: "Protocolo",
    items: [
      { href: "/referencia/o-que-e", label: "O que é o BANZA", key: "f-referencia" },
      { href: "/arquitectura", label: "Arquitectura", key: "f-decisoes" },
      { href: "/referencia", label: "Referência", key: "f-referencia" },
      { href: "/estado", label: "Estado", key: "f-estado" },
    ],
  },
  {
    // Implementar e validar — developer resources, the Technical Registry, BanzAI and the reference
    // implementation (Operador Zero, external read-only surface).
    title: "Implementar e validar",
    items: [
      { href: "/referencia/programadores", label: "Programadores", key: "f-programadores" },
      { href: "/registo-tecnico", label: "Registo técnico", key: "f-decisoes" },
      { href: "/banzai", label: "BanzAI", key: "f-banzai-open" },
      { href: "https://zero.banza.network/", label: "Operador Zero", key: "f-operador-zero", external: true },
    ],
  },
  {
    // Governança — decisions record, security, licence and the source repository.
    title: "Governança",
    items: [
      { href: "/decisoes", label: "Decisões", key: "f-decisoes" },
      { href: "/confianca", label: "Segurança", key: "f-security" },
      { href: "/licenca", label: "Licença", key: "f-licenca" },
      { href: GITHUB_URL, label: "GitHub", key: "f-github", external: true, github: true },
    ],
  },
];
