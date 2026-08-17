import type { Metadata } from "next";
import { getWhitepaper, getWhitepaperManifest } from "@/lib/whitepaper";
import { WhitepaperEdition } from "@/components/whitepaper/WhitepaperEdition";

const SITE = "https://banza.network";
const PDF = "/whitepaper/banza-whitepaper-v1.0-en.pdf";

export function generateMetadata(): Metadata {
  const wp = getWhitepaper("en");
  return {
    title: `${wp.title} — Whitepaper v${wp.version}`,
    description: wp.abstract.slice(0, 300),
    alternates: {
      canonical: `${SITE}/whitepaper/en`,
      languages: { en: `${SITE}/whitepaper/en`, pt: `${SITE}/whitepaper/pt`, "x-default": `${SITE}/whitepaper` },
    },
    openGraph: { title: wp.title, description: wp.abstract.slice(0, 200), url: `${SITE}/whitepaper/en`, type: "article", locale: "en" },
    other: {
      citation_title: wp.title,
      citation_author: wp.authors.map((a) => a.display),
      citation_publication_date: wp.date_iso,
      citation_publisher: wp.publisher_legal,
      citation_pdf_url: `${SITE}${PDF}`,
      citation_language: "en",
    },
  };
}

export default function WhitepaperEN() {
  const wp = getWhitepaper("en");
  const v = getWhitepaperManifest()?.pdfs.find((p) => p.lang === "en")?.sha256.slice(0, 8);
  const pdfHref = v ? `${PDF}?v=${v}` : PDF;
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: wp.title,
    name: wp.title,
    inLanguage: "en",
    author: wp.authors.map((a) => ({ "@type": "Person", name: a.display, affiliation: { "@type": "Organization", name: wp.affiliation_legal } })),
    publisher: { "@type": "Organization", name: wp.publisher_legal },
    datePublished: wp.date_iso,
    version: wp.version,
    license: "https://creativecommons.org/licenses/by/4.0/",
    url: `${SITE}/whitepaper/en`,
    isBasedOn: `${SITE}/whitepaper/pt`,
    abstract: wp.abstract,
    keywords: wp.keywords.join(", "),
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld) }} />
      <WhitepaperEdition wp={wp} pdfHref={pdfHref} />
    </main>
  );
}
