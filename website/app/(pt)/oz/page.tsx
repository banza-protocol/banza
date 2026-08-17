import type { Metadata } from "next";
import Link from "next/link";
import OperadorZeroReference from "@/components/operador-zero/OperadorZeroReference";
import { workbenchDeepLinkAbsolute } from "@/lib/banzaiValidation";

// M2.19E/F — the Operador Zero standalone surface, now the PREMIUM READ-ONLY canonical reference
// implementation. Served ONLY on zero.banza.network (the middleware rewrites the subdomain `/` onto
// this internal /oz route; the apex route /operador-zero is retired, 410 Gone). It is a surface of its
// own: no BANZA global header/nav/footer (root layout suppresses SiteNav/SiteFooter for /oz). It
// carries its own shell + the read-only reference component. It EXPOSES the implementation (identity,
// manifest, capabilities, endpoints, metadata, keys, reports, evidence, certification status) and runs
// NO simulation, ledger, conformance/trust/federation execution, Evidence-Bundle construction or
// certification action. Every human-initiated validation runs in the modo de validação do BanzAI.

const APEX = "https://banza.network";
const GITHUB = "https://github.com/banza-protocol/banza/tree/main/examples/operators/zero";
const MONO = "font-[family-name:var(--font-mono)]";
const VALIDATE = workbenchDeepLinkAbsolute("operator-zero", "full");

export const metadata: Metadata = {
  title: "Operador Zero — Implementação de referência BANZA",
  description:
    "Operador Zero é a implementação pública de referência do protocolo BANZA. Expõe identidade, manifest, capabilities, endpoints, metadata, chaves, relatórios e evidência para descoberta e verificação. Ambiente de demonstração; não movimenta fundos reais; validado exclusivamente no BanzAI.",
  alternates: { canonical: "https://zero.banza.network/" },
  robots: { index: true, follow: true },
};

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Artefactos", href: "#artefactos" },
  { label: "Validar no BanzAI", href: VALIDATE },
  { label: "Referência", href: `${APEX}/referencia/operador-zero` },
  { label: "GitHub", href: GITHUB },
];

const BADGES = ["demo_only", "KZ_DEMO", "sem dinheiro real", "não PSP", "apenas leitura"];

export default function OperadorZeroStandalonePage() {
  return (
    <div style={{ background: "#0b0c10" }} className="min-h-screen">
      {/* ── Operador Zero shell — top bar (NOT the BANZA global nav) ──────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0c10]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1152px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
          <Link href="/" className="flex items-baseline gap-2 no-underline">
            <span className="text-[15px] font-semibold tracking-tight text-white">Operador Zero</span>
            <span className="hidden text-[11.5px] text-white/45 sm:inline">Implementação de referência BANZA</span>
          </Link>
          <div className={`hidden flex-wrap items-center gap-1.5 md:flex ${MONO}`}>
            {BADGES.map((b) => (
              <span key={b} className="rounded-full border border-white/15 px-2 py-[2px] text-[10px] text-white/55">{b}</span>
            ))}
          </div>
          <nav className="ml-auto flex items-center gap-3 text-[12.5px] text-white/70">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-white">{l.label}</a>
            ))}
          </nav>
        </div>
      </header>

      <noscript>
        <div style={{ background: "#0b0c10", color: "#fff", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Operador Zero</h1>
          <p>Implementação pública de referência do protocolo BANZA. O explorador de artefactos precisa de JavaScript.</p>
          <p>
            Operador Zero — implementação de referência e ambiente de demonstração. Não corresponde a um
            participante financeiro activo, não movimenta fundos reais e não possui certificação de
            produção. Esta superfície expõe o estado e os artefactos da implementação; não executa
            testes, pagamentos, conformidade ou certificação.
          </p>
          <p>
            <a href={`${APEX}/referencia/operador-zero`} style={{ color: "#fff" }}>Capítulo 9 da Referência BANZA</a>
          </p>
          <img
            src="/diagrams/protocol/operador-zero-validation-target-v2.svg"
            alt="Operador Zero como implementação de referência e alvo de validação — BanzAI inicia, os motores Rust avaliam, o Operador Zero expõe endpoints só de leitura."
            style={{ maxWidth: "100%" }}
          />
        </div>
      </noscript>

      <OperadorZeroReference />

      {/* ── Operador Zero shell — own footer (NOT the BANZA institutional footer) ──────── */}
      <footer className="border-t border-white/10 bg-[#0b0c10]">
        <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-2 px-5 py-8 text-[12px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p className={MONO}>Operador Zero · implementação de referência · demo_only · KZ_DEMO · sem dinheiro real · sem certificação de produção · validado no BanzAI.</p>
          <nav className="flex items-center gap-4 text-white/60">
            <a href={`${APEX}/`} className="hover:text-white">Protocolo BANZA</a>
            <a href={VALIDATE} className="hover:text-white">Validar no BanzAI</a>
            <a href={`${APEX}/referencia/operador-zero`} className="hover:text-white">Referência</a>
            <a href={GITHUB} className="hover:text-white">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
