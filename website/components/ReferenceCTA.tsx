import Link from "next/link";
import { Section, Container } from "@/components/ui";

/**
 * "O website orienta; a referência documenta."
 *
 * A consistent band that points a public entry page to its canonical reference chapter. The public
 * page is a doorway — quick orientation for a reader; the full normative and technical detail lives
 * in the reference. There must be at most ONE primary reference CTA per page (this component).
 */
export function ReferenceCTA({ slug, lead }: { slug: string; lead?: string }) {
  return (
    <Section tone="paper2">
      <Container width="read" data-reveal>
        <div className="eyebrow mb-[14px]">A REFERÊNCIA COMPLETA</div>
        <p className="mb-5 max-w-[72ch] text-[15px] leading-[1.7] text-ink-4">
          {lead ??
            "Esta página é uma porta de entrada. Para os detalhes normativos e técnicos, leia o capítulo completo da referência — o website orienta; a referência documenta."}
        </p>
        <Link href={`/referencia/${slug}`} className="btn-bordo">
          Ler capítulo completo na referência <span className="font-mono">→</span>
        </Link>
      </Container>
    </Section>
  );
}
