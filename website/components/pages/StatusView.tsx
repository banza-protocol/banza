import Link from "next/link";
import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { STATUS_CONTENT } from "@/components/pages/statusContent";
import { GITHUB_URL, BANZAI_GITHUB_URL } from "@/lib/site";
import { routeHref } from "@/lib/routeRegistry";
import { referenceChapterPath } from "@/lib/referenceSlugs";
import type { Locale } from "@/lib/i18n";

// The protocol-status page — ONE structure, realized per edition.
//
// The status panel is static and citable; the machine routes below it are the verifiable source and this
// page is the human explanation. The BanzAI row is NOT static: it is derived server-side from the runtime
// SSOT (GET /banzai/runtime), by the same module both editions use, so the page can never contradict what
// the service actually reports. Where prose and the route differ, the route wins — which only means
// something because there is one derivation, not one per language.
//
// The four onward destinations are the same Reference chapters in both editions, and the closing "ask"
// link resolves to each edition's own BanzAI.

const CONTINUE_CHAPTERS = [7, 6, 13, 14];

// The runtime row is fetched by the ROUTE and handed in, so the async boundary stays where it has always
// been — at the page — and this view renders synchronously. Both editions fetch it through the same
// module, so there is still exactly one derivation of what the runtime is doing.
export function StatusView({ locale, banzaiRow }: { locale: Locale; banzaiRow: { value: string; tone: string } }) {
  const c = STATUS_CONTENT[locale];
  const PANEL = [...c.panel, { label: "BanzAI", value: banzaiRow.value, tone: banzaiRow.tone }];
  return (
    <>
      <PageHero eyebrow={c.hero.eyebrow} title={c.hero.title} lede={c.hero.lede} chips={c.hero.chips} />

      {/* Painel de estado (estático; a fonte verificável são as rotas máquina) */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.panelEyebrow}</div>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {PANEL.map((r) => (
              <div key={r.label} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{r.label.toUpperCase()}</div>
                <div className="text-[14.5px] font-semibold leading-[1.45] text-ink">{r.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">{c.intro}</p>
          <p className="mt-4 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">{c.schemeNote}</p>
        </Container>
      </Section>

      {/* Rotas máquina — a fonte verificável */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.routesEyebrow}</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            {c.routesTitle}
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">{c.routesLede}</p>
          <div className="flex flex-col gap-[12px]">
            {c.routes.map((r) => (
              <div key={r.path} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <a href={r.path} className="link-bordo break-all font-mono text-[13px]" title={c.openRoute(r.path)}>
                  {r.path}
                </a>
                <div className="mt-1.5 text-[14px] leading-[1.55] text-ink-3">{r.what}</div>
                <div className="mt-1 text-[13px] leading-[1.55] text-ink-5">{c.todayLabel}: {r.today}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* O que cada termo significa */}
      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">{c.readingEyebrow}</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">{c.reading}</div>
          <div className="mt-8">
            <StatusNote tone="pend">{c.note}</StatusNote>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.continueEyebrow}</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {c.more.map((label, i) => (
              <MoreLink key={label} href={referenceChapterPath(CONTINUE_CHAPTERS[i], locale) ?? routeHref("REFERENCE", locale)}>
                {label}
              </MoreLink>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            <a href={GITHUB_URL} className="link-bordo text-[13.5px]" rel="noopener">
              {c.github[0]} <span className="font-mono">↗</span>
            </a>
            <a href={BANZAI_GITHUB_URL} className="link-bordo text-[13.5px]" rel="noopener">
              {c.github[1]} <span className="font-mono">↗</span>
            </a>
            <Link href={routeHref("BANZAI", locale)} className="link-bordo text-[13.5px]">
              {c.ask} <span className="font-mono">→</span>
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
