// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: small
//
// U2 walking-skeleton-claude — parsePluginCliArgs is a pure fail-closed parser
// (no filesystem), so its full accept/reject enumeration lives in the unit tier
// (fs-tests-integration-first). Every rejected shape must yield a usage error so
// the mutation body (integration-tested in t299) is never reached with raw argv.

import { describe, expect, test } from "bun:test";
import { parsePluginCliArgs } from "../../packages/framework/core/tools/amadeus-plugin.ts";

describe("t300 parsePluginCliArgs (fail-closed)", () => {
  test("accepts the four verbs and their allowed flags", () => {
    const cases: Array<[string[], object]> = [
      [["compose"], { kind: "compose", ifStale: false }],
      [["compose", "--if-stale"], { kind: "compose", ifStale: true }],
      [["compose", "--project-root", "/x"], { kind: "compose", ifStale: false, projectRoot: "/x" }],
      [["compose", "--if-stale", "--project-root", "/x"], { kind: "compose", ifStale: true, projectRoot: "/x" }],
      [["doctor"], { kind: "doctor" }],
      [["status"], { kind: "status" }],
      [["drop", "my-plugin"], { kind: "drop", name: "my-plugin" }],
      [["drop", "my-plugin", "--project-root", "/x"], { kind: "drop", name: "my-plugin", projectRoot: "/x" }],
    ];
    for (const [argv, expected] of cases) {
      const r = parsePluginCliArgs(argv);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.command).toMatchObject(expected);
    }
  });

  test("rejects every fail-closed shape with a usage error", () => {
    const rejected: string[][] = [
      [], // no verb
      ["frobnicate"], // unknown verb
      ["compose", "--help"], // unknown flag = surplus argument
      ["compose", "extra"], // surplus positional
      ["compose", "--project-root"], // missing value
      ["compose", "--project-root", "--if-stale"], // value looks like a flag
      ["drop"], // missing name
      ["drop", "a", "b"], // two positionals
      ["drop", "a", "--unknown"], // unknown flag on drop
      ["doctor", "extra"], // surplus argument
      ["status", "--if-stale"], // flag not allowed on status
    ];
    for (const argv of rejected) {
      const r = parsePluginCliArgs(argv);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.message.length).toBeGreaterThan(0);
    }
  });
});
