import type { Metadata } from "next";
import { redirect } from "next/navigation";

// M2.7B — the protocol explanation is consolidated in the Referência Completa.
// This route is kept only as a redirect so existing links resolve to the
// canonical reference chapter. The home presents; the reference explains.
export const metadata: Metadata = {
  title: "Governação",
  alternates: { canonical: "/referencia/governacao" },
};

export default function GovernacaoRedirect() {
  redirect("/referencia/governacao");
}
