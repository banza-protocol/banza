import { SiteNav } from "@/components/SiteNav";
import { SiteFooterGate } from "@/components/SiteFooterGate";
import { ScrollReveal } from "@/components/ScrollReveal";
import type { Locale } from "@/lib/i18n";

/** The body composition shared by both root layouts.
 *
 * Portuguese and English need separate root layouts so each can emit its own `<html lang>`, but
 * everything inside `<body>` is the same site. This holds that in one place: duplicating it would let
 * the two editions drift in structure — a skip link in one and not the other, a footer that appears on
 * one side only — which is the kind of difference nobody notices until an accessibility audit.
 *
 * Only the language of the skip link differs, because it is the one string here a reader sees.
 */

const SKIP_LABEL: Record<Locale, string> = {
  pt: "Saltar para o conteúdo",
  en: "Skip to content",
};

export function SiteShell({
  locale,
  jsonLd,
  children,
}: {
  locale: Locale;
  jsonLd: unknown;
  children: React.ReactNode;
}) {
  return (
    <body>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
        {SKIP_LABEL[locale]}
      </a>
      <SiteNav locale={locale} />
      {/* The anchor id stays `conteudo` in both editions: it is a machine target that inbound links and
          the skip link above address, not reader-facing text. */}
      <main id="conteudo">{children}</main>
      <SiteFooterGate locale={locale} />
      <ScrollReveal />
    </body>
  );
}
