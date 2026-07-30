// covers: file:scripts
// size: small
//
// t370 — scope-grid write/check symmetry in scripts/promote-self.ts.
// Mechanism: none — pure imports of the script's exported helpers (its main
// flow is guarded by import.meta.main, so importing runs no build and no
// check); zero spawn, zero LLM, zero tokens.
//
// WHY THIS EXISTS (#1734): the check was a per-key comparison and the write
// was a re-serialisation, so the two disagreed about key ORDER. A runtime
// grid whose composed (dst-only) keys sat BEFORE the dist keys satisfied the
// check — promote:self:check reported no drift — while the very next
// `promote:self --apply` rewrote the file in the write path's own order,
// producing a whole-file move diff (~144 lines on the self-install grid) that
// no check had predicted. The entries were never dropped; the diff was a move.
//
// WHAT IS UNDER TEST:
//   1. The pre-fix shape (extras first) is now DETECTED by the check.
//   2. --apply is idempotent: re-merging its own output is byte-identical.
//   3. A grid with no composed entry stays byte-identical to dist (the
//      byte-stability guarantee t200 pins is not weakened by canonicalisation).
//   4. Composed scopes named after Object.prototype members survive. `in`
//      membership resolved `constructor`/`toString` against the prototype and
//      classified them as non-composed, so --apply DROPPED them; assigning
//      `__proto__` set the prototype rather than a data key, dropping that one
//      too. All three vanished silently while the check reported in-sync.

import { describe, expect, test } from "bun:test";
import { mergeScopeGrid, scopeGridInSync } from "../../scripts/promote-self.ts";

const grid = (obj: Record<string, unknown>): Buffer =>
  Buffer.from(`${JSON.stringify(obj, null, 2)}\n`, "utf-8");

// A dist grid with enough keys that a reordering is a large move diff, and
// whose natural order is NOT sorted — so canonicalisation is observable.
const STOCK: Record<string, unknown> = {
  mvp: { stages: { "intent-capture": "EXECUTE" } },
  feature: { stages: { "intent-capture": "EXECUTE" } },
  fix: { stages: { "intent-capture": "SKIP" } },
  "amadeus-bugfix": { stages: { "intent-capture": "SKIP" } },
};

// The on-disk shape that reproduces #1734: the composed key precedes every
// dist key (the order `.codex/tools/data/scope-grid.json` had at c48877451).
const EXTRAS_FIRST = grid({
  "team-custom": { stages: { "intent-capture": "EXECUTE" } },
  ...STOCK,
});

describe("t370 promote-self scope-grid ordering", () => {
  test("check detects a grid whose composed key precedes the dist keys", () => {
    expect(scopeGridInSync(EXTRAS_FIRST, grid(STOCK))).toBe(false);
  });

  test("the merge output is what the check accepts", () => {
    const merged = mergeScopeGrid(EXTRAS_FIRST, grid(STOCK));
    expect(scopeGridInSync(merged, grid(STOCK))).toBe(true);
  });

  test("apply is idempotent — re-merging its own output changes no byte", () => {
    const once = mergeScopeGrid(EXTRAS_FIRST, grid(STOCK));
    const twice = mergeScopeGrid(once, grid(STOCK));
    expect(twice.equals(once)).toBe(true);
  });

  test("merge output is in canonical key order regardless of input order", () => {
    const extrasLast = grid({
      ...STOCK,
      "team-custom": { stages: { "intent-capture": "EXECUTE" } },
    });
    const fromFirst = mergeScopeGrid(EXTRAS_FIRST, grid(STOCK));
    const fromLast = mergeScopeGrid(extrasLast, grid(STOCK));
    expect(fromFirst.equals(fromLast)).toBe(true);
    const keys = Object.keys(JSON.parse(fromFirst.toString("utf-8")));
    expect(keys).toEqual([...keys].sort());
  });

  test("composed values survive canonicalisation", () => {
    const merged = mergeScopeGrid(EXTRAS_FIRST, grid(STOCK));
    const parsed = JSON.parse(merged.toString("utf-8")) as Record<string, unknown>;
    expect(parsed["team-custom"]).toEqual({ stages: { "intent-capture": "EXECUTE" } });
    for (const key of Object.keys(STOCK)) expect(parsed[key]).toEqual(STOCK[key]);
  });

  // Written as JSON text, not an object literal: `{ __proto__: ... }` in
  // source sets the prototype, so a literal cannot express the on-disk shape.
  const PROTO_NAMED = Buffer.from(
    `{"__proto__":{"stages":{"a":"1"}},"constructor":{"stages":{"a":"2"}},` +
      `"toString":{"stages":{"a":"3"}},` +
      `"mvp":{"stages":{"intent-capture":"EXECUTE"}}}\n`,
    "utf-8",
  );
  const PROTO_DIST = grid({ mvp: STOCK.mvp });

  test("composed scopes named after Object.prototype members are preserved", () => {
    const merged = mergeScopeGrid(PROTO_NAMED, PROTO_DIST);
    const parsed = JSON.parse(merged.toString("utf-8")) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["__proto__", "constructor", "mvp", "toString"]);
    // Read through own descriptors: plain member access would resolve these
    // three to Object.prototype and hide a dropped entry behind a builtin.
    const own = (key: string): unknown => {
      expect(Object.hasOwn(parsed, key)).toBe(true);
      return Object.getOwnPropertyDescriptor(parsed, key)?.value;
    };
    expect(own("__proto__")).toEqual({ stages: { a: "1" } });
    expect(own("constructor")).toEqual({ stages: { a: "2" } });
    expect(own("toString")).toEqual({ stages: { a: "3" } });
  });

  test("prototype-named composed scopes are idempotent and check-symmetric", () => {
    const once = mergeScopeGrid(PROTO_NAMED, PROTO_DIST);
    expect(mergeScopeGrid(once, PROTO_DIST).equals(once)).toBe(true);
    expect(scopeGridInSync(once, PROTO_DIST)).toBe(true);
    expect(scopeGridInSync(PROTO_NAMED, PROTO_DIST)).toBe(false);
  });

  test("a grid with no composed entry is byte-unchanged and stays in sync", () => {
    const want = grid(STOCK);
    expect(mergeScopeGrid(want, want).equals(want)).toBe(true);
    expect(scopeGridInSync(want, want)).toBe(true);
  });
});
