import Link from "next/link";
import type { ReactNode } from "react";

// Shared institutional building blocks used across all content pages.

export function Container({
  children,
  width = "read",
  className = "",
}: {
  children: ReactNode;
  width?: "read" | "diagram" | "site";
  className?: string;
}) {
  const max = width === "diagram" ? "max-w-diagram" : width === "site" ? "max-w-site" : "max-w-read";
  return (
    <div className={`mx-auto w-full ${max} px-[clamp(16px,4vw,40px)] ${className}`}>{children}</div>
  );
}

export function Section({
  children,
  className = "",
  tone = "paper",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "paper2" | "card";
  id?: string;
}) {
  const bg = tone === "paper2" ? "bg-paper-2" : tone === "card" ? "bg-white" : "bg-paper";
  return (
    <section id={id} className={`section ${bg} ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow mb-3">{children}</div>;
}

/**
 * Poster-band hero for content pages — bordô band, creme text, mono eyebrow.
 * `status` chips communicate pre-production state where relevant.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  chips,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  chips?: { label: string; tone?: "neutral" | "pend" | "ok" | "neg" }[];
}) {
  return (
    <header className="band border-b border-bordo-deep">
      <Container width="site" className="relative z-10 py-[clamp(48px,7vw,96px)]">
        <div className="band-eyebrow mb-4">{eyebrow}</div>
        <h1 className="font-display max-w-[20ch] text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.05] text-creme-high">
          {title}
        </h1>
        {lede && (
          <p className="mt-5 max-w-[58ch] text-[clamp(15px,1.7vw,18px)] leading-[1.6] text-creme-mid">
            {lede}
          </p>
        )}
        {chips && chips.length > 0 && (
          <div className="mt-7 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c.label}
                className="rounded-protocol border border-creme-chip/30 bg-white/5 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-creme-chip"
              >
                {c.label}
              </span>
            ))}
          </div>
        )}
      </Container>
    </header>
  );
}

/** Inline truth callout — "PASS ≠ certificado", federation/roadmap notes. */
export function StatusNote({
  tone = "pend",
  children,
}: {
  tone?: "pend" | "neg" | "ok";
  children: ReactNode;
}) {
  const styles =
    tone === "neg"
      ? "border-bordo/30 bg-tint-bordo text-bordo-soft"
      : tone === "ok"
        ? "border-ok/30 bg-tint-green text-ok"
        : "border-pend/30 bg-tint-gold text-pend";
  return (
    <div className={`rounded-cardish border px-4 py-3 text-[13.5px] leading-[1.6] ${styles}`}>
      {children}
    </div>
  );
}

export function MoreLink({ href, children, back = false }: { href: string; children: ReactNode; back?: boolean }) {
  return (
    <Link href={href} className="link-bordo text-[13.5px]">
      {back ? (
        <>
          <span className="font-mono">←</span> {children}
        </>
      ) : (
        <>
          {children} <span className="font-mono">→</span>
        </>
      )}
    </Link>
  );
}

/** Reveal wrapper — pairs with ScrollReveal observer. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div data-reveal className={className}>
      {children}
    </div>
  );
}
