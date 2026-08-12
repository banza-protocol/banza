"use client";

import { useEffect, useState } from "react";

// Five specified moments of federation — illustrative example (Operador A/B,
// Ana/Bento). This depicts protocol-specified behaviour, not a live production
// network. Auto-advances every 4.2s; pauses on interaction and under reduced-motion.
const STEPS = [
  { title: "Confiança", desc: "O Operador A corre localmente a Open Trust Evaluation sobre o material que o Operador B publica — manifest, signed protocol metadata e conformance evidence verificados contra a trust root, ausência da revocation list. A confiança é bidirecional: o B também verifica o A." },
  { title: "Encaminhamento", desc: "O Operador A envia um pedido de encaminhamento assinado com a sua chave privada, incluindo o trace_id que será partilhado por todos os artefactos de pagamento em ambos os operadores." },
  { title: "Aceitação", desc: "Quando o Operador B aceita, a execução é simultânea: a carteira do Bento é creditada nesse instante exacto. Aceitação e execução não são duas etapas separadas." },
  { title: "Obrigação", desc: "Atomicamente, o Operador A debita a carteira da Ana e regista uma obrigação assinada e irrevogável: “O Operador A deve 2.000 AOA ao Operador B”." },
  { title: "Liquidação", desc: "As obrigações acumulam ao longo de um ciclo de compensação (tipicamente 24h). No final, a posição líquida é liquidada com uma única transferência bancária por ciclo." },
];

const CHANNEL = ["avalia evidência", "pedido assinado", "aceite · creditado", "obrigação registada", "compensação bilateral"];

export function FederacaoStepper() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !playing) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 4200);
    return () => clearInterval(t);
  }, [playing]);

  const pick = (n: number) => {
    setStep(n);
    setPlaying(false);
  };

  const i = step;
  const bCredited = i >= 2;
  const aDebited = i >= 3;
  const aBorder = i === 1 || i === 3 ? "border-bordo/50" : "border-black/10";
  const bBorder = i === 0 || i === 2 ? "border-ok/50" : "border-black/10";

  return (
    <div>
      {/* Rail */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="tablist" aria-label="Momentos da federação">
        {STEPS.map((s, n) => {
          const active = n === i;
          const done = n <= i;
          return (
            <button
              key={s.title}
              role="tab"
              aria-selected={active}
              onClick={() => pick(n)}
              className={`rounded-cardish border p-[14px] text-left transition-colors ${active ? "border-bordo/50 bg-tint-bordo" : "border-black/[0.08] bg-white"}`}
              style={{ borderTop: `2px solid ${done ? "#8E1326" : "#D8D0C0"}` }}
            >
              <div className={`mb-[10px] font-mono text-[12px] ${active ? "text-bordo-soft" : "text-ink-5"}`}>0{n + 1}</div>
              <div className={`text-[13.5px] font-semibold ${active ? "text-ink" : "text-ink-4"}`}>{s.title}</div>
            </button>
          );
        })}
      </div>

      {/* Diagram */}
      <div className="rounded-terminal border border-black/10 bg-white p-[clamp(20px,3vw,36px)]">
        <div className="mb-6 grid grid-cols-1 items-stretch gap-[clamp(12px,2vw,28px)] md:grid-cols-[1fr_auto_1fr]">
          <div className={`rounded-cardish border bg-white p-5 transition-colors ${aBorder}`}>
            <div className="mb-1.5 font-mono text-[11px] text-seal">OPERADOR A</div>
            <div className="mb-1 text-[15px] font-semibold text-ink">Carteira da Ana</div>
            <div className={`font-mono text-[13px] transition-colors ${aDebited ? "text-bordo-soft" : "text-ink-4"}`}>
              {aDebited ? "12 000 → 10 000 AOA" : "12 000 AOA"}
            </div>
          </div>
          <div className="flex min-w-[120px] flex-col items-center justify-center gap-2">
            <div className="text-center font-mono text-[10px] leading-[1.4] text-ink-4">{CHANNEL[i]}</div>
            <div className="font-mono text-[18px] text-bordo">{i === 2 ? "←" : "→"}</div>
            <div className="font-mono text-[10px] text-ink-5">trace · tr-xyz</div>
          </div>
          <div className={`rounded-cardish border bg-white p-5 transition-colors ${bBorder}`}>
            <div className="mb-1.5 font-mono text-[11px] text-seal">OPERADOR B</div>
            <div className="mb-1 text-[15px] font-semibold text-ink">Carteira do Bento</div>
            <div className={`font-mono text-[13px] transition-colors ${bCredited ? "text-ok" : "text-ink-4"}`}>
              {bCredited ? "5 000 → 7 000 AOA" : "5 000 AOA"}
            </div>
          </div>
        </div>
        <div className="border-t border-black/[0.08] pt-[22px]">
          <div className="mb-[10px] flex items-center gap-3">
            <span className="font-mono text-[12px] text-bordo">0{i + 1}</span>
            <div className="font-serif text-[20px] text-ink">{STEPS[i].title}</div>
          </div>
          <p className="m-0 max-w-[78ch] text-[15px] leading-[1.65] text-ink-3">{STEPS[i].desc}</p>
        </div>
      </div>
      <p className="mt-[18px] text-[13px] leading-[1.6] text-ink-5">
        Descrição do comportamento especificado pelo protocolo, não de uma rede de produção em funcionamento.
      </p>
    </div>
  );
}
