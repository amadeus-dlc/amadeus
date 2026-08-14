// t237 — FR-0 walking-skeleton demonstration over the real CLI (Bolt 1).
// Layer: e2e — spawns the packaged election CLI exactly as an AI (or
// the Bolt 4 machine executor) would, proving the directive loop alone carries
// a zero-confirm election from open to recorded. Coverage of the wiring lines
// is owned by the in-process t236 (spawn is a bun --coverage blind spot).
import { describe, expect, test } from "bun:test";
import { spawnSync } from "bun";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(
  import.meta.dir,
  "..",
  "..",
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-election.ts",
);
const CODEX_SKILL = join(
  import.meta.dir,
  "..",
  "..",
  "packages",
  "framework",
  "harness",
  "codex",
  "skills",
  "amadeus",
  "SKILL.md",
);

function cli(projectDir: string, args: string[]): { code: number; stdout: string } {
  const proc = spawnSync(["bun", SCRIPT, ...args, "--project", projectDir], {
    env: process.env,
    cwd: projectDir,
  });
  return { code: proc.exitCode ?? 1, stdout: proc.stdout.toString().trim() };
}

describe("t237 election walking skeleton (e2e)", () => {
  test("the CLI directive loop completes a zero-confirm election end-to-end", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "election-e2e-"));
    try {
      mkdirSync(join(projectDir, "amadeus", "spaces", "default", "elections"), {
        recursive: true,
      });
      const def = join(projectDir, "def.json");
      writeFileSync(
        def,
        JSON.stringify({
          electionId: "E-E2E-1",
          kind: "zero-confirm",
          question: "0件でよいか",
          choices: [{ internalNo: 1, label: "0件で可" }],
          voters: ["alice"],
        }),
      );
      const b1 = join(projectDir, "b1.json");
      writeFileSync(
        b1,
        JSON.stringify({
          electionId: "E-E2E-1",
          voter: "alice",
          voterKind: "member",
          choiceInternalNo: 1,
          goa: 1,
          submittedAt: "2026-07-19T00:01:00Z",
        }),
      );

      expect(cli(projectDir, ["open", "--file", def]).code).toBe(0);
      // FR-0: execute exactly what each directive names (verb/report fields) —
      // this loop holds no kind->verb mapping of its own. The only external
      // input is the ballot arriving during collect-wait.
      const seenKinds: string[] = [];
      for (let guard = 0; guard < 20; guard++) {
        const next = cli(projectDir, ["next", "--election", "E-E2E-1"]);
        expect(next.code).toBe(0);
        const directive = JSON.parse(next.stdout);
        seenKinds.push(directive.kind);
        if (directive.kind === "done") break;
        if (directive.kind === "collect-wait") {
          expect(
            cli(projectDir, ["vote", "--election", "E-E2E-1", "--file", b1]).code,
          ).toBe(0);
          continue;
        }
        expect(typeof directive.verb).toBe("string");
        expect(cli(projectDir, [directive.verb, "--election", "E-E2E-1"]).code).toBe(0);
        expect(
          cli(projectDir, ["report", "--election", "E-E2E-1", "--result", directive.report]).code,
        ).toBe(0);
      }
      expect(seenKinds).toEqual([
        "distribute",
        "collect-wait",
        "tally-ready",
        "render",
        "verify",
        "done",
      ]);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("an automatic failure election records a tie hold and routes to the human fallback", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "failure-election-e2e-"));
    try {
      mkdirSync(join(projectDir, "amadeus", "spaces", "default", "elections"), {
        recursive: true,
      });
      writeFileSync(
        join(projectDir, "amadeus", "config.json"),
        JSON.stringify({ "solo-election": { trigger: { mode: "auto" } } }),
      );
      const definition = join(projectDir, "failure-definition.json");
      writeFileSync(
        definition,
        JSON.stringify({
          electionId: "E-FAILURE-HOLD",
          kind: "failure-ruling",
          question: "Unit alpha の失敗をどう裁定するか",
          choices: [
            { internalNo: 1, label: "Retry" },
            { internalNo: 2, label: "Skip" },
            { internalNo: 3, label: "Abort" },
          ],
          voters: ["subagent-1", "subagent-2"],
        }),
      );
      expect(cli(projectDir, ["open", "--trigger", "auto", "--file", definition]).code).toBe(0);
      expect(
        cli(projectDir, ["report", "--election", "E-FAILURE-HOLD", "--result", "distributed"]).code,
      ).toBe(0);

      for (const [voter, choiceInternalNo] of [["subagent-1", 1], ["subagent-2", 2]] as const) {
        const ballot = join(projectDir, `${voter}.json`);
        writeFileSync(
          ballot,
          JSON.stringify({
            electionId: "E-FAILURE-HOLD",
            voter,
            voterKind: "subagent",
            choiceInternalNo,
            goa: 1,
            submittedAt: `2026-08-14T00:0${choiceInternalNo}:00Z`,
          }),
        );
        expect(cli(projectDir, ["vote", "--election", "E-FAILURE-HOLD", "--file", ballot]).code).toBe(0);
      }

      const tally = cli(projectDir, ["tally", "--election", "E-FAILURE-HOLD"]);
      expect(tally.code).toBe(0);
      expect(JSON.parse(tally.stdout).result).toMatchObject({ kind: "hold", reason: "tie" });
      expect(
        cli(projectDir, ["report", "--election", "E-FAILURE-HOLD", "--result", "tallied"]).code,
      ).toBe(0);
      expect(JSON.parse(cli(projectDir, ["next", "--election", "E-FAILURE-HOLD"]).stdout).kind).toBe("hold");

      const registry = JSON.parse(
        readFileSync(join(projectDir, "amadeus", "spaces", "default", "elections", "elections.json"), "utf8"),
      ) as Array<{ electionId: string; dirName: string }>;
      const dirName = registry.find((entry) => entry.electionId === "E-FAILURE-HOLD")?.dirName;
      expect(dirName).toBeDefined();
      const timeline = JSON.parse(
        readFileSync(
          join(projectDir, "amadeus", "spaces", "default", "elections", dirName!, "timeline.json"),
          "utf8",
        ),
      ) as Array<{ kind: string }>;
      expect(timeline.map((entry) => entry.kind)).toContain("tallied");

      const actingContract = readFileSync(CODEX_SKILL, "utf8");
      expect(actingContract).toContain("hold / split / interrupt / CLI error");
      expect(actingContract).toContain("Retry / Skip / Abort");
      expect(actingContract).toContain("report --user-input retry|skip|abort");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
