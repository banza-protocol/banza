// Rendered output, not source text.
//
// Block B proved why this file has to exist. `getReferenceOutline` returned Portuguese slugs for the English
// edition, so the English sidebar linked to /en/reference/arquitectura — a 404 — while every one of the 30
// chapter URLs returned 200. The route matrix looked perfect and the navigation between those routes was
// broken. No source file contained the bad link: it was assembled at render time from outline data, so
// scanning route sources could not have found it, and did not.
//
// So each core page pair is checked twice, and neither check substitutes for the other:
//
//   SOURCE   what the page declares — metadata, canonical, alternates, the links it writes literally
//   RENDERED what a reader actually receives — every href and label after the components have run
//
// The rendered pass is built here on WHY_BANZA first and proven, before the pattern is copied to the
// remaining four pages. A harness that has never caught anything is not a harness.

import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { chapterSlugMap } from "./reference";
import { ROUTES, counterpartOf } from "./routeRegistry";

const source = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// Two Block-D pages read their state from the public machine routes at render time. Tests must not depend
// on that network — and the branch worth rendering is the honest one anyway: an unreachable route is the
// "state unconfirmed" path, which the page must never present as an empty registry. Failing every fetch
// pins exactly that branch, deterministically and instantly.
vi.stubGlobal("fetch", () => Promise.reject(new Error("offline in tests")));

/** The text a reader receives: markup removed, entities resolved, whitespace collapsed. */
function readerText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&rsquo;|&#39;/g, "'")
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Render a page component. Server components may be async, and awaiting is the only way to see them. */
async function renderPage(mod: { default: unknown }): Promise<string> {
  const out = (mod.default as () => ReactElement | Promise<ReactElement>)();
  const el = out instanceof Promise ? await out : out;
  return renderToStaticMarkup(el);
}

/** Source with comments stripped — a file may legitimately NAME a forbidden path in order to forbid it. */
const code = (p: string) =>
  source(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Every Portuguese public path a reader-facing English link must never point at. */
const PT_READER_PATHS = [
  "/referencia",
  "/porque-existe",
  "/arquitectura",
  "/certificacao",
  "/federacao",
  "/confianca",
  "/estado",
  "/operadores",
  "/glossario",
];

/** Portuguese UI words that would betray an untranslated shared component or label. */
const PT_UI_WORDS = [
  "Anterior",
  "Seguinte",
  "Capítulo",
  "Índice",
  "Voltar",
  "Referência",
  "Arquitectura",
  "Certificação",
  "Confiança",
  "Federação",
];

/**
 * The Block C page pairs. Only WHY_BANZA is implemented so far; the rest are declared here so that adding a
 * page cannot silently skip its properties — the list is the checklist.
 */
const CORE_PAGES = [
  {
    id: "WHY_BANZA",
    pt: "/porque-existe",
    en: "/en/why-banza",
    enSource: "../app/en/why-banza/page.tsx",
    ptSource: "../app/(pt)/porque-existe/page.tsx",
    implemented: true,
    enHeading: /open layer over the interoperability/i,
    // Claims the Portuguese page makes, which the translation must not quietly drop or strengthen.
    mustSay: [/complements the infrastructures in use/i, /operator-neutral/i, /reproduce that validation/i],
    mustNotSay: [],
  },
  {
    id: "FEDERATION",
    pt: "/federacao",
    en: "/en/federation",
    enSource: "../app/en/federation/page.tsx",
    ptSource: "../app/(pt)/federacao/page.tsx",
    implemented: true,
    enHeading: /Interoperate by evidence/i,
    // The qualifications the Portuguese page is careful to make. "Federation" pulls towards consensus
    // networks in English, so the restraint is what must survive translation.
    mustSay: [
      /not an automatic real-payments network/i,
      /Production federation is not active/i,
      /do not constitute regulatory approval/i,
      /technical, local, per-interaction/i,
    ],
    // Claims the page must never make. Federation is not consensus and admission does not propagate.
    mustNotSay: [
      /global consensus/i,
      /single global network/i,
      /shared global state/i,
      /without intermediaries\b(?!.{0,40}not)/i,
    ],
  },
  {
    id: "TRUST",
    pt: "/confianca",
    en: "/en/trust",
    enSource: "../app/en/trust/page.tsx",
    ptSource: "../app/(pt)/confianca/page.tsx",
    implemented: true,
    enHeading: /Trust without asking anyone for permission/i,
    mustSay: [
      /no certificate authority/i,
      /assertion about artifacts, never about a participant/i,
      /Private keys never appear/i,
      /closed by default/i,
      /does not certify any operator/i,
    ],
    // "Permissionless" and a named threshold are both absent from the Portuguese page. The first is a term
    // of art this page must not acquire; the second is accurate elsewhere but is not this page's claim, and
    // translation preserves the scope of what is left unsaid as much as what is said.
    mustNotSay: [/permissionless/i, /trustless/i, /fully decentrali[sz]ed/i, /global consensus/i, /2-of-3/i],
  },
  {
    id: "ARCHITECTURE",
    pt: "/arquitectura",
    en: "/en/architecture",
    enSource: "../app/en/architecture/page.tsx",
    ptSource: "../app/(pt)/arquitectura/page.tsx",
    implemented: true,
    enHeading: /Three layers\. One interface\./i,
    mustSay: [
      /Layer 1/i,
      /Layer 2/i,
      /Layer 3/i,
      /certifies an implementation .*never an entity/i,
      /is not a layer and not an authority/i,
      /Certifying is not admitting; admitting is not authorising/i,
      /there is no\s+propagation between layers/i,
      /BANZA is not Banzami/i,
      /real payments switched off/i,
    ],
    // The page names Banzami as designated scheme operator WITH its qualifications. Dropping them, or
    // promoting certification into admission or authorisation, are the failures that matter here.
    mustNotSay: [
      /certification grants (operational )?admission/i,
      /certification grants regulatory/i,
      /BANZA certifies (operators|companies|entities)/i,
      /BANZA operates the scheme/i,
    ],
  },
  {
    id: "CERTIFICATION",
    pt: "/certificacao",
    en: "/en/certification",
    enSource: "../app/en/certification/page.tsx",
    ptSource: "../app/(pt)/certificacao/page.tsx",
    implemented: true,
    enHeading: /An implementation is certified/i,
    // Every claim here is narrow, and narrowness is what translation erodes. These are the page's own
    // sentences, not imported protocol truths.
    mustSay: [
      /An implementation is certified, never an entity and never a brand/i,
      /attribution and contact only, never the subject/i,
      /never broader than the evidence/i,
      /Outside them, it asserts nothing/i,
      /does not constitute a financial licence, regulatory authorisation/i,
      /None implies another/i,
      /may be a prerequisite for an admission — but never produces it/i,
      /no Layer 2 transition propagates to scheme admission/i,
      /REVOKED is terminal/i,
      /never decides, certifies or changes a state or reason code/i,
    ],
    // The broader readings the page exists to prevent. "X is BANZA-certified" without scope is the exact
    // sentence that would undo it.
    mustNotSay: [
      /certification grants (operational )?admission/i,
      /certification grants regulatory/i,
      /BANZA certifies (operators|companies|entities|organisations|organizations)/i,
      /certifies an entity/i,
      /certifying authority (issues|grants)/i,
      /BANZA (controls|operates) (operators|participants|the scheme)/i,
      /BanzAI certifies/i,
    ],
  },
  // ── Block D — institutional and status surfaces ────────────────────────────────────────────────
  {
    id: "PROTOCOL_STATUS",
    pt: "/estado",
    en: "/en/status",
    enSource: "../app/en/status/page.tsx",
    ptSource: "../app/(pt)/estado/page.tsx",
    implemented: true,
    enHeading: /What is true today — and how to check it/i,
    // Lifecycle facts, stated exactly as the canonical artifact states them. The specification is
    // published and versioned; it is NOT frozen (contracts/production/protocol-version.json:
    // lifecycle_state.protocol_frozen = false), and the page keeps the machine routes as the authority
    // over its own prose.
    mustSay: [
      /not yet frozen for external implementation/i,
      /Pre-production/i,
      /production_certificates/i,
      /\/operators returns \[\]/i,
      /certifies an implementation, never an entity/i,
      /REVOKED|closed by default/i,
      /if they diverge, the route wins/i,
      /Nothing on this page constitutes regulatory approval/i,
    ],
    // A status page is where an overclaim does the most damage, so the forbidden set is the lifecycle
    // itself: frozen, released, production-ready, independently demonstrated.
    mustNotSay: [
      /specification .{0,30}is frozen/i,
      /v1\.0\.0 — frozen/i,
      /production[- ]ready/i,
      /ready for production/i,
      /independent implementation .{0,20}(demonstrated|proven)(?!.{0,20}not)/i,
      /regulatory (approval|authorisation) (granted|obtained)/i,
      /certified operators?\b/i,
      // The reference implementation implements BANZA; it does not define it. Found by mutation D3:
      // the page named Operator Zero as the canonical reference and nothing stopped that being
      // rewritten into authorship of the protocol.
      /Operator Zero defines/i,
      /normative definition of BANZA/i,
      /reference implementation is the (normative|canonical) (definition|specification)/i,
      /Operator Zero .{0,40}(certification authority|root authority|defines the protocol)/i,
    ],
  },
  {
    id: "OPERATORS",
    pt: "/operadores",
    en: "/en/operators",
    enSource: "../app/en/operators/page.tsx",
    ptSource: "../app/(pt)/operadores/page.tsx",
    implemented: true,
    enHeading: /Who takes part in the protocol/i,
    // The page is a set of role distinctions; all six roles and the entity/implementation boundary must
    // survive, because English collapses "operator" into "approved participant" without them.
    mustSay: [
      /Entity, operator, implementation — these are not the same thing/i,
      /it is not the subject of certification/i,
      /identified by content hash — never an entity and never a brand/i,
      /One operator may publish several/i,
      /Appearing in the technical registry is not being admitted to a scheme/i,
      /The operator is the responsible entity; the implementation is the technical system\s+evaluated/i,
      /it is not granted by a central authority/i,
      /Absence from the registry is not a regulatory prohibition/i,
    ],
    mustNotSay: [
      /certified operators?\b/i,
      /BANZA certifies (operators|entities|companies)/i,
      /approved operators?\b/i,
      /licen[cs]ed operators?\b/i,
      /BANZA (controls|governs|operates) (operators|participants)/i,
      /list of (approved|licen[cs]ed) /i,
    ],
  },
  {
    id: "TECHNICAL_REGISTRY",
    pt: "/registo-tecnico",
    en: "/en/technical-registry",
    enSource: "../app/en/technical-registry/page.tsx",
    ptSource: "../app/(pt)/registo-tecnico/page.tsx",
    implemented: true,
    enHeading: /Consult, search and verify — technical information, not a seal/i,
    // The registry's boundary, plus the four honest live states. An outage must never read as an empty
    // registry, which is the distinction a translation is most likely to flatten.
    mustSay: [
      /Appearing in the registry is not being admitted, and not being authorised/i,
      /strictly\s+independent of an operational scheme/i,
      /Operator ≠ implementation/i,
      /Certification ≠ admission/i,
      /Certification ≠ authorisation/i,
      /does not list licensed, approved or admitted operators/i,
      /Only CERTIFIED reads as valid/i,
      /state unconfirmed|STATE UNCONFIRMED/i,
      /never appears as a published operator/i,
    ],
    mustNotSay: [
      /registry entry grants/i,
      /grants admission/i,
      /grants (regulatory )?authorisation/i,
      /certified entity\b(?!.{0,30}(here|no))/i,
      /approved by BANZA/i,
      /membership/i,
    ],
  },
  {
    id: "GOVERNANCE_OPEN",
    pt: "/governanca",
    en: "/en/open-governance",
    enSource: "../app/en/open-governance/page.tsx",
    ptSource: "../app/(pt)/governanca/page.tsx",
    implemented: true,
    enHeading: /Public governance, today/i,
    // Open governance is a model WITH roles and a procedure. Both halves are asserted: the process
    // exists, and its authority stops well short of operating anything.
    mustSay: [
      /the active maintainers review and integrate through the public process/i,
      /original creator and initial institutional maintainer/i,
      /governed by the repository/i,
      /does not license, does not approve and does not certify\s+operators/i,
      /does not issue financial licences and does not replace regulators/i,
      /it does not create rules/i,
      /Operators implement the protocol\s+independently/i,
      /does not automatically grant trademark rights/i,
    ],
    // "Open" must not become "absent", and governing the rules must not become operating a scheme.
    mustNotSay: [
      /permissionless/i,
      /leaderless/i,
      /no authority/i,
      /without governance/i,
      // Deliberately tolerant of words between the verb and its object. Mutation D5 wrote "controls
      // participating operators" and the tighter form missed it entirely.
      /governance\s+(controls|operates|runs|directs)\b[^.]{0,60}(operators|participants|schemes)/i,
      /BANZA\s+(controls|operates|runs|directs)\b[^.]{0,60}(operators|participants)/i,
      /governance grants (admission|authorisation)/i,
      /BANZA CA\b/i,
      /certificate authority/i,
    ],
  },
] as const;

const IMPLEMENTED = CORE_PAGES.filter((p) => p.implemented);

describe("core page pairs — source level", () => {
  it("at least one pair is implemented, else this suite proves nothing", () => {
    expect(IMPLEMENTED.length).toBeGreaterThan(0);
  });

  for (const page of IMPLEMENTED) {
    it(`${page.id}: declares its own canonical and reciprocal alternates`, () => {
      const src = source(page.enSource);
      expect(src).toContain(`canonical: "${page.en}"`);
      expect(src).toContain(`"pt-PT": "${page.pt}"`);
      expect(src).toContain(`en: "${page.en}"`);
    });

    it(`${page.id}: the EN source contains no Portuguese route that HAS an English edition`, () => {
      // Registry-aware, not a fixed list: a Portuguese path is only wrong here when an English edition of
      // that route exists. Linking /glossario from an English page is correct while the glossary has no
      // English edition — and becomes wrong the moment it gains one, without this test being edited.
      const src = code(page.enSource);
      for (const pt of PT_READER_PATHS) {
        const en = counterpartOf(pt);
        if (!en) continue;
        expect(src, `${page.id} links to ${pt}, which HAS an English counterpart (${en})`).not.toContain(
          `href="${pt}"`,
        );
      }
    });

    it(`${page.id}: the registry owns the counterpart in both directions`, () => {
      expect(counterpartOf(page.pt)).toBe(page.en);
      expect(counterpartOf(page.en)).toBe(page.pt);
      const record = ROUTES.find((r) => r.id === page.id);
      expect(record, `${page.id} must be registered`).toBeDefined();
    });
  }
});

describe("core page pairs — rendered output", () => {
  for (const page of IMPLEMENTED) {
    it(`${page.id}: renders English, with no Portuguese href or label`, async () => {
      const mod = await import(/* @vite-ignore */ page.enSource.replace("../", "../"));
      const html = await renderPage(mod);

      // The page actually rendered something recognisable — otherwise every assertion below is vacuous.
      expect(html.length).toBeGreaterThan(500);
      expect(html).toMatch(page.enHeading);

      // Every href a reader could follow. This is the check that would have caught the Block B outline bug.
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length, "the page must actually link somewhere").toBeGreaterThan(0);
      for (const href of hrefs) {
        if (!href.startsWith("/")) continue; // external / anchors are locale-neutral
        // English links stay English WHEN a counterpart exists. A page not yet translated has no English
        // address, and inventing one would render a dead link — worse than an honest cross-locale one. The
        // registry decides, so this relaxes automatically as Block C lands pages, and tightens by itself.
        const enCounterpart = counterpartOf(href);
        if (href.startsWith("/en/")) continue;
        expect(
          enCounterpart,
          `${page.id} links to ${href}, which HAS an English counterpart (${enCounterpart}) and must use it`,
        ).toBeNull();
      }

      // Portuguese UI words leaking in from a shared component.
      for (const w of PT_UI_WORDS) {
        expect(html, `${page.id} renders PT label "${w}"`).not.toContain(`>${w}`);
      }
    });

    it(`${page.id}: keeps the claims the Portuguese page makes`, async () => {
      const mod = await import(/* @vite-ignore */ page.enSource);
      const html = await renderPage(mod);
      // Match the reader's TEXT, not the markup: a claim split by <strong> is still the same sentence to
      // a reader, and a regex that fails on emphasis is testing the styling rather than the statement.
      const text = readerText(html);
      for (const claim of page.mustSay) {
        expect(text, `${page.id} lost a claim: ${claim}`).toMatch(claim);
      }
      for (const forbidden of page.mustNotSay) {
        expect(text, `${page.id} made a forbidden claim: ${forbidden}`).not.toMatch(forbidden);
      }
    });

    it(`${page.id}: every rendered Reference link is a real EN chapter`, async () => {
      const mod = await import(/* @vite-ignore */ page.enSource);
      const html = await renderPage(mod);
      const known = new Set(chapterSlugMap().map((m) => `/en/reference/${m.en}`));
      known.add("/en/reference");
      known.add("/en/reference/full");
      const refLinks = [...html.matchAll(/href="(\/en\/reference[^"]*)"/g)].map((m) => m[1]);
      for (const l of refLinks) {
        expect(known.has(l), `${page.id} links to a non-existent EN chapter: ${l}`).toBe(true);
      }
    });
  }
});
