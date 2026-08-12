"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Decision } from "@/lib/decisions";

// Client-side explorer for the ADR/RFC library. Pure local state — filters and
// search operate over the statically-indexed `decisions` array (no network, no
// LLM, no runtime data source). BanzAI links open /banzai pre-filled with the
// question; the agent answers there from local on-host inference (ADR-044/048).

type TypeFilter = "all" | "ADR" | "RFC";
type StateFilter = "all" | "activo" | "rascunho" | "substituido";

const TYPE_TABS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "ADR", label: "ADRs" },
  { key: "RFC", label: "RFCs" },
];

const STATE_TABS: { key: StateFilter; label: string }[] = [
  { key: "all", label: "Todos os estados" },
  { key: "activo", label: "Activos" },
  { key: "rascunho", label: "Rascunhos" },
  { key: "substituido", label: "Substituídos" },
];

function stateChipClass(state: Decision["state"]) {
  if (state === "activo") return "border-line-2 bg-white text-ink-2";
  if (state === "substituido") return "border-line-2 bg-paper-3 text-ink-5";
  return "border-pend/40 bg-tint-gold text-pend"; // rascunho
}

export function DecisionsExplorer({
  decisions,
  categories,
}: {
  decisions: Decision[];
  categories: string[];
}) {
  const [type, setType] = useState<TypeFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decisions.filter((d) => {
      if (type !== "all" && d.type !== type) return false;
      if (state !== "all" && d.state !== state) return false;
      if (category !== "all" && d.category !== category) return false;
      if (q) {
        const hay = `${d.id} ${d.title} ${d.summary} ${d.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [decisions, type, state, category, query]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tipo">
            {TYPE_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={type === t.key}
                onClick={() => setType(t.key)}
                className={`rounded-[3px] border px-[13px] py-[6px] text-[13px] font-medium transition-colors ${
                  type === t.key
                    ? "border-bordo bg-bordo text-white"
                    : "border-line bg-white text-ink-2 hover:border-bordo/40 hover:text-bordo"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
            {STATE_TABS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={state === s.key}
                onClick={() => setState(s.key)}
                className={`rounded-[3px] border px-[13px] py-[6px] text-[12.5px] transition-colors ${
                  state === s.key
                    ? "border-seal bg-seal/10 text-seal"
                    : "border-line bg-white text-ink-3 hover:border-seal hover:text-seal"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[3px] border border-line bg-white px-3 py-2 focus-within:border-bordo/40">
            <span className="sr-only">Pesquisar decisões</span>
            <span aria-hidden="true" className="font-mono text-[12px] text-ink-5">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por código, título, tema…"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-5"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-4">
            <span>Tema</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-[3px] border border-line bg-white px-3 py-2 text-[13px] text-ink-2 outline-none focus:border-bordo/40"
            >
              <option value="all">Todos os temas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Result count (live) */}
      <p className="mt-5 font-mono text-[11px] tracking-[0.08em] text-ink-5" aria-live="polite">
        {results.length} {results.length === 1 ? "DOCUMENTO" : "DOCUMENTOS"}
      </p>
      <p className="mt-1 max-w-[74ch] text-[12px] leading-[1.55] text-ink-5">
        A biblioteca lista todos os ADRs e RFCs do Protocolo BANZA v1.0 — activos, rascunhos e
        substituídos. Os registos substituídos mantêm-se publicados: o rasto de decisões é parte da
        governação aberta.
      </p>

      {/* Cards */}
      {results.length === 0 ? (
        <div className="mt-5 rounded-cardish border border-dashed border-line-2 bg-paper-2 px-7 py-12 text-center">
          <p className="m-0 text-[15px] font-medium text-ink-3">Nenhum documento encontrado.</p>
          <p className="m-0 mt-2 text-[13.5px] text-ink-5">Ajuste os filtros ou limpe a pesquisa.</p>
        </div>
      ) : (
        <ul className="mt-5 grid list-none grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 p-0">
          {results.map((d) => (
            <li
              key={d.id}
              className="flex flex-col rounded-cardish border border-line bg-white p-[22px] transition-shadow hover:shadow-[0_6px_20px_rgba(16,19,30,0.06)]"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-[2px] px-[8px] py-[3px] font-mono text-[10.5px] font-semibold tracking-[0.06em] ${
                    d.type === "ADR" ? "bg-bordo/10 text-bordo" : "bg-seal/12 text-seal"
                  }`}
                >
                  {d.type}
                </span>
                <span className="font-mono text-[12px] text-ink-3">{d.id}</span>
                <span className={`ml-auto rounded-[2px] border px-[8px] py-[3px] font-mono text-[10px] ${stateChipClass(d.state)}`}>
                  {d.status}
                </span>
              </div>
              <h3 className="m-0 mb-2 text-[15px] font-semibold leading-[1.35] text-ink">
                <Link href={`/decisoes/${d.slug}`} className="no-underline hover:text-bordo">
                  {d.title}
                </Link>
              </h3>
              <p className="m-0 mb-4 text-[13px] leading-[1.55] text-ink-4">{d.summary}</p>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-ink-5">
                <span>{d.category}</span>
                <span aria-hidden="true">·</span>
                <span>{d.normativeLevel}</span>
                {d.date ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{d.date}</span>
                  </>
                ) : null}
              </div>
              <div className="mb-4 font-mono text-[10px] text-ink-6">
                Conteúdo completo · língua original
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href={`/decisoes/${d.slug}`} className="text-[13px] font-semibold text-bordo no-underline hover:underline">
                  Ler conteúdo completo <span aria-hidden="true" className="font-mono">→</span>
                </Link>
                <Link
                  href={`/banzai?doc=${encodeURIComponent(d.id)}&q=${encodeURIComponent(
                    d.type === "ADR"
                      ? `Explica o ${d.id} em linguagem simples, destacando que é o registo canónico da decisão de arquitectura que documenta, mas que deve ser lido em conjunto com a Referência BANZA, contratos e invariantes aplicáveis. Este documento não confere estatuto a nenhum operador.`
                      : `Explica o ${d.id} em linguagem simples, destacando que é o registo canónico da proposta ou discussão técnica que documenta, mas que não altera por si só as regras actuais enquanto não for aceite e reflectida nos documentos normativos aplicáveis. Este documento não confere estatuto a nenhum operador.`
                  )}`}
                  className="text-[12.5px] text-ink-4 no-underline hover:text-seal"
                >
                  Explicar com BanzAI
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
