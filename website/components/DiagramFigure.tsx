import type { ReactNode } from "react";

/**
 * Premium figure wrapper for protocol diagrams (SVG). Light institutional card,
 * responsive image (no horizontal overflow), optional eyebrow/title and a
 * truth-framing note for diagrams that could otherwise be misread as production.
 */
export function DiagramFigure({
  src,
  alt,
  eyebrow,
  title,
  caption,
  note,
  maxW = 1000,
}: {
  src: string;
  alt: string;
  eyebrow?: string;
  title?: string;
  caption?: ReactNode;
  /** Truth-framing note (e.g. "modelo especificado · aguarda M2"). */
  note?: ReactNode;
  maxW?: number;
}) {
  return (
    <figure className="m-0">
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      {title && <h3 className="h-card mb-3 text-[18px]">{title}</h3>}
      <div className="overflow-hidden rounded-cardish border border-line-2 bg-white p-3 sm:p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="mx-auto block h-auto w-full"
          style={{ maxWidth: maxW }}
        />
      </div>
      {(caption || note) && (
        <figcaption className="mt-3 max-w-[80ch]">
          {caption && <span className="text-[13.5px] leading-[1.6] text-ink-4">{caption}</span>}
          {note && (
            <span className="mt-1.5 block font-mono text-[11px] leading-[1.5] text-pend">{note}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
