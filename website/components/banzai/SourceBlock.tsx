"use client";

// M2.13D — the "Fontes usadas" block: a BanzAI answer's citations rendered in their OWN block,
// visually separate from the answer body and from the quick-prompt suggestions. Each source shows a
// category LABEL (not colour alone), a short title, and its repo/path; a safe href makes it clickable
// (opens the file on GitHub in a new tab). Sources with no safe link (sensitive/excluded paths) render
// as a non-clickable row. Presentation only — a citation is never a normative rule.

import type { Source } from "@/components/home/banzaiKb";

// Category → { label, chip classes }. Labels distinguish the classes even without colour; the palette
// reuses the existing tokens (gold=licença, green=relatório, wine=segurança, gray=código/norma).
const CAT: Record<string, { label: string; cls: string }> = {
  "legal-license": { label: "LICENÇA", cls: "border-pend/30 bg-tint-gold text-pend" },
  reference: { label: "REFERÊNCIA", cls: "border-pend/25 bg-tint-gold text-pend" },
  decision: { label: "DECISÃO", cls: "border-line-2 bg-paper-2 text-ink-3" },
  normative: { label: "NORMA", cls: "border-line-2 bg-paper-2 text-ink-3" },
  implementation: { label: "CÓDIGO", cls: "border-ink/15 bg-ink/[0.03] text-ink-3" },
  banzai: { label: "CÓDIGO", cls: "border-ink/15 bg-ink/[0.03] text-ink-3" },
  "banzai-runtime": { label: "CÓDIGO", cls: "border-ink/15 bg-ink/[0.03] text-ink-3" },
  website: { label: "WEBSITE", cls: "border-ink/15 bg-ink/[0.03] text-ink-3" },
  "guard-ci": { label: "GUARD/CI", cls: "border-ink/15 bg-ink/[0.03] text-ink-3" },
  "operator-zero": { label: "OPERADOR ZERO", cls: "border-line-2 bg-paper-2 text-ink-3" },
  report: { label: "RELATÓRIO", cls: "border-ok/25 bg-tint-green text-ok" },
  "security-boundary": { label: "SEGURANÇA", cls: "border-bordo/30 bg-tint-bordo text-bordo" },
  infra: { label: "INFRA", cls: "border-line-2 bg-paper-2 text-ink-3" },
};

// Document CLASS → label, in both editions. One authoritative map, so a class cannot be spelled one way
// here and another way somewhere else. `reference` names the canonical descriptive Reference and nothing
// else — it is not, and must never again become, the label for a source whose class is unknown.
const KIND_LABEL: Record<string, { pt: string; en: string }> = {
  adr: { pt: "ADR", en: "ADR" },
  rfc: { pt: "RFC", en: "RFC" },
  spec: { pt: "ESPECIFICAÇÃO", en: "SPECIFICATION" },
  contract: { pt: "CONTRATO", en: "CONTRACT" },
  conformance: { pt: "CONFORMIDADE", en: "CONFORMANCE" },
  governance: { pt: "GOVERNAÇÃO", en: "GOVERNANCE" },
  reference: { pt: "REFERÊNCIA", en: "REFERENCE" },
  code: { pt: "CÓDIGO", en: "CODE" },
  doc: { pt: "DOCUMENTO", en: "DOCUMENT" },
};

/** The honest label when the registry classified nothing. Never "REFERÊNCIA". */
const UNKNOWN_LABEL = { pt: "FONTE", en: "SOURCE" };

export function sourceKindLabel(kind: string, lang: "pt" | "en" = "pt"): string {
  const entry = KIND_LABEL[kind];
  return entry ? entry[lang] : UNKNOWN_LABEL[lang];
}

function catMeta(source: { kind?: string; category?: string }) {
  const kind = String(source.kind || "");
  const label = sourceKindLabel(kind);
  const cls =
    (kind && CAT[kind]?.cls) ||
    CAT[String(source.category || "")]?.cls ||
    "border-line-2 bg-paper-2 text-ink-3";
  return { label, cls };
}

function DocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
    </svg>
  );
}

export function SourceBlock({ sources }: { sources: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <section aria-label="Fontes usadas" data-sources-block="1" className="mt-[11px]">
      <div className="mb-[6px] flex items-center gap-[6px] font-mono text-[10px] tracking-[0.14em] text-ink-4">
        <DocIcon /> FONTES USADAS · {sources.length}
      </div>
      <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
        {sources.map((s, i) => {
          const meta = catMeta(s);
          const repoShort = String(s.repo || "").split("/").pop() || s.repo;
          const inner = (
            <div className="flex items-start gap-[9px] rounded-[9px] border border-black/[0.06] bg-paper-2/70 px-[11px] py-[8px]">
              <span className={`mt-[1px] inline-flex flex-none items-center rounded-[5px] border px-[6px] py-[2px] font-mono text-[9px] tracking-[0.04em] ${meta.cls}`}>
                {meta.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] leading-[1.4] text-ink-2">{s.title || s.id}</span>
                {s.path && (
                  <span className="mt-[2px] block truncate font-mono text-[10.5px] text-ink-5">
                    {repoShort ? `${repoShort} · ` : ""}
                    {s.path}
                  </span>
                )}
              </span>
              {s.href && (
                <span className="mt-[1px] flex-none text-ink-5" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              )}
            </div>
          );
          return (
            <li key={`${s.id}|${s.path}|${i}`}>
              {s.href ? (
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block no-underline transition-colors [&>div]:hover:border-bordo/30 [&>div]:hover:bg-tint-bordo/40"
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
