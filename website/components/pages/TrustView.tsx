import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { editorialCopy, type EditorialCopyId } from "@/components/pages/editorialPresentation";
import { routeHref } from "@/lib/routeRegistry";
import { referenceChapterPath } from "@/lib/referenceSlugs";
import type { Locale } from "@/lib/i18n";

// The trust page — ONE structure, realized per edition.
//
// Editorial trust page. Presents the Open Trust Evaluation (open trust model, no certificate authority),
// Signed Protocol Metadata as an assertion about ARTIFACTS (never participants), the key manifest (public
// keys only), and the three distinct kinds of revocation (key vs metadata/artifact vs Certification
// Record). Links into the canonical reference chapter for the full specification.
//
// Portuguese is canonical and preserved exactly: same hero, four chips, four sections in the same order,
// three input cards, three revocation cards, the status note, and the same FOUR onward destinations. The
// English edition offered three, two of which were different pages.

const INPUTS: { t: EditorialCopyId; b: EditorialCopyId }[] = [
  { t: "trust.inputs.1.t", b: "trust.inputs.1.b" },
  { t: "trust.inputs.2.t", b: "trust.inputs.2.b" },
  { t: "trust.inputs.3.t", b: "trust.inputs.3.b" },
];

const REVOCATION: { t: EditorialCopyId; b: EditorialCopyId }[] = [
  { t: "trust.revocation.1.t", b: "trust.revocation.1.b" },
  { t: "trust.revocation.2.t", b: "trust.revocation.2.b" },
  { t: "trust.revocation.3.t", b: "trust.revocation.3.b" },
];

export function TrustView({ locale }: { locale: Locale }) {
  const t = (id: EditorialCopyId) => editorialCopy(id, locale);
  return (
    <>
      <PageHero
        eyebrow={t("trust.eyebrow")}
        title={<>{t("trust.title")}</>}
        lede={<>{t("trust.lede")}</>}
        chips={[
          { label: t("trust.chip.1") },
          { label: t("trust.chip.2") },
          { label: t("trust.chip.3") },
          { label: t("trust.chip.4") },
        ]}
      />

      {/* O que a avaliação combina */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{t("trust.inputs.eyebrow")}</div>
          <h2 className="mb-3 font-serif text-[clamp(22px,3vw,34px)] font-semibold leading-[1.16] tracking-[-0.01em] text-ink">
            {t("trust.inputs.title")}
          </h2>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">{t("trust.inputs.lede")}</p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
            {INPUTS.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{t(c.t)}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{t(c.b)}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Assinaturas e chaves */}
      <Section tone="paper2">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">{t("trust.keys.eyebrow")}</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>
              <strong className="text-ink">{t("trust.keys.p1.lead")}</strong>
              {t("trust.keys.p1.body")}
            </p>
            <p>
              <strong className="text-ink">{t("trust.keys.p2.lead")}</strong>
              {t("trust.keys.p2.body")}
            </p>
          </div>
        </Container>
      </Section>

      {/* Revogação — três objectos distintos */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{t("trust.revocation.eyebrow")}</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">{t("trust.revocation.lede")}</p>
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            {REVOCATION.map((r) => (
              <div key={r.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{t(r.t)}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{t(r.b)}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <StatusNote tone="pend">{t("trust.note")}</StatusNote>
          </div>
        </Container>
      </Section>

      {/* Continuar */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{t("trust.continue.eyebrow")}</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href={referenceChapterPath(6, locale) ?? routeHref("REFERENCE", locale)}>{t("trust.more.chapter")}</MoreLink>
            <MoreLink href={routeHref("FEDERATION", locale)}>{t("trust.more.federation")}</MoreLink>
            <MoreLink href={routeHref("PROTOCOL_STATUS", locale)}>{t("trust.more.status")}</MoreLink>
            <MoreLink href={routeHref("BANZAI", locale)}>{t("trust.more.banzai")}</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
