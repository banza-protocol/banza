import type { Metadata } from "next";
import { CertificationView } from "@/components/pages/CertificationView";
import { CERTIFICATION_CONTENT } from "@/components/pages/certificationContent";
import { alternatesFor } from "@/lib/i18n";

// The Portuguese certification page — the canonical structure. See CertificationView.
export const metadata: Metadata = {
  title: CERTIFICATION_CONTENT.pt.metaTitle,
  description: CERTIFICATION_CONTENT.pt.metaDescription,
  alternates: alternatesFor("/certificacao"),
};

export default function CertificacaoPage() {
  return <CertificationView locale="pt" />;
}
