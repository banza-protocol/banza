import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ROUTES, counterpartOf, pathFor } from "./routeRegistry";
import { REFERENCE_CHAPTER_SLUGS } from "./referenceSlugs";

/**
 * WHAT THE READER RECEIVES — the full site shell, not the page body.
 *
 * `corePageParity.test.ts` renders `mod.default()`: the page component and nothing around it. That is a
 * real property and it stays, but it is structurally blind to everything the layout contributes, which is
 * how five English pages shipped carrying an entirely Portuguese navigation and footer — including the
 * English architecture and trust pages, whose own bodies link correctly. A guard that renders only the
 * page cannot observe the frame around the page, so the frame was never observed at all until a container
 * rendered the whole document.
 *
 * This harness closes that gap at the highest boundary that renders without a Next.js server: `SiteShell`,
 * the composition both root layouts use — skip link, SiteNav, <main>, SiteFooter. Only `<html>` is missing,
 * and `<html>` contributes no reader-facing links or labels. Full-framework rendering remains proven by the
 * container QA; this is what makes the property merge-blocking in the test suite.
 *
 * `next/navigation` is mocked because SiteNav and SiteFooterGate are client components that read the
 * current pathname. That is the smallest reliable seam: no fake Next runtime, and the components under
 * test are the real ones.
 */

const pathname = { current: "/en" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const { SiteShell } = await import("@/components/SiteShell");

/** A child that is unmistakably the page, so "the page rendered" is never confused with "the shell did". */
const STUB_PAGE = createElement("h1", null, "PAGE-BODY-MARKER");

function renderShell(path: string, child: ReactElement = STUB_PAGE): string {
  pathname.current = path;
  // JSX rather than createElement: `children` must be a real child (ESLint react/no-children-prop) and
  // SiteShell's props require it (TypeScript). JSX is the one form that satisfies both.
  return renderToStaticMarkup(
    <SiteShell locale={path === "/en" || path.startsWith("/en/") ? "en" : "pt"} jsonLd={{}}>
      {child}
    </SiteShell>,
  );
}

/** Every anchor tag in the rendered markup, in document order. */
function anchorTags(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
}

function hrefOf(tag: string): string | null {
  return tag.match(/href="([^"]*)"/)?.[1] ?? null;
}

/**
 * A link that DECLARES its destination's language is announcing a deliberate cross-language jump — that is
 * the language switch doing its job, and the announcement is the difference between it and a stale link.
 * Chrome that merely pointed at the wrong edition never carried `hreflang`; it just pointed.
 */
function declaresForeignLanguage(tag: string): boolean {
  return /hreflang=/i.test(tag);
}

/** The chrome is everything OUTSIDE <main> — what the layout contributes, isolated from page content. */
function chromeOnly(html: string): string {
  const open = html.indexOf('<main id="conteudo">');
  const close = html.lastIndexOf("</main>");
  expect(open, "shell rendered no <main> landmark").toBeGreaterThan(-1);
  expect(close, "shell rendered no closing </main>").toBeGreaterThan(open);
  return html.slice(0, open) + html.slice(close);
}

const EN_CORE = [
  { id: "WHY_BANZA", path: "/en/why-banza", mod: () => import("@/app/en/why-banza/page") },
  { id: "FEDERATION", path: "/en/federation", mod: () => import("@/app/en/federation/page") },
  { id: "TRUST", path: "/en/trust", mod: () => import("@/app/en/trust/page") },
  { id: "ARCHITECTURE", path: "/en/architecture", mod: () => import("@/app/en/architecture/page") },
  { id: "CERTIFICATION", path: "/en/certification", mod: () => import("@/app/en/certification/page") },
] as const;

beforeEach(() => {
  pathname.current = "/en";
});

// ── §14 NON-VACUITY ───────────────────────────────────────────────────────────────────────────────
// Before any locale assertion, prove the harness renders the things it claims to inspect. Without this,
// a shell that silently stopped rendering its nav and footer would make every property below pass.

describe("full shell — non-vacuity", () => {
  it("renders the navigation landmark, the page body and the footer, all three", () => {
    const html = renderShell("/en");
    expect(html, "SiteNav did not render").toContain('aria-label="Main navigation"');
    expect(html, "the page child did not render").toContain("PAGE-BODY-MARKER");
    expect(html, "SiteFooter did not render").toContain(
      "BanzAI does not certify, does not approve operators and does not move funds.",
    );
  });

  it("a page body on its own does NOT satisfy the shell property", () => {
    // The exact blind spot this file exists to close: page-only markup must fail the shell check.
    const pageOnly = renderToStaticMarkup(STUB_PAGE);
    expect(pageOnly).toContain("PAGE-BODY-MARKER");
    expect(pageOnly).not.toContain('aria-label="Main navigation"');
    expect(pageOnly).not.toContain("does not move funds");
  });

  it("renders a substantial number of chrome links, not an empty frame", () => {
    const chrome = chromeOnly(renderShell("/en"));
    // 3 nav + 12 footer + brand/home + locale switch + bottom bar. A collapsed structure would be far fewer.
    expect(anchorTags(chrome).length).toBeGreaterThanOrEqual(15);
  });

  it("the Portuguese shell renders its own chrome too", () => {
    const html = renderShell("/");
    expect(html).toContain('aria-label="Navegação principal"');
    expect(html).toContain("O BanzAI não certifica, não aprova operadores e não movimenta fundos.");
  });
});

// ── §15 / §16 RENDERED LOCALE PROPERTY ────────────────────────────────────────────────────────────

/** Registry-aware: a PT href in an EN shell is a defect only when that route HAS an English edition. */
function localeLeaks(chrome: string): { href: string; expected: string }[] {
  const leaks: { href: string; expected: string }[] = [];
  for (const tag of anchorTags(chrome)) {
    if (declaresForeignLanguage(tag)) continue;
    const href = hrefOf(tag);
    if (!href || !href.startsWith("/") || href.startsWith("/en/") || href === "/en") continue;
    const en = counterpartOf(href);
    if (en) leaks.push({ href, expected: en });
  }
  return leaks;
}

describe("full shell — English chrome resolves implemented English counterparts", () => {
  it("the English home carries no stale Portuguese chrome link", () => {
    const leaks = localeLeaks(chromeOnly(renderShell("/en")));
    expect(
      leaks,
      `EN shell chrome links at Portuguese routes whose English editions exist: ${JSON.stringify(leaks)}`,
    ).toEqual([]);
  });

  // §16 — the exact class that escaped, pinned by rendered href and not by source text.
  it("ARCHITECTURE resolves to /en/architecture, never /arquitectura", () => {
    const chrome = chromeOnly(renderShell("/en"));
    expect(chrome).toContain('href="/en/architecture"');
    expect(chrome, "the footer still links at the Portuguese architecture page").not.toContain(
      'href="/arquitectura"',
    );
  });

  it("TRUST resolves to /en/trust, never /confianca", () => {
    const chrome = chromeOnly(renderShell("/en"));
    expect(chrome).toContain('href="/en/trust"');
    expect(chrome, "the footer still links at the Portuguese trust page").not.toContain('href="/confianca"');
  });

  it("Reference destinations resolve to the English Reference, never /referencia", () => {
    const chrome = chromeOnly(renderShell("/en"));
    expect(chrome).toContain('href="/en/reference"');
    // Chapter slugs are different words per edition; prefixing would invent a 404.
    expect(chrome).toContain('href="/en/reference/what-banza-is"');
    expect(chrome).toContain('href="/en/reference/developer-resources"');
    expect(chrome).not.toContain('href="/referencia"');
    expect(chrome).not.toContain('href="/en/reference/o-que-e"');
    expect(chrome).not.toContain('href="/en/reference/programadores"');
  });

  it("routes with NO English edition keep their canonical Portuguese path — no invented /en URLs", () => {
    const chrome = chromeOnly(renderShell("/en"));
    // BanzAI and the decisions record are not translated yet; the registry says so, and the chrome obeys.
    // The Technical Registry used to be listed here, and the licence has now followed it out — each gained
    // an English edition and the chrome tracked it without this assertion needing to know, which is the
    // property. What stays here is only what genuinely has no English edition.
    expect(pathFor("BANZAI", "en")).toBeNull();
    expect(pathFor("DECISIONS", "en")).toBeNull();
    expect(chrome).toContain('href="/banzai"');
    expect(chrome).toContain('href="/decisoes"');
    expect(chrome).not.toContain('href="/en/banzai"');
    expect(chrome).not.toContain('href="/en/decisoes"');
    // Routes that DO have an English edition resolve to it in the English chrome.
    expect(pathFor("TECHNICAL_REGISTRY", "en")).toBe("/en/technical-registry");
    expect(chrome).toContain('href="/en/technical-registry"');
    expect(pathFor("LICENSE", "en")).toBe("/en/license");
    expect(pathFor("GLOSSARY", "en")).toBe("/en/glossary");
    expect(pathFor("WHITEPAPER", "en")).toBe("/en/whitepaper");
    expect(pathFor("WHITEPAPER_VERSIONS", "en")).toBe("/en/whitepaper/versions");
  });

  // §17 — the defect was in shared chrome, so one page proves nothing about the other four.
  for (const page of EN_CORE) {
    it(`${page.id} — full shell is locale-correct around the real page`, async () => {
      const mod = await page.mod();
      const html = renderShell(page.path, (mod.default as () => ReactElement)());
      expect(html, "nav missing").toContain('aria-label="Main navigation"');
      expect(html, "footer missing").toContain("does not move funds");
      const leaks = localeLeaks(chromeOnly(html));
      expect(leaks, `${page.id} chrome leaks: ${JSON.stringify(leaks)}`).toEqual([]);
    });
  }

  // §18 — nested navigation: the page-local ReferenceNav was correct while the global chrome was not.
  it("an English Reference chapter gets English global chrome", () => {
    const chapter = REFERENCE_CHAPTER_SLUGS.find((c) => c.pt === "governacao")!;
    const chrome = chromeOnly(renderShell(`/en/reference/${chapter.en}`));
    expect(chapter.en).toBe("governance");
    expect(localeLeaks(chrome)).toEqual([]);
    expect(chrome).toContain('href="/en/architecture"');
    expect(chrome).not.toContain('href="/en/reference/governacao"');
  });

  // §19 — the guard is not scoped to Block C pages; the same components serve every English route.
  it("the English home page body renders inside an English shell", async () => {
    const mod = await import("@/app/en/page");
    const html = renderShell("/en", (mod.default as () => ReactElement)());
    expect(localeLeaks(chromeOnly(html))).toEqual([]);
  });
});

// ── §5 PORTUGUESE CHROME IS UNCHANGED ─────────────────────────────────────────────────────────────

describe("full shell — Portuguese chrome keeps Portuguese routes", () => {
  it("the PT shell links at PT routes and never leaks into /en", () => {
    const chrome = chromeOnly(renderShell("/"));
    expect(chrome).toContain('href="/arquitectura"');
    expect(chrome).toContain('href="/confianca"');
    expect(chrome).toContain('href="/referencia"');
    expect(chrome).toContain('href="/referencia/o-que-e"');
    expect(chrome).toContain('href="/referencia/programadores"');
    expect(chrome).not.toContain('href="/en/architecture"');
    expect(chrome).not.toContain('href="/en/trust"');
    // The language switch is the one chrome control that must offer the other edition.
    expect(chrome).toContain('hrefLang="en"');
  });
});

// ── §21 LABEL LEAK ────────────────────────────────────────────────────────────────────────────────
// Rendered with a stub page, so anything Portuguese found here is chrome by construction.

describe("full shell — English chrome speaks English", () => {
  const PT_CHROME_STRINGS = [
    "Registo técnico",
    "Ler a referência",
    "Implementar e validar",
    "Governança",
    "Decisões",
    "Licença",
    "Segurança",
    "Programadores",
    "O que é o BANZA",
    "Referência",
    "PROTOCOLO",
    "abre numa nova aba",
    "Abrir menu",
    "Saltar para o conteúdo",
    "Navegação principal",
    "não movimenta fundos",
  ];

  it("renders no Portuguese chrome label, including screen-reader-only text", () => {
    const chrome = chromeOnly(renderShell("/en"));
    for (const s of PT_CHROME_STRINGS) {
      expect(chrome, `English chrome renders the Portuguese string "${s}"`).not.toContain(s);
    }
  });

  it("renders the expected English chrome labels", () => {
    const chrome = chromeOnly(renderShell("/en"));
    for (const s of [
      "Technical registry",
      "Read the Reference",
      "Protocol",
      "Implement and validate",
      "Governance",
      "Decisions",
      "Licence",
      "Security",
      "Developers",
      "What BANZA is",
      "Operator Zero",
      "opens in a new tab",
      "Skip to content",
      "PROTOCOL",
    ]) {
      expect(chrome, `English chrome is missing "${s}"`).toContain(s);
    }
  });

  it("the Portuguese shell keeps its Portuguese labels", () => {
    const chrome = chromeOnly(renderShell("/"));
    for (const s of ["Registo técnico", "Ler a referência", "Implementar e validar", "Governança", "PROTOCOLO"]) {
      expect(chrome).toContain(s);
    }
    expect(chrome).not.toContain("Read the Reference");
  });
});

// ── THE LANGUAGE SWITCH ───────────────────────────────────────────────────────────────────────────
// The chrome control whose entire job is locale, and which was pointing at the wrong place on every
// English core page: it offered the front page and said the current page had no Portuguese edition.

describe("full shell — the language switch offers the real counterpart", () => {
  for (const page of EN_CORE) {
    it(`${page.id} — the switch links at its Portuguese source, not the front page`, () => {
      const pt = ROUTES.find((r) => r.id === page.id)!.pt;
      const chrome = chromeOnly(renderShell(page.path));
      expect(chrome, `${page.id} switch should offer ${pt}`).toContain(`href="${pt}"`);
      expect(chrome).toContain('hrefLang="pt-PT"');
    });
  }

  it("a Portuguese core page offers its English edition", () => {
    const chrome = chromeOnly(renderShell("/arquitectura"));
    expect(chrome).toContain('href="/en/architecture"');
    expect(chrome).toContain('hrefLang="en"');
  });
});
