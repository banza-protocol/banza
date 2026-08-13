"use client";

// Client search island for the Registo Técnico explorer. It NEVER fetches: it filters, in the browser,
// the closed set of entries the Server Component already fetched and validated (operator/implementation
// rows from /operators, validated server-side). No autocomplete, no invented suggestions, no network
// round-trip on keystroke — so the ADR-038 posture holds (the browser never resolves a validation target).
// Four honest states only: (1) entries === null → the /operators state was NOT confirmed (outage or
// invalid payload) → disabled input pointing at the machine route, never presented as "empty";
// (2) confirmed-empty → disabled input, valid-empty note; (3) query empty → all;
// (4) query matches none → an explicit "no result", never a fabricated row.

import { useMemo, useState } from "react";

export type RegistryEntry = {
  id: string;
  label: string;
  kind: string;
};

export function RegistrySearch({ entries }: { entries: RegistryEntry[] | null }) {
  const [q, setQ] = useState("");
  const unconfirmed = entries === null;
  const list = entries ?? [];
  const empty = !unconfirmed && list.length === 0;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (e) =>
        e.id.toLowerCase().includes(needle) ||
        e.label.toLowerCase().includes(needle) ||
        e.kind.toLowerCase().includes(needle),
    );
  }, [q, list]);

  return (
    <div className="rounded-cardish border border-line bg-white px-[20px] py-[18px]">
      <label htmlFor="registry-search" className="mb-2 block font-mono text-[10.5px] tracking-[0.08em] text-ink-5">
        PESQUISAR POR OPERADOR, IMPLEMENTAÇÃO OU IDENTIFICADOR
      </label>
      <input
        id="registry-search"
        type="search"
        value={q}
        disabled={empty || unconfirmed}
        onChange={(e) => setQ(e.target.value)}
        placeholder={
          unconfirmed
            ? "Estado não confirmado — não foi possível ler /operators agora."
            : empty
              ? "Nada para pesquisar — nenhuma entrada indexada neste ambiente."
              : "Escreva um operador, implementação ou identificador…"
        }
        aria-describedby="registry-search-note"
        className="w-full rounded-[8px] border border-line bg-paper px-[14px] py-[10px] text-[14px] text-ink outline-none placeholder:text-ink-5 focus:border-bordo/40 disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-ink-5"
      />
      {unconfirmed ? (
        <p id="registry-search-note" className="mt-2 text-[12.5px] leading-[1.55] text-ink-5">
          Estado não confirmado — verifique directamente na rota máquina{" "}
          <a href="/operators" className="link-bordo font-mono">/operators</a>.
        </p>
      ) : empty ? (
        <p id="registry-search-note" className="mt-2 text-[12.5px] leading-[1.55] text-ink-5">
          O registo vazio é um estado válido e verificável — assim que uma implementação for indexada,
          torna-se pesquisável aqui.
        </p>
      ) : results.length === 0 ? (
        <p id="registry-search-note" className="mt-3 text-[13px] leading-[1.55] text-ink-4">
          Nenhum resultado para «{q.trim()}».
        </p>
      ) : (
        <ul id="registry-search-note" className="mt-3 flex flex-col gap-[8px]">
          {results.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-[8px] text-[13.5px]">
              <span className="font-mono text-[12.5px] text-bordo">{e.id}</span>
              <span className="text-ink">{e.label}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-5">{e.kind}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
