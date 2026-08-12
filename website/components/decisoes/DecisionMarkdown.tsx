import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders the full ADR/RFC document body in its ORIGINAL language, unmodified.
// Reuses the same safe pipeline as the protocol reference: react-markdown +
// remark-gfm, with raw HTML NOT enabled (rehype-raw absent) — any embedded HTML
// is escaped, so no scripts or unsafe markup can execute. Wrapped in
// `.reference-body` for consistent typography, scrollable tables and code.
//
// Relative links inside the documents (e.g. `ADR-006-….md`, `../governance/…`)
// are rewritten to the canonical GitHub location so they never 404 on the site.
const GH_BLOB = "https://github.com/banza-protocol/banza/blob/main/";

function resolveHref(href: string, baseDir: string): { url: string; external: boolean } {
  if (/^https?:\/\//.test(href)) return { url: href, external: true };
  if (href.startsWith("#")) return { url: href, external: false }; // in-page anchor
  if (href.startsWith("mailto:")) return { url: href, external: false };
  // Resolve a repo-relative path against the document's directory, then point to GitHub.
  const stack = baseDir.split("/").filter(Boolean);
  for (const part of href.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return { url: GH_BLOB + stack.join("/"), external: true };
}

export function DecisionMarkdown({ markdown, baseDir }: { markdown: string; baseDir: string }) {
  return (
    <div className="reference-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const { url, external } = resolveHref(href ?? "", baseDir);
            return external ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <a href={url}>{children}</a>
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
