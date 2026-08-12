import type { Metadata } from "next";
import { serif, sans, mono, display } from "./fonts";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooterGate } from "@/components/SiteFooterGate";
import { ScrollReveal } from "@/components/ScrollReveal";
import "./globals.css";

const SITE_URL = "https://banza.network";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BANZA — Protocolo financeiro aberto para interoperabilidade em Angola",
    template: "%s · BANZA",
  },
  description:
    "O BANZA define regras públicas, perfis versionados, testes de conformidade, verificação de interoperabilidade e certificação técnica para implementações independentes interoperarem em Angola, sem reconstruir integrações técnicas bilaterais entre cada par.",
  applicationName: "BANZA",
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
  authors: [{ name: "BANZA Protocol" }],
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: `${SITE_URL}/`,
    siteName: "BANZA",
    title: "BANZA — Protocolo financeiro aberto para interoperabilidade em Angola",
    description:
      "O BANZA define regras públicas, perfis versionados, testes de conformidade, verificação de interoperabilidade e certificação técnica para implementações independentes interoperarem em Angola, sem reconstruir integrações técnicas bilaterais entre cada par.",
    images: [
      {
        url: "/og-card.png",
        width: 1200,
        height: 630,
        alt: "BANZA — Protocolo financeiro aberto para interoperabilidade entre implementações independentes em Angola. Regras públicas, perfis versionados, testes de conformidade e certificação técnica, sem reconstruir integrações técnicas bilaterais entre cada par.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BANZA — Protocolo financeiro aberto para interoperabilidade em Angola",
    description:
      "O BANZA define regras públicas, perfis versionados, testes de conformidade, verificação de interoperabilidade e certificação técnica para implementações independentes interoperarem em Angola, sem reconstruir integrações técnicas bilaterais entre cada par.",
    images: ["/og-card.png"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/banza-mark-bordo.png", apple: "/banza-mark-bordo.png" },
};

// Neutral structured data only: Organization + WebSite. Deliberately NOT
// FinancialService/Bank/PaymentService — BANZA is a protocol specification,
// not a licensed financial operator, and the metadata must never suggest it is.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "BANZA Protocol",
      url: SITE_URL,
      logo: `${SITE_URL}/banza-mark-bordo.png`,
      description:
        "Protocolo aberto para interoperabilidade financeira, em pré-produção. Especificação pública e conformidade protocolar verificável: signed protocol metadata, conformance evidence, technical registry, trust root, delegated signing keys e revocation/fail-closed. Não é um banco nem um operador de pagamentos.",
      sameAs: ["https://github.com/banza-protocol/banza"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "BANZA Protocol",
      inLanguage: "pt-PT",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The progressive-enhancement script below adds a `js` class to <html> before React hydrates,
    // so the server (no `js`) and client (`js`) className differ by design. suppressHydrationWarning
    // is React's sanctioned handling for a script-mutated attribute; it is scoped to this one element
    // (one level deep) and does not affect children.
    <html
      lang="pt-PT"
      className={`${serif.variable} ${sans.variable} ${mono.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* Enables JS-only reveal animations; absent => content visible by default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js');",
          }}
        />
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[100] focus:rounded focus:bg-bordo focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar para o conteúdo
        </a>
        <SiteNav />
        <main id="conteudo">{children}</main>
        <SiteFooterGate />
        <ScrollReveal />
      </body>
    </html>
  );
}
