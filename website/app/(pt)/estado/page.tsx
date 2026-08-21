import type { Metadata } from "next";
import { StatusView } from "@/components/pages/StatusView";
import { STATUS_CONTENT } from "@/components/pages/statusContent";
import { fetchBanzaiRuntimeRow } from "@/lib/runtimeStatusRow";
import { alternatesFor } from "@/lib/i18n";

// The Portuguese protocol-status page — the canonical structure. See components/pages/StatusView.tsx.
export const metadata: Metadata = {
  title: STATUS_CONTENT.pt.metaTitle,
  description: STATUS_CONTENT.pt.metaDescription,
  alternates: alternatesFor("/estado"),
};

export default async function EstadoPage() {
  const banzaiRow = await fetchBanzaiRuntimeRow("pt");
  return <StatusView locale="pt" banzaiRow={banzaiRow} />;
}
