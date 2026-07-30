// t369 — the auto-solo election hook lives in the harness-neutral protocol.
// Layer: integration (reads the tracked canonical, dist, and self-install trees).
//
// Issue #1735: the auto-solo activation rules only existed in the election
// SKILL, which a conductor reads when it already decided to hold an election.
// The trigger has to be where the conductor already is — the stage protocol's
// §13 learnings ritual and its halt-and-ask seam, plus the conductor persona's
// deviation stop. This test pins that placement across every shipped surface,
// so a canonical edit that skips `bun scripts/package.ts` / `promote:self`
// cannot land silently.
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

// Harness dir differs per distribution, so the open command is matched by shape
// rather than by a literal path.
const OPEN_COMMAND = /tools\/amadeus-election\.ts open --trigger auto-solo/;
const DISABLED_ENVELOPE = '{"opened":null,"reason":"auto-solo-election-disabled"}';
const CONFIG_KEY = '"auto-solo-election": true';

// Every surface that must carry the hook: the canonical source plus each
// generated distribution and self-install copy.
const HARNESS_DIRS = [
  ["dist/claude", ".claude"],
  ["dist/codex", ".codex"],
  ["dist/cursor", ".cursor"],
  ["dist/kimi", ".kimi-code"],
  ["dist/kiro", ".kiro"],
  ["dist/kiro-ide", ".kiro"],
  ["dist/opencode", ".opencode"],
] as const;

const SELF_INSTALL_DIRS = [".claude", ".codex", ".cursor", ".kimi-code", ".opencode"] as const;

function protocolSurfaces(): string[] {
  const paths = [join(ROOT, "packages/framework/core/amadeus-common/protocols/stage-protocol.md")];
  for (const [dist, harness] of HARNESS_DIRS) {
    paths.push(join(ROOT, dist, harness, "amadeus-common/protocols/stage-protocol.md"));
  }
  for (const harness of SELF_INSTALL_DIRS) {
    paths.push(join(ROOT, harness, "amadeus-common/protocols/stage-protocol.md"));
  }
  return paths;
}

function conductorSurfaces(): string[] {
  const paths = [join(ROOT, "packages/framework/core/amadeus-common/conductor.md")];
  for (const [dist, harness] of HARNESS_DIRS) {
    paths.push(join(ROOT, dist, harness, "amadeus-common/conductor.md"));
  }
  for (const harness of SELF_INSTALL_DIRS) {
    paths.push(join(ROOT, harness, "amadeus-common/conductor.md"));
  }
  return paths;
}

// Returns the §13 learnings ritual body — the hook must sit inside it, not
// merely somewhere in the file, so the §1 halt-and-ask line cannot satisfy it.
function sectionThirteen(content: string): string {
  const start = content.indexOf("## 13. Learnings Ritual");
  if (start < 0) return "";
  const next = content.indexOf("\n## ", start + 1);
  return next < 0 ? content.slice(start) : content.slice(start, next);
}

function haltAndAskSection(content: string): string {
  const start = content.indexOf("**Halt-and-ask on failure**");
  if (start < 0) return "";
  const next = content.indexOf("\n## ", start + 1);
  return next < 0 ? content.slice(start) : content.slice(start, next);
}

// The guard predicate under test: names the first missing marker, or null when
// the section carries the whole hook. The real guard and its falling proof both
// go through this one predicate.
function findMissingHookMarker(section: string): string | null {
  if (!OPEN_COMMAND.test(section)) return "open --trigger auto-solo";
  if (!section.includes(DISABLED_ENVELOPE)) return DISABLED_ENVELOPE;
  return null;
}

describe("t369 auto-solo hook is baked into the harness-neutral protocol (#1735)", () => {
  test("every stage-protocol surface carries the hook in §13", () => {
    for (const path of protocolSurfaces()) {
      expect(existsSync(path)).toBe(true);
      const section = sectionThirteen(readFileSync(path, "utf8"));
      expect(section).not.toBe("");
      expect(findMissingHookMarker(section)).toBeNull();
      expect(section).toContain(CONFIG_KEY);
    }
  });

  test("every stage-protocol surface carries the blocker hook in halt-and-ask", () => {
    for (const path of protocolSurfaces()) {
      const section = haltAndAskSection(readFileSync(path, "utf8"));
      expect(section).not.toBe("");
      expect(findMissingHookMarker(section)).toBeNull();
    }
  });

  test("every conductor persona surface stops before a deviation and routes it", () => {
    for (const path of conductorSurfaces()) {
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, "utf8");
      expect(findMissingHookMarker(content)).toBeNull();
      expect(content).toContain("Design deviations");
      expect(content).toContain(CONFIG_KEY);
    }
  });

  test("falling proof: a section missing either marker turns the predicate red", () => {
    const canonical = readFileSync(
      join(ROOT, "packages/framework/core/amadeus-common/protocols/stage-protocol.md"),
      "utf8",
    );
    const section = sectionThirteen(canonical);
    expect(findMissingHookMarker(section.replace(/--trigger auto-solo/g, "--trigger explicit"))).toBe(
      "open --trigger auto-solo",
    );
    expect(findMissingHookMarker(section.replace(DISABLED_ENVELOPE, ""))).toBe(DISABLED_ENVELOPE);
  });
});
