// covers: subcommand:amadeus-finding:create-github-issue
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { REPO_ROOT } from "../harness/fixtures.ts";

const TOOL = join(
  REPO_ROOT,
  "packages/framework/core/tools/amadeus-finding.ts",
);
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("amadeus-finding create-github-issue", () => {
  test("prompt mode returns an approval candidate without contacting GitHub", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-finding-cli-"));
    roots.push(root);
    mkdirSync(join(root, "amadeus"), { recursive: true });
    writeFileSync(
      join(root, "amadeus", "config.json"),
      `${JSON.stringify({ finding: { github: { issue: { creation: { mode: "prompt" } } } } })}\n`,
      "utf-8",
    );
    const bodyFile = join(root, "finding.md");
    writeFileSync(bodyFile, "Observed evidence.", "utf-8");

    const result = spawnSync(
      process.execPath,
      [
        TOOL,
        "create-github-issue",
        "--project-dir",
        root,
        "--kind",
        "defect",
        "--title",
        "A reproducible Amadeus defect",
        "--body-file",
        bodyFile,
        "--fingerprint",
        "orchestrator:reproducible-defect",
      ],
      {
        cwd: root,
        encoding: "utf-8",
        env: { ...process.env, PATH: "" },
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: "approval-required",
    });
    expect(readFileSync(bodyFile, "utf-8")).toBe("Observed evidence.");
  });

  test("resolves a relative body file from the project directory", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-finding-cli-"));
    const runnerRoot = mkdtempSync(join(tmpdir(), "amadeus-finding-runner-"));
    roots.push(root, runnerRoot);
    mkdirSync(join(root, "amadeus"), { recursive: true });
    writeFileSync(
      join(root, "amadeus", "config.json"),
      `${JSON.stringify({ finding: { github: { issue: { creation: { mode: "prompt" } } } } })}\n`,
      "utf-8",
    );
    writeFileSync(join(root, "finding.md"), "Observed evidence.", "utf-8");

    const result = spawnSync(
      process.execPath,
      [
        TOOL,
        "create-github-issue",
        "--project-dir",
        root,
        "--kind",
        "defect",
        "--title",
        "A reproducible Amadeus defect",
        "--body-file",
        "finding.md",
        "--fingerprint",
        "orchestrator:relative-body-file",
      ],
      {
        cwd: runnerRoot,
        encoding: "utf-8",
        env: { ...process.env, PATH: "" },
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: "approval-required",
    });
  });
});
