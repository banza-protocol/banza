// Block E2 / Q5 — a decision record's own page, as ONE reader surface parameterized by edition.
//
// Everything this page ASSERTS about the record — its code, type, declared state, repository path,
// canonical URL, its neighbours in reading order and the document body itself — is computed from the
// record and is byte-identical for every reader. Only the chrome that frames those assertions is the
// reader's own. The body is never translated at all: it is served in the language it was authored in,
// which is what "presented in its original language" means and why both editions say so.

import Link from "next/link";
import { PageHero, Section, Container, StatusNote } from "@/components/ui";
import { GitHubMark } from "@/components/GitHubMark";
import { DecisionMarkdown } from "@/components/decisoes/DecisionMarkdown";
import {
  decisionDetailAskQuestion,
  decisionDetailStateLabel,
  decisionsCopy,
  type DecisionsCopyId,
} from "@/components/decisoes/decisionsPresentation";
import { decisions, type Decision } from "@/lib/decisions";
import type { Locale } from "@/lib/i18n";

export function DecisionDetailView({
  decision: d,
  body,
  locale,
}: {
  decision: Decision;
  body: string | null;
  locale: Locale;
}) {
  const t = (id: DecisionsCopyId, params?: Record<string, string>) => decisionsCopy(id, locale, params);
  const isADR = d.type === "ADR";

  // Canonical documents live at decisions/adr and decisions/rfc (there is no docs/adr|docs/rfc).
  // This base is joined with relative hrefs inside the rendered body to build GitHub blob URLs, so
  // a wrong base silently 404s every sibling link (M2.9F).
  const baseDir = isADR ? "decisions/adr" : "decisions/rfc";
  // Neighbours in reading order: the index is a logical sequence, so the previous and next records
  // are more useful than a hand-maintained "related" list, and they cannot go stale.
  const idx = decisions.findIndex((x) => x.id === d.id);
  const related = [decisions[idx - 1], decisions[idx + 1]].filter(Boolean);

  const banzaiPrompt = decisionDetailAskQuestion(d.type, d.id, locale);

  const META: { k: string; v: string }[] = [
    { k: t("detail.meta.type"), v: isADR ? t("detail.type.adr") : t("detail.type.rfc") },
    // The STATE is read from the record; only the sentence naming it belongs to the reader.
    { k: t("detail.meta.state"), v: decisionDetailStateLabel(d.status, locale) },
    { k: t("detail.meta.normativeLevel"), v: t("detail.normativeLevel") },
    { k: t("detail.meta.path"), v: d.path },
  ];

  // The ADR/RFC explainer appears twice on this page — beside the metadata and above the body. One
  // definition, rendered in both places, so the two can never drift apart in either edition.
  const explainer = isADR ? (
    <>
      {t("detail.note.adr.1")}{" "}
      <Link href="/referencia" className="link-bordo">{t("link.reference")}</Link>
      {t("detail.note.adr.2")}
    </>
  ) : (
    <>{t("detail.note.rfc")}</>
  );

  return (
    <>
      <PageHero
        eyebrow={`${d.type} · ${d.id}`}
        title={d.title}
        lede={<>{d.summary}</>}
        chips={[
          { label: d.type, tone: "neutral" },
          { label: t("detail.chip.nonNormative"), tone: "neutral" },
        ]}
      />

      {/* Breadcrumb */}
      <Section tone="paper">
        <Container width="site" data-reveal>
          <nav aria-label={t("detail.aria.breadcrumb")} className="mb-8 font-mono text-[12px] text-ink-5">
            <Link href="/decisoes" className="text-ink-4 no-underline hover:text-bordo">
              {t("detail.breadcrumb.index")}
            </Link>{" "}
            <span aria-hidden="true">/</span> <span className="text-ink-2">{d.id}</span>
          </nav>

          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-start">
            {/* Metadata + actions */}
            <div>
              <div className="overflow-hidden rounded-cardish border border-line bg-white">
                {META.map((row, i) => (
                  <div
                    key={row.k}
                    className={`grid grid-cols-[minmax(120px,160px)_1fr] ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <div className="bg-paper-2 px-5 py-[13px] font-mono text-[11px] tracking-[0.06em] text-ink-5">
                      {row.k.toUpperCase()}
                    </div>
                    <div className="break-words px-5 py-[13px] text-[13.5px] text-ink-2">{row.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={d.canonicalUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-[7px] rounded-[3px] border border-bordo bg-bordo px-[15px] py-[10px] text-[13.5px] font-semibold text-white no-underline hover:bg-bordo-deep"
                >
                  <GitHubMark size={14} />
                  {t("detail.action.readOnGithub")}
                </a>
                <Link
                  href={`/banzai?doc=${encodeURIComponent(d.id)}&q=${encodeURIComponent(banzaiPrompt)}`}
                  className="inline-flex items-center rounded-[3px] border border-line bg-white px-[15px] py-[10px] text-[13.5px] text-ink-2 no-underline hover:border-seal hover:text-seal"
                >
                  {t("card.explainWithBanzai")}
                </Link>
                <Link href="/decisoes" className="text-[13px] text-ink-4 no-underline hover:text-bordo">
                  <span aria-hidden="true" className="font-mono">←</span> {t("detail.action.back")}
                </Link>
              </div>

              {related.length > 0 ? (
                <div className="mt-9">
                  <div className="mb-3 font-mono text-[11px] tracking-[0.08em] text-ink-5">
                    {t("detail.section.related")}
                  </div>
                  <ul className="flex list-none flex-wrap gap-2 p-0">
                    {related.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/decisoes/${r.slug}`}
                          className="inline-flex items-center gap-2 rounded-[3px] border border-line bg-white px-[11px] py-[6px] text-[12.5px] text-ink-3 no-underline hover:border-bordo/40 hover:text-bordo"
                        >
                          <span className="font-mono text-[11px] text-ink-5">{r.id}</span>
                          {r.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Prudent side note */}
            <aside className="md:sticky md:top-[92px]">
              <StatusNote tone="pend">
                <span className="mb-1 block font-semibold">{t("detail.note.heading")}</span>
                {explainer} {t("detail.note.asideTail")}
              </StatusNote>
              <p className="mt-4 text-[12px] leading-[1.6] text-ink-5">
                {t("detail.protocolState")} <span className="font-mono">/operators = []</span> ·{" "}
                <span className="font-mono">production_certificates = false</span>.
              </p>
            </aside>
          </div>
        </Container>
      </Section>

      {/* Conteúdo completo — língua original, sem tradução */}
      <Section tone="paper2">
        <Container width="site" data-reveal>
          <div className="mx-auto max-w-[900px]">
            <div className="mb-6">
              <StatusNote tone="pend">
                {explainer} {t("detail.note.bodyTail")}
              </StatusNote>
            </div>

            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <div className="font-mono text-[11px] tracking-[0.1em] text-ink-5">
                {t("detail.section.originalDocument")}
              </div>
              <a
                href={d.canonicalUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-[6px] font-mono text-[11px] text-ink-4 no-underline hover:text-bordo"
              >
                <GitHubMark size={12} />
                {d.path}
              </a>
            </div>

            {body ? (
              <DecisionMarkdown markdown={body} baseDir={baseDir} />
            ) : (
              <StatusNote tone="neg">{t("detail.body.unavailable")}</StatusNote>
            )}

            <p className="mt-10 border-t border-line pt-5 text-[12.5px] leading-[1.6] text-ink-5">
              {t("detail.footer.1")}{" "}
              <Link href="/referencia" className="link-bordo">{t("link.reference")}</Link>
              {t("detail.footer.2")}
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
