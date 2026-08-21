// The /ask envelope must tell the reader's client which locale the answer was composed for.
//
// The provenance already existed: composers stamp `result.answer_locale` at composition, and the
// knowledge path takes it from the realization that was actually used rather than from the locale that
// was requested. It simply never left the process. A client could therefore ask in English, receive the
// Portuguese answer the legacy default produces, and have no way to know — which is exactly what
// happened on the English surface.
//
// What this file pins is narrow and deliberate: the serving boundary EXPOSES that provenance and does not
// invent it. A layer that stamped the request locale onto whatever text arrived would satisfy every check
// while attesting to a composition it never performed, so a response whose composer left no provenance
// must go out as null rather than as a confident lie.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SERVER = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "server.js");
const src = readFileSync(SERVER, "utf8");

test("the ask envelope carries answer_locale", () => {
  assert.match(
    src,
    /answer_locale:\s*result\.answer_locale/,
    "the reader-facing envelope must expose the composed locale",
  );
});

test("the serving boundary reads provenance and never manufactures it", () => {
  // The forbidden shapes: stamping the requested locale, or falling back to it when the composer left
  // none. Either makes the field a restatement of the question instead of a fact about the answer.
  assert.doesNotMatch(
    src,
    /answer_locale:\s*result\.answer_locale\s*\?\?\s*locale/,
    "must not fall back to the requested locale",
  );
  assert.doesNotMatch(
    src,
    /answer_locale:\s*locale\b/,
    "must not stamp the requested locale onto the response",
  );
  assert.match(
    src,
    /answer_locale:\s*result\.answer_locale\s*\?\?\s*null/,
    "an unprovenanced answer must be declared null, not guessed",
  );
});

test("the field sits in the reader-facing body, not only in the internal result", () => {
  // `result` and `meta` are returned alongside the body for the streaming handler; the plain /ask route
  // serves the body alone. Provenance that lived only in `result` is provenance the client never sees —
  // which is the whole defect this closes.
  // Anchored on the reader-facing body by a field only it has, rather than on the first `body: {` in the
  // file — there are several, and picking the wrong one would test nothing.
  const start = src.indexOf("sources_count:");
  assert.ok(start > 0, "expected the reader-facing body to declare sources_count");
  const bodyRegion = src.slice(start - 2000, start + 2000);
  assert.match(bodyRegion, /answer_locale/, "answer_locale must be inside the response body");
});
