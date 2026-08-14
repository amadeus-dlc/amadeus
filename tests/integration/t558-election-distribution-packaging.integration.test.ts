// t558 — U8 election-distribution-and-verification packaging.
// Pins FR-OBS-2 skill vocabulary, FR-NORM-1/2 memory scan, and the published
// CLI token dispatching explicit v2 elections without stealing legacy ones.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "bun";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverHarnessNames } from "../../scripts/package.ts";
import { MIRROR_PROJECTIONS } from "../../packages/framework/harness/projections.ts";

const ROOT = join(import.meta.dir, "..", "..");
const SKILL_PATH = join(ROOT, "packages", "framework", "core", "skills", "amadeus-election", "SKILL.md");
const MEMORY_DIR = join(ROOT, "amadeus", "spaces", "default", "memory");
const TEAM_MD = join(MEMORY_DIR, "team.md");
const SCRIPT = join(ROOT, "packages", "framework", "core", "tools", "amadeus-election.ts");
const HARNESS_ROOT = join(ROOT, "packages", "framework", "harness");

/** Whether a harness's own manifest.ts (or, for codex, its emit.ts session-skill
 *  list) declares amadeus-election as a projected skill. Read from the harness's
 *  own source rather than hardcoded, so a harness gaining or losing the election
 *  skill flips this set without touching the test. */
function shipsElectionSkill(harness: string): boolean {
  const emitPath = join(HARNESS_ROOT, harness, "emit.ts");
  if (existsSync(emitPath) && readFileSync(emitPath, "utf8").includes('"amadeus-election"')) return true;
  const manifestPath = join(HARNESS_ROOT, harness, "manifest.ts");
  return existsSync(manifestPath) && readFileSync(manifestPath, "utf8").includes("skills/amadeus-election");
}

const REQUIRED_SKILL_TOKENS = [
  "questions",
  "responses",
  "targetQuestionIds",
  "held",
  "preservedResultDigest",
  "mixed",
  "hold-only",
] as const;

const FORBIDDEN_WORKAROUNDS = ["E-SRA-RAS13", "election-cli-canonical"] as const;

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(path));
    else out.push(path);
  }
  return out;
}

function alwaysElectLine(teamMd: string): string {
  const line = teamMd.split("\n").find((row) => row.includes("cid:requirements-analysis:always-elect"));
  expect(line).toBeDefined();
  return line ?? "";
}

function cli(project: string, args: readonly string[]): { code: number; stdout: string; stderr: string } {
  const spawned = spawnSync(["bun", SCRIPT, ...args, "--project", project], {
    env: process.env,
    cwd: project,
  });
  return {
    code: spawned.exitCode ?? 1,
    stdout: spawned.stdout.toString().trim(),
    stderr: spawned.stderr.toString().trim(),
  };
}

describe("t558 election distribution packaging", () => {
  test("FR-OBS-2: the canonical skill names the multi-question directive loop", () => {
    const skill = readFileSync(SKILL_PATH, "utf8");
    for (const token of REQUIRED_SKILL_TOKENS) {
      expect(skill).toContain(token);
    }
    expect(skill).toContain("{{HARNESS_DIR}}/tools/amadeus-election.ts");
    expect(skill).not.toContain("amadeus-election-v2-cli.ts");
  });

  test("FR-OBS-2: Claude and Codex projections keep the multi-question tokens", () => {
    const claude = readFileSync(join(ROOT, ".claude", "skills", "amadeus-election", "SKILL.md"), "utf8");
    const codex = readFileSync(join(ROOT, ".agents", "skills", "amadeus-election", "SKILL.md"), "utf8");
    for (const token of REQUIRED_SKILL_TOKENS) {
      expect(claude).toContain(token);
      expect(codex).toContain(token);
    }
    expect(claude).toContain(".claude/tools/amadeus-election.ts");
    expect(codex).toContain(".codex/tools/amadeus-election.ts");
    expect(claude).not.toContain("{{HARNESS_DIR}}");
    expect(codex).not.toContain("{{HARNESS_DIR}}");
  });

  test("FR-NORM-2: active memory does not restore deleted election workarounds", () => {
    const hits: string[] = [];
    for (const path of walkFiles(MEMORY_DIR)) {
      const text = readFileSync(path, "utf8");
      for (const token of FORBIDDEN_WORKAROUNDS) {
        if (text.includes(token)) hits.push(`${path}: ${token}`);
      }
    }
    expect(hits).toEqual([]);
  });

  test("FR-NORM-1: always-elect describes verified multi-question contracts", () => {
    const line = alwaysElectLine(readFileSync(TEAM_MD, "utf8"));
    expect(line).not.toContain("1選挙1質問");
    expect(line).toContain("question");
    expect(line).toMatch(/mixed|混在/);
    expect(line).toMatch(/hold-only|hold 中/);
  });

  test("the published CLI opens a v2 definition and forwards the directive file", () => {
    const project = mkdtempSync(join(tmpdir(), "election-u8-v2-"));
    const definitionPath = join(project, "definition.json");
    const ballotPath = join(project, "ballot.json");
    const directivePath = join(project, "directive.json");
    mkdirSync(join(project, "amadeus", "spaces", "default", "elections"), { recursive: true });
    writeFileSync(
      definitionPath,
      JSON.stringify({
        schemaVersion: 2,
        electionId: "E-U8-V2",
        kind: "decision",
        questions: [
          { questionId: "q-a", text: "A?", choices: [{ internalNo: 1, label: "yes" }] },
          { questionId: "q-b", text: "B?", choices: [{ internalNo: 1, label: "yes" }] },
        ],
        voters: ["alice"],
      }),
    );
    writeFileSync(
      ballotPath,
      JSON.stringify({
        schemaVersion: 2,
        kind: "original",
        electionId: "E-U8-V2",
        voter: "alice",
        voterKind: "member",
        responses: [
          { questionId: "q-a", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
          { questionId: "q-b", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
        ],
        submittedAt: "2026-08-14T00:00:00Z",
      }),
    );
    try {
      expect(cli(project, ["open", "--file", definitionPath])).toMatchObject({ code: 0, stderr: "" });
      const kinds: string[] = [];
      let voted = false;
      for (let guard = 0; guard < 20; guard++) {
        const next = cli(project, ["next", "--election", "E-U8-V2"]);
        expect(next).toMatchObject({ code: 0, stderr: "" });
        const directive = JSON.parse(next.stdout) as {
          kind: string;
          verb: string | null;
          report: string | null;
          schemaVersion?: number;
          targetQuestionIds?: readonly string[];
        };
        kinds.push(directive.kind);
        if (directive.kind === "done") break;
        expect(directive.schemaVersion).toBe(2);
        expect(directive.targetQuestionIds).toEqual(["q-a", "q-b"]);
        if (directive.kind === "collect-wait") {
          if (!voted) {
            expect(cli(project, ["vote", "--election", "E-U8-V2", "--file", ballotPath]).code).toBe(0);
            voted = true;
          }
          continue;
        }
        writeFileSync(directivePath, next.stdout);
        expect(cli(project, [String(directive.verb), "--election", "E-U8-V2", "--file", directivePath]).code).toBe(0);
        expect(cli(project, ["report", "--election", "E-U8-V2", "--file", directivePath])).toMatchObject({
          code: 0,
          stderr: "",
        });
      }
      expect(kinds).toEqual(["distribute", "collect-wait", "tally-ready", "render", "verify", "done"]);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  // #2967/b402f5ce0 removed the pre-canonical (schemaVersion-less, single
  // top-level `question`/`choiceInternalNo`) v1 wire format entirely — it is a
  // declared BREAKING CHANGE, not a bug: "pre-canonical (single-question v1)
  // election data is no longer readable". What remains distinctly worth
  // covering is that a canonical (schemaVersion 2) definition carrying exactly
  // ONE question — as opposed to the two-question case above — still drives
  // the same directive loop end to end.
  test("the published CLI completes a single-question canonical election", () => {
    const project = mkdtempSync(join(tmpdir(), "election-u8-single-"));
    const definitionPath = join(project, "def.json");
    const ballotPath = join(project, "b1.json");
    const directivePath = join(project, "directive.json");
    mkdirSync(join(project, "amadeus", "spaces", "default", "elections"), { recursive: true });
    writeFileSync(
      definitionPath,
      JSON.stringify({
        schemaVersion: 2,
        electionId: "E-U8-SINGLE",
        kind: "zero-confirm",
        questions: [
          { questionId: "q-only", text: "0件でよいか", choices: [{ internalNo: 1, label: "0件で可" }] },
        ],
        voters: ["alice"],
      }),
    );
    writeFileSync(
      ballotPath,
      JSON.stringify({
        schemaVersion: 2,
        kind: "original",
        electionId: "E-U8-SINGLE",
        voter: "alice",
        voterKind: "member",
        responses: [{ questionId: "q-only", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null }],
        submittedAt: "2026-08-14T00:01:00Z",
      }),
    );
    try {
      expect(cli(project, ["open", "--file", definitionPath])).toMatchObject({ code: 0, stderr: "" });
      const kinds: string[] = [];
      let voted = false;
      for (let guard = 0; guard < 20; guard++) {
        const next = cli(project, ["next", "--election", "E-U8-SINGLE"]);
        expect(next).toMatchObject({ code: 0, stderr: "" });
        const directive = JSON.parse(next.stdout) as {
          kind: string;
          verb: string | null;
          report: string | null;
          schemaVersion?: number;
          targetQuestionIds?: readonly string[];
        };
        kinds.push(directive.kind);
        if (directive.kind === "done") break;
        expect(directive.schemaVersion).toBe(2);
        expect(directive.targetQuestionIds).toEqual(["q-only"]);
        if (directive.kind === "collect-wait") {
          if (!voted) {
            expect(cli(project, ["vote", "--election", "E-U8-SINGLE", "--file", ballotPath]).code).toBe(0);
            voted = true;
          }
          continue;
        }
        writeFileSync(directivePath, next.stdout);
        expect(cli(project, [String(directive.verb), "--election", "E-U8-SINGLE", "--file", directivePath]).code).toBe(0);
        expect(cli(project, ["report", "--election", "E-U8-SINGLE", "--file", directivePath])).toMatchObject({
          code: 0,
          stderr: "",
        });
      }
      expect(kinds).toEqual(["distribute", "collect-wait", "tally-ready", "render", "verify", "done"]);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("FR-2c: non-target harness distributions still omit the election skill", () => {
    const harnesses = discoverHarnessNames();
    const nonTargetHarnesses = harnesses.filter((harness) => !shipsElectionSkill(harness));
    // Sanity: the split must actually separate something; the target set itself
    // is derived from each harness's manifest/emit source, so a harness that
    // legitimately adds or drops the skill moves between the partitions here
    // without a hand-maintained enumeration going stale.
    expect(nonTargetHarnesses.length).toBeGreaterThan(0);
    expect(nonTargetHarnesses.length).toBeLessThan(harnesses.length);

    for (const harness of nonTargetHarnesses) {
      const distSkill = MIRROR_PROJECTIONS.find((projection) => projection.surface === harness)?.distSkill;
      if (distSkill === undefined) throw new Error(`no mirror projection for harness ${harness}`);
      // distSkill points at .../skills/amadeus-mirror/SKILL.md; the skills root
      // is two segments up.
      const skillsDir = join(ROOT, distSkill, "..", "..");
      expect(existsSync(skillsDir)).toBe(true);
      expect(existsSync(join(skillsDir, "amadeus-election"))).toBe(false);
    }
  });
});
