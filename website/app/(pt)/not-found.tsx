import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "A página que procura não existe na referência do protocolo BANZA.",
};

export default function NotFound() {
  return (
    <section className="band border-b border-bordo-deep">
      <div className="relative z-10 mx-auto flex max-w-read flex-col items-start px-[clamp(16px,4vw,40px)] py-[clamp(72px,12vw,140px)]">
        <div className="band-eyebrow mb-4">ERRO · 404</div>
        <h1 className="font-display max-w-[16ch] text-[clamp(32px,5vw,56px)] font-semibold leading-[1.05] text-creme-high">
          Esta página não consta da referência.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[clamp(15px,1.7vw,18px)] leading-[1.6] text-creme-mid">
          O endereço que procura não existe. Use o índice do protocolo para encontrar
          a secção certa — da arquitectura à conformidade e à federação.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-protocol bg-white px-[24px] py-[13px] text-[14px] font-bold text-bordo no-underline">
            Voltar ao início
          </Link>
          <Link href="/referencia/faq" className="rounded-protocol border border-white/50 px-[24px] py-[13px] text-[14px] font-semibold text-white no-underline">
            Perguntas frequentes
          </Link>
        </div>
      </div>
    </section>
  );
}
