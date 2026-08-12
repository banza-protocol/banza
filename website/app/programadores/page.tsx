import type { Metadata } from "next";
import { redirect } from "next/navigation";

// M2.7B — the protocol explanation is consolidated in the Referência Completa.
// This route is kept only as a redirect so existing links resolve to the
// canonical reference chapter. The home presents; the reference explains.
export const metadata: Metadata = {
  title: "Recursos para programadores",
  alternates: { canonical: "/referencia/programadores" },
};

export default function ProgramadoresRedirect() {
  redirect("/referencia/programadores");
}
