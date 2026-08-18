"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OutlineChapter } from "@/lib/reference";

// Smart reference index. Scrollspy (IntersectionObserver) highlights the chapter
// and subsection currently in view, expands "Nesta secção" for the active chapter,
// tracks a subtle reading-progress bar, filters by chapter/subsection, and offers
// a mobile disclosure. SSR-safe: active state starts null (server === first client
// render); everything reactive runs in effects after mount.
//
// variant "full"    → /referencia/completa: chapter anchors (#id) + subsections.
// variant "chapter" → /referencia/<slug>:   subsections of the current chapter,
//                      plus a switcher to the other chapter pages.

type Props = {
  outline: OutlineChapter[];
  variant: "full" | "chapter";
  chapterSlug?: string;
};

/** Ordered heading ids to observe, plus lookup maps. */
function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visible = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (ids.length === 0) return;
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    if (els.length === 0) return;

    const order = new Map(els.map((el, i) => [el.id, i] as const));

    const pickActive = () => {
      if (visible.current.size === 0) return;
      let best: string | null = null;
      let bestOrder = Infinity;
      for (const id of visible.current) {
        const o = order.get(id) ?? Infinity;
        if (o < bestOrder) {
          bestOrder = o;
          best = id;
        }
      }
      if (best) setActiveId(best);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.current.add(e.target.id);
          else visible.current.delete(e.target.id);
        }
        pickActive();
      },
      // Trigger band: below the sticky header (~84px), active until a heading
      // leaves the top third of the viewport. Keeps the last active heading while
      // scrolling through long prose (empty visible set → no change).
      { rootMargin: "-84px 0px -66% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));

    // Seed from the initial hash (deep link) or the first heading.
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (hash && order.has(hash)) setActiveId(hash);
    else setActiveId(els[0].id);

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  return activeId;
}

/** Subtle document reading-progress ratio [0,1], rAF-throttled. */
function useReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return progress;
}

/**
 * Locale-supplied strings and paths.
 *
 * This component used to build `/referencia/<slug>` itself and label the list "CAPÍTULOS". Rendered inside
 * an English page that produced a Portuguese sidebar linking into the Portuguese Reference — a locale leak
 * in shared structure, which is the hardest kind to notice because the page around it is correct.
 *
 * The structure is genuinely shared; only the words and the addresses differ, so those are passed in. A
 * base STRING rather than an href function: this is a Client Component, and a function prop cannot cross
 * that boundary — the production build rejects it. The defaults keep every Portuguese call site unchanged.
 */
export function ReferenceNav({
  outline,
  variant,
  chapterSlug,
  chapterBase = "/referencia",
  chaptersLabel = "CAPÍTULOS",
}: Props & { chapterBase?: string; chaptersLabel?: string }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const currentChapter =
    variant === "chapter" ? outline.find((c) => c.slug === chapterSlug) ?? null : null;

  // Heading ids to observe. Full: every chapter anchor + every subsection.
  // Chapter: the subsections rendered on this page.
  const observeIds = useMemo(() => {
    if (variant === "chapter") return currentChapter?.sections.map((s) => s.id) ?? [];
    const ids: string[] = [];
    for (const c of outline) {
      ids.push(c.anchorId);
      for (const s of c.sections) ids.push(s.id);
    }
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline, variant, chapterSlug]);

  const activeId = useScrollSpy(observeIds);
  const progress = useReadingProgress();

  // Map the active heading id back to its chapter (full variant).
  const activeChapterId = useMemo(() => {
    if (!activeId) return null;
    for (const c of outline) {
      if (c.anchorId === activeId) return c.anchorId;
      if (c.sections.some((s) => s.id === activeId)) return c.anchorId;
    }
    return null;
  }, [activeId, outline]);

  const closeMobile = useCallback(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, []);

  // ── Full-reference index (chapter list with in-place active subsections) ────
  const fullBody = (
    <>
      {(() => {
        const visibleChapters = outline
          .map((c) => {
            const chapterMatch = query ? c.shortTitle.toLowerCase().includes(query) : true;
            const matchedSections = query
              ? c.sections.filter((s) => s.title.toLowerCase().includes(query))
              : c.sections;
            const show = query ? chapterMatch || matchedSections.length > 0 : true;
            return { c, chapterMatch, matchedSections, show };
          })
          .filter((x) => x.show);

        if (visibleChapters.length === 0) {
          return (
            <p className="px-2 py-2 text-[13px] text-ink-5">Nenhuma secção encontrada.</p>
          );
        }

        return (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {visibleChapters.map(({ c, chapterMatch, matchedSections }) => {
              const isActive = activeChapterId === c.anchorId;
              // Which subsections to reveal: when filtering, the matches; otherwise
              // only the active chapter's ("Nesta secção").
              const revealSections = query
                ? chapterMatch
                  ? c.sections
                  : matchedSections
                : isActive
                  ? c.sections
                  : [];
              return (
                <li key={c.anchorId}>
                  <a
                    href={`#${c.anchorId}`}
                    aria-current={isActive ? "location" : undefined}
                    onClick={closeMobile}
                    className={`flex items-baseline gap-1.5 rounded-protocol border-l-2 py-1.5 pl-2.5 pr-2 text-[13px] leading-snug no-underline transition-colors ${
                      isActive
                        ? "border-bordo bg-tint-bordo font-semibold text-bordo"
                        : "border-transparent text-ink-3 hover:bg-paper-2 hover:text-bordo"
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] ${isActive ? "text-bordo" : "text-ink-5"}`}
                    >
                      {String(c.num).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">{c.shortTitle}</span>
                  </a>
                  {revealSections.length > 0 && (
                    <ul className="m-0 mb-1 mt-0.5 flex list-none flex-col gap-px border-l border-line-3 pl-3 pt-0.5">
                      {revealSections.map((s) => {
                        const sActive = activeId === s.id;
                        return (
                          <li key={s.id}>
                            <a
                              href={`#${s.id}`}
                              aria-current={sActive ? "location" : undefined}
                              onClick={closeMobile}
                              className={`block rounded-protocol py-1 pl-2 pr-1 text-[12px] leading-snug no-underline transition-colors ${
                                sActive
                                  ? "font-medium text-bordo"
                                  : "text-ink-4 hover:text-bordo"
                              }`}
                            >
                              {s.title}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        );
      })()}
    </>
  );

  // ── Chapter page: "Nesta página" subsections + switcher to other chapters ───
  const chapterBody = (
    <>
      {currentChapter && currentChapter.sections.length > 0 && (
        <>
          <div className="mb-2 mt-1 font-mono text-[10px] tracking-eyebrow text-ink-5">
            NESTA PÁGINA
          </div>
          <ul className="m-0 mb-5 flex list-none flex-col gap-px border-l border-line-3 p-0 pl-2.5">
            {currentChapter.sections
              .filter((s) => (query ? s.title.toLowerCase().includes(query) : true))
              .map((s) => {
                const sActive = activeId === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-current={sActive ? "location" : undefined}
                      onClick={closeMobile}
                      className={`block rounded-protocol py-1 pl-2 pr-1 text-[12.5px] leading-snug no-underline transition-colors ${
                        sActive ? "font-medium text-bordo" : "text-ink-3 hover:text-bordo"
                      }`}
                    >
                      {s.title}
                    </a>
                  </li>
                );
              })}
          </ul>
        </>
      )}
      <div className="mb-2 font-mono text-[10px] tracking-eyebrow text-ink-5">{chaptersLabel}</div>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {outline
          .filter((c) => (query ? c.shortTitle.toLowerCase().includes(query) : true))
          .map((c) => {
            const isCurrent = c.slug === chapterSlug;
            return (
              <li key={c.slug}>
                <a
                  href={`${chapterBase}/${c.slug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={closeMobile}
                  className={`flex items-baseline gap-1.5 rounded-protocol border-l-2 py-1.5 pl-2.5 pr-2 text-[13px] leading-snug no-underline transition-colors ${
                    isCurrent
                      ? "border-bordo bg-tint-bordo font-semibold text-bordo"
                      : "border-transparent text-ink-3 hover:bg-paper-2 hover:text-bordo"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] ${isCurrent ? "text-bordo" : "text-ink-5"}`}
                  >
                    {String(c.num).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">{c.shortTitle}</span>
                </a>
              </li>
            );
          })}
      </ul>
    </>
  );

  const heading =
    variant === "chapter" && currentChapter ? (
      <div className="mb-3">
        <div className="font-mono text-[10px] tracking-eyebrow text-bordo">
          CAPÍTULO {String(currentChapter.num).padStart(2, "0")}
        </div>
        <div className="mt-0.5 text-[15px] font-semibold leading-tight text-ink">
          {currentChapter.shortTitle}
        </div>
      </div>
    ) : (
      <div className="mb-3 font-mono text-[10px] tracking-eyebrow text-ink-5">ÍNDICE</div>
    );

  const filter = (
    <input
      type="search"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="Filtrar secções…"
      aria-label="Filtrar secções da referência"
      className="mb-3 w-full rounded-protocol border border-line-3 bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-5 focus-visible:border-bordo"
    />
  );

  const progressBar = (
    <div
      className="mb-3 h-[3px] w-full overflow-hidden rounded-full bg-line-3"
      role="progressbar"
      aria-label="Progresso de leitura"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <div
        className="h-full rounded-full bg-bordo/70 transition-[width] duration-150 ease-out"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );

  const body = variant === "chapter" ? chapterBody : fullBody;

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <nav
        aria-label="Índice da referência"
        className="hidden lg:block lg:sticky lg:top-[84px]"
      >
        {heading}
        {progressBar}
        {filter}
        <div className="max-h-[70vh] overflow-y-auto pr-1">{body}</div>
      </nav>

      {/* Mobile: disclosure */}
      <details ref={detailsRef} className="group lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-cardish border border-line bg-white px-4 py-3 text-[13.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-eyebrow text-bordo">ÍNDICE</span>
            {variant === "chapter" && currentChapter && (
              <span className="text-ink-4">
                · {String(currentChapter.num).padStart(2, "0")} {currentChapter.shortTitle}
              </span>
            )}
          </span>
          <span className="font-mono text-[13px] text-ink-4 transition-transform group-open:rotate-90">
            →
          </span>
        </summary>
        <div className="mt-2 rounded-cardish border border-line bg-white p-4">
          {progressBar}
          {filter}
          {body}
        </div>
      </details>
    </>
  );
}
