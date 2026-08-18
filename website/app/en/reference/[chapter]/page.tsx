import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ReferenceMarkdown } from "@/components/reference/ReferenceMarkdown";
import { ReferenceNav } from "@/components/reference/ReferenceNav";
import { BanzaiRuntimeStrip } from "@/components/reference/BanzaiRuntimeStrip";
import {
  getReferenceChapters,
  getReferenceChapter,
  getReferenceOutline,
  getReferenceMeta,
  chapterSlug,
  chapterCounterpart,
} from "@/lib/reference";
import { GITHUB_URL } from "@/lib/site";

// One chapter of the official English Reference — ONE generated route, not fifteen page files.
//
// The public identifier is the declared English slug, never a slug derived from the translated heading: an
// editorial retitle must not move a published URL. Resolution goes slug → semantic chapter number → English
// chapter, and previous/next walk the same semantic order the Portuguese edition walks, so the two editions
// cannot drift into different reading sequences.
//
// An unknown slug is a 404. It is deliberately NOT a fall back to Portuguese: serving Portuguese text at an
// English URL is the failure this milestone exists to end, and a typo must not reach it.

type Params = { chapter: string };

export function generateStaticParams(): Params[] {
  // Enumerated from the semantic chapter definitions, so a new chapter appears in both editions at once.
  return getReferenceChapters("en")
    .map((c) => chapterSlug(c.num, "en"))
    .filter((s): s is string => Boolean(s))
    .map((chapter) => ({ chapter }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { chapter: slug } = await params;
  const chapter = getReferenceChapter(slug, "en");
  if (!chapter) return {};
  // The Portuguese counterpart comes from the semantic id — never from string surgery on the pathname,
  // which would produce /en/referencia/... and the architecture this route scheme replaced.
  const pt = chapterCounterpart(slug, "en");
  return {
    title: `${chapter.title} · Reference`,
    description: `Chapter ${chapter.num} of the official BANZA v1.0 protocol Reference (pre-production) — participation is demonstrated by verifiable protocol conformance.`,
    alternates: {
      canonical: `/en/reference/${slug}`,
      ...(pt ? { languages: { "pt-PT": pt, en: `/en/reference/${slug}` } } : {}),
    },
  };
}

export default async function EnReferenceChapterPage({ params }: { params: Promise<Params> }) {
  const { chapter: slug } = await params;
  const chapters = getReferenceChapters("en");
  const idx = chapters.findIndex((c) => chapterSlug(c.num, "en") === slug);
  if (idx === -1) notFound();
  const chapter = chapters[idx];
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx + 1 < chapters.length ? chapters[idx + 1] : null;
  const href = (num: number) => `/en/reference/${chapterSlug(num, "en")}`;
  const outline = getReferenceOutline("en");
  const { version } = getReferenceMeta("en");

  return (
    <>
      <header className="band border-b border-bordo-deep">
        <Container width="site" className="relative z-10 py-[clamp(32px,4.5vw,56px)]">
          <nav aria-label="Location" className="band-eyebrow mb-4">
            <Link href="/en/reference" className="text-creme-mid no-underline hover:text-creme-high">
              REFERENCE
            </Link>{" "}
            · CHAPTER {chapter.num} / {chapters.length}
          </nav>
          <h1 className="font-display max-w-[24ch] text-[clamp(24px,3.6vw,42px)] font-semibold leading-[1.1] text-creme-high">
            {chapter.title}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {[`BANZA v${version}`, "PRE-PRODUCTION", "PUBLIC REGISTRY WITH NO INDEXED EVIDENCE"].map((c) => (
              <span key={c} className="rounded-protocol border border-creme-chip/30 bg-white/5 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-creme-chip">
                {c}
              </span>
            ))}
          </div>
        </Container>
      </header>

      <section className="bg-paper">
        <Container width="site" className="py-[clamp(28px,4vw,48px)]">
          <div className="grid grid-cols-1 gap-[clamp(20px,4vw,56px)] lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside>
              <ReferenceNav
                outline={outline}
                variant="chapter"
                chapterSlug={chapter.slug}
                chapterBase="/en/reference"
                chaptersLabel="CHAPTERS"
              />
            </aside>
            <div className="min-w-0">
              <article className="max-w-[820px]">
                <ReferenceMarkdown markdown={chapter.content} />
                {chapter.num === 12 && <BanzaiRuntimeStrip />}
              </article>
              <p className="mt-8 max-w-[80ch] text-[12.5px] leading-[1.6] text-ink-5">
                Cross-chapter references (§) resolve on the{" "}
                <Link href="/en/reference/full" className="link-bordo">full Reference</Link>.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-paper-2">
        <Container width="site" className="flex flex-wrap items-center justify-between gap-4 py-7">
          {prev ? (
            <Link href={href(prev.num)} className="text-[13.5px] font-medium text-ink-4 no-underline hover:text-ink">
              <span className="font-mono">←</span> {prev.title}
            </Link>
          ) : (
            <Link href="/en/reference" className="text-[13.5px] font-medium text-ink-4 no-underline hover:text-ink">
              <span className="font-mono">←</span> Reference index
            </Link>
          )}
          {next ? (
            <Link href={href(next.num)} className="text-[13.5px] font-semibold text-seal no-underline hover:text-pend">
              {next.title} <span className="font-mono">→</span>
            </Link>
          ) : (
            <Link href="/en/reference" className="text-[13.5px] font-semibold text-seal no-underline hover:text-pend">
              Back to index <span className="font-mono">→</span>
            </Link>
          )}
        </Container>
      </section>

      <section className="border-t border-line bg-paper">
        <Container width="site" className="py-7">
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <Link href="/en/reference/conformance-certification" className="link-bordo">Conformance</Link>
            <Link href="/en/reference/trust" className="link-bordo">Trust</Link>
            <Link href="/en/reference/developer-resources" className="link-bordo">Developer resources</Link>
            <a href={GITHUB_URL} rel="noopener" className="link-bordo">GitHub ↗</a>
          </div>
        </Container>
      </section>
    </>
  );
}
