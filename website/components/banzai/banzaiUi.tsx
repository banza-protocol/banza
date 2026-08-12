// Shared BanzAI UI primitives (icons + the card surface) used by the single /banzai shell
// (BanzaiAgent) and by the in-shell validation mode (BanzaiValidationMode). Extracted so both render
// with the same light "bordo/paper" theme — there is one shell, one visual language, two modes.

import { type ReactNode } from "react";
import type { WbIcon } from "@/components/banzai/banzai-agent";

/* ── Line icons (inline, stroke=currentColor) ──────────────────────────────── */
export type IconKey =
  | WbIcon
  | "repo"
  | "quote"
  | "sliders"
  | "sparkle"
  | "send"
  | "chevron"
  | "info"
  | "arrow"
  | "terminal"
  | "shield"
  | "coins"
  | "menu"
  | "x"
  | "panel"
  | "chevronLeft";

export const PATHS: Record<IconKey, ReactNode> = {
  chat: <><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.6 8.6 0 0 1-3.6-.8L3.5 20.5l1.4-5.3a8.4 8.4 0 0 1-.9-3.7A8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" /></>,
  doc: <><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></>,
  route: <><line x1="6" y1="4" x2="6" y2="15" /><circle cx="18" cy="6" r="2.6" /><circle cx="6" cy="18" r="2.6" /><path d="M18 8.6a9 9 0 0 1-9 9" /></>,
  graph: <><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><line x1="8.4" y1="13.4" x2="15.6" y2="17.6" /><line x1="15.6" y1="6.4" x2="8.4" y2="10.6" /></>,
  medal: <><circle cx="12" cy="9" r="5.4" /><path d="M8.6 13.4 7 21l5-2.6L17 21l-1.6-7.6" /></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  book: <><path d="M12 7v13" /><path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H9a3 3 0 0 1 3 3 3 3 0 0 1 3-3h4.5A1.5 1.5 0 0 1 21 5.5v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 2.6 3 3 0 0 0-3-2.6H4a1 1 0 0 1-1-1z" /></>,
  scale: <><path d="M12 3v18" /><path d="M5 7h14" /><path d="M5 7 2.5 13a3 3 0 0 0 5 0z" /><path d="M19 7l2.5 6a3 3 0 0 1-5 0z" /><path d="M7.5 21h9" /></>,
  repo: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  quote: <><path d="M9 7c-2.2.7-3.5 2.4-3.5 4.6V17H10v-5H7.6c0-1.2.6-2 1.9-2.4zM18.5 7C16.3 7.7 15 9.4 15 11.6V17h4.5v-5h-2.4c0-1.2.6-2 1.9-2.4z" /></>,
  sliders: <><line x1="5" y1="21" x2="5" y2="13" /><line x1="5" y1="9" x2="5" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="19" y1="21" x2="19" y2="15" /><line x1="19" y1="11" x2="19" y2="3" /><line x1="2.5" y1="13" x2="7.5" y2="13" /><line x1="9.5" y1="8" x2="14.5" y2="8" /><line x1="16.5" y1="15" x2="21.5" y2="15" /></>,
  sparkle: <><path d="M12 3l1.7 5.1a2 2 0 0 0 1.2 1.2L20 11l-5.1 1.7a2 2 0 0 0-1.2 1.2L12 19l-1.7-5.1a2 2 0 0 0-1.2-1.2L4 11l5.1-1.7a2 2 0 0 0 1.2-1.2z" /><path d="M19 4v3M20.5 5.5h-3" /></>,
  send: <><path d="M21.5 3.5 11 14" /><path d="M21.5 3.5 15 21l-3.8-7.7L3.5 9.5z" /></>,
  chevron: <polyline points="9 6 15 12 9 18" />,
  info: <><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12" y2="8" /></>,
  arrow: <><line x1="4" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></>,
  terminal: <><polyline points="4 7 9 12 4 17" /><line x1="12" y1="17" x2="20" y2="17" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.6-3 7.9-7 9-4-1.1-7-4.4-7-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  coins: <><ellipse cx="8" cy="6" rx="5" ry="2.5" /><path d="M3 6v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6" /><path d="M11 13.4c.6 1.1 2.6 1.9 5 1.9 2.8 0 5-1.1 5-2.5V8c0-1.4-2.2-2.5-5-2.5-1.3 0-2.5.24-3.4.64" /></>,
  menu: <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>,
  x: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="15" y1="4" x2="15" y2="20" /></>,
  chevronLeft: <polyline points="15 6 9 12 15 18" />,
};

export function Ico({ name, size = 18, sw = 1.6, className = "" }: { name: IconKey; size?: number; sw?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {PATHS[name]}
    </svg>
  );
}

export const CARD = "rounded-[10px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,19,30,0.04)]";
