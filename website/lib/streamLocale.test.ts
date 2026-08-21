import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The streamed ask is the PRIMARY path. The non-stream one is the escape hatch.
//
// The English answer-locale regression was first closed on `banzaiKb()` alone — the request carried the
// reader's edition, the response was verified against it, and every test passed. None of it ran in
// production: `BanzaiAgent` asks through `askViaStream()` and only falls back to `banzaiKb()` when the
// transport is unusable. A locale threaded through the fallback and not through the stream is a locale
// production never sends, and a verification that only guards the fallback guards the path nobody takes.
//
// So the property pinned here is not "the stream supports a locale". It is that the two paths cannot
// drift: whatever the non-stream path sends and checks, the streamed path sends and checks too.

const SRC = readFileSync(join(process.cwd(), "lib", "banzaiProgressClient.ts"), "utf8");

describe("the streamed ask carries and verifies the reader's edition", () => {
  it("sends the locale in the streamed request body", () => {
    // buildAskBody is shared with the non-stream path; the locale is its fifth argument. Passing the
    // conversation state and stopping there is the exact shape of the original omission.
    expect(SRC).toMatch(/buildAskBody\(\s*q,\s*history,\s*journey,\s*opts\.convState,\s*opts\.locale\s*\)/);
  });

  it("verifies the terminal envelope declares the edition that asked", () => {
    // The terminal `.final` IS the /ask envelope, so it carries the same `answer_locale` provenance and
    // must face the same check.
    expect(SRC).toMatch(/localeMatches\(\s*terminal\.final,\s*locale\s*\)/);
  });

  it("realizes the terminal answer for the reader, not for the default edition", () => {
    expect(SRC).toMatch(/mapAskResponse\(\s*terminal\.final \|\| \{\},\s*locale\s*\)/);
    // The defaulted call is what shipped Portuguese status lines under English answers.
    expect(SRC).not.toMatch(/mapAskResponse\(\s*terminal\.final \|\| \{\}\s*\)/);
  });

  it("does not infer the edition from the question or the answer text", () => {
    // No lexical detection anywhere on this path: the declaration decides, or nothing does.
    expect(SRC).not.toMatch(/detectLanguage|guessLocale|\/\[\\u00C0-\\u017F\]\//);
  });
});

describe("the agent asks through the stream with its edition attached", () => {
  const AGENT = readFileSync(join(process.cwd(), "components", "banzai", "BanzaiAgent.tsx"), "utf8");

  it("passes the locale to askViaStream, not only to the fallback", () => {
    // Anchored forward from the call itself: `setLastMetrics` is also a useState setter declared far
    // earlier in the file, and slicing to its first occurrence yields an empty string that matches nothing.
    const start = AGENT.indexOf("await askViaStream(");
    expect(start).toBeGreaterThan(0);
    const call = AGENT.slice(start, AGENT.indexOf("setLastMetrics", start));
    expect(call.length).toBeGreaterThan(0);
    // Both the stream options and the fallback closure must carry it — the fallback alone was the
    // incomplete fix. Asserted separately and specifically: a bare /locale/ over this whole region is
    // satisfied by the fallback line on its own, so it would stay green with the stream's locale deleted,
    // which is precisely the state being ruled out.
    expect(call).toMatch(/askViaStream\(q, history, journey, \{\s*\n\s*locale,/);
    expect(call).toMatch(/fallback:\s*\(\)\s*=>\s*banzaiKb\(q, history, journey, convState, locale\)/);
  });
});
