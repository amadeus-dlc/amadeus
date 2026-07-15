// covers: docs-gate:settings-defaults-sync
//
// t228-settings-docs-sync.test.ts — pins the canonical-settings docs (U3, AC-1b
// / AC-1d(ii)) against the DEFAULT_SETTINGS / INTERACTION_MODE_KEYS constants so
// the ledger can never silently drift from code. Mechanism: readFileSync over
// docs/ (no spawn, no LLM), same technique as t68's version-badge sync and
// t174's docs gate. Lives in integration because filesystem reads are medium on
// the size axis (a unit-tree readFileSync would break the size-purity ratchet).
//
// The four EN/JA doc surfaces settings.json is documented on:
//   - docs/amadeus-files.md / .ja.md          (space tree 5th element + ledger)
//   - docs/guide/03-spaces-and-intents.md / .ja.md (space tree 5th element)
// (The design named docs/reference/18-workspace-layout.md for the structure
// edit, but that file is the #610 package-layout DECISION doc with no amadeus/
// spaces tree; the real space structure lives in 03-spaces-and-intents, so the
// 5th-element edit landed there. Flagged for the conductor.)
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";
import {
  DEFAULT_SETTINGS,
  INTERACTION_MODE_KEYS,
} from "../../packages/framework/core/tools/amadeus-settings.ts";

const DOCS = REPO_ROOT;

// The four EN/JA doc surfaces that must mention settings.json.
const ALL_DOCS = [
  "docs/amadeus-files.md",
  "docs/amadeus-files.ja.md",
  "docs/guide/03-spaces-and-intents.md",
  "docs/guide/03-spaces-and-intents.ja.md",
] as const;

// The ledger pair that documents the interactionModes shape + default posture.
const LEDGER_DOCS = ["docs/amadeus-files.md", "docs/amadeus-files.ja.md"] as const;

function read(rel: string): string {
  return readFileSync(join(DOCS, rel), "utf-8");
}

describe("t228 canonical settings docs ⇄ DEFAULT_SETTINGS sync", () => {
  test("every settings doc surface mentions settings.json", () => {
    for (const rel of ALL_DOCS) {
      expect(read(rel)).toContain("settings.json");
    }
  });

  test("the ledger docs name interactionModes and every canonical mode key", () => {
    for (const rel of LEDGER_DOCS) {
      const text = read(rel);
      expect(text).toContain("interactionModes");
      for (const key of INTERACTION_MODE_KEYS) {
        expect(text).toContain(key);
      }
    }
  });

  test("the documented default posture matches DEFAULT_SETTINGS (all modes true)", () => {
    // Coupling: the ledger states the default is every mode `true`. If a default
    // is ever flipped to false in the constant, this precondition fails and the
    // docs/test must be updated together — that is the sync this guard enforces.
    const allDefaultTrue = INTERACTION_MODE_KEYS.every((key) => DEFAULT_SETTINGS[key] === true);
    expect(allDefaultTrue).toBe(true);
    for (const rel of LEDGER_DOCS) {
      expect(read(rel)).toContain("true");
    }
  });

  test("the ledger docs record the fail-closed policy and the doctor surface", () => {
    for (const rel of LEDGER_DOCS) {
      const text = read(rel);
      expect(text).toContain("fail-closed");
      expect(text.toLowerCase()).toContain("doctor");
    }
  });
});
