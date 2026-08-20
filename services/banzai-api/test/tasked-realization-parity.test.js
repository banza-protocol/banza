// The catalogue must describe the Rust tables exactly — every item, byte for byte in Portuguese.
//
// The tasked terminal's content lives in Rust as Portuguese sentences inside typed section structs.
// Localizing it means moving the WORDING here while Rust keeps deciding WHICH facts appear and in what
// order. That exchange is only safe if the Portuguese side is provably unchanged: if a single sentence
// drifts during the move, the Portuguese reader silently gets different content than before, and the
// English reader gets a translation of something that was never served.
//
// So parity is checked against the generated inventory, which is extracted from `tasked.rs` itself:
//   every inventory item has a catalogue entry,
//   its Portuguese text matches byte for byte,
//   no catalogue entry is an orphan,
//   and every item has an English realization too.
//
// TWO IDENTIFIERS. `locator` (`subject.task.section[.index]`) says where an item sits in the Rust
// tables and is what parity is checked against. `item_id` says what the fact IS. They are separate
// because inserting a step renumbers every locator after it while the facts themselves do not change —
// a positional string is a coordinate, not a name.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TASKED_ITEMS, TASKED_SECTION_LABELS, taskedItem, taskedItemIds } from "../src/taskedRealizations.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INVENTORY = join(REPO, "docs", "banzai", "tasked-item-inventory.json");

const inventory = JSON.parse(readFileSync(INVENTORY, "utf8"));
const LOCALES = ["pt-PT", "en"];

test("the inventory is real and non-trivial, else every property here is vacuous", () => {
  assert.ok(inventory.count >= 100, `inventory looks truncated: ${inventory.count} items`);
  assert.equal(inventory.items.length, inventory.count, "the declared count must match the items present");
  const subjects = new Set(inventory.items.map((i) => i.subject));
  const blocks = new Set(inventory.items.map((i) => `${i.subject}.${i.task}`));
  assert.ok(subjects.size >= 11, `only ${subjects.size} subjects discovered`);
  assert.ok(blocks.size >= 21, `only ${blocks.size} data blocks discovered`);
});

test("every Rust item has a catalogue entry at the same source locator", () => {
  const byLocator = new Map();
  for (const [id, entry] of Object.entries(TASKED_ITEMS)) {
    assert.ok(entry.locator, `${id} declares no source locator`);
    assert.ok(!byLocator.has(entry.locator), `two items claim locator ${entry.locator}`);
    byLocator.set(entry.locator, id);
  }
  const missing = inventory.items.filter((i) => !byLocator.has(i.item_id)).map((i) => i.item_id);
  assert.deepEqual(missing, [], `${missing.length} Rust item(s) have no catalogue entry`);
});

test("the Portuguese realization matches the Rust source byte for byte", () => {
  // The exchange this whole change rests on: Portuguese content moves, it does not change. A drifted
  // sentence here would mean the Portuguese reader silently gets different content than before.
  const byLocator = new Map(Object.entries(TASKED_ITEMS).map(([id, e]) => [e.locator, { id, ...e }]));
  const drifted = [];
  for (const item of inventory.items) {
    const entry = byLocator.get(item.item_id);
    if (!entry) continue; // the property above owns absence
    if (entry["pt-PT"] !== item.pt) {
      drifted.push(`${entry.id} (${item.item_id})\n      rust: ${item.pt}\n      cat : ${entry["pt-PT"]}`);
    }
  }
  assert.deepEqual(drifted, [], `${drifted.length} Portuguese realization(s) drifted from the Rust source`);
});

test("no catalogue entry is an orphan", () => {
  // The converse: an entry whose locator no longer exists in Rust is content nobody serves, and it
  // would quietly pad the coverage counts.
  const locators = new Set(inventory.items.map((i) => i.item_id));
  const orphans = Object.entries(TASKED_ITEMS)
    .filter(([, e]) => !locators.has(e.locator))
    .map(([id, e]) => `${id} -> ${e.locator}`);
  assert.deepEqual(orphans, [], `${orphans.length} catalogue entr(ies) point at a locator Rust no longer has`);
});

test("every semantic item is realized in BOTH locales", () => {
  const gaps = [];
  for (const id of taskedItemIds()) {
    for (const locale of LOCALES) {
      if (!taskedItem(id, locale)) gaps.push(`${id} [${locale}]`);
    }
  }
  assert.deepEqual(gaps, [], `${gaps.length} missing realization(s) — a locale cannot serve a partial procedure`);
});

test("the two locales are genuinely different text, not a copied placeholder", () => {
  // A catalogue where `en` was filled by pasting the Portuguese would satisfy every count above while
  // serving Portuguese to English readers — the exact defect being fixed.
  const copied = taskedItemIds().filter((id) => taskedItem(id, "pt-PT") === taskedItem(id, "en"));
  // Actor names like "operator A" legitimately coincide; anything longer must not.
  const substantive = copied.filter((id) => String(taskedItem(id, "pt-PT")).length > 24);
  assert.deepEqual(substantive, [], `${substantive.length} English realization(s) are copies of the Portuguese`);
});

test("semantic identity is not the source position", () => {
  // A catalogue keyed by `subject.task.section.index` would look identical to this one and be worthless:
  // inserting a step would renumber the ids and silently reassign meanings.
  const positional = taskedItemIds().filter((id) => /\.(steps|sequence|actors|prerequisites|validations)\.\d+$/.test(id));
  assert.deepEqual(positional, [], "semantic ids must name the fact, not its position in a list");
  for (const id of taskedItemIds()) {
    assert.ok(id.includes("."), `${id} must be namespaced by domain`);
    assert.ok(id.length > 8, `${id} is too short to name a fact`);
  }
});

test("section labels exist in both locales for every section the inventory uses", () => {
  const used = new Set(inventory.items.map((i) => i.section));
  // `framing`, `gap_note` and `schema_note` are prose, not headings — they have no label.
  const headings = [...used].filter((s) => !["framing", "gap_note", "schema_note"].includes(s));
  for (const locale of LOCALES) {
    for (const section of headings) {
      assert.ok(
        TASKED_SECTION_LABELS[locale][section],
        `no ${locale} label for section "${section}"`,
      );
    }
  }
  assert.ok(headings.length >= 5, `only ${headings.length} heading sections discovered`);
});
