"use client";

// Programadores — the developer tools + reference area (M2.19G.1, ADR-068 § Recursos).
//
// This is the home for the isolated developer draft tool ("Validar rascunho") and the developer
// reference (Rust-first commands, well-known endpoints, questions). The paste/upload manual-input
// surfaces live ONLY here — never in the official operator-validation journey. The Repositório link
// moved out of the primary nav into this area.

import { Ico, CARD } from "@/components/banzai/banzaiUi";
import { GitHubMark } from "@/components/GitHubMark";
import { DEV_COMMANDS, DEV_ENDPOINTS, DEV_QUESTIONS, REPO_LINK } from "@/components/banzai/banzai-agent";
import { DraftValidationTool } from "@/components/banzai/DraftValidationTool";

function DevQChip({ q, onAsk }: { q: string; onAsk: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAsk(q)}
      className={`group flex w-full items-center gap-[12px] px-[16px] py-[11px] text-left transition-all hover:-translate-y-px hover:border-bordo/30 hover:shadow-[0_6px_18px_rgba(142,19,38,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${CARD}`}
    >
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-[7px] bg-tint-bordo font-mono text-[11px] text-bordo">↳</span>
      <span className="flex-1 text-[13px] text-ink-2">{q}</span>
      <Ico name="chevron" size={15} className="flex-none text-ink-5 transition-transform group-hover:translate-x-0.5 group-hover:text-bordo" />
    </button>
  );
}

export function ProgramadoresTools({ onAsk }: { onAsk: (t: string) => void }) {
  return (
    <div className="mx-auto max-w-[760px] pb-4">
      <div className="mb-6 flex items-start gap-[14px]">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[13px] border border-bordo/15 bg-gradient-to-b from-tint-bordo to-white text-bordo shadow-[0_4px_14px_rgba(142,19,38,0.08)]">
          <Ico name="terminal" size={22} sw={1.5} />
        </span>
        <div className="pt-0.5">
          <h2 className="m-0 font-serif text-[clamp(20px,2.4vw,26px)] font-semibold leading-[1.2] text-ink">Programadores</h2>
          <p className="mb-0 mt-1.5 max-w-[58ch] text-[14px] leading-[1.55] text-ink-3">Ferramentas e referência para quem implementa o protocolo. A validação oficial de operador é sempre com origem nos endpoints públicos; aqui vivem as ferramentas locais de rascunho e a referência técnica.</p>
        </div>
      </div>

      {/* Ferramentas — the isolated developer draft tool */}
      <div className="mb-3 mt-2 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">FERRAMENTAS</div>
      <DraftValidationTool />

      {/* Referência técnica */}
      <div className="mb-3 mt-8 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">COMANDOS (RUST-FIRST)</div>
      <div className={`p-[14px] ${CARD}`}>
        <div className="flex flex-col gap-[6px]">
          {DEV_COMMANDS.map((c) => (
            <code key={c} className="block break-all rounded-[7px] border border-black/[0.06] bg-[#0a0b0f] px-[11px] py-[8px] font-mono text-[11.5px] text-[#c7cad3]">{c}</code>
          ))}
        </div>
      </div>

      <div className="mb-3 mt-8 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">ENDPOINTS PÚBLICOS</div>
      <div className={`p-[14px] ${CARD}`}>
        <div className="flex flex-col gap-[5px]">
          {DEV_ENDPOINTS.map((e) => (
            <code key={e} className="font-mono text-[11.5px] text-ink-3">{e}</code>
          ))}
        </div>
      </div>

      <div className="mb-3 mt-8 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">PERGUNTAS FREQUENTES</div>
      <div className="flex flex-col gap-[8px]">
        {DEV_QUESTIONS.map((q) => (
          <DevQChip key={q} q={q} onAsk={onAsk} />
        ))}
      </div>

      <div className="mb-3 mt-8 font-mono text-[10.5px] tracking-[0.16em] text-ink-5">REPOSITÓRIO</div>
      <a
        href={REPO_LINK.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-[11px] px-[16px] py-[12px] no-underline transition-colors hover:border-bordo/30 ${CARD}`}
      >
        <GitHubMark size={16} />
        <span className="flex-1 text-[13.5px] text-ink-2">{REPO_LINK.name}</span>
        <span className="font-mono text-[10.5px] text-ink-5">abre numa nova aba</span>
        <Ico name="arrow" size={15} className="flex-none text-ink-5 transition-transform group-hover:translate-x-0.5 group-hover:text-bordo" />
      </a>
    </div>
  );
}
