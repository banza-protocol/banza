import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ReferenceMarkdown } from "@/components/reference/ReferenceMarkdown";
import { ReferenceNav } from "@/components/reference/ReferenceNav";
import { BanzaiRuntimeStrip } from "@/components/reference/BanzaiRuntimeStrip";
import { getReferenceChapters, getReferenceChapter, getReferenceOutline, getReferenceMeta } from "@/lib/reference";
import { GITHUB_URL } from "@/lib/site";

// One chapter of the canonical reference. The markdown is sliced at build time
// from the same single-source file that /referencia/completa renders in full.
// Note: cross-chapter § anchors resolve on /referencia/completa.

type Params = { capitulo: string };

export function generateStaticParams(): Params[] {
  return getReferenceChapters().map((c) => ({ capitulo: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { capitulo } = await params;
  const chapter = getReferenceChapter(capitulo);
  if (!chapter) return {};
  return {
    title: `${chapter.title} · Referência`,
    description: `${chapter.summary} Capítulo ${chapter.num} da referência oficial do protocolo BANZA v1.0 (pré-produção) — a participação demonstra-se por conformidade protocolar verificável.`,
    alternates: { canonical: `/referencia/${chapter.slug}` },
  };
}

export default async function ReferenciaCapituloPage({ params }: { params: Promise<Params> }) {
  const { capitulo } = await params;
  const chapters = getReferenceChapters();
  const idx = chapters.findIndex((c) => c.slug === capitulo);
  if (idx === -1) notFound();
  const chapter = chapters[idx];
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx + 1 < chapters.length ? chapters[idx + 1] : null;
  const outline = getReferenceOutline();
  const { version } = getReferenceMeta();

  return (
    <>
      <header className="band border-b border-bordo-deep">
        <Container width="site" className="relative z-10 py-[clamp(32px,4.5vw,56px)]">
          {/* Breadcrumb */}
          <nav aria-label="Localização" className="band-eyebrow mb-4">
            <Link href="/referencia" className="text-creme-mid no-underline hover:text-creme-high">
              REFERÊNCIA
            </Link>{" "}
            · CAPÍTULO {chapter.num} / {chapters.length}
          </nav>
          <h1 className="font-display max-w-[24ch] text-[clamp(24px,3.6vw,42px)] font-semibold leading-[1.1] text-creme-high">
            {chapter.title}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {[`BANZA v${version}`, "PRÉ-PRODUÇÃO", "REGISTO PÚBLICO SEM EVIDÊNCIA INDEXADA"].map((c) => (
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
              <ReferenceNav outline={outline} variant="chapter" chapterSlug={chapter.slug} />
            </aside>
            <div className="min-w-0">
              <article className="max-w-[820px]">
                <ReferenceMarkdown markdown={chapter.content} />
                {chapter.slug === "banzai" && <BanzaiRuntimeStrip locale="pt" />}
              </article>
              <p className="mt-8 max-w-[80ch] text-[12.5px] leading-[1.6] text-ink-5">
                Referências internas a outros capítulos (§) resolvem na{" "}
                <Link href="/referencia/completa" className="link-bordo">referência completa</Link>.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Prev / next */}
      <section className="border-t border-line bg-paper-2">
        <Container width="site" className="flex flex-wrap items-center justify-between gap-4 py-7">
          {prev ? (
            <Link href={`/referencia/${prev.slug}`} className="text-[13.5px] font-medium text-ink-4 no-underline hover:text-ink">
              <span className="font-mono">←</span> {prev.title}
            </Link>
          ) : (
            <Link href="/referencia" className="text-[13.5px] font-medium text-ink-4 no-underline hover:text-ink">
              <span className="font-mono">←</span> Índice da referência
            </Link>
          )}
          {next ? (
            <Link href={`/referencia/${next.slug}`} className="text-[13.5px] font-semibold text-seal no-underline hover:text-pend">
              {next.title} <span className="font-mono">→</span>
            </Link>
          ) : (
            <Link href="/referencia" className="text-[13.5px] font-semibold text-seal no-underline hover:text-pend">
              Voltar ao índice <span className="font-mono">→</span>
            </Link>
          )}
        </Container>
      </section>

      {/* Continue */}
      <section className="border-t border-line bg-paper">
        <Container width="site" className="py-7">
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <Link href="/estado" className="link-bordo">Estado verificável</Link>
            <Link href="/referencia/certificacao" className="link-bordo">Conformidade</Link>
            <Link href="/referencia/confianca" className="link-bordo">Confiança</Link>
            <Link href="/referencia/programadores" className="link-bordo">Programadores</Link>
            <a href={GITHUB_URL} rel="noopener" className="link-bordo">GitHub ↗</a>
          </div>
        </Container>
      </section>
    </>
  );
}
