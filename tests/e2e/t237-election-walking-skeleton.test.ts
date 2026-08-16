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
import { applyProductionAutonomyMode } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { mintHumanPresence } from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { createTestProject, FIXTURES_DIR, seededStateFile, seedStateFile } from "../harness/fixtures.ts";

const CONSTRUCTION = join(FIXTURES_DIR, "state-construction.md");

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
          schemaVersion: 2,
          electionId: "E-E2E-1",
          kind: "zero-confirm",
          questions: [
            {
              questionId: "q-zero",
              text: "0件でよいか",
              choices: [{ internalNo: 1, label: "0件で可" }],
            },
          ],
          voters: ["alice"],
        }),
      );
      const b1 = join(projectDir, "b1.json");
      writeFileSync(
        b1,
        JSON.stringify({
          schemaVersion: 2,
          kind: "original",
          electionId: "E-E2E-1",
          voter: "alice",
          voterKind: "member",
          responses: [
            { questionId: "q-zero", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
          ],
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
        const directivePath = join(projectDir, "directive.json");
        writeFileSync(directivePath, next.stdout);
        expect(
          cli(projectDir, [directive.verb, "--election", "E-E2E-1", "--file", directivePath]).code,
        ).toBe(0);
        expect(
          cli(projectDir, ["report", "--election", "E-E2E-1", "--file", directivePath]).code,
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
    const projectDir = createTestProject();
    try {
      mkdirSync(join(projectDir, "amadeus", "spaces", "default", "elections"), {
        recursive: true,
      });
      // RFC-0001 ADR-8: the solo auto-election trigger is DERIVED from the
      // declared Intent Autonomy Mode (deriveSoloElectionTrigger: "semi"/"full"
      // -> "auto"), not read from config any more. Declare it through the real
      // production API so the spawned CLI's readProductionAutonomyProjection
      // (audit-sourced, not a bare state-file field read) actually observes it.
      seedStateFile(projectDir, CONSTRUCTION);
      resetOtelPerProject();
      mintHumanPresence({
        projectDir,
        capability: { kind: "unavailable", reason: "t237 e2e fixture" },
      });
      const applied = applyProductionAutonomyMode({
        projectDir,
        stateContent: readFileSync(seededStateFile(projectDir), "utf-8"),
        mode: "semi",
      });
      if (!applied.ok) throw new Error(`semi declaration failed: ${applied.error}`);
      const definition = join(projectDir, "failure-definition.json");
      writeFileSync(
        definition,
        JSON.stringify({
          schemaVersion: 2,
          electionId: "E-FAILURE-HOLD",
          kind: "failure-ruling",
          questions: [
            {
              questionId: "q-failure-ruling",
              text: "Unit alpha の失敗をどう裁定するか",
              choices: [
                { internalNo: 1, label: "Retry" },
                { internalNo: 2, label: "Skip" },
                { internalNo: 3, label: "Abort" },
              ],
            },
          ],
          voters: ["subagent-1", "subagent-2"],
        }),
      );
      expect(cli(projectDir, ["open", "--trigger", "auto", "--file", definition]).code).toBe(0);

      // Drive the directive loop exactly as issued until the tie hold appears.
      let sawHold = false;
      for (let guard = 0; guard < 20; guard++) {
        const next = cli(projectDir, ["next", "--election", "E-FAILURE-HOLD"]);
        expect(next.code).toBe(0);
        const directive = JSON.parse(next.stdout);
        if (directive.kind === "hold") {
          expect(directive.held).toEqual([{ questionId: "q-failure-ruling", reason: "tie" }]);
          sawHold = true;
          break;
        }
        if (directive.kind === "collect-wait") {
          for (const [voter, choiceInternalNo] of [["subagent-1", 1], ["subagent-2", 2]] as const) {
            const ballot = join(projectDir, `${voter}.json`);
            writeFileSync(
              ballot,
              JSON.stringify({
                schemaVersion: 2,
                kind: "original",
                electionId: "E-FAILURE-HOLD",
                voter,
                voterKind: "subagent",
                responses: [
                  {
                    questionId: "q-failure-ruling",
                    choiceInternalNo,
                    goa: 1,
                    reservation: null,
                    rationale: null,
                  },
                ],
                submittedAt: `2026-08-14T00:0${choiceInternalNo}:00Z`,
              }),
            );
            expect(
              cli(projectDir, ["vote", "--election", "E-FAILURE-HOLD", "--file", ballot]).code,
            ).toBe(0);
          }
          continue;
        }
        expect(typeof directive.verb).toBe("string");
        const directivePath = join(projectDir, "failure-directive.json");
        writeFileSync(directivePath, next.stdout);
        expect(
          cli(projectDir, [directive.verb, "--election", "E-FAILURE-HOLD", "--file", directivePath]).code,
        ).toBe(0);
        expect(
          cli(projectDir, ["report", "--election", "E-FAILURE-HOLD", "--file", directivePath]).code,
        ).toBe(0);
      }
      expect(sawHold).toBe(true);

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
      expect(actingContract).toContain("`report --user-input` with the ruling (`retry` / `skip` / `abort`)");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
