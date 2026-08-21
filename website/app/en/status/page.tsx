import type { Metadata } from "next";
import { StatusView } from "@/components/pages/StatusView";
import { STATUS_CONTENT } from "@/components/pages/statusContent";
import { fetchBanzaiRuntimeRow } from "@/lib/runtimeStatusRow";
import { alternatesFor } from "@/lib/i18n";

// The English protocol-status page — the SAME page as the Portuguese one, realized in English.
export const metadata: Metadata = {
  title: STATUS_CONTENT.en.metaTitle,
  description: STATUS_CONTENT.en.metaDescription,
  alternates: alternatesFor("/en/status"),
};

export default async function EnStatusPage() {
  const banzaiRow = await fetchBanzaiRuntimeRow("en");
  return <StatusView locale="en" banzaiRow={banzaiRow} />;
}
