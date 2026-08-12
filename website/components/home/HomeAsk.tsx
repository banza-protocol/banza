"use client";

import { useEffect, useRef, useState } from "react";
import { banzaiKb, type ChatTurn, type ConversationState } from "./banzaiKb";
import { SafeMarkdown } from "@/components/banzai/SafeMarkdown";
import { BanzaiMark } from "@/components/BanzaiMark";

// M2.16 — "Perguntar ao BanzAI" hero card. UI ported 1:1 from the dossier design (Home.dc.html),
// but the Q&A brain is the LIVE BanzAI agent (same-origin POST /banzai/ask via banzaiKb, local Qwen),
// NOT the design's canned kb() — those canned answers carried the retired protocol model (a central
// CA, a commercial operator brand, certified-operator language, stale ADRs, payments) which the current
// protocol no longer uses. Answers
// render through the shared SafeMarkdown; real sources render as citation chips. Enter submits,
// Shift+Enter breaks the line, the textarea auto-grows to 180px.

const F_SANS = "var(--font-sans), sans-serif";
const F_SERIF = "var(--font-serif), serif";
const F_MONO = "var(--font-mono), monospace";

type Msg = { role: "user" | "ai"; text: string; cites?: string[]; status?: string };

const CHIPS: { label: string; q: string; icon: React.ReactNode }[] = [
  {
    label: "O que é o BANZA?",
    q: "O que é o BANZA?",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8E1326" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" /></svg>
    ),
  },
  {
    label: "Por onde começa um operador?",
    q: "Por onde começa um operador?",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8E1326" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M16 6a3 3 0 0 1 0 5.5M21 20c0-2.4-1.3-4-3.5-4.6" /></svg>
    ),
  },
  {
    label: "Validar um manifesto",
    q: "Como valido um manifesto de operador?",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8E1326" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" /></svg>
    ),
  },
  {
    label: "Onde está esta regra?",
    q: "Onde está definida esta regra na referência?",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8E1326" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v16H5.5A2.5 2.5 0 0 0 3 21.5z" /><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v16h6.5A2.5 2.5 0 0 1 21 21.5z" /></svg>
    ),
  },
];

export function HomeAsk() {
  const askRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false); // synchronous double-submit lock (set before React commits `busy`)
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  // BZCI-6 (§2) — the SAFE typed conversational state returned on the last turn, carried verbatim into the
  // next ask so the Rust reference resolver can inherit the subject/intent (multi-turn follow-ups). Referent
  // only — re-resolved server-side, never trusted as a fact source.
  const [convState, setConvState] = useState<ConversationState | null>(null);

  const ask = async (text: string) => {
    const q = (text || "").trim();
    // Guard against a double submit (rapid Enter/click before `busy` commits): the ref flips
    // synchronously, so a second call in the same tick returns immediately — the question is sent once.
    if (!q || inFlight.current) return;
    inFlight.current = true;
    const history: ChatTurn[] = msgs.map((m) => ({ role: m.role, text: m.text }));
    setMsgs((prev) => [...prev, { role: "user", text: q }]);
    setBusy(true);
    try {
      const ans = await banzaiKb(q, history, undefined, convState);
      // BZCI-6 (§2) — carry the backend's SAFE conversation_context to the next turn (only when present).
      if (ans.conversationContext) setConvState(ans.conversationContext);
      setMsgs((prev) => [...prev, { role: "ai", text: ans.text, cites: ans.cites, status: ans.status }]);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, busy]);

  const go = () => {
    const el = askRef.current;
    if (el) { ask(el.value); el.value = ""; el.style.height = "auto"; }
  };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); }
  };
  const onInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 180) + "px";
  };

  const chip: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 500, color: "#3A2E20",
    background: "#fff", border: "1px solid #E4DAC8", padding: "12px 18px", borderRadius: 12, whiteSpace: "nowrap",
    cursor: "pointer", fontFamily: F_SANS,
  };

  return (
    <div
      style={{
        position: "relative", zIndex: 2, marginTop: "clamp(6px,1vw,16px)", background: "#FCFAF5",
        border: "1px solid #E7DFD0", borderRadius: 22,
        boxShadow: "0 28px 66px -30px rgba(94,12,24,0.30),0 4px 14px rgba(20,25,30,0.05)", padding: "clamp(20px,2.4vw,30px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <span style={{ display: "inline-flex", width: 46, height: 46, borderRadius: 13, background: "#FBEFF0", border: "1px solid rgba(142,19,38,0.18)", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <BanzaiMark size={22} color="#8E1326" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: F_SERIF, fontSize: 20, fontWeight: 600, color: "#16191E", lineHeight: 1.15 }}>Perguntar ao BanzAI</div>
          <div style={{ fontSize: 13, color: "#8A8275", lineHeight: 1.35, marginTop: 2 }}>Agente de IA do protocolo BANZA</div>
        </div>
      </div>

      <label htmlFor="hero-ask" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
        Pergunta sobre o protocolo BANZA ou cola um artefacto técnico
      </label>
      <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 8, background: "#fff", border: "1px solid #D8D0C0", borderRadius: 14, padding: "8px 18px", minWidth: 0 }}>
          <textarea
            id="hero-ask" ref={askRef} onKeyDown={onKey} onInput={onInput} rows={1}
            placeholder="Pergunta sobre o protocolo ou cola um artefacto técnico…"
            style={{ flex: 1, resize: "none", background: "transparent", border: "none", outline: "none", color: "#16191E", fontSize: 15.5, lineHeight: 1.55, fontFamily: F_SANS, padding: "11px 0", maxHeight: 180, minWidth: 0 }}
          />
        </div>
        <button
          onClick={go} disabled={busy}
          style={{ flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#8E1326", color: "#fff", border: "none", cursor: busy ? "default" : "pointer", fontFamily: F_SANS, fontSize: 15.5, fontWeight: 600, padding: "0 28px", borderRadius: 13, opacity: busy ? 0.7 : 1 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>Perguntar
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {CHIPS.map((c) => (
          <button key={c.label} onClick={() => ask(c.q)} style={chip}>
            {c.icon}<span>{c.label}</span>
          </button>
        ))}
      </div>

      {(msgs.length > 0 || busy) && (
        <div ref={scrollRef} aria-live="polite" style={{ maxHeight: 340, overflowY: "auto", marginTop: 18, borderTop: "1px solid #ECE5D6", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {msgs.map((m, i) => {
            const ai = m.role === "ai";
            return (
              <div key={i} style={{ display: "flex", gap: 12, flexDirection: ai ? "row" : "row-reverse", alignItems: "flex-start" }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: ai ? "#8E1326" : "#EDE8DD", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: F_MONO, fontSize: 11, color: ai ? "#fff" : "#6B6358" }}>{ai ? <BanzaiMark size={16} color="#fff" /> : "tu"}</span>
                <div style={{ flex: 1, maxWidth: "86%" }}>
                  <div style={{ background: ai ? "#FFFFFF" : "#FBF3E3", border: `1px solid ${ai ? "#E4DECF" : "rgba(154,107,30,0.3)"}`, borderRadius: 10, padding: "12px 16px", color: ai ? "#3A3F45" : "#5A4A2E", fontSize: 14, lineHeight: 1.6 }}>
                    {ai ? <SafeMarkdown text={m.text} /> : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.text}</p>}
                  </div>
                  {ai && m.cites && m.cites.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                      {m.cites.map((c) => (
                        <span key={c} style={{ fontFamily: F_MONO, fontSize: 10, color: "#9A6B1E", border: "1px solid rgba(154,107,30,0.3)", background: "#FBF3E3", padding: "3px 8px", borderRadius: 4 }}>{c}</span>
                      ))}
                    </div>
                  )}
                  {ai && m.status && (
                    <p style={{ margin: "6px 0 0", fontFamily: F_MONO, fontSize: 10, lineHeight: 1.4, color: "#9A968C" }}>{m.status}</p>
                  )}
                </div>
              </div>
            );
          })}
          {busy && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#8A8275" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "#8E1326", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontFamily: F_MONO, fontSize: 11, color: "#fff" }}><BanzaiMark size={16} color="#fff" /></span>
              <span style={{ fontFamily: F_MONO, fontSize: 12 }} className="animate-pulse">A consultar as fontes locais…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
