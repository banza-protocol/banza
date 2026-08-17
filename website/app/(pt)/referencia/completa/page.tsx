import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { ReferenceMarkdown } from "@/components/reference/ReferenceMarkdown";
import { ReferenceNav } from "@/components/reference/ReferenceNav";
import { getReferenceMarkdown, getReferenceOutline, getReferenceMeta } from "@/lib/reference";

// The single-page rendering of the canonical reference. Kept for compatibility:
// every in-document anchor (§ cross-references) resolves here. The chapter pages
// under /referencia/<capitulo> are the recommended reading path.

export const metadata: Metadata = {
  title: "Referência completa (página única)",
  description:
    "A referência oficial do protocolo BANZA v1.0 numa única página — todos os capítulos e âncoras internas. Pré-produção; registo público sem evidência indexada.",
  alternates: { canonical: "/referencia/completa" },
};

const TRUTH = [
  "Registo público sem evidência indexada",
  "PASS = evidência verificável e reproduzível",
  "Trust metadata pendente",
  "Federação de produção não activa",
];

export default function ReferenciaCompletaPage() {
  const markdown = getReferenceMarkdown();
  const outline = getReferenceOutline();
  const { version, data } = getReferenceMeta();

  return (
    <>
      <header className="band border-b border-bordo-deep">
        <Container width="site" className="relative z-10 py-[clamp(36px,5vw,64px)]">
          <div className="band-eyebrow mb-4">
            <Link href="/referencia" className="text-creme-mid no-underline hover:text-creme-high">
              REFERÊNCIA
            </Link>{" "}
            · PÁGINA ÚNICA
          </div>
          <h1 className="font-display max-w-[22ch] text-[clamp(26px,3.8vw,44px)] font-semibold leading-[1.08] text-creme-high">
            Referência completa
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.6] text-creme-mid">
            Todos os capítulos numa única página, com todas as âncoras internas. Para leitura
            por capítulos, use o <Link href="/referencia" className="text-creme-high underline">índice da referência</Link>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[`BANZA v${version}`, "PRÉ-PRODUÇÃO", ...(data ? [data] : [])].map((c) => (
              <span key={c} className="rounded-protocol border border-creme-chip/30 bg-white/5 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-creme-chip">
                {c}
              </span>
            ))}
          </div>
        </Container>
      </header>

      <section className="border-b border-line bg-paper-2">
        <Container width="site" className="py-5">
          <div className="flex flex-wrap gap-2">
            {TRUTH.map((t) => (
              <span key={t} className="rounded-protocol border border-pend/30 bg-tint-gold px-3 py-1.5 font-mono text-[11px] text-pend">
                {t}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-paper">
        <Container width="site" className="py-[clamp(32px,4vw,56px)]">
          <div className="grid grid-cols-1 gap-[clamp(20px,4vw,56px)] lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside>
              <ReferenceNav outline={outline} variant="full" />
            </aside>
            <article className="min-w-0 max-w-[820px]">
              <ReferenceMarkdown markdown={markdown} />
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}
