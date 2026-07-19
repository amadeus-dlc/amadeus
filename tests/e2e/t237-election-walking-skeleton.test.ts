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
});
