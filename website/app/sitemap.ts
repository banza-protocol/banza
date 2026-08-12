import type { MetadataRoute } from "next";
import { getReferenceChapters } from "@/lib/reference";

const SITE = "https://banza.network";

// Only canonical, real content surfaces are listed here; redirect aliases
// (e.g. /conformidade, /governacao, /faq, /programadores, /referencia/racional) are
// deliberately excluded. The reference chapters are appended below. The single
// canonical introductory definition of BANZA is the reference chapter
// /referencia/o-que-e (appended below via getReferenceChapters); the standalone
// /o-que-e route was removed (M2.19G.2) and is deliberately absent here. The
// remaining editorial entry pages (/porque-existe, /arquitectura, /confianca,
// /federacao) introduce a concept and link into the canonical reference chapter.
const ROUTES = [
  "",
  "/porque-existe",
  "/arquitectura",
  "/operadores",
  "/registo-tecnico",
  "/certificacao",
  "/glossario",
  "/confianca",
  "/federacao",
  "/banzai",
  "/estado",
  "/governanca",
  "/decisoes",
  "/licenca",
  "/referencia",
  "/whitepaper",
  "/whitepaper/en",
  "/whitepaper/pt",
  "/whitepaper/versions",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const referenceRoutes = [
    "/referencia/completa",
    ...getReferenceChapters().map((c) => `/referencia/${c.slug}`),
  ];
  return [...ROUTES, ...referenceRoutes].map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path.startsWith("/referencia/") ? 0.6 : 0.7,
  }));
}
