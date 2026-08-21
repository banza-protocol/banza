import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { CERTIFICATION_CONTENT } from "@/components/pages/certificationContent";
import { routeHref } from "@/lib/routeRegistry";
import { referenceChapterPath } from "@/lib/referenceSlugs";
import type { Locale } from "@/lib/i18n";

// The certification page — ONE structure, realized per edition.
//
// It states, in both editions, what a BANZA certification is and is not: a technical certification of a
// specific implementation, bound to a profile, version, environment, scope and validity — and never a
// licence, a scheme admission or a regulatory authorisation. The lifecycle is a closed state machine
// decided only by the Rust engine, and REVOKED is terminal.
//
// Portuguese is canonical. The English edition used to offer five onward destinations where Portuguese
// offered seven: it dropped the BanzAI validation link, the protocol state and the glossary, and pointed
// two of the five at different pages. Same eight sections either way, which is exactly why nobody noticed.

function toneClasses(tone: string) {
  return tone === "ok"
    ? "border-ok/40 text-ok"
    : tone === "neg"
      ? "border-bordo/40 text-bordo"
      : "border-line text-ink-5";
}

export function CertificationView({ locale }: { locale: Locale }) {
  const c = CERTIFICATION_CONTENT[locale];
  const chapter = (n: number) => referenceChapterPath(n, locale) ?? routeHref("REFERENCE", locale);
  // The seven onward destinations, in canonical order: three in the verification band, four in CONTINUE.
  const dest = [
    routeHref("TECHNICAL_REGISTRY", locale),
    `${routeHref("BANZAI", locale)}?mode=validation&target=operator-zero&workflow=full`,
    chapter(7),
    routeHref("OPERATORS", locale),
    routeHref("PROTOCOL_STATUS", locale),
    routeHref("GLOSSARY", locale),
    chapter(6),
  ];

  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={<>{c.hero.title}</>}
        lede={<>{c.hero.lede}</>}
        chips={c.hero.chips}
      />

      {/* As duas frases canónicas — o que a certificação é, e o que não é. */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[0]}</div>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <div className="rounded-cardish border border-line bg-white px-[22px] py-[20px]">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.08em] text-bordo">{c.isLabel}</div>
              <p className="text-[15.5px] leading-[1.65] text-ink">{c.is}</p>
            </div>
            <div className="rounded-cardish border border-line bg-white px-[22px] py-[20px]">
              <div className="mb-2 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{c.isNotLabel}</div>
              <p className="text-[15.5px] leading-[1.65] text-ink">{c.isNot}</p>
            </div>
          </div>
          <p className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.7] text-ink-4">{c.noAuthority}</p>
        </Container>
      </Section>

      {/* A cadeia: perfil → implementação → registo */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[1]}</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            {c.headings[0]}
          </h2>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">{c.paragraphs[0]}</p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {c.chain.map((x) => (
              <div key={x.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-bordo">{x.k}</div>
                <div className="mb-1.5 text-[15.5px] font-semibold leading-[1.3] text-ink">{x.t}</div>
                <div className="mb-2 font-mono text-[11px] text-ink-5">{x.id}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{x.b}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Ao que o registo se liga */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[2]}</div>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">{c.paragraphs[1]}</p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
            {c.binding.map((r) => (
              <div key={r.f} className="rounded-cardish border border-line bg-white px-[20px] py-[16px]">
                <div className="mb-1 font-mono text-[12px] leading-[1.4] text-bordo">{r.f}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{r.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Ciclo de vida — a máquina de estados fechada */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[3]}</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            {c.headings[1]}
          </h2>
          <p className="mb-8 max-w-[78ch] text-[15px] leading-[1.7] text-ink-4">{c.paragraphs[2]}</p>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
            {c.states.map((st) => (
              <div key={st.s} className={`rounded-cardish border bg-white px-[20px] py-[16px] ${toneClasses(st.tone)}`}>
                <div className="mb-1.5 font-mono text-[12.5px] font-semibold tracking-[0.04em]">{st.s}</div>
                <div className="text-[13px] leading-[1.6] text-ink-4">{st.d}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
            <strong className="text-ink">{c.terminalLead}</strong> {c.terminalBody}
          </p>
        </Container>
      </Section>

      {/* Reason codes */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[4]}</div>
          <p className="mb-8 max-w-[76ch] text-[15px] leading-[1.7] text-ink-4">{c.paragraphs[3]}</p>
          <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
            {c.reasonCodes.map((r) => (
              <div key={r.c} className="rounded-cardish border border-line bg-white px-[18px] py-[14px]">
                <div className="mb-1 font-mono text-[12px] text-ink">{r.c}</div>
                <div className="text-[13px] leading-[1.55] text-ink-4">{r.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* As três determinações distintas */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[5]}</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            {c.headings[2]}
          </h2>
          <p className="mb-8 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">{c.paragraphs[4]}</p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {c.determinations.map((d) => (
              <div key={d.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1 font-mono text-[10.5px] tracking-[0.08em] text-ink-5">{d.layer}</div>
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{d.t}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{d.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">{c.note}</StatusNote>
          </div>
        </Container>
      </Section>

      {/* Como se verifica */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[6]}</div>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">{c.paragraphs[5]}</p>
          <p className="mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-ink-4">{c.paragraphs[6]}</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {c.more.slice(0, 3).map((label, i) => (
              <MoreLink key={label} href={dest[i]}>{label}</MoreLink>
            ))}
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{c.eyebrows[7]}</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {c.more.slice(3).map((label, i) => (
              <MoreLink key={label} href={dest[i + 3]}>{label}</MoreLink>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
