import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

// M2.7L — the former "Racional Estratégico" chapter was merged into chapter 02
// "Por Que o BANZA Existe". The Ch02 final editorial revision retired the strategic-
// rationale section itself, so this route is kept only as a permanent redirect to the
// chapter, so existing links and SEO still resolve; it is not a chapter/card of its own.
export const metadata: Metadata = {
  title: "Por Que o BANZA Existe · Referência",
  alternates: { canonical: "/referencia/porque-existe" },
};

export default function RacionalRedirect() {
  permanentRedirect("/referencia/porque-existe");
}
