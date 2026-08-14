"use client";

// Developer draft tool — "Validar rascunho" (M2.19G.1, ADR-038 §17).
//
// This is a LOCAL, non-authoritative developer utility, fully ISOLATED from the official journey. It
// accepts pasted JSON OR an uploaded file, an artifact-type choice, and runs the matching Rust/WASM
// schema/type/invariant validator. Its result is labelled DRAFT_VALIDATION_RESULT and carries a
// permanent banner. It NEVER: advances the journey, produces an official OperationReceipt, feeds the
// Evidence Bundle, or yields VERIFIED / Certification Readiness. It imports NOTHING from the validation
// session — it cannot touch endpoints, the registry, remote artifacts, evidence or certification.

import { useRef, useState } from "react";
import { Ico, CARD } from "@/components/banzai/banzaiUi";
import { DRAFT_COPY } from "@/components/banzai/banzai-agent";
import { scanUpload } from "@/lib/banzaOperatorJourney";
import { validateManifest } from "@/lib/banzaOperatorManifest";
import { validateBundle } from "@/lib/banzaEvidenceBundle";
import { validateConformanceReport } from "@/lib/banzaConformance";
import { evaluateTrust, trustStatusTone } from "@/lib/banzaTrust";
import { verifyTrace, traceStatus } from "@/components/banzai/traceVerifier";

const UPLOAD_MAX_BYTES = 256 * 1024;

type ArtifactType = "manifest" | "evidence-bundle" | "conformance" | "trust" | "trace";
const ARTIFACT_TYPES: { id: ArtifactType; label: string; engine: string }[] = [
  { id: "manifest", label: "Operator Manifest", engine: "banza-operator-manifest" },
  { id: "evidence-bundle", label: "Evidence Bundle", engine: "banza-evidence-bundle" },
  { id: "conformance", label: "Relatório de conformidade", engine: "banza-conformance" },
  { id: "trust", label: "Trust / signed metadata", engine: "banza-trust" },
  { id: "trace", label: "Trace", engine: "banzai-core (trace verifier)" },
];

interface DraftResult {
  label: "DRAFT_VALIDATION_RESULT";
  artifact_type: ArtifactType;
  ok: boolean;
  status: string;
  reason_codes: string[];
  source: "paste" | "upload";
  file_name?: string;
}

async function runDraft(type: ArtifactType, jsonText: string): Promise<{ ok: boolean; status: string; reason_codes: string[] }> {
  switch (type) {
    case "manifest": {
      const r = await validateManifest(jsonText);
      return {
        ok: r.status === "VALID",
        status: r.status,
        reason_codes: [`MANIFEST_${r.status}`, ...r.missing_fields.map((f) => `MISSING_FIELD:${f}`), ...r.errors.map((e) => `ERROR:${e}`)],
      };
    }
    case "evidence-bundle": {
      const v = await validateBundle(jsonText);
      return { ok: v.ok, status: v.ok ? "BUNDLE_OK" : "BUNDLE_INVALID", reason_codes: v.ok ? ["BUNDLE_OK"] : v.errors.map((e) => `ERROR:${e}`) };
    }
    case "conformance": {
      const v = await validateConformanceReport(jsonText);
      return { ok: v.ok, status: v.ok ? "CONFORMANCE_OK" : "CONFORMANCE_INVALID", reason_codes: v.ok ? ["CONFORMANCE_OK"] : [`ERROR:${v.error ?? "invalid"}`] };
    }
    case "trust": {
      const parsed = JSON.parse(jsonText);
      const r = await evaluateTrust(parsed);
      return {
        ok: trustStatusTone(r.trust_status) === "pass",
        status: r.trust_status,
        reason_codes: [r.trust_status, `SIGNED_METADATA:${r.checks.signed_metadata_status}`, `REVOCATION:${r.checks.revocation_status}`],
      };
    }
    case "trace": {
      const parsed = JSON.parse(jsonText);
      const r = await verifyTrace(parsed);
      const s = traceStatus(r);
      return { ok: s.tone === "pass", status: s.label, reason_codes: r.invariant_checks.map((c) => `${c.id}:${c.status}`) };
    }
  }
}

export function DraftValidationTool() {
  const [type, setType] = useState<ArtifactType>("manifest");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [source, setSource] = useState<"paste" | "upload">("paste");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    if (!/\.json$/i.test(file.name)) { setError("Apenas ficheiros .json são aceites."); return; }
    if (file.size === 0) { setError("Ficheiro vazio."); return; }
    if (file.size > UPLOAD_MAX_BYTES) { setError("Ficheiro demasiado grande (máx. 256 kB)."); return; }
    setBusy(true);
    try {
      const raw = await file.text();
      const scan = await scanUpload(raw); // Rust gate: parse + secret/credential detection
      if (!scan.ok) {
        setError(scan.error === "secret_detected" ? "O ficheiro parece conter dados sensíveis (chaves privadas, segredos ou credenciais). Remova-os e tente de novo." : "Não foi possível ler o ficheiro (JSON inválido ou demasiado grande).");
        return;
      }
      setText(raw);
      setUploadName(file.name);
      setSource("upload");
      setResult(null);
    } catch {
      setError("Não foi possível ler o ficheiro.");
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    setError(null);
    if (!text.trim()) { setError("Cole ou carregue um artefacto JSON primeiro."); return; }
    setBusy(true);
    try {
      const out = await runDraft(type, text);
      setResult({ label: DRAFT_COPY.resultLabel, artifact_type: type, source, ...(uploadName ? { file_name: uploadName } : {}), ...out });
    } catch (e) {
      setError(e instanceof Error ? `JSON inválido ou não suportado: ${e.message}` : "Falha ao validar o rascunho.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const clear = () => { setText(""); setUploadName(null); setSource("paste"); setResult(null); setError(null); };

  return (
    <div className={`p-[16px] ${CARD}`}>
      <div className="flex items-center gap-[10px]">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-tint-bordo text-bordo"><Ico name="code" size={16} /></span>
        <div>
          <div className="text-[14px] font-semibold text-ink">{DRAFT_COPY.title}</div>
          <div className="font-mono text-[10.5px] text-ink-5">ferramenta local para programadores · validação Rust/WASM · sem rede</div>
        </div>
      </div>

      {/* Permanent banner (§17) */}
      <div className="mt-3 flex items-start gap-[8px] rounded-[10px] border border-pend/30 bg-pend/[0.07] px-[13px] py-[9px]" role="note">
        <Ico name="info" size={14} className="mt-px flex-none text-pend" />
        <p className="m-0 font-mono text-[11px] leading-[1.5] text-pend">{DRAFT_COPY.banner}</p>
      </div>

      <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-ink-4">{DRAFT_COPY.subtitle}</p>

      {/* Artifact type */}
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-5">Tipo de artefacto</div>
      <div className="mt-2 flex flex-wrap gap-[6px]">
        {ARTIFACT_TYPES.map((t) => {
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setType(t.id); setResult(null); }}
              aria-pressed={active}
              className={`rounded-full border px-[11px] py-[5px] font-mono text-[11.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordo/40 ${
                active ? "border-bordo/40 bg-tint-bordo text-bordo" : "border-black/10 bg-white text-ink-4 hover:border-bordo/30"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-ink-5">motor: {ARTIFACT_TYPES.find((t) => t.id === type)!.engine}</div>

      {/* Paste + upload */}
      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-5">Colar JSON</div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSource("paste"); setUploadName(null); }}
        rows={7}
        spellCheck={false}
        aria-label="Colar artefacto JSON para validação de rascunho"
        placeholder='{ "artifact_type": "manifest", ... }'
        className="mt-2 w-full resize-y rounded-[10px] border border-black/10 bg-paper-2 p-[12px] font-mono text-[11.5px] leading-[1.5] text-ink-2 outline-none focus:border-bordo/40"
      />
      <div className="mt-2 flex flex-wrap items-center gap-[8px]">
        <input ref={inputRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" aria-hidden="true" tabIndex={-1} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-[10px] border border-bordo/30 bg-white px-[13px] py-[8px] text-[12.5px] font-semibold text-bordo transition-colors hover:bg-tint-bordo disabled:opacity-60">
          <Ico name="doc" size={14} /> Carregar ficheiro JSON
        </button>
        {uploadName && (
          <span className="inline-flex items-center gap-2 font-mono text-[11px] text-ink-4">
            <span className="h-[5px] w-[5px] rounded-full bg-ok" /> {uploadName}
          </span>
        )}
        <button type="button" onClick={validate} disabled={busy} className="inline-flex items-center gap-2 rounded-[10px] bg-bordo px-[15px] py-[8px] text-[12.5px] font-semibold text-creme-high shadow-[0_2px_8px_rgba(142,19,38,0.25)] transition-colors hover:bg-[#7a0f20] disabled:opacity-60">
          {busy ? "A validar…" : "Validar rascunho"}
        </button>
        {(text || result) && <button type="button" onClick={clear} className="font-mono text-[11.5px] text-bordo hover:underline">Limpar</button>}
      </div>
      <p className="m-0 mt-2 font-mono text-[10.5px] leading-[1.5] text-ink-5">O ficheiro é lido apenas nesta sessão do navegador; nada é enviado nem publicado. Não é exemplo oficial.</p>

      {error && <div className="mt-3 rounded-[10px] border border-bordo/25 bg-tint-bordo px-[12px] py-[9px] text-[12px] leading-[1.5] text-bordo">{error}</div>}

      {result && (
        <div className="mt-4 rounded-[10px] border border-black/[0.08] bg-paper-2 p-[14px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-5">{result.label}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-[10px] py-[3px] font-mono text-[10.5px] font-semibold ${result.ok ? "border-ok/40 bg-ok/[0.08] text-ok" : "border-bordo/40 bg-tint-bordo text-bordo"}`}>
              <span className={`h-[5px] w-[5px] rounded-full ${result.ok ? "bg-ok" : "bg-bordo"}`} /> {result.ok ? "esquema válido (rascunho)" : "inválido (rascunho)"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-[4px] font-mono text-[11px] text-ink-4">
            <span>tipo: <span className="text-ink-2">{result.artifact_type}</span></span>
            <span>estado: <span className="text-ink-2">{result.status}</span></span>
            <span>origem: <span className="text-ink-2">{result.source}{result.file_name ? ` · ${result.file_name}` : ""}</span></span>
            <span>oficial: <span className="text-bordo">não</span></span>
          </div>
          {result.reason_codes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-[5px]">
              {result.reason_codes.map((c, i) => (
                <code key={`${c}-${i}`} className="break-all rounded-[5px] border border-black/[0.07] bg-white px-[6px] py-[2px] font-mono text-[10.5px] text-ink-3">{c}</code>
              ))}
            </div>
          )}
          <p className="m-0 mt-3 font-mono text-[10.5px] leading-[1.5] text-pend">Resultado de rascunho. Não avança a jornada, não produz recibo oficial, não alimenta o Evidence Bundle e nunca devolve VERIFIED nem Prontidão de Certificação.</p>
        </div>
      )}
    </div>
  );
}
