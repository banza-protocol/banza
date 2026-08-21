import Link from "next/link";
import { routeHref } from "@/lib/routeRegistry";
import { referenceChapterPath } from "@/lib/referenceSlugs";
import type { Locale } from "@/lib/i18n";

// The 404 surface — ONE structure, realized per edition.
//
// Only the Portuguese route group had a not-found page; the English one fell through to the root
// boundary, so an English reader who mistyped an address got a different page from a Portuguese one. It is
// a small surface and it is not one of the 22 registered pairs, but it is still something a reader reads,
// and "it is only the 404" is exactly the reasoning that let the homepage diverge.
//
// Portuguese is canonical. Same eyebrow, same heading, same explanation, same two recovery actions in the
// same order — home first, then the FAQ chapter — resolved inside the reader's own edition.

type NotFoundCopy = {
  eyebrow: string;
  title: string;
  body: string;
  home: string;
  faq: string;
};

const COPY: Record<Locale, NotFoundCopy> = {
  pt: {
    eyebrow: "ERRO · 404",
    title: "Esta página não consta da referência.",
    body:
      "O endereço que procura não existe. Use o índice do protocolo para encontrar a secção certa — da arquitectura à conformidade e à federação.",
    home: "Voltar ao início",
    faq: "Perguntas frequentes",
  },
  en: {
    eyebrow: "ERROR · 404",
    title: "This page is not part of the Reference.",
    body:
      "The address you are looking for does not exist. Use the protocol index to find the right section — from architecture to conformance and federation.",
    home: "Back to the start",
    faq: "Frequently asked questions",
  },
};

export function NotFoundView({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const faq = referenceChapterPath(15, locale) ?? routeHref("REFERENCE", locale);
  return (
    <section className="band border-b border-bordo-deep" aria-labelledby="notfound-title">
      <div className="relative z-10 mx-auto flex max-w-read flex-col items-start px-[clamp(16px,4vw,40px)] py-[clamp(72px,12vw,140px)]">
        <div className="band-eyebrow mb-4">{c.eyebrow}</div>
        <h1
          id="notfound-title"
          className="font-display max-w-[16ch] text-[clamp(32px,5vw,56px)] font-semibold leading-[1.05] text-creme-high"
        >
          {c.title}
        </h1>
        <p className="mt-5 max-w-[52ch] text-[clamp(15px,1.7vw,18px)] leading-[1.6] text-creme-mid">{c.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={routeHref("HOME", locale)}
            className="rounded-protocol bg-white px-[24px] py-[13px] text-[14px] font-bold text-bordo no-underline"
          >
            {c.home}
          </Link>
          <Link
            href={faq}
            className="rounded-protocol border border-white/50 px-[24px] py-[13px] text-[14px] font-semibold text-white no-underline"
          >
            {c.faq}
          </Link>
        </div>
      </div>
    </section>
  );
}

export const NOT_FOUND_COPY = COPY;
