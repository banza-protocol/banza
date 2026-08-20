import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeView";
import { alternatesFor } from "@/lib/i18n";

// The English home — the SAME page as the Portuguese one, realized in English.
//
// It used to be an independently authored page: a different hero, a different composition, a different
// information architecture. A reader moving between `/` and `/en` met what looked like two different
// products. That page is gone. Portuguese is the canonical structure; this route asks for the same view
// in the other edition, and the only thing that differs is the words.
export const metadata: Metadata = {
  title: { absolute: "BANZA — Open financial protocol for verifiable interoperability" },
  description:
    "BANZA defines public rules, versioned profiles and verifiable mechanisms for operators to publish implementations and demonstrate conformance and interoperability.",
  alternates: alternatesFor("/en"),
};

export default function EnglishHomePage() {
  return <HomeView locale="en" />;
}
