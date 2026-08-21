import Link from "next/link";
import { Container } from "@/components/ui";
import { REFERENCE_CONTENT } from "@/components/pages/referenceContent";
import { getReferenceChapters, getReferenceMeta, chapterSlug } from "@/lib/reference";
import { routeHref } from "@/lib/routeRegistry";
import { referenceChapterPath } from "@/lib/referenceSlugs";
import { GITHUB_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

// The Reference landing — ONE structure, realized per edition.
//
// The cover, framing and index of the canonical protocol Reference. It orients the reader; the chapters
// explain. The full single-page rendering lives at the full-reference route; each chapter at its own.
// Copy is page-authored (sober, self-contained) rather than pulled from the markdown, so the entry page
// stays a door rather than a chapter zero.
//
// Portuguese is the canonical structure. The English edition used to be a smaller page: it was missing the
// third framing paragraph, the "read by chapter" heading, the decisions-and-evolution band and one onward
// destination. Those are substantive statements about how the protocol works, so their absence was a
// content omission and not a stylistic difference.

// The four onward destinations: the protocol state, then three Reference chapters.
const CONTINUE_CHAPTERS = [7, 6, 13];

export function ReferenceLandingView({ locale }: { locale: Locale }) {
  const c = REFERENCE_CONTENT[locale];
  const chapters = getReferenceChapters(locale);
  const { version } = getReferenceMeta();
  const continueHrefs = [
    routeHref("PROTOCOL_STATUS", locale),
    ...CONTINUE_CHAPTERS.map((n) => referenceChapterPath(n, locale) ?? routeHref("REFERENCE", locale)),
  ];

  return (
    <>
      {/* Hero */}
      <header className="band border-b border-bordo-deep">
        <Container width="site" className="relative z-10 py-[clamp(44px,6vw,80px)]">
          <div className="band-eyebrow mb-4">{c.heroEyebrow}</div>
          <h1 className="font-display max-w-[20ch] text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.05] text-creme-high">
            {c.h1}
          </h1>
          <p className="mt-5 max-w-[62ch] text-[clamp(15px,1.7vw,18px)] leading-[1.6] text-creme-mid">{c.lede}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[`BANZA v${version}`, c.preProductionChip].map((chip) => (
              <span key={chip} className="rounded-protocol border border-creme-chip/30 bg-white/5 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-creme-chip">
                {chip}
              </span>
            ))}
          </div>
        </Container>
      </header>

      {/* Sobre esta Referência */}
      <section className="border-b border-line bg-paper">
        <Container width="site" className="py-[clamp(28px,4vw,48px)]">
          <div className="eyebrow mb-4">{c.aboutEyebrow}</div>
          <div className="max-w-[74ch] space-y-4 text-[15px] leading-[1.7] text-ink-4">
            {c.about.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        </Container>
      </section>

      {/* Estado actual */}
      <section className="border-b border-line bg-paper-2">
        <Container width="site" className="py-[clamp(28px,4vw,48px)]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div className="eyebrow">{c.stateEyebrow}</div>
            <Link href={routeHref("PROTOCOL_STATUS", locale)} className="btn-ghost">
              {c.stateLink} <span className="font-mono">→</span>
            </Link>
          </div>
          <ul className="max-w-[80ch] space-y-2.5">
            {c.state.map((fact) => (
              <li key={fact} className="flex gap-3 text-[14px] leading-[1.6] text-ink-4">
                <span aria-hidden className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-bordo/60" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Índice de capítulos */}
      <section className="bg-paper">
        <Container width="site" className="py-[clamp(32px,4vw,56px)]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow mb-3">{c.chaptersEyebrow} · {chapters.length}</div>
              <h2 className="h-section m-0">{c.chaptersTitle}</h2>
            </div>
            <Link href={routeHref("REFERENCE_FULL", locale)} className="btn-ghost">
              {c.fullReferenceLink} <span className="font-mono">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((ch) => {
              const slug = chapterSlug(ch.num, locale);
              if (!slug) return null;
              return (
                <Link
                  key={slug}
                  href={referenceChapterPath(ch.num, locale) ?? routeHref("REFERENCE", locale)}
                  className="group rounded-cardish border border-line bg-white px-[20px] py-[18px] no-underline transition-colors hover:border-bordo/40"
                >
                  <div className="mb-2 font-mono text-[10.5px] tracking-[0.1em] text-ink-5">
                    {c.chapterLabel} {String(ch.num).padStart(2, "0")}
                  </div>
                  <div className="mb-1.5 text-[15.5px] font-semibold leading-[1.3] text-ink group-hover:text-bordo">
                    {ch.title.replace(/^\d+\.\s*/, "")}
                  </div>
                  <div className="text-[13px] leading-[1.55] text-ink-4">{ch.summary}</div>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Decisões e evolução */}
      <section className="border-t border-line bg-paper-2">
        <Container width="site" className="py-[clamp(32px,4vw,52px)]">
          <div className="grid gap-5 md:grid-cols-[1.6fr_auto] md:items-center">
            <div>
              <div className="mb-3 font-mono text-[11px] tracking-eyebrow text-bordo">{c.decisionsEyebrow}</div>
              <p className="m-0 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">{c.decisionsBody}</p>
            </div>
            <Link href={routeHref("DECISIONS", locale)} className="btn-ghost justify-self-start md:justify-self-end">
              {c.decisionsLink} <span className="font-mono">→</span>
            </Link>
          </div>
        </Container>
      </section>

      {/* Continuar */}
      <section className="border-t border-line bg-paper">
        <Container width="site" className="py-[clamp(36px,5vw,64px)]">
          <div className="mb-5 font-mono text-[11px] tracking-eyebrow text-bordo">{c.continueEyebrow}</div>
          <div className="flex flex-wrap gap-3">
            {c.continueLabels.map((label, i) => (
              <Link key={label} href={continueHrefs[i]} className="btn-ghost">
                {label} <span className="font-mono">→</span>
              </Link>
            ))}
            <a href={GITHUB_URL} rel="noopener" className="btn-ghost">
              {c.github} <span className="font-mono">↗</span>
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
