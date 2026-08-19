"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Decision } from "@/lib/decisions";
import {
  decisionAskQuestion,
  decisionStateLabel,
  decisionsCopy,
  type DecisionsCopyId,
} from "@/components/decisoes/decisionsPresentation";
import type { Locale } from "@/lib/i18n";

// Client-side explorer for the ADR/RFC library. Pure local state — filters and
// search operate over the statically-indexed `decisions` array (no network, no
// LLM, no runtime data source). BanzAI links open /banzai pre-filled with the
// question; the agent answers there from local on-host inference (ADR-036/048).

type TypeFilter = "all" | "ADR" | "RFC";
type StateFilter = "all" | "activo" | "rascunho" | "substituido";

// The tabs are FACTS plus a label id: `key` is what the filter actually does and is the same for every
// reader; the id is only how that key is named to them. Block E2/Q4 — the state decides, the label
// explains. (An RFC declares its state in frontmatter; an ADR in this tree is current by construction.
// Before the registry could read either, every card was labelled "Activo" from a literal — harmless only
// for as long as the six draft RFCs were invisible.)
const TYPE_TABS: { key: TypeFilter; labelId: DecisionsCopyId }[] = [
  { key: "all", labelId: "filter.type.all" },
  { key: "ADR", labelId: "filter.type.adr" },
  { key: "RFC", labelId: "filter.type.rfc" },
];

const STATE_TABS: { key: StateFilter; labelId: DecisionsCopyId }[] = [
  { key: "all", labelId: "filter.state.all" },
  { key: "activo", labelId: "filter.state.activo" },
  { key: "rascunho", labelId: "filter.state.rascunho" },
  { key: "substituido", labelId: "filter.state.substituido" },
];

function stateChipClass(state: string) {
  if (state === "activo") return "border-line-2 bg-white text-ink-2";
  if (state === "substituido") return "border-line-2 bg-paper-3 text-ink-5";
  return "border-pend/40 bg-tint-gold text-pend"; // rascunho
}

export function DecisionsExplorer({
  decisions,
  categories,
  locale,
}: {
  decisions: Decision[];
  categories: string[];
  /** The edition this library is being served in, declared by the route that renders it. */
  locale: Locale;
}) {
  const t = (id: DecisionsCopyId) => decisionsCopy(id, locale);
  const [type, setType] = useState<TypeFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decisions.filter((d) => {
      if (type !== "all" && d.type !== type) return false;
      if (state !== "all" && d.status !== state) return false;
      if (category !== "all" && d.category !== category) return false;
      if (q) {
        const hay = `${d.id} ${d.title} ${d.summary} ${d.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [decisions, type, state, category, query]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("aria.filterByType")}>
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={type === tab.key}
                onClick={() => setType(tab.key)}
                className={`rounded-[3px] border px-[13px] py-[6px] text-[13px] font-medium transition-colors ${
                  type === tab.key
                    ? "border-bordo bg-bordo text-white"
                    : "border-line bg-white text-ink-2 hover:border-bordo/40 hover:text-bordo"
                }`}
              >
                {t(tab.labelId)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("aria.filterByState")}>
            {STATE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={state === tab.key}
                onClick={() => setState(tab.key)}
                className={`rounded-[3px] border px-[13px] py-[6px] text-[12.5px] transition-colors ${
                  state === tab.key
                    ? "border-seal bg-seal/10 text-seal"
                    : "border-line bg-white text-ink-3 hover:border-seal hover:text-seal"
                }`}
              >
                {t(tab.labelId)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[3px] border border-line bg-white px-3 py-2 focus-within:border-bordo/40">
            <span className="sr-only">{t("search.label")}</span>
            <span aria-hidden="true" className="font-mono text-[12px] text-ink-5">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-5"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-4">
            <span>{t("facet.theme")}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-[3px] border border-line bg-white px-3 py-2 text-[13px] text-ink-2 outline-none focus:border-bordo/40"
            >
              <option value="all">{t("facet.allThemes")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Result count (live) */}
      <p className="mt-5 font-mono text-[11px] tracking-[0.08em] text-ink-5" aria-live="polite">
        {results.length} {results.length === 1 ? t("count.one") : t("count.many")}
      </p>
      <p className="mt-1 max-w-[74ch] text-[12px] leading-[1.55] text-ink-5">
        {t("library.note")}
      </p>

      {/* Cards */}
      {results.length === 0 ? (
        <div className="mt-5 rounded-cardish border border-dashed border-line-2 bg-paper-2 px-7 py-12 text-center">
          <p className="m-0 text-[15px] font-medium text-ink-3">{t("empty.title")}</p>
          <p className="m-0 mt-2 text-[13.5px] text-ink-5">{t("empty.hint")}</p>
        </div>
      ) : (
        <ul className="mt-5 grid list-none grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 p-0">
          {results.map((d) => (
            <li
              key={d.id}
              // The record's identity and state are rendered as DATA, not only as words, so a property can
              // read what the page actually claims about a decision independently of the language it is
              // claimed in. An edition that showed a draft as active would differ here, not just in prose.
              data-decision-id={d.id}
              data-decision-type={d.type}
              data-decision-status={d.status}
              data-decision-slug={d.slug}
              className="flex flex-col rounded-cardish border border-line bg-white p-[22px] transition-shadow hover:shadow-[0_6px_20px_rgba(16,19,30,0.06)]"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-[2px] px-[8px] py-[3px] font-mono text-[10.5px] font-semibold tracking-[0.06em] ${
                    d.type === "ADR" ? "bg-bordo/10 text-bordo" : "bg-seal/12 text-seal"
                  }`}
                >
                  {d.type}
                </span>
                <span className="font-mono text-[12px] text-ink-3">{d.id}</span>
                <span className={`ml-auto rounded-[2px] border px-[8px] py-[3px] font-mono text-[10px] ${stateChipClass(d.status)}`}>
                  {decisionStateLabel(d.status, locale)}
                </span>
              </div>
              <h3 className="m-0 mb-2 text-[15px] font-semibold leading-[1.35] text-ink">
                <Link href={`/decisoes/${d.slug}`} className="no-underline hover:text-bordo">
                  {d.title}
                </Link>
              </h3>
              <p className="m-0 mb-4 text-[13px] leading-[1.55] text-ink-4">{d.summary}</p>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-ink-5">
                <span>{d.category}</span>
                <span aria-hidden="true">·</span>
                <span>{t("card.nonNormative")}</span>
              </div>
              <div className="mb-4 font-mono text-[10px] text-ink-6">{t("card.originalLanguage")}</div>
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href={`/decisoes/${d.slug}`} className="text-[13px] font-semibold text-bordo no-underline hover:underline">
                  {t("card.readFull")} <span aria-hidden="true" className="font-mono">→</span>
                </Link>
                <Link
                  href={`/banzai?doc=${encodeURIComponent(d.id)}&q=${encodeURIComponent(
                    decisionAskQuestion(d.type, d.id, locale),
                  )}`}
                  className="text-[12.5px] text-ink-4 no-underline hover:text-seal"
                >
                  {t("card.explainWithBanzai")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
