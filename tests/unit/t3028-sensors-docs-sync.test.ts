// covers: file:docs/harness-engineering/06-sensors.md
// covers: file:docs/harness-engineering/06-sensors.ja.md
// size: small
//
// t3028 — the sensor tables in docs/harness-engineering/06-sensors(.ja).md stay
// in sync with the real sensor corpus. #3028 measured the hand-maintained table
// drifting from 10 rows to a 14-manifest reality across two intents; a
// count-free set contract keeps the docs honest as sensors come and go.
//
// The derived expectation is deliberately NOT a pinned number: it is the union
// of the core sensors dir and every plugin.json `sensors` declaration, so
// adding or removing a sensor moves the expectation with the corpus and this
// test only reddens when the docs table disagrees with reality.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

function coreSensors(): string[] {
  return readdirSync(join(REPO_ROOT, "packages", "framework", "core", "sensors"))
    .filter((f) => f.endsWith(".md"));
}

function pluginDeclaredSensors(): string[] {
  const out: string[] = [];
  for (const plugin of readdirSync(join(REPO_ROOT, "plugins"))) {
    let manifest: { sensors?: unknown };
    try {
      manifest = JSON.parse(readFileSync(join(REPO_ROOT, "plugins", plugin, "plugin.json"), "utf8"));
    } catch {
      continue;
    }
    const raw = manifest.sensors;
    if (!Array.isArray(raw)) continue;
    for (const entry of raw) {
      if (typeof entry === "string") out.push(entry.split("/").pop() ?? entry);
    }
  }
  return out;
}

function derivedCorpus(): string[] {
  return [...new Set([...coreSensors(), ...pluginDeclaredSensors()])].sort();
}

function tableRows(doc: string): string[] {
  const text = readFileSync(join(REPO_ROOT, "docs", "harness-engineering", doc), "utf8");
  const rows = [...text.matchAll(/^\| `(amadeus-[a-z0-9-]+\.md)` \|/gmu)].map((m) => m[1] ?? "");
  return [...new Set(rows)].sort();
}

describe("06-sensors docs tables match the sensor corpus (#3028)", () => {
  test("the derived corpus is non-empty (vacuity guard)", () => {
    expect(derivedCorpus().length).toBeGreaterThan(0);
  });

  test("the English table lists exactly the derived corpus", () => {
    expect(tableRows("06-sensors.md")).toEqual(derivedCorpus());
  });

  test("the Japanese table lists exactly the derived corpus", () => {
    expect(tableRows("06-sensors.ja.md")).toEqual(derivedCorpus());
  });
});
