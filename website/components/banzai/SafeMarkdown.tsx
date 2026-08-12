"use client";

// M2.13D — SAFE Markdown rendering for BanzAI answers. A strict allowlist: only bold, italic, inline
// code, short lists, paragraphs and SAFE links render. Raw HTML is never parsed (no `rehype-raw`), so
// `<script>`, `<img onerror>`, iframes and inline event handlers are inert (shown as plain text, never
// executed). Link URLs pass a protocol allowlist (`safeHref`) — `javascript:`/`data:` and arbitrary
// external hosts are stripped to plain text. Applied to BOTH model and deterministic answers for
// consistency. Presentation only; it never changes the answer's meaning or the retrieval/routing.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeHref, urlTransform } from "@/components/banzai/safeLinks";

// Only these element types may render. `img`, `h1..h6`, `table`, `pre`, `blockquote`, raw HTML, etc.
// are dropped; `unwrapDisallowed` keeps their text content so nothing is silently lost.
const ALLOWED = ["p", "br", "strong", "em", "code", "a", "ul", "ol", "li"];

export function SafeMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className} data-safe-markdown="1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={ALLOWED}
        unwrapDisallowed
        urlTransform={urlTransform}
        components={{
          p: ({ children }) => (
            <p className="m-0 mb-[10px] text-[14.5px] leading-[1.68] text-ink-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded-[4px] bg-ink/[0.05] px-[5px] py-[1px] font-mono text-[12.5px] text-ink-1">
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul className="m-0 mb-[10px] flex list-none flex-col gap-[5px] p-0 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="m-0 mb-[10px] flex list-decimal flex-col gap-[5px] pl-[18px] last:mb-0">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-[8px] text-[14px] leading-[1.6] text-ink-2">
              <span className="mt-[9px] h-[4px] w-[4px] flex-none rounded-full bg-bordo/50" />
              <span className="flex-1">{children}</span>
            </li>
          ),
          a: ({ href, children }) => {
            const safe = safeHref(href);
            // A disallowed URL still shows its text — it just is not a link.
            if (!safe) return <span className="text-ink-2">{children}</span>;
            return (
              <a
                href={safe}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-bordo underline decoration-bordo/30 underline-offset-2 transition-colors hover:decoration-bordo"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
