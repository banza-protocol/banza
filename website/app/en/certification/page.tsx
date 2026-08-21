import type { Metadata } from "next";
import { CertificationView } from "@/components/pages/CertificationView";
import { CERTIFICATION_CONTENT } from "@/components/pages/certificationContent";
import { alternatesFor } from "@/lib/i18n";

// The English certification page — the SAME page as the Portuguese one, realized in English. It used to
// offer five onward destinations where Portuguese offered seven.
export const metadata: Metadata = {
  title: CERTIFICATION_CONTENT.en.metaTitle,
  description: CERTIFICATION_CONTENT.en.metaDescription,
  alternates: alternatesFor("/en/certification"),
};

export default function EnCertificationPage() {
  return <CertificationView locale="en" />;
}
