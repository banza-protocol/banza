import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeView";
import { alternatesFor } from "@/lib/i18n";

// The Portuguese home — the CANONICAL edition. Its structure is the one both editions render; see
// components/home/HomeView.tsx. This route owns only the metadata and the locale it asks for.
//
// Home SEO (§32): absolute title (overrides the layout template) + description. No claim of real
// payments, an operational financial network, active operators, integrated banks or regulatory
// authorisation.
export const metadata: Metadata = {
  title: { absolute: "BANZA — Protocolo financeiro aberto para interoperabilidade verificável" },
  description:
    "O BANZA define regras públicas, perfis versionados e mecanismos verificáveis para operadores publicarem implementações e demonstrarem conformidade e interoperabilidade.",
  // Reciprocal alternates: an hreflang pair that only one side declares is ignored, so the Portuguese
  // home must name the English edition just as /en names this one.
  alternates: alternatesFor("/"),
};

export default function HomePage() {
  return <HomeView locale="pt" />;
}
