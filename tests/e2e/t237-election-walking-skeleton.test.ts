// t237 — FR-0 walking-skeleton demonstration over the real CLI (Bolt 1).
// Layer: e2e — spawns `bun scripts/amadeus-election.ts` exactly as an AI (or
// the Bolt 4 machine executor) would, proving the directive loop alone carries
// a zero-confirm election from open to recorded. Coverage of the wiring lines
// is owned by the in-process t236 (spawn is a bun --coverage blind spot).
import { describe, expect, test } from "bun:test";
import { spawnSync } from "bun";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "..", "..", "scripts", "amadeus-election.ts");

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
          choiceInternalNo: 1,
          goa: 1,
          submittedAt: "2026-07-19T00:01:00Z",
        }),
      );

      expect(cli(projectDir, ["open", "--file", def]).code).toBe(0);
      // Forward whatever `next` names, never deciding ourselves (FR-0).
      const steps: Array<{ expectKind: string; act: string[][]; report: string }> = [
        { expectKind: "distribute", act: [["notify"]], report: "distributed" },
        { expectKind: "collect-wait", act: [["vote", "--file", b1]], report: "" },
        { expectKind: "tally-ready", act: [["tally"]], report: "tallied" },
        { expectKind: "render", act: [["render"]], report: "rendered" },
        { expectKind: "verify", act: [["verify"]], report: "verified" },
      ];
      for (const step of steps) {
        const next = cli(projectDir, ["next", "--election", "E-E2E-1"]);
        expect(next.code).toBe(0);
        expect(JSON.parse(next.stdout).kind).toBe(step.expectKind);
        for (const act of step.act) {
          const r = cli(projectDir, [act[0] ?? "", ...act.slice(1), "--election", "E-E2E-1"]);
          expect(r.code).toBe(0);
        }
        if (step.report !== "") {
          expect(
            cli(projectDir, ["report", "--election", "E-E2E-1", "--result", step.report]).code,
          ).toBe(0);
        }
      }
      const done = cli(projectDir, ["next", "--election", "E-E2E-1"]);
      expect(done.code).toBe(0);
      expect(JSON.parse(done.stdout).kind).toBe("done");
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
