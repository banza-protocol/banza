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
const META = SITE_METADATA["en"];

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
    url: `${SITE_URL}/en`,
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

// Neutral structured data only: Organization + WebSite. Deliberately NOT FinancialService/Bank/
// PaymentService — BANZA is a protocol specification, not a licensed financial operator, and the
// metadata must never suggest it is.
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
        "An open protocol for financial interoperability, in pre-production. Public specification and verifiable protocol conformance: signed protocol metadata, conformance evidence, a technical registry, a trust root, delegated signing keys and fail-closed revocation. Not a bank and not a payment operator.",
      sameAs: ["https://github.com/banza-protocol/banza"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website-en`,
      url: `${SITE_URL}/en`,
      name: "BANZA Protocol",
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function EnglishRootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The second of two root layouts. Portuguese has its own at `app/(pt)/layout.tsx`; this one owns
    // the English document and declares its own `lang`. That is the whole reason the Portuguese tree
    // sits in a route group: a nested layout cannot render `<html>`, so English under a shared root
    // would have had to inherit `lang="pt-PT"` — a document lying about its own language to every
    // screen reader and search engine.
    <html
      lang={HTML_LANG.en}
      className={`${serif.variable} ${sans.variable} ${mono.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <SiteShell locale="en" jsonLd={JSON_LD}>
        {children}
      </SiteShell>
    </html>
  );
}
