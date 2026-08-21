import { PageHero, Section, Container, StatusNote, MoreLink } from "@/components/ui";
import { editorialCopy, type EditorialCopyId } from "@/components/pages/editorialPresentation";
import { routeHref } from "@/lib/routeRegistry";
import { referenceChapterPath } from "@/lib/referenceSlugs";
import type { Locale } from "@/lib/i18n";

// The federation page — ONE structure, realized per edition.
//
// Editorial federation page. States the QUALIFIED federation claim (never the absolute "sem acordos
// bilaterais"/"sem intermediários"/"sem aprovação"/"federação automática para pagamentos reais") and is
// explicit that contracts, participation, risk, settlement, responsibilities and authorisation remain in
// the applicable domain. Links into the canonical reference chapter.
//
// Portuguese is the canonical structure and it is preserved exactly: the same hero, the same three chips,
// the same three sections in the same order, the same four requirement cards, the same six domain tokens,
// the same status note, and the same FOUR onward destinations. The English edition used to offer three,
// two of which pointed at different pages — an English reader could not reach the architecture or the
// protocol state from here at all.

const REQUIRES: { t: EditorialCopyId; b: EditorialCopyId }[] = [
  { t: "federation.requires.1.t", b: "federation.requires.1.b" },
  { t: "federation.requires.2.t", b: "federation.requires.2.b" },
  { t: "federation.requires.3.t", b: "federation.requires.3.b" },
  { t: "federation.requires.4.t", b: "federation.requires.4.b" },
];

const REMAINS: EditorialCopyId[] = [
  "federation.remains.1",
  "federation.remains.2",
  "federation.remains.3",
  "federation.remains.4",
  "federation.remains.5",
  "federation.remains.6",
];

export function FederationView({ locale }: { locale: Locale }) {
  const t = (id: EditorialCopyId) => editorialCopy(id, locale);
  return (
    <>
      <PageHero
        eyebrow={t("federation.eyebrow")}
        title={<>{t("federation.title")}</>}
        lede={<>{t("federation.lede")}</>}
        chips={[
          { label: t("federation.chip.1") },
          { label: t("federation.chip.2") },
          { label: t("federation.chip.3") },
        ]}
      />

      {/* O que é */}
      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">{t("federation.what.eyebrow")}</div>
          <div className="flex flex-col gap-5 text-[15px] leading-[1.7] text-ink-3">
            <p>{t("federation.what.p1")}</p>
            <p>{t("federation.what.p2")}</p>
          </div>
        </Container>
      </Section>

      {/* O que a federação exige */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="eyebrow mb-[18px]">{t("federation.requires.eyebrow")}</div>
          <p className="mb-8 max-w-[74ch] text-[15px] leading-[1.7] text-ink-4">{t("federation.requires.lede")}</p>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {REQUIRES.map((c) => (
              <div key={c.t} className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
                <div className="mb-1.5 text-[15px] font-semibold leading-[1.3] text-ink">{t(c.t)}</div>
                <div className="text-[13.5px] leading-[1.6] text-ink-4">{t(c.b)}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* O que permanece no domínio aplicável */}
      <Section tone="paper">
        <Container width="read" data-reveal>
          <div className="eyebrow mb-[18px]">{t("federation.remains.eyebrow")}</div>
          <p className="mb-6 text-[15px] leading-[1.7] text-ink-3">{t("federation.remains.lede")}</p>
          <div className="mb-8 flex flex-wrap gap-2">
            {REMAINS.map((m) => (
              <span key={m} className="rounded-protocol border border-line bg-white px-3 py-1.5 font-mono text-[11px] text-ink-4">{t(m)}</span>
            ))}
          </div>
          <StatusNote tone="pend">{t("federation.note")}</StatusNote>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            <MoreLink href={referenceChapterPath(10, locale) ?? routeHref("REFERENCE", locale)}>{t("federation.more.chapter")}</MoreLink>
            <MoreLink href={routeHref("TRUST", locale)}>{t("federation.more.trust")}</MoreLink>
            <MoreLink href={routeHref("ARCHITECTURE", locale)}>{t("federation.more.architecture")}</MoreLink>
            <MoreLink href={routeHref("PROTOCOL_STATUS", locale)}>{t("federation.more.status")}</MoreLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
