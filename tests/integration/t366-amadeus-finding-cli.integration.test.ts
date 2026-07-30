// covers: subcommand:amadeus-finding:file
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

describe("amadeus-finding file", () => {
  test("prompt mode returns an approval candidate without contacting GitHub", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-finding-cli-"));
    roots.push(root);
    mkdirSync(join(root, "amadeus"), { recursive: true });
    writeFileSync(
      join(root, "amadeus", "config.json"),
      `${JSON.stringify({ "auto-file-findings": "prompt" })}\n`,
      "utf-8",
    );
    const bodyFile = join(root, "finding.md");
    writeFileSync(bodyFile, "Observed evidence.", "utf-8");

    const result = spawnSync(
      process.execPath,
      [
        TOOL,
        "file",
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
});
