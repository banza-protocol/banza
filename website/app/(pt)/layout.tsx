import type { Metadata } from "next";
import { serif, sans, mono, display } from "../fonts";
import { SiteShell } from "@/components/SiteShell";
import { HTML_LANG } from "@/lib/i18n";
import { SITE_METADATA, OG_IMAGE, OG_IMAGE_SIZE } from "@/lib/siteMetadata";
import "../globals.css";

const SITE_URL = "https://banza.network";

// Site metadata comes from lib/siteMetadata.ts, which owns both editions under one shape. It used to be
// written twice, and the English half was not a translation: it carried the headline of the independent
// English homepage that has since been removed, and dropped "Angola" from the title, the description and
// the keywords while Portuguese kept it. A share card in English claimed something different from the
// same card in Portuguese.
const META = SITE_METADATA["pt"];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: META.title, template: "%s · BANZA" },
  description: META.description,
  applicationName: "BANZA",
  keywords: META.keywords,
  authors: [{ name: "BANZA Protocol" }],
  openGraph: {
    type: "website",
    locale: META.ogLocale,
    url: `${SITE_URL}/`,
    siteName: "BANZA",
    title: META.title,
    description: META.description,
    images: [{ url: OG_IMAGE, ...OG_IMAGE_SIZE, alt: META.imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: META.title,
    description: META.description,
    images: [OG_IMAGE],
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

export default function PortugueseRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // One of two root layouts. This one owns the Portuguese document: `app/(pt)/` is a route group, so
    // it contributes nothing to the URL — `app/(pt)/estado` is still served at `/estado` — but it does
    // let this layout be a real root and declare `lang` for its own edition. English has its own root
    // at `app/en/`. Navigating between the two performs a full document load, which is correct: they
    // are different documents in different languages.
    //
    // The progressive-enhancement script inside SiteShell adds a `js` class to <html> before React
    // hydrates, so the server (no `js`) and client (`js`) className differ by design.
    // suppressHydrationWarning is React's sanctioned handling for a script-mutated attribute; it is
    // scoped to this one element and does not affect children.
    <html
      lang={HTML_LANG.pt}
      className={`${serif.variable} ${sans.variable} ${mono.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <SiteShell locale="pt" jsonLd={JSON_LD}>
        {children}
      </SiteShell>
    </html>
  );
}
