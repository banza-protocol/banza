// One glossary, rendered twice.
//
// The Portuguese page used to own both the data and the markup. Splitting them means the English route
// is not a second glossary — it is the same 24 semantic records read with a different locale, so the two
// languages cannot come to disagree about which concepts exist or how they relate. That was the whole
// point of moving the terms into `glossaryTerms.ts`; this component is what makes it true at render time.
//
// `related` holds semantic KEYS, so the related-terms line is resolved here into whichever display name
// the locale uses. A term renamed in one language does not silently break the relationship in the other.
//
// The technical id and the anchor stay locale-neutral: `certified-implementation` is the concept's
// published identifier, not a Portuguese word, and a reader following a deep link should land on the same
// concept whichever language they are reading.

import Link from "next/link";
import { PageHero, Section, Container, StatusNote } from "@/components/ui";
import { GLOSSARY_TERMS, relatedName } from "@/lib/glossaryTerms";
import type { Locale } from "@/lib/i18n";
import { counterpartOf } from "@/lib/i18n";

/** The page's own chrome, per locale. The term content itself lives in the semantic records. */
const CHROME = {
  pt: {
    eyebrow: "GLOSSÁRIO · ARQUITECTURA ACTUAL",
    title: "Os conceitos do BANZA — cada um com o seu significado exacto.",
    lede: "Um glossário canónico e actual: cada termo com uma definição curta, uma definição completa, o seu id técnico quando existe, a página que o define, os termos relacionados e o que não confundir com ele. Reflecte apenas a arquitectura actual — três camadas, uma interface BanzAI transversal e uma implementação de referência apenas de leitura.",
    chips: ["CANÓNICO", "APENAS TERMOS ACTUAIS"],
    termsChip: (n: number) => `${n} TERMOS`,
    related: "RELACIONADOS",
    notConfuse: "NÃO CONFUNDIR",
    footer:
      "Este glossário define apenas conceitos da arquitectura actual. Termos e superfícies retirados em realinhamentos anteriores não são definidos aqui como conceitos correntes; o histórico dessas decisões vive nos ADRs e RFCs.",
  },
  en: {
    eyebrow: "GLOSSARY · CURRENT ARCHITECTURE",
    title: "The concepts of BANZA — each with its exact meaning.",
    lede: "A canonical, current glossary: each term with a short definition, a full definition, its technical id where one exists, the page that defines it, the related terms, and what not to confuse it with. It reflects only the current architecture — three layers, one transversal BanzAI interface, and a read-only reference implementation.",
    chips: ["CANONICAL", "CURRENT TERMS ONLY"],
    termsChip: (n: number) => `${n} TERMS`,
    related: "RELATED",
    notConfuse: "DO NOT CONFUSE",
    footer:
      "This glossary defines only concepts of the current architecture. Terms and surfaces retired in earlier realignments are not defined here as current concepts; the history of those decisions lives in the ADRs and RFCs.",
  },
} as const;

/**
 * Where the concept's owning page lives, in this locale.
 *
 * Records store the Portuguese path because that is the canonical route; the English site serves the
 * same concepts under `/en`. Query strings are preserved — one term links into a specific BanzAI mode.
 */
/**
 * The English destination of a term's "read more" link.
 *
 * Block E2/Q7 — this used to be `/en` + the Portuguese path, which is the "locale prefixing as a rule"
 * failure the route registry was built to stop: it produced `/en/certificacao`, `/en/registo-tecnico` and
 * `/en/referencia/arquitectura`, none of which exist. The registry knows each route's real English path,
 * including the Reference chapters whose slugs are translated words, so it is asked instead of guessed at.
 *
 * A term whose destination has no English edition keeps the Portuguese one: sending the reader to a page
 * that is not there would be worse than sending them to one in the other language, and the registry is
 * what tells the two cases apart.
 */
function localizedHref(href: string, locale: Locale): string {
  if (locale === "pt") return href;
  // One term links into a specific BanzAI mode, so the query is part of the destination and is carried
  // across: the counterpart of a PATH is what the registry answers, and the parameters ride along.
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? "" : href.slice(cut);
  const en = counterpartOf(path, "en");
  return en ? `${en}${rest}` : href;
}

export function GlossaryView({ locale }: { locale: Locale }) {
  const t = CHROME[locale];
  return (
    <>
      <PageHero
        eyebrow={t.eyebrow}
        title={<>{t.title}</>}
        lede={<>{t.lede}</>}
        chips={[...t.chips.map((label) => ({ label })), { label: t.termsChip(GLOSSARY_TERMS.length) }]}
      />

      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2">
            {GLOSSARY_TERMS.map((term) => (
              <article
                key={term.key}
                id={term.technicalId ?? undefined}
                className="rounded-cardish border border-line bg-white px-[22px] py-[20px]"
              >
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="font-serif text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-ink">
                    {term.name[locale]}
                  </h2>
                  {/* The other language's display name, as a quiet cross-reference. */}
                  <span className="text-[12.5px] italic leading-[1.3] text-ink-5">
                    {term.name[locale === "pt" ? "en" : "pt"]}
                  </span>
                </div>
                {term.technicalId && (
                  <div className="mb-2.5 font-mono text-[11px] text-bordo">{term.technicalId}</div>
                )}
                <p className="mb-3 text-[14.5px] font-medium leading-[1.6] text-ink-3">{term.short[locale]}</p>
                <p className="mb-4 text-[13.5px] leading-[1.65] text-ink-4">{term.full[locale]}</p>
                <dl className="space-y-2 border-t border-line pt-3">
                  <div className="flex flex-wrap gap-x-2 text-[12.5px] leading-[1.55]">
                    <dt className="font-mono tracking-[0.04em] text-ink-5">{t.related}</dt>
                    <dd className="text-ink-4">
                      {term.related
                        .map((key) => relatedName(key, locale))
                        .filter(Boolean)
                        .join(" · ")}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-[12.5px] leading-[1.55]">
                    <dt className="font-mono tracking-[0.04em] text-ink-5">{t.notConfuse}</dt>
                    <dd className="text-ink-4">{term.notConfuse[locale]}</dd>
                  </div>
                </dl>
                <div className="mt-3.5">
                  <Link href={localizedHref(term.href, locale)} className="link-bordo text-[13px]">
                    {term.hrefLabel[locale]} <span className="font-mono">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="paper">
        <Container width="site" data-reveal>
          <StatusNote tone="pend">{t.footer}</StatusNote>
        </Container>
      </Section>
    </>
  );
}
