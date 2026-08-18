// Does this text ASSERT that <subject> <predicate>? — the matcher the institutional properties are read with.
//
// The first version searched for the subject and the object within one sentence and then scanned 60
// characters backwards for a negator. That has no semantic boundary, and it failed in the ordinary shape of
// this corpus, where a denial is immediately followed by the thing it is contrasted with:
//
//     O protocolo não é, ele próprio, um certificador. O BanzAI certifica implementações.
//
// The second sentence states a prohibited claim. The `não` sixty characters upstream belongs to a different
// sentence and a different subject, and it silently defused the match — so the matcher reported GREEN while
// the forbidden claim sat in the answer. A matcher that under-detects violations is worse than no matcher:
// it is a green light bolted to a broken sensor.
//
// The replacement binds negation to the RELATION:
//
//   1. Text is cut into sentences, and sentences into clauses. Negation never crosses either boundary,
//      because an independent clause carries its own polarity.
//   2. A relation is a (subject, predicate) pair inside ONE clause, subject first.
//   3. The relation is negated when a negator sits between the subject and the predicate, or when a negator
//      precedes the subject in a cleft ("Não é o protocolo que certifica") — recognized structurally by the
//      tokens in between, never by a character distance.
//   4. A clause with no subject of its own inherits the subject of the preceding clause in the same
//      sentence — but never its polarity. Subject carries; negation does not. (The same rule the query
//      frame uses for conversational context: inherit the subject, never the action.)
//
// Clause boundaries are the marks and conjunctions that introduce a new predication — `;` `:` `—` and
// coordinating/adversative conjunctions. A bare comma is NOT one, because in this corpus commas are mostly
// appositive ("não é, ele próprio, um certificador") and splitting on them would separate a negator from
// the predicate it governs.

const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;
const CLAUSE_SPLIT =
  /\s*[;:—–]\s*|\s+(?:mas|porém|contudo|todavia|embora|enquanto|but|however|while|whereas|although)\s+|\s*,\s*(?:e|and)\s+|\s+(?:e|and)\s+(?=(?:n[ãa]o|nunca|nem|jamais|not|never|neither)\s)/i;

const NEGATORS = [
  "não", "nao", "nunca", "jamais", "nem", "sem", "nenhum", "nenhuma",
  "not", "never", "no", "neither", "nor", "without", "cannot", "cant", "doesnt", "dont", "isnt", "arent",
];

// Tokens that may stand between a leading negator and the subject in a cleft construction. Anything else
// means the negator governs some other predication, not this one. This is a grammatical test, not a window.
const CLEFT_BRIDGE = new Set([
  "é", "e", "eh", "o", "a", "os", "as", "um", "uma", "que", "quem", "apenas", "só", "so", "somente",
  "is", "it", "the", "that", "an", "only", "just", "who", "which",
]);

// Emphasis markers are stripped first. The corpus bolds its canonical entities, so a sentence ends
// "…distintas.**" — and a boundary rule looking for a period followed by whitespace runs straight past it,
// welding two sentences into one and letting the first one's polarity leak into the second.
const norm = (s) =>
  String(s).toLowerCase().replace(/[*_`]+/g, "").replace(/\s+/g, " ").trim();
const tokens = (s) => norm(s).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

function isNegator(tok) {
  return NEGATORS.includes(tok);
}

/** A negator anywhere in this span (span is already clause-bounded by the caller). */
function spanNegated(span) {
  return tokens(span).some(isNegator);
}

// English postposes its negation into the complement: "grants neither admission nor authorization" denies
// the relation with nothing before the verb at all. A negative quantifier standing where the object belongs
// negates the relation.
const NEG_QUANTIFIER = new Set([
  "neither", "nor", "none", "nothing", "nenhum", "nenhuma", "nenhuns", "nenhumas", "nada", "nem",
]);
// Tokens that may sit between a predicate and its object without being the object.
const OBJECT_BRIDGE = new Set([
  "a", "o", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "any", "an", "the", "to", "of", "sequer",
]);

function postNegated(after) {
  for (const tok of tokens(after)) {
    if (NEG_QUANTIFIER.has(tok)) return true;
    if (!OBJECT_BRIDGE.has(tok)) return false;
  }
  return false;
}

// A clause has a subject of its own when something before the predicate can BE one. Only then does it stop
// inheriting the previous clause's subject — otherwise "o protocolo não certifica, e o BanzAI certifica"
// would let `protocolo` inherit into a clause that plainly names someone else.
const NON_SUBJECT_LEAD = new Set([
  ...NEGATORS, ...CLEFT_BRIDGE, ...NEG_QUANTIFIER, ...OBJECT_BRIDGE,
  "também", "tambem", "ainda", "já", "ja", "also", "still", "yet", "then", "therefore", "portanto", "assim",
]);

function subjectIsElided(lead) {
  return tokens(lead).every((t) => NON_SUBJECT_LEAD.has(t));
}

/** "Não é o protocolo que certifica" — the negator governs the relation through a cleft. */
function cleftNegated(lead) {
  const toks = tokens(lead);
  for (let i = toks.length - 1; i >= 0; i--) {
    if (isNegator(toks[i])) return true;
    if (!CLEFT_BRIDGE.has(toks[i])) return false;
  }
  return false;
}

function clausesOf(text) {
  const out = [];
  for (const sentence of norm(text).split(SENTENCE_SPLIT)) {
    // An interrogative asserts nothing. These answers routinely echo the question before denying it —
    // "Um operador e uma implementação são a mesma coisa? Não — são coisas distintas." — and reading the
    // echo as a claim would report the denial itself as the violation.
    if (sentence.trim().endsWith("?")) continue;
    const parts = sentence.split(CLAUSE_SPLIT).filter((p) => p && p.trim());
    parts.forEach((clause, i) => out.push({ clause: clause.trim(), sentence, first: i === 0 }));
  }
  return out;
}

function allMatches(re, text) {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  const out = [];
  let m;
  while ((m = g.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  return out;
}

/**
 * True when `text` AFFIRMS that <subject> <predicate>.
 *
 * @param {string} text        the answer as the reader receives it
 * @param {RegExp|string} subject    the actor
 * @param {RegExp|string} predicate  what it is said to do
 * @returns {{asserted: boolean, clause: string|null, why: string}}
 */
export function relation(text, subject, predicate) {
  const sRe = subject instanceof RegExp ? subject : new RegExp(subject, "i");
  const pRe = predicate instanceof RegExp ? predicate : new RegExp(predicate, "i");

  let carried = null; // subject inherited across coordinated clauses of the same sentence
  let sentence = null;
  let sawPair = false;

  for (const { clause, sentence: sent, first } of clausesOf(text)) {
    if (sent !== sentence) {
      sentence = sent;
      carried = null; // a new sentence inherits nothing
    }

    const subs = allMatches(sRe, clause);
    const preds = allMatches(pRe, clause);
    if (subs.length) carried = subs[subs.length - 1];
    if (!preds.length) continue;

    // Pairs inside this clause, subject before predicate.
    for (const p of preds) {
      const before = subs.filter((s) => s.end <= p.start);
      const s = before.length ? before[before.length - 1] : null;

      if (s) {
        sawPair = true;
        if (spanNegated(clause.slice(s.end, p.start))) continue;
        if (cleftNegated(clause.slice(0, s.start))) continue;
        if (postNegated(clause.slice(p.end))) continue;
        return { asserted: true, clause, why: "affirmative subject-predicate relation in one clause" };
      }

      // No subject of its own: inherit the sentence's subject, never its polarity.
      if (!first && carried && !subs.length && subjectIsElided(clause.slice(0, p.start))) {
        sawPair = true;
        if (spanNegated(clause.slice(0, p.start))) continue;
        if (postNegated(clause.slice(p.end))) continue;
        return { asserted: true, clause, why: "affirmative relation on an inherited subject" };
      }
    }
  }

  return {
    asserted: false,
    clause: null,
    why: sawPair ? "every subject-predicate pair is negated in its own clause" : "no subject-predicate pair",
  };
}

/** Convenience for assertions: the boolean alone. */
export const asserts = (text, subject, predicate) => relation(text, subject, predicate).asserted;

/**
 * Equality is not a verb. C1 asks whether the text says an operator and an implementation are THE SAME —
 * a symmetric claim, expressible either way round ("um operador é uma implementação" / "uma implementação é
 * um operador" / "são a mesma coisa"). Reading it with verb semantics gets the direction wrong and misses
 * half the ways the claim can be made, so it gets its own reading.
 */
export function assertsEquality(text, a, b) {
  const aRe = a instanceof RegExp ? a : new RegExp(a, "i");
  const bRe = b instanceof RegExp ? b : new RegExp(b, "i");
  const SAME =
    /(?:é|s[ãa]o|e)\s+(?:a\s+)?mesma\s+coisa|s[ãa]o\s+iguais|s[ãa]o\s+equivalentes|s[ãa]o\s+sin[óo]nimos|equivale[m]?\s+a|are\s+the\s+same|is\s+the\s+same|are\s+equivalent|are\s+synonym|are\s+identical/i;

  // Either term as subject of an explicit sameness predicate.
  if (asserts(text, aRe, SAME) || asserts(text, bRe, SAME)) return true;
  // Or copular identification in either direction: "um operador é uma implementação".
  // The interpolated source must be GROUPED. Without `(?: … )` an alternation inside it becomes a
  // top-level alternative of the whole pattern, so `implementa[çc][ãa]o|implementation` reduced this to
  // "the copular form, OR the bare word anywhere" — and every sentence merely mentioning an implementation
  // read as an assertion of identity. It fired on a clause that says the two are distinct.
  //
  // The copula must be a WHOLE WORD. Unbounded, `is` matched inside "dois", so "dois operadores
  // interoperam" — a sentence about federation — read as "…is operador" and reported an identity claim.
  // `\b` cannot do this here: it is ASCII-based, and `é` is not a word character to it, so `\bé` never
  // matches after a space. The boundary is written as a Unicode letter/digit lookaround instead.
  const B = String.raw`(?<![\p{L}\p{N}])`;
  const E = String.raw`(?![\p{L}\p{N}])`;
  const COP = (t) => new RegExp(`${B}(?:é|s[ãa]o|is|are)${E}\\s+(?:um|uma|an?|the)?\\s*(?:${t.source})`, "iu");
  return asserts(text, aRe, COP(bRe)) || asserts(text, bRe, COP(aRe));
}
