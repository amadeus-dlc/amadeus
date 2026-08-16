// t369 — the automatic solo election hook lives in the harness-neutral protocol.
// Layer: integration (reads the tracked canonical, dist, and self-install trees).
//
// Issue #1735: the automatic solo activation rules only existed in the election
// SKILL, which a conductor reads when it already decided to hold an election.
// The trigger has to be where the conductor already is — the stage protocol's
// §13 learnings ritual and its halt-and-ask seam, plus the conductor persona's
// deviation stop. This test pins that placement across every shipped surface,
// so a canonical edit that skips `bun scripts/package.ts` / `promote:self`
// cannot land silently.
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CODEX_DIST,
  ELECTION_ID,
  ELECTIONS_REL,
  PAYLOAD_NAME,
  PHASE,
  seedAutoSoloS13Project,
  STAGE_SLUG,
} from "../harness/autosolo-s13-fixture.ts";

const ROOT = join(import.meta.dir, "..", "..");

// Harness dir differs per distribution, so the open command is matched by shape
// rather than by a literal path.
const OPEN_COMMAND = /tools\/amadeus-election\.ts open --trigger auto/;
const DISABLED_ENVELOPE = '{"opened":null,"reason":"solo-election-manual-trigger-required"}';
// RFC-0001 ADR-8 retired the `solo-election.trigger.mode` config leaf: the
// trigger is DERIVED from the Intent Autonomy Mode. The surfaces must name the
// derivation, so this pins the derived-trigger phrase rather than a config path
// no workspace may set any more.
const DERIVED_TRIGGER = "derives an `auto` solo-election trigger";

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

const SELF_INSTALL_DIRS = [".claude", ".codex", ".cursor", ".kimi-code", ".opencode", ".pi"] as const;

const FAILURE_ELECTION_SURFACES = [
  "packages/framework/harness/claude/skills/amadeus/SKILL.md",
  "packages/framework/harness/codex/skills/amadeus/SKILL.md",
  "packages/framework/harness/cursor/commands/amadeus.md",
  "packages/framework/harness/kimi/skills/amadeus/SKILL.md",
  "packages/framework/harness/kiro/skills/amadeus/SKILL.md",
  "packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md",
  "packages/framework/harness/opencode/commands/amadeus.md",
  "packages/framework/harness/pi/skills/amadeus/SKILL.md",
] as const;

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
  if (!OPEN_COMMAND.test(section)) return "open --trigger auto";
  if (!section.includes(DISABLED_ENVELOPE)) return DISABLED_ENVELOPE;
  return null;
}

describe("t369 automatic solo hook is baked into the harness-neutral protocol (#1735)", () => {
  test("every stage-protocol surface carries the hook in §13", () => {
    for (const path of protocolSurfaces()) {
      expect(existsSync(path)).toBe(true);
      const section = sectionThirteen(readFileSync(path, "utf8"));
      expect(section).not.toBe("");
      expect(findMissingHookMarker(section)).toBeNull();
      expect(section).toContain(DERIVED_TRIGGER);
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
      expect(content).toContain(DERIVED_TRIGGER);
    }
  });

  test("the §13 hook names --file, which the CLI requires", () => {
    // The CLI exits 2 on usage without --file, so a hook that omitted it would
    // send every conductor into an unopenable election.
    for (const path of [...protocolSurfaces(), ...conductorSurfaces()]) {
      expect(readFileSync(path, "utf8")).toMatch(
        /open --trigger auto --file <definition\.json>/,
      );
    }
  });

  test("falling proof: a section missing either marker turns the predicate red", () => {
    const canonical = readFileSync(
      join(ROOT, "packages/framework/core/amadeus-common/protocols/stage-protocol.md"),
      "utf8",
    );
    const section = sectionThirteen(canonical);
    expect(findMissingHookMarker(section.replace(/--trigger auto/g, "--trigger manual"))).toBe(
      "open --trigger auto",
    );
    expect(findMissingHookMarker(section.replace(DISABLED_ENVELOPE, ""))).toBe(DISABLED_ENVELOPE);
  });
});

describe("t369 #2976 failure-election fallback is complete on every conductor surface", () => {
  test("hold, split, interrupt, CLI error, and decline all return to the human ruling path", () => {
    for (const relativePath of FAILURE_ELECTION_SURFACES) {
      const content = readFileSync(join(ROOT, relativePath), "utf8");
      expect(content).toContain("execute-failure-election");
      expect(content).toContain("open --trigger auto --file <definition.json>");
      expect(content).toContain(DISABLED_ENVELOPE);
      expect(content).toContain("hold / split / interrupt / CLI error");
      expect(content).toMatch(/Retry\s*\/\s*Skip\s*\/\s*Abort/);
      expect(content).toContain("`report --user-input` with the ruling (`retry` / `skip` / `abort`)");
    }
  });
});

// The live probe in tests/e2e/t-exec-codex-autosolo-s13.serial.test.ts runs only
// under --release and only with a codex binary + auth. Its fixture is verified
// HERE, in the integration band --ci runs, so a fixture that stops satisfying
// the ritual's preconditions reds in CI instead of quietly turning the live
// probe into a measurement of a broken setup.
describe("t369 the live §13 probe's fixture satisfies the ritual's preconditions", () => {
  const scratchDirs: string[] = [];
  afterAll(() => {
    for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
  });

  function seededProject(): string {
    const proj = mkdtempSync(join(tmpdir(), "autosolo-s13-fixture-"));
    scratchDirs.push(proj);
    cpSync(join(CODEX_DIST, ".codex"), join(proj, ".codex"), { recursive: true });
    seedAutoSoloS13Project(proj);
    return proj;
  }

  function runShippedTool(
    proj: string,
    tool: string,
    args: string[],
  ): { status: number; stdout: string; stderr: string } {
    const r = spawnSync(process.execPath, [join(proj, ".codex", "tools", tool), ...args], {
      cwd: proj,
      encoding: "utf-8",
    });
    return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  }

  test("surface reaches the diary and yields the seeded candidate", () => {
    const proj = seededProject();
    const surfaced = runShippedTool(proj, "amadeus-learnings.ts", [
      "surface",
      "--slug",
      STAGE_SLUG,
      "--project-dir",
      proj,
    ]);
    expect(surfaced.stderr).toBe("");
    expect(surfaced.status).toBe(0);
    const output = JSON.parse(surfaced.stdout);
    expect(output.stage_slug).toBe(STAGE_SLUG);
    expect(output.phase).toBe(PHASE);
    // An empty candidate list would leave the automatic solo hook nothing to route.
    expect(output.candidates).toHaveLength(1);
    expect(output.candidates[0].source_heading).toBe("Deviations");
  });

  test("the open the hook names runs against the fixture as seeded", () => {
    const proj = seededProject();
    const opened = runShippedTool(proj, "amadeus-election.ts", [
      "open",
      "--trigger",
      "auto",
      "--file",
      join(proj, PAYLOAD_NAME),
    ]);
    expect(opened.status).toBe(0);
    expect(JSON.parse(opened.stdout).electionId).toBe(ELECTION_ID);
    expect(existsSync(join(proj, ELECTIONS_REL, "elections.json"))).toBe(true);
  });

  test("falling proof: omitting --file is a usage failure, not a disabled envelope", () => {
    const proj = seededProject();
    const opened = runShippedTool(proj, "amadeus-election.ts", [
      "open",
      "--trigger",
      "auto",
    ]);
    expect(opened.status).toBe(2);
    expect(opened.stdout).toBe("");
    expect(existsSync(join(proj, ELECTIONS_REL, "elections.json"))).toBe(false);
  });
});
