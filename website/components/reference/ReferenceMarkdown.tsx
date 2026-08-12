import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import { slugifyHeading } from "@/lib/reference";

// Flatten react children to a plain string for heading-id slugs.
function toText(children: ReactNode): string {
  if (children == null) return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(toText).join("");
  if (typeof children === "object" && "props" in (children as { props?: { children?: ReactNode } })) {
    return toText((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

/**
 * Renders the protocol reference markdown. Raw HTML is NOT enabled (no
 * rehype-raw) — react-markdown escapes any embedded HTML, so no scripts or
 * unsafe markup can render. GFM tables/strikethrough via remark-gfm.
 */
export function ReferenceMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="reference-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 id={slugifyHeading(toText(children))}>{children}</h1>,
          h2: ({ children }) => <h2 id={slugifyHeading(toText(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={slugifyHeading(toText(children))}>{children}</h3>,
          a: ({ href, children }) => {
            const h = href ?? "";
            return /^https?:\/\//.test(h) ? (
              <a href={h} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <a href={h}>{children}</a>
            );
          },
          table: ({ children }) => (
            <div className="table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
