import { describe, expect, test } from "bun:test";
import { spawnSync } from "bun";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools", "amadeus-election-v2-cli.ts");

describe("t555 election v2 directive-only executor", () => {
  test("carries a multi-question election to done using only verb and report fields", () => {
    const project = mkdtempSync(join(tmpdir(), "election-v2-executor-"));
    const definitionPath = join(project, "definition.json");
    const ballotPath = join(project, "ballot.json");
    const directivePath = join(project, "directive.json");
    mkdirSync(join(project, "amadeus", "spaces", "default", "elections"), { recursive: true });
    writeFileSync(definitionPath, JSON.stringify({
      schemaVersion: 2,
      electionId: "E-V2-EXECUTOR",
      kind: "decision",
      questions: [
        { questionId: "q-a", text: "A?", choices: [{ internalNo: 1, label: "yes" }] },
        { questionId: "q-b", text: "B?", choices: [{ internalNo: 1, label: "yes" }] },
      ],
      voters: ["alice"],
    }));
    writeFileSync(ballotPath, JSON.stringify({
      schemaVersion: 2,
      kind: "original",
      electionId: "E-V2-EXECUTOR",
      voter: "alice",
      voterKind: "member",
      responses: [
        { questionId: "q-a", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
        { questionId: "q-b", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
      ],
      submittedAt: "2026-08-13T00:00:00Z",
    }));
    const cli = (args: readonly string[]) => {
      const process = spawnSync(["bun", script, ...args, "--project", project]);
      return { code: process.exitCode ?? 1, stdout: process.stdout.toString().trim(), stderr: process.stderr.toString().trim() };
    };
    try {
      expect(cli(["open", "--file", definitionPath]).code).toBe(0);
      const kinds: string[] = [];
      let voted = false;
      for (let guard = 0; guard < 20; guard++) {
        const next = cli(["next", "--election", "E-V2-EXECUTOR"]);
        expect(next).toMatchObject({ code: 0, stderr: "" });
        const directive = JSON.parse(next.stdout);
        kinds.push(directive.kind);
        if (directive.kind === "done") break;
        if (directive.kind === "collect-wait") {
          if (!voted) {
            expect(cli(["vote", "--election", "E-V2-EXECUTOR", "--file", ballotPath]).code).toBe(0);
            voted = true;
          }
          continue;
        }
        writeFileSync(directivePath, next.stdout);
        expect(cli([directive.verb, "--election", "E-V2-EXECUTOR", "--file", directivePath]).code).toBe(0);
        const reported = cli(["report", "--election", "E-V2-EXECUTOR", "--file", directivePath]);
        expect(reported).toMatchObject({ code: 0, stderr: "" });
      }
      expect(kinds).toEqual(["distribute", "collect-wait", "tally-ready", "render", "verify", "done"]);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
