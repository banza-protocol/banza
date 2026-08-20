// Block E2 / Q5 — the DECISIONS index, as ONE reader surface parameterized by edition.
//
// The route used to own its own copy, which is why Q4 could localize the explorer and still leave the
// page around it Portuguese. There is no second tree here: the Portuguese route renders this with
// `locale="pt"` and an English route would render the same component with `locale="en"`. The counts, the
// record set and every link target are computed once and are the same for both.

import Link from "next/link";
import { PageHero, Section, Container } from "@/components/ui";
import { GitHubMark } from "@/components/GitHubMark";
import { DecisionsExplorer } from "@/components/decisoes/DecisionsExplorer";
import { decisionsCopy, type DecisionsCopyId } from "@/components/decisoes/decisionsPresentation";
import { routeHref } from "@/lib/routeRegistry";
import { counterpartOf } from "@/lib/i18n";

// The governance PROCESS lives in a Reference chapter, whose slug is a translated word — so the chapter
// counterpart resolver owns the pairing, exactly as it does for the glossary's outbound links. Writing
// the English path here by hand is how `/en/referencia/governacao` gets invented.
const GOVERNANCE_CHAPTER_PT = "/referencia/governacao";
import { decisions, decisionCategories } from "@/lib/decisions";
import { GITHUB_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

const adrCount = decisions.filter((d) => d.type === "ADR").length;
const rfcCount = decisions.filter((d) => d.type === "RFC").length;

export function DecisionsIndexView({ locale }: { locale: Locale }) {
  const t = (id: DecisionsCopyId, params?: Record<string, string>) => decisionsCopy(id, locale, params);

  return (
    <>
      <PageHero
        eyebrow={t("index.eyebrow")}
        title={t("index.title")}
        lede={<>{t("index.lede")}</>}
        chips={[
          { label: t("index.chip.protocol"), tone: "neutral" },
          { label: t("index.chip.governance"), tone: "neutral" },
          // The counts are facts read off the index, identical in both editions.
          { label: t("index.chip.counts", { adr: String(adrCount), rfc: String(rfcCount) }), tone: "neutral" },
          { label: t("index.chip.banzaiExplains"), tone: "pend" },
        ]}
      />

      {/* NOTA PRUDENTE */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-center">
            <p className="m-0 max-w-[78ch] text-[14.5px] leading-[1.7] text-ink-4">
              {t("index.note.1")}{" "}
              <Link href={routeHref("REFERENCE", locale)} className="link-bordo">{t("link.reference")}</Link>
              {t("index.note.2")}{" "}
              <Link href={routeHref("BANZAI", locale)} className="link-bordo">{t("link.banzai")}</Link>{" "}
              {t("index.note.3")}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`${GITHUB_URL}/tree/main/docs`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-[7px] rounded-[3px] border border-line bg-white px-[14px] py-[9px] text-[13px] text-ink-2 no-underline hover:border-bordo/40 hover:text-bordo"
              >
                <GitHubMark size={14} />
                {t("index.link.githubSource")}
              </a>
              <Link
                href={counterpartOf(GOVERNANCE_CHAPTER_PT, locale) ?? GOVERNANCE_CHAPTER_PT}
                className="inline-flex items-center rounded-[3px] border border-line bg-white px-[14px] py-[9px] text-[13px] text-ink-2 no-underline hover:border-bordo/40 hover:text-bordo"
              >
                {t("index.link.governanceProcess")}
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* EXPLORADOR */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <DecisionsExplorer decisions={decisions} categories={decisionCategories} locale={locale} />
        </Container>
      </Section>
    </>
  );
}
