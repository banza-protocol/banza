import type { Metadata } from "next";
import { serif, sans, mono, display } from "../fonts";
import { SiteShell } from "@/components/SiteShell";
import { HTML_LANG } from "@/lib/i18n";
import "../globals.css";

const SITE_URL = "https://banza.network";

const TITLE = "BANZA — An open financial interoperability protocol";
const DESCRIPTION =
  "BANZA defines public rules, versioned profiles, conformance tests, interoperability verification and technical certification so that independent implementations can interoperate without rebuilding a bilateral technical integration for every pair.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · BANZA" },
  description: DESCRIPTION,
  applicationName: "BANZA",
  keywords: [
    "BANZA",
    "protocol",
    "open financial protocol",
    "interoperability",
    "conformance",
    "verifiable evidence",
    "federation",
  ],
  authors: [{ name: "BANZA Protocol" }],
  openGraph: {
    type: "website",
    locale: "en",
    url: `${SITE_URL}/en`,
    siteName: "BANZA",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og-card.png",
        width: 1200,
        height: 630,
        alt: "BANZA — an open protocol for interoperability between independent implementations. Public rules, versioned profiles, conformance tests and technical certification, without rebuilding a bilateral technical integration for every pair.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-card.png"],
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
