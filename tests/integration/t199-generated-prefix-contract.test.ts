// t199-generated-prefix-contract: authored files follow the framework prefix.
//
// This is the RED/GREEN guard for the upcoming public rename. Generated dist
// files are excluded because they are rebuilt by the packager. Every tracked
// authored file outside dist is checked by path and by bytes.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const prefix = "amadeus-";
const commandName = prefix.replace(/-$/, "");
const commonDirName = `${prefix}common`;
const knownPrefixes = [
  ["aidlc", "-"].join(""),
  ["amadeus", "-"].join(""),
] as const;
const forbiddenPrefixes = knownPrefixes.filter((known) => known !== prefix);

function trackedAuthoredFiles(): string[] {
  const res = spawnSync("git", ["ls-files", "-z"], {
    cwd: REPO_ROOT,
    encoding: "buffer",
  });
  expect(res.status).toBe(0);
  return Buffer.from(res.stdout)
    .toString("utf-8")
    .split("\0")
    .filter((file) => file.length > 0)
    .filter((file) => !file.startsWith("dist/"))
    .sort();
}

describe("authored source naming prefix contract", () => {
  test("tracked authored files include the prefixed framework surfaces", () => {
    const tracked = trackedAuthoredFiles();
    expect(tracked).toContain(`core/${commonDirName}/conductor.md`);
    expect(tracked).toContain(`core/tools/${prefix}utility.ts`);
    expect(tracked).toContain(`core/hooks/${prefix}stop.ts`);
    expect(tracked).toContain(`core/agents/${prefix}developer-agent.md`);
    expect(tracked).toContain(`core/sensors/${prefix}type-check.md`);
    expect(tracked).toContain(`core/scopes/${prefix}feature.md`);
    expect(tracked).toContain(`core/skills/${prefix}replay/SKILL.md`);
    expect(tracked).toContain(`harness/claude/skills/${commandName}/SKILL.md`);
  });

  test("tracked authored file paths and contents do not retain another known framework prefix", () => {
    const offenders: string[] = [];
    for (const file of trackedAuthoredFiles()) {
      const body = readFileSync(join(REPO_ROOT, file));
      for (const forbidden of forbiddenPrefixes) {
        if (file.includes(forbidden)) offenders.push(`${file}: path contains ${forbidden}`);
        if (body.includes(Buffer.from(forbidden))) {
          offenders.push(`${file}: content contains ${forbidden}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
