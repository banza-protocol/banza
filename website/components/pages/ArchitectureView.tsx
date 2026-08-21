import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { editorialCopy, type EditorialCopyId } from "@/components/pages/editorialPresentation";
import { routeHref } from "@/lib/routeRegistry";
import { referenceChapterPath } from "@/lib/referenceSlugs";
import type { Locale } from "@/lib/i18n";

// The architecture page — ONE structure, realized per edition.
//
// Real page that OWNS the canonical three-layer institutional architecture: L1 Protocol / L2 Conformance
// & Interoperability Certification / L3 Banzami Operational Scheme, with BanzAI as the single transversal
// interface (NOT a layer). It states the three-way separation certification ≠ scheme admission ≠
// regulatory authorisation.
//
// Portuguese is canonical and preserved exactly: same hero, four chips, four sections in order, three
// layer cards with their bullets and the Layer-3 status strip, three determination cards, the status note,
// and the same FIVE onward destinations. The English edition offered four — it dropped open governance
// and BanzAI, and added a page the Portuguese edition does not link from here.

type Layer = {
  tag: EditorialCopyId;
  name: EditorialCopyId;
  role: EditorialCopyId;
  body: EditorialCopyId;
  bullets: EditorialCopyId[];
  status?: EditorialCopyId;
};

const LAYERS: Layer[] = [
  {
    tag: "architecture.layer.1.tag",
    name: "architecture.layer.1.name",
    role: "architecture.layer.1.role",
    body: "architecture.layer.1.body",
    bullets: [
      "architecture.layer.1.b1",
      "architecture.layer.1.b2",
      "architecture.layer.1.b3",
      "architecture.layer.1.b4",
      "architecture.layer.1.b5",
    ],
  },
  {
    tag: "architecture.layer.2.tag",
    name: "architecture.layer.2.name",
    role: "architecture.layer.2.role",
    body: "architecture.layer.2.body",
    bullets: [
      "architecture.layer.2.b1",
      "architecture.layer.2.b2",
      "architecture.layer.2.b3",
      "architecture.layer.2.b4",
      "architecture.layer.2.b5",
    ],
  },
  {
    tag: "architecture.layer.3.tag",
    name: "architecture.layer.3.name",
    role: "architecture.layer.3.role",
    body: "architecture.layer.3.body",
    bullets: ["architecture.layer.3.b1", "architecture.layer.3.b2", "architecture.layer.3.b3"],
    status: "architecture.layer.3.status",
  },
];

// Three separate determinations — none implies another (non-propagation).
const DETERMINATIONS: { t: EditorialCopyId; b: EditorialCopyId }[] = [
  { t: "architecture.determinations.1.t", b: "architecture.determinations.1.b" },
  { t: "architecture.determinations.2.t", b: "architecture.determinations.2.b" },
  { t: "architecture.determinations.3.t", b: "architecture.determinations.3.b" },
];

export function ArchitectureView({ locale }: { locale: Locale }) {
  const t = (id: EditorialCopyId) => editorialCopy(id, locale);
  return (
    <>
      <PageHero
        eyebrow={t("architecture.eyebrow")}
        title={<>{t("architecture.title")}</>}
        lede={<>{t("architecture.lede")}</>}
        chips={[
          { label: t("architecture.chip.1") },
          { label: t("architecture.chip.2") },
          { label: t("architecture.chip.3") },
          { label: t("architecture.chip.4") },
        ]}
      />

      {/* As três camadas */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{t("architecture.layers.eyebrow")}</div>
          <div className="flex flex-col gap-[14px]">
            {LAYERS.map((l) => (
              <div key={l.tag} className="rounded-cardish border border-line bg-white p-[clamp(18px,2.4vw,28px)]">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="rounded-protocol border border-bordo/20 bg-tint-bordo px-2.5 py-1 font-mono text-[12px] font-semibold tracking-[0.04em] text-bordo">
                    {t(l.tag)}
                  </span>
                  <h2 className="font-serif text-[clamp(18px,2vw,24px)] font-semibold leading-[1.2] text-ink">
                    {t(l.name)}
                  </h2>
                  <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-5">{t(l.role)}</span>
                </div>
                <p className="mt-3 max-w-[80ch] text-[14.5px] leading-[1.65] text-ink-3">{t(l.body)}</p>
                <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  {l.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[13.5px] leading-[1.55] text-ink-4">
                      <span aria-hidden className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-bordo/60" />
                      {t(b)}
                    </li>
                  ))}
                </ul>
                {l.status && (
                  <div className="mt-4 rounded-cardish border border-pend/30 bg-tint-gold px-4 py-2.5 font-mono text-[12px] leading-[1.5] text-pend">
                    {t(l.status)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* BanzAI transversal */}
      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">{t("architecture.banzai.eyebrow")}</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              {t("architecture.banzai.p1.a")}
              <strong className="text-ink">{t("architecture.banzai.p1.name")}</strong>
              {t("architecture.banzai.p1.b")}
              <span className="font-mono text-[13px]">{routeHref("BANZAI", locale)}</span>
              {t("architecture.banzai.p1.c")}
            </p>
            <p>
              {t("architecture.banzai.p2.a")}
              <strong className="text-ink">{t("architecture.banzai.p2.not")}</strong>
              {t("architecture.banzai.p2.b")}
              <strong className="text-ink">{t("architecture.banzai.p2.rust")}</strong>
              {t("architecture.banzai.p2.c")}
            </p>
          </div>
        </Container>
      </Section>

      {/* Três determinações distintas */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{t("architecture.determinations.eyebrow")}</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            {t("architecture.determinations.title")}
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">{t("architecture.determinations.lede")}</p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
            {DETERMINATIONS.map((d) => (
              <div key={d.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{t(d.t)}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{t(d.b)}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">{t("architecture.note")}</StatusNote>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{t("architecture.continue.eyebrow")}</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href={referenceChapterPath(4, locale) ?? routeHref("REFERENCE", locale)}>{t("architecture.more.chapter")}</MoreLink>
            <MoreLink href={routeHref("TRUST", locale)}>{t("architecture.more.trust")}</MoreLink>
            <MoreLink href={routeHref("FEDERATION", locale)}>{t("architecture.more.federation")}</MoreLink>
            <MoreLink href={routeHref("GOVERNANCE_OPEN", locale)}>{t("architecture.more.governance")}</MoreLink>
            <MoreLink href={routeHref("BANZAI", locale)}>{t("architecture.more.banzai")}</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
