"use client";

import { useState } from "react";

export type FaqGroup = { label: string; items: [string, string][] };

export function FaqAccordion({ groups }: { groups: FaqGroup[] }) {
  // Single-open accordion; first item open by default (handoff parity).
  const [open, setOpen] = useState<string | null>("q0");
  let idx = 0;

  return (
    <>
      {groups.map((g) => (
        <div key={g.label} className="mb-9">
          <div className="mb-[14px] font-mono text-[11px] tracking-[0.18em] text-ink-5">{g.label}</div>
          <div className="overflow-hidden rounded-cardish border border-black/10">
            {g.items.map(([q, a]) => {
              const id = "q" + idx++;
              const isOpen = open === id;
              return (
                <div key={id} className="border-t border-black/[0.07] first:border-t-0">
                  <h3 className="m-0">
                    <button
                      onClick={() => setOpen((cur) => (cur === id ? null : id))}
                      aria-expanded={isOpen}
                      className="flex w-full cursor-pointer items-center justify-between gap-[18px] bg-white px-[22px] py-5 text-left transition-colors hover:bg-paper-2"
                    >
                      <span className="text-[15.5px] font-semibold leading-[1.4] text-ink">{q}</span>
                      <span
                        className={`flex-none font-mono text-[18px] transition-transform duration-200 ${isOpen ? "rotate-45 text-bordo-soft" : "text-ink-5"}`}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>
                  </h3>
                  {isOpen && (
                    <div className="bg-white px-[22px] pb-[22px] pt-1">
                      <p className="m-0 max-w-[74ch] text-[14.5px] leading-[1.7] text-ink-3">{a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
