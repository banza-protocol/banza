import type { Metadata } from "next";
import { GlossaryView } from "@/components/GlossaryView";

// M2.19G (§26) — /glossario is the REAL owning page for the canonical, current-only glossary of the BANZA
// architecture (three layers · single BanzAI interface · read-only reference). Each term carries a short
// definition, a full definition, a technical id where one exists, the canonical page that owns it, related
// terms and a "não confundir com" line. It defines ONLY current concepts — retired framings (a central
// certifying authority, per-entity certificates, public certification levels, removed surfaces) are never
// defined here as current concepts.

export const metadata: Metadata = {
  title: "Glossário — os conceitos do BANZA, com precisão",
  description:
    "Glossário canónico e actual do BANZA: operador, implementação, validação por endpoints, rascunho, origem canónica, descoberta, camada segura de fetch, participante, perfil, capability, conformidade, interoperabilidade, certificação, admissão, autorização, evidência, confiança, revogação, registo, federação, esquema e recibo — cada termo com definição, id técnico, página canónica, termos relacionados e o que não confundir.",
  alternates: { canonical: "/glossario" },
};

export default function GlossarioPage() {
  return <GlossaryView locale="pt" />;
}
