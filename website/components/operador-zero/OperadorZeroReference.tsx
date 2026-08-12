"use client";

// Operador Zero — the PREMIUM READ-ONLY canonical reference implementation surface (M2.19E/F).
//
// This component EXPOSES the implementation (identity, capabilities, endpoints, metadata, keys,
// reports, evidence, certification status) and NOTHING ELSE. It runs no simulation, no ledger, no
// conformance/trust/federation execution, no Evidence-Bundle construction and no certification action.
// Every human-initiated validation happens in the modo de validação do BanzAI (Rust engines) via
// the deep links below. The only client interactivity here is: copy an endpoint, expand a read-only
// JSON artifact, and filter the artifact list — all read-only. No handlers execute the protocol.
//
// RUST_WRAPPER_ONLY is not needed: TypeScript computes nothing about validation (no scoring, no
// verdicts). It renders published facts. (ADR-037, ADR-052, ADR-053.)

import { useMemo, useState } from "react";
import {
  OPERADOR_ZERO,
  OPERADOR_ZERO_VALIDATION_STATE,
  OPERADOR_ZERO_DESCRIPTOR,
  OPERADOR_ZERO_EYEBROW,
  ARTIFACT_ROUTES,
  readArtifact,
  BOUNDARY,
  DEFINITION,
  DISCLAIMER,
} from "@/lib/operadorZero";
import { ZERO_DIMENSIONS, PROOF_CHAIN, STATE_TONE, dimensionState } from "@/lib/operadorZeroStatus";
import {
  DEFAULT_TARGET_ID,
  workbenchDeepLinkAbsolute,
  WORKFLOW_LABEL_PT,
  type ValidationWorkflow,
} from "@/lib/banzaiValidation";

const ARTIFACT_CATEGORY: Record<string, string> = {
  manifest: "Identity",
  "key-manifest": "Keys",
  "revocation-list": "Keys",
  "conformance/evidence": "Conformance",
  "federation/metadata": "Federation",
  "federation-metadata": "Federation",
  "evidence-bundle": "Evidence",
  "traces/full-e2e": "Traces",
  "ledger/demo": "Examples",
  "payments/demo-qr": "Examples",
  "payments/demo-refund": "Examples",
  discovery: "Identity",
  capabilities: "Identity",
  "signed-metadata": "Keys",
};

const S = OPERADOR_ZERO_VALIDATION_STATE;

const SECONDARY_WORKFLOWS: ValidationWorkflow[] = [
  "conformance",
  "interoperability",
  "trust",
  "federation",
  "evidence",
  "certification",
];

function endpointUrl(route: string): string {
  return `${OPERADOR_ZERO.currency ? "https://zero.banza.network" : ""}/${route}.json`;
}

export default function OperadorZeroReference() {
  const [openArtifact, setOpenArtifact] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("Todos");

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(ARTIFACT_ROUTES.map((a) => ARTIFACT_CATEGORY[a.route] ?? "Outros")))],
    [],
  );
  const artifacts = useMemo(
    () =>
      ARTIFACT_ROUTES.filter(
        (a) => filter === "Todos" || (ARTIFACT_CATEGORY[a.route] ?? "Outros") === filter,
      ),
    [filter],
  );

  function copy(route: string) {
    void navigator.clipboard?.writeText(endpointUrl(route)).then(() => {
      setCopied(route);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const fullLink = workbenchDeepLinkAbsolute(DEFAULT_TARGET_ID, "full");

  return (
    <div className="ozr">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* 9.2 Hero */}
      <header className="ozr-hero">
        <p className="ozr-eyebrow">{OPERADOR_ZERO_EYEBROW}</p>
        <h1 className="ozr-title">Operador Zero</h1>
        <p className="ozr-lede">
          A implementação pública de referência do protocolo BANZA. Expõe os artefactos, endpoints e
          estados necessários para descoberta, verificação de conformidade, interoperabilidade, trust e
          preparação de certificação.
        </p>
        <p className="ozr-note">Não movimenta fundos reais. Não é PSP. Não é participante activo.</p>
        <div className="ozr-cta-row">
          <a className="ozr-btn ozr-btn-primary" href={fullLink}>
            {WORKFLOW_LABEL_PT.full}
          </a>
          <a className="ozr-btn" href="#artefactos">Explorar artefactos</a>
          <a className="ozr-btn" href="#endpoints">Consultar endpoints</a>
          <a className="ozr-btn" href="#estado">Ver estado técnico</a>
        </div>
      </header>

      {/* 9.3 Status strip */}
      <section className="ozr-strip" aria-label="Estado da implementação">
        <Field k="operator_id" v={OPERADOR_ZERO.operator_id} mono />
        <Field k="implementation" v={String((readManifest()?.implementation_id as string) ?? "operator-zero-impl")} mono />
        <Field k="protocol" v={String(readManifest()?.protocol_version ?? "1.0.0")} />
        <Field k="environment" v="demo" />
        <Field k="certification" v="NOT_CERTIFIED" />
        <Field k="last_evaluated" v={String(S.last_validation_phase ?? "—")} />
      </section>

      {/* 9.4 Implementation identity */}
      <section className="ozr-card" aria-labelledby="ident-h">
        <h2 id="ident-h" className="ozr-h2">Identidade da implementação</h2>
        <dl className="ozr-kv">
          <KV k="Nome" v={OPERADOR_ZERO.operator_display_name} />
          <KV k="Operator ID" v={OPERADOR_ZERO.operator_id} mono />
          <KV k="Descriptor" v={OPERADOR_ZERO_DESCRIPTOR} />
          <KV k="Ambiente" v="demo" />
          <KV k="Moeda de demonstração" v={OPERADOR_ZERO.currency} mono />
          <KV k="Versão do protocolo" v={String(readManifest()?.protocol_version ?? "1.0.0")} mono />
          <KV k="Certificação de produção" v="não" />
          <KV k="Verificação pública" v="https://zero.banza.network" mono />
        </dl>
      </section>

      {/* 9.5 Technical status */}
      <section id="estado" className="ozr-card" aria-labelledby="estado-h">
        <h2 id="estado-h" className="ozr-h2">Estado técnico</h2>
        <p className="ozr-muted">
          Estados categóricos publicados pela última validação no BanzAI. Esta superfície não calcula
          estados nem apresenta pontuação agregada.
        </p>
        <ul className="ozr-dims">
          {ZERO_DIMENSIONS.map((d) => (
            <li key={d.key} className={`ozr-dim tone-${STATE_TONE[d.state]}`}>
              <span className="ozr-dim-label">{d.label}</span>
              <span className={`ozr-badge tone-${STATE_TONE[d.state]}`}>
                <span className="ozr-dot" aria-hidden="true" />
                {d.state} · {d.state_label}
              </span>
              <span className="ozr-dim-engine">motor: {d.engine}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 9.6 Capabilities */}
      <section className="ozr-card" aria-labelledby="caps-h">
        <h2 id="caps-h" className="ozr-h2">Capabilities</h2>
        <div className="ozr-caps">
          {readCapabilities().map((c) => (
            <div key={c} className="ozr-cap">
              <code>{c}</code>
              <span className="ozr-cap-note">declarada no manifest</span>
            </div>
          ))}
        </div>
      </section>

      {/* 9.7 Proof chain */}
      <section className="ozr-card" aria-labelledby="proof-h">
        <h2 id="proof-h" className="ozr-h2">Cadeia de verificação</h2>
        <p className="ozr-muted">Apenas leitura. Nenhum clique inicia uma avaliação nesta página.</p>
        <ol className="ozr-chain">
          {PROOF_CHAIN.map((n, i) => {
            const st = dimensionState(n.key);
            return (
              <li key={`${n.key}-${i}`} className={`ozr-chain-node tone-${STATE_TONE[st]}`}>
                <span className="ozr-chain-label">{n.label}</span>
                <span className="ozr-chain-state">{st}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 9.8 Artifact explorer */}
      <section id="artefactos" className="ozr-card" aria-labelledby="art-h">
        <h2 id="art-h" className="ozr-h2">Artefactos públicos</h2>
        <p className="ozr-muted" id="endpoints">
          Explorador apenas de leitura. Cada artefacto é servido por um endpoint GET; escrita responde
          405; desconhecido responde 404.
        </p>
        <div className="ozr-filter" role="tablist" aria-label="Filtrar artefactos">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={filter === c}
              className={`ozr-chip ${filter === c ? "is-on" : ""}`}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <ul className="ozr-arts">
          {artifacts.map((a) => (
            <li key={a.route} className="ozr-art">
              <div className="ozr-art-head">
                <div>
                  <span className="ozr-art-cat">{ARTIFACT_CATEGORY[a.route] ?? "Outros"}</span>
                  <span className="ozr-art-label">{a.label}</span>
                </div>
                <code className="ozr-art-ep">/{a.route}.json</code>
              </div>
              <div className="ozr-art-actions">
                <button className="ozr-mini" onClick={() => setOpenArtifact(openArtifact === a.route ? null : a.route)}>
                  {openArtifact === a.route ? "Fechar JSON" : "Ver JSON"}
                </button>
                <a className="ozr-mini" href={endpointUrl(a.route)} target="_blank" rel="noopener noreferrer">
                  Abrir endpoint
                </a>
                <button className="ozr-mini" onClick={() => copy(a.route)}>
                  {copied === a.route ? "Copiado ✓" : "Copiar endpoint"}
                </button>
              </div>
              {openArtifact === a.route && (
                <pre className="ozr-json" tabIndex={0} aria-label={`JSON de ${a.label}`}>
                  {JSON.stringify(readArtifact(a.route), null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* 9.9 Validation in BanzAI */}
      <section className="ozr-card ozr-validate" aria-labelledby="val-h">
        <h2 id="val-h" className="ozr-h2">Validar o Operador Zero</h2>
        <p className="ozr-muted">
          A validação é executada no BanzAI através dos motores Rust do protocolo. Esta página
          apenas expõe a implementação e os seus artefactos. A validação oficial utiliza
          exclusivamente artefactos obtidos dos endpoints públicos desta implementação, por uma
          camada segura de fetch em Rust — nunca pelo navegador (ADR-068). O Operador Zero é o
          exemplo canónico inicial, mas utiliza exactamente o mesmo processo de validação aplicado a
          qualquer futura implementação publicada.
        </p>
        <img
          className="ozr-diagram"
          src="/diagrams/protocol/operador-zero-validation-target-v2.svg"
          alt="Operador Zero como alvo de validação: BanzAI inicia, os motores Rust avaliam, o Operador Zero expõe endpoints, os relatórios e o Evidence Bundle fluem para o Registo Técnico."
          loading="lazy"
        />
        <a className="ozr-btn ozr-btn-primary" href={fullLink}>Abrir validação no BanzAI</a>
        <ol className="ozr-steps">
          {["Discovery", "Manifest", "Keys", "Conformance", "Interoperability", "Trust", "Federation", "Evidence", "Certification Readiness"].map(
            (s, i) => (
              <li key={s} className="ozr-step"><span className="ozr-step-n">{i + 1}</span>{s}</li>
            ),
          )}
        </ol>
        <div className="ozr-cta-row">
          {SECONDARY_WORKFLOWS.map((w) => (
            <a key={w} className="ozr-btn ozr-btn-sm" href={workbenchDeepLinkAbsolute(DEFAULT_TARGET_ID, w)}>
              {WORKFLOW_LABEL_PT[w]}
            </a>
          ))}
        </div>
      </section>

      {/* 9.10 Institutional boundary */}
      <section className="ozr-card ozr-boundary" aria-labelledby="bound-h">
        <h2 id="bound-h" className="ozr-h2">Fronteira institucional</h2>
        <ul className="ozr-bounds">
          <li>não é banco</li>
          <li>não é PSP</li>
          <li>não é carteira</li>
          <li>não é operador financeiro licenciado</li>
          <li>não movimenta dinheiro real (real_money=false)</li>
          <li>não é produção (production_allowed=false)</li>
          <li>não participa no scheme operacional (Camada 3)</li>
          <li>não aparece como operador real no registo</li>
          <li>não possui certificação de produção</li>
          <li>não representa autorização regulatória</li>
        </ul>
        <p className="ozr-muted">{BOUNDARY}</p>
      </section>

      {/* 9.11 FAQ */}
      <section className="ozr-card" aria-labelledby="faq-h">
        <h2 id="faq-h" className="ozr-h2">Perguntas frequentes</h2>
        <div className="ozr-faq">
          {FAQ.map((f) => (
            <details key={f.q} className="ozr-faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="ozr-disclaimer">{DISCLAIMER}</p>
      <noscript>
        <p className="ozr-disclaimer">{DEFINITION}</p>
      </noscript>
    </div>
  );
}

function readManifest(): Record<string, unknown> | null {
  const m = readArtifact("manifest");
  return m && typeof m === "object" ? (m as Record<string, unknown>) : null;
}

function readCapabilities(): string[] {
  const m = readManifest();
  const caps = m?.capabilities;
  if (Array.isArray(caps)) {
    return caps.map((c) => (typeof c === "string" ? c : (c as { id?: string })?.id ?? JSON.stringify(c))).filter(Boolean);
  }
  return ["payments", "settlement", "conformance", "trust", "federation", "evidence"];
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="ozr-field">
      <span className="ozr-field-k">{k}</span>
      <span className={`ozr-field-v ${mono ? "mono" : ""}`}>{v}</span>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="ozr-kv-row">
      <dt>{k}</dt>
      <dd className={mono ? "mono" : ""}>{v}</dd>
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: "O que é o Operador Zero?", a: "É a implementação pública de referência do protocolo BANZA — um ambiente de demonstração que mostra como um operador expõe identidade, manifest, capabilities, endpoints, metadata, chaves e evidência." },
  { q: "É um operador real?", a: "Não. Não é um participante financeiro activo, não é PSP e não aparece como operador real no registo." },
  { q: "Movimenta dinheiro?", a: "Não. Usa apenas valores fictícios (KZ_DEMO) e não movimenta fundos reais." },
  { q: "É certificado?", a: "Não. O estado de certificação é NOT_CERTIFIED. Uma certificação é técnica, por implementação, e não é licença nem autorização." },
  { q: "Onde é validado?", a: "Exclusivamente no BanzAI, através dos motores Rust do protocolo." },
  { q: "Quem executa os testes?", a: "Os motores Rust. O BanzAI orquestra a jornada; esta página não executa nada." },
  { q: "O Qwen decide os resultados?", a: "Não. O Qwen apenas explica resultados já determinados pelos motores Rust." },
  { q: "Onde estão os artefactos?", a: "São servidos como endpoints GET apenas de leitura sob zero.banza.network e listados no explorador acima." },
  { q: "Como executar conformidade?", a: "Abrindo a validação no BanzAI e executando a etapa de conformidade — nunca a partir desta página." },
  { q: "Como verificar o Certification Record?", a: "Através da preparação de certificação no BanzAI e do Registo Técnico público (verificável sem conta)." },
  { q: "Por que não há simulação nesta página?", a: "Porque o Operador Zero é uma implementação de referência: expõe o seu estado e artefactos. A execução e a validação vivem no BanzAI." },
];

const CSS = `
.ozr{--bg:#0b0c10;--bg2:#111318;--bg3:#161922;--line:#242836;--ink:#e8e9ee;--muted:#9aa0ad;--accent:#5b8cff;--verified:#3fb950;--pending:#d9a021;--failed:#e5534b;max-width:72rem;margin:0 auto;padding:0 1.25rem 5rem;color:var(--ink);font:15px/1.65 var(--font-sans,system-ui,-apple-system,sans-serif)}
.ozr .mono{font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)}
.ozr-eyebrow{letter-spacing:.14em;font-size:.72rem;color:var(--muted);margin:0 0 .8rem;font-weight:600}
.ozr-hero{padding:4.5rem 0 2.5rem;border-bottom:1px solid var(--line);position:relative}
.ozr-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 20% 0,rgba(91,140,255,.10),transparent 70%);pointer-events:none}
.ozr-title{font-size:clamp(2.4rem,6vw,3.6rem);line-height:1.05;margin:0 0 1rem;font-weight:680;letter-spacing:-.02em}
.ozr-lede{font-size:clamp(1.05rem,2vw,1.2rem);color:#c7cad3;max-width:44rem;margin:0 0 .9rem}
.ozr-note{color:var(--muted);margin:0 0 1.6rem;font-size:.95rem}
.ozr-cta-row{display:flex;flex-wrap:wrap;gap:.6rem}
.ozr-btn{display:inline-flex;align-items:center;gap:.4rem;border:1px solid var(--line);background:var(--bg2);color:var(--ink);padding:.6rem 1rem;border-radius:.55rem;text-decoration:none;font-weight:550;font-size:.92rem;transition:border-color .15s,background .15s}
.ozr-btn:hover{border-color:#3a4152;background:var(--bg3)}
.ozr-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ozr-btn-primary{background:var(--accent);border-color:var(--accent);color:#08111f;font-weight:650}
.ozr-btn-primary:hover{background:#6f9bff;border-color:#6f9bff}
.ozr-btn-sm{font-size:.85rem;padding:.45rem .75rem}
.ozr-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:.7rem;overflow:hidden;margin:2rem 0}
.ozr-field{background:var(--bg2);padding:.85rem 1rem;display:flex;flex-direction:column;gap:.25rem;min-width:0}
.ozr-field-k{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.ozr-field-v{font-size:.95rem;font-weight:600;overflow-wrap:anywhere;word-break:break-word}
.ozr-card{background:var(--bg2);border:1px solid var(--line);border-radius:.8rem;padding:1.6rem 1.6rem 1.8rem;margin:1.5rem 0}
.ozr-h2{font-size:1.25rem;margin:0 0 .5rem;font-weight:640;letter-spacing:-.01em}
.ozr-muted{color:var(--muted);margin:.2rem 0 1.1rem;font-size:.92rem;max-width:48rem}
.ozr-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:0 1.6rem;margin:.4rem 0 0}
.ozr-kv-row{display:flex;flex-direction:column;gap:.2rem;padding:.75rem 0;border-bottom:1px solid var(--line);min-width:0}
.ozr-kv-row dt{color:var(--muted);font-size:.7rem;letter-spacing:.06em;text-transform:uppercase}
.ozr-kv-row dd{margin:0;font-weight:560;font-size:.95rem;line-height:1.4;overflow-wrap:anywhere;word-break:break-word}
.ozr-dims{list-style:none;margin:0;padding:0;display:grid;gap:.55rem}
.ozr-dim{display:grid;grid-template-columns:1fr auto;align-items:center;gap:.4rem 1rem;padding:.75rem .9rem;background:var(--bg3);border:1px solid var(--line);border-radius:.55rem;border-left:3px solid var(--line)}
.ozr-dim.tone-verified{border-left-color:var(--verified)}
.ozr-dim.tone-pending{border-left-color:var(--pending)}
.ozr-dim.tone-failed{border-left-color:var(--failed)}
.ozr-dim-label{font-weight:600}
.ozr-dim-engine{grid-column:1/-1;font-size:.78rem;color:var(--muted);font-family:var(--font-mono,monospace)}
.ozr-badge{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:600;padding:.25rem .55rem;border-radius:2rem;border:1px solid var(--line);background:var(--bg2);white-space:nowrap}
.ozr-dot{width:.5rem;height:.5rem;border-radius:50%;background:var(--muted)}
.tone-verified .ozr-dot{background:var(--verified)}
.tone-pending .ozr-dot{background:var(--pending)}
.tone-failed .ozr-dot{background:var(--failed)}
.ozr-caps{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.6rem}
.ozr-cap{background:var(--bg3);border:1px solid var(--line);border-radius:.5rem;padding:.7rem .85rem;display:flex;flex-direction:column;gap:.25rem}
.ozr-cap code{font-size:.9rem}
.ozr-cap-note{font-size:.75rem;color:var(--muted)}
.ozr-chain{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem;counter-reset:c}
.ozr-chain-node{flex:1 1 8rem;background:var(--bg3);border:1px solid var(--line);border-radius:.5rem;padding:.7rem .8rem;border-top:3px solid var(--line)}
.ozr-chain-node.tone-verified{border-top-color:var(--verified)}
.ozr-chain-node.tone-pending{border-top-color:var(--pending)}
.ozr-chain-node.tone-failed{border-top-color:var(--failed)}
.ozr-chain-label{display:block;font-weight:600;font-size:.9rem}
.ozr-chain-state{font-size:.72rem;color:var(--muted);font-family:var(--font-mono,monospace)}
.ozr-filter{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 1rem}
.ozr-chip{border:1px solid var(--line);background:var(--bg3);color:var(--muted);padding:.35rem .7rem;border-radius:2rem;font-size:.82rem;cursor:pointer}
.ozr-chip.is-on{color:var(--ink);border-color:var(--accent);background:rgba(91,140,255,.12)}
.ozr-chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ozr-arts{list-style:none;margin:0;padding:0;display:grid;gap:.65rem}
.ozr-art{background:var(--bg3);border:1px solid var(--line);border-radius:.6rem;padding:.9rem 1rem}
.ozr-art-head{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
.ozr-art-cat{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-right:.6rem}
.ozr-art-label{font-weight:600}
.ozr-art-ep{font-size:.82rem;color:#aeb4c2}
.ozr-art-actions{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.7rem}
.ozr-mini{border:1px solid var(--line);background:var(--bg2);color:var(--ink);padding:.35rem .65rem;border-radius:.45rem;font-size:.8rem;text-decoration:none;cursor:pointer}
.ozr-mini:hover{border-color:var(--accent)}
.ozr-mini:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ozr-json{margin:.8rem 0 0;padding:.9rem;background:#0a0b0f;border:1px solid var(--line);border-radius:.5rem;font-size:.8rem;max-height:22rem;overflow:auto;color:#c7cad3}
.ozr-validate{background:linear-gradient(180deg,rgba(91,140,255,.07),var(--bg2))}
.ozr-steps{list-style:none;margin:1.2rem 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.5rem;counter-reset:s}
.ozr-step{display:flex;align-items:center;gap:.6rem;background:var(--bg3);border:1px solid var(--line);border-radius:.5rem;padding:.6rem .75rem;font-size:.9rem}
.ozr-step-n{display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--bg);border:1px solid var(--line);font-size:.78rem;font-weight:600;flex:none}
.ozr-bounds{columns:2;gap:1.5rem;list-style:none;margin:0 0 1rem;padding:0}
.ozr-bounds li{padding:.3rem 0;color:#c7cad3}
.ozr-bounds li::before{content:"— "}
.ozr-faq{display:grid;gap:.5rem}
.ozr-faq-item{background:var(--bg3);border:1px solid var(--line);border-radius:.5rem;padding:.2rem .9rem}
.ozr-faq-item summary{cursor:pointer;padding:.7rem 0;font-weight:560}
.ozr-faq-item summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ozr-faq-item p{margin:0 0 .8rem;color:var(--muted)}
.ozr-diagram{display:block;width:100%;max-width:100%;height:auto;margin:1rem 0 1.4rem;border:1px solid var(--line);border-radius:.6rem;background:var(--bg3)}
.ozr-disclaimer{color:var(--muted);font-size:.85rem;border-top:1px solid var(--line);padding-top:1.2rem;margin-top:2rem}
@media (max-width:640px){.ozr-bounds{columns:1}.ozr-dim{grid-template-columns:1fr}.ozr-badge{justify-self:start}}
@media (prefers-reduced-motion:reduce){.ozr-btn{transition:none}}
`;
