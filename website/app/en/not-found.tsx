import type { Metadata } from "next";
import { NotFoundView } from "@/components/pages/NotFoundView";

// The English route group had no not-found page of its own, so an English reader who mistyped an address
// fell through to the Portuguese one. Same view, realized in English.
export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist in the BANZA protocol Reference.",
};

export default function NotFound() {
  return <NotFoundView locale="en" />;
}
