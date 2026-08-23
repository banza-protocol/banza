"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { counterpartOf, HTML_LANG, LOCALE_NAME, localeOfPath, LOCALES, type Locale } from "@/lib/i18n";

/** PT / EN switch — a segmented control.
 *
 * Two bare words beside two outlined chips and a solid CTA read as leftover text, not as something you
 * press. The switch is therefore one object: a pill with the nav's own hairline border, and the current
 * language raised to the exact treatment the navigation already gives the current section — tinted
 * ground, gold border, bordô text. Nothing new to learn; the bar already says "you are here" this way.
 *
 * Language names, never flags: a flag names a country, and neither Portuguese nor English belongs to
 * one. The current language is announced with `aria-current` rather than colour alone, and the target
 * link carries `hrefLang` so assistive technology knows the destination changes language.
 *
 * When a page has no counterpart in the other edition — the English edition is being published page by
 * page — the switch does not link to a 404 and does not silently dump the reader on the front page
 * either. It offers that edition's entry point, and says so in the accessible name.
 */

const LABEL: Record<Locale, string> = { pt: "PT", en: "EN" };
const HOME: Record<Locale, string> = { pt: "/", en: "/en" };

const ARIA_SAME: Record<Locale, (name: string) => string> = {
  pt: (n) => `Idioma actual: ${n}`,
  en: (n) => `Current language: ${n}`,
};
const ARIA_GO: Record<Locale, (name: string) => string> = {
  pt: (n) => `Ver esta página em ${n}`,
  en: (n) => `View this page in ${n}`,
};
const ARIA_HOME: Record<Locale, (name: string) => string> = {
  pt: (n) => `Esta página ainda não existe em ${n} — ir para a entrada dessa edição`,
  en: (n) => `This page is not published in ${n} yet — go to that edition's entry point`,
};

const F_MONO = "var(--font-mono), monospace";

// The resting look. The container owns the border and the radius; a segment owns only its own fill, so
// the two segments read as one control rather than as two adjacent buttons.
const SEGMENT: React.CSSProperties = {
  fontFamily: F_MONO,
  fontSize: 11.5,
  letterSpacing: "0.08em",
  fontWeight: 600,
  lineHeight: 1,
  borderRadius: 999,
  border: "1px solid transparent",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

export function LocaleSwitch({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() || "/";
  const current = localeOfPath(pathname);
  const pad = compact ? "4px 9px" : "5px 11px";

  return (
    <nav
      aria-label={current === "pt" ? "Idioma" : "Language"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        background: "#fff",
        border: "1px solid #DDD1BE",
        borderRadius: 999,
      }}
    >
      {LOCALES.map((l) => {
        const isCurrent = l === current;
        const target = counterpartOf(pathname, l);
        const href = isCurrent ? pathname : (target ?? HOME[l]);
        const name = LOCALE_NAME[l];
        const aria = isCurrent
          ? ARIA_SAME[current](name)
          : target
            ? ARIA_GO[current](name)
            : ARIA_HOME[current](name);

        if (isCurrent) {
          return (
            <span
              key={l}
              aria-current="true"
              aria-label={aria}
              className="locale-seg-item"
              style={{
                ...SEGMENT,
                padding: pad,
                color: "#8B1428",
                background: "#F7EEDD",
                borderColor: "#C8A96F",
              }}
            >
              {LABEL[l]}
            </span>
          );
        }
        return (
          <Link
            key={l}
            href={href}
            hrefLang={HTML_LANG[l]}
            aria-label={aria}
            className="locale-seg-item"
            style={{ ...SEGMENT, padding: pad, color: "#6B5F52" }}
          >
            {LABEL[l]}
          </Link>
        );
      })}
    </nav>
  );
}
