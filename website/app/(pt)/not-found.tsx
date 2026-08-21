import type { Metadata } from "next";
import { NotFoundView } from "@/components/pages/NotFoundView";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "A página que procura não existe na referência do protocolo BANZA.",
};

export default function NotFound() {
  return <NotFoundView locale="pt" />;
}
