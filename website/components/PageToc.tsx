/**
 * Lightweight in-page section index ("Nesta página"). Server component —
 * plain anchor links, no client JS. Compact and wrapping so it works on mobile
 * and desktop without competing with the sticky primary nav. The `id`s must
 * match anchors set on the page's sections (which carry scroll-mt for the
 * sticky header).
 */
export function PageToc({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="Nesta página"
      className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-cardish border border-line bg-white px-5 py-4"
    >
      <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-5">
        Nesta página
      </span>
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className="rounded-[2px] border border-line px-[10px] py-[5px] text-[12.5px] text-ink-3 no-underline transition-colors hover:border-seal hover:text-seal focus-visible:border-seal focus-visible:text-seal"
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}
