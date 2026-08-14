// t241 — FR-0 machine executor (ADR-6 layer (i), CI-resident, Bolt 4).
// Layer: integration (spawns the packaged election CLI over a tmp
// project dir — classifyTestSize = medium, the integration ceiling). Living in
// tests/integration means it runs under --ci on every PR, which is what makes
// the CI-resident claim below true (ADR-6 fixes layer (i) in integration).
// An LLM-free TS loop that reads each `next` directive and executes EXACTLY the
// verb/report it names — zero election knowledge lives in this file. If the
// loop completes, the directive stream alone carried the election, which is the
// strongest standing proof of FR-0 (the acceptance-demo subagent run is layer
// (ii), one-shot, not in CI). Doubles as the consumer contract test for the
// directive schema (stdout-only parse).
import { describe, expect, test } from "bun:test";
import { spawnSync } from "bun";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

type Cli = { code: number; stdout: string };

function makeCli(projectDir: string) {
  return (args: string[]): Cli => {
    const proc = spawnSync(["bun", SCRIPT, ...args, "--project", projectDir], {
      env: process.env,
      cwd: projectDir,
    });
    return { code: proc.exitCode ?? 1, stdout: proc.stdout.toString().trim() };
  };
}

// The machine executor: forwards directives until done/hold. Knows only the
// directive envelope (kind/verb/report + the file-carried directive JSON),
// never the election protocol.
function runExecutor(
  cli: (args: string[]) => Cli,
  projectDir: string,
  electionId: string,
  onCollectWait: (pending: string[]) => void,
  guard = 30,
): { stoppedAt: string; kinds: string[] } {
  const kinds: string[] = [];
  const directivePath = join(projectDir, "directive.json");
  for (let i = 0; i < guard; i++) {
    const next = cli(["next", "--election", electionId]);
    if (next.code !== 0) return { stoppedAt: "error", kinds };
    const directive = JSON.parse(next.stdout);
    kinds.push(directive.kind);
    if (directive.kind === "done" || directive.kind === "hold") {
      return { stoppedAt: directive.kind, kinds };
    }
    if (directive.kind === "collect-wait") {
      onCollectWait(directive.pending);
      continue;
    }
    writeFileSync(directivePath, next.stdout);
    if (typeof directive.verb === "string") {
      const acted = cli([directive.verb, "--election", electionId, "--file", directivePath]);
      if (acted.code !== 0) return { stoppedAt: `verb-failed:${directive.verb}`, kinds };
    }
    const reported = cli(["report", "--election", electionId, "--file", directivePath]);
    if (reported.code !== 0) return { stoppedAt: "report-failed", kinds };
  }
  return { stoppedAt: "guard-exhausted", kinds };
}

function setup(electionId: string, goa: number) {
  const projectDir = mkdtempSync(join(tmpdir(), "election-exec-"));
  mkdirSync(join(projectDir, "amadeus", "spaces", "default", "elections"), { recursive: true });
  const def = join(projectDir, "def.json");
  writeFileSync(
    def,
    JSON.stringify({
      schemaVersion: 2,
      electionId,
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
      electionId,
      voter: "alice",
      voterKind: "member",
      responses: [
        { questionId: "q-zero", choiceInternalNo: 1, goa, reservation: null, rationale: null },
      ],
      submittedAt: "2026-07-19T00:01:00Z",
    }),
  );
  return { projectDir, def, b1 };
}

describe("t241 machine executor (ADR-6 CI layer)", () => {
  test("carries a zero-confirm election from open to done on directives alone", () => {
    const { projectDir, def, b1 } = setup("E-EXEC1", 1);
    const cli = makeCli(projectDir);
    try {
      expect(cli(["open", "--file", def]).code).toBe(0);
      const outcome = runExecutor(cli, projectDir, "E-EXEC1", () => {
        expect(cli(["vote", "--election", "E-EXEC1", "--file", b1]).code).toBe(0);
      });
      expect(outcome.stoppedAt).toBe("done");
      expect(outcome.kinds).toEqual([
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

  test("stops at hold for the human and offers no CLI verb that injects a ruling", () => {
    const { projectDir, def, b1 } = setup("E-EXEC2", 8);
    const cli = makeCli(projectDir);
    try {
      expect(cli(["open", "--file", def]).code).toBe(0);
      const first = runExecutor(cli, projectDir, "E-EXEC2", () => {
        expect(cli(["vote", "--election", "E-EXEC2", "--file", b1]).code).toBe(0);
      });
      // the executor never resolves a hold on its own — it stops for the human
      expect(first.stoppedAt).toBe("hold");
      // the canonical CLI removed the ruling-injection verb: a human decision
      // is settled outside the CLI (or via a rerun round), never reported in
      const resolved = cli([
        "report",
        "--election",
        "E-EXEC2",
        "--result",
        "hold-resolved",
        "--resolution",
        "rejected",
      ]);
      expect(resolved.code).not.toBe(0);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
