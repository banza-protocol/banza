import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

// Chapter 05 was renamed "PostgreSQL — Estado Protocolar" → "Estado Protocolar". The identity audit
// confirmed PostgreSQL is the reference implementation's chosen persistence, not a normative part of the
// protocol (the ADR-013 data boundary — protocol state, not financial value — stays, described as the
// reference deployment's mechanism). The slug moved postgresql → estado-protocolar; this route is kept as
// a permanent redirect so existing links and SEO still resolve.
export const metadata: Metadata = {
  title: "Estado Protocolar · Referência",
  alternates: { canonical: "/referencia/estado-protocolar" },
};

export default function PostgresqlRedirect() {
  permanentRedirect("/referencia/estado-protocolar");
}
