import type { Locale } from "./i18n";

// The site-level metadata each edition publishes, under one shape.
//
// This existed twice, and the English half was not a translation of the Portuguese one — it was the
// headline of the independent English homepage that Block F removed. When that page went, its framing
// stayed behind in the layout: the English `og:title` and `twitter:title` still read "An open financial
// interoperability protocol", and English dropped "Angola" from the title, the description and the
// keywords while Portuguese kept it. A share card in English therefore made a different claim about what
// BANZA is, and about where, than the same card in Portuguese.
//
// Portuguese is canonical here as everywhere else. English is a faithful realization of the same claims,
// not a second positioning. Word-for-word equality is not the standard and would be wrong — what must
// match is the ROLES and the CLAIMS: same title role, same description, same keyword concepts, same
// image, same alt text meaning.

export type SiteMetadata = {
  title: string;
  description: string;
  keywords: string[];
  /** OpenGraph and Twitter share the same title and description; the card is the same image. */
  ogLocale: string;
  imageAlt: string;
};

export const SITE_METADATA: Record<Locale, SiteMetadata> = {
  pt: {
    title: "BANZA — Protocolo financeiro aberto para interoperabilidade em Angola",
    description:
      "O BANZA define regras públicas, perfis versionados, testes de conformidade, verificação de interoperabilidade e certificação técnica para implementações independentes interoperarem em Angola, sem reconstruir integrações técnicas bilaterais entre cada par.",
    keywords: [
      "BANZA",
      "protocolo",
      "protocolo financeiro aberto",
      "interoperabilidade",
      "Angola",
      "conformidade",
      "evidência verificável",
      "federação",
    ],
    ogLocale: "pt_PT",
    imageAlt:
      "BANZA — Protocolo financeiro aberto para interoperabilidade entre implementações independentes em Angola. Regras públicas, perfis versionados, testes de conformidade e certificação técnica, sem reconstruir integrações técnicas bilaterais entre cada par.",
  },
  en: {
    title: "BANZA — Open financial protocol for verifiable interoperability in Angola",
    description:
      "BANZA defines public rules, versioned profiles, conformance tests, interoperability verification and technical certification so that independent implementations can interoperate in Angola, without rebuilding a bilateral technical integration for every pair.",
    keywords: [
      "BANZA",
      "protocol",
      "open financial protocol",
      "interoperability",
      "Angola",
      "conformance",
      "verifiable evidence",
      "federation",
    ],
    ogLocale: "en",
    imageAlt:
      "BANZA — an open financial protocol for interoperability between independent implementations in Angola. Public rules, versioned profiles, conformance tests and technical certification, without rebuilding a bilateral technical integration for every pair.",
  },
};

/** The share card both editions use. One image, one meaning, two languages of alt text. */
export const OG_IMAGE = "/og-card.png";
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
