#!/usr/bin/env bun

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const checkScript = join(root, "dev-scripts/evals/llm-templates/check.ts");
const corporateRunner = join(root, "dev-scripts/run-codex-corporate.sh");
const claudePersonalRunner = join(root, "dev-scripts/run-claude-personal.sh");

type Case = {
  args?: string[];
  env?: Record<string, string>;
  expectedCommand?: string;
  expectedRunner?: string;
  name: string;
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function runCase(testCase: Case): void {
  const workspace = mkdtempSync(join(tmpdir(), "amadeus-llm-runner-options-"));
  try {
    const result = Bun.spawnSync([
      "bun",
      "run",
      checkScript,
      "--mode",
      "ping",
      "--provider",
      "real",
      "--print-command",
      "--workspace",
      workspace,
      ...(testCase.args ?? []),
    ], {
      cwd: root,
      env: {
        ...process.env,
        ...(testCase.env ?? {}),
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    if (result.exitCode !== 0) {
      fail([
        `${testCase.name}: command failed`,
        "stdout:",
        stdout,
        "stderr:",
        stderr,
      ].join("\n"));
    }

    const expected = testCase.expectedCommand ?? `'${testCase.expectedRunner}' 'exec'`;
    if (!stdout.includes(expected)) {
      fail([
        `${testCase.name}: unexpected runner command`,
        `expected: ${expected}`,
        "stdout:",
        stdout,
      ].join("\n"));
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

const cases: Case[] = [
  {
    name: "default runner uses corporate wrapper",
    expectedRunner: corporateRunner,
  },
  {
    name: "environment runner overrides default",
    env: { AMADEUS_CODEX_RUNNER: "dev-scripts/run-codex-corporate.sh" },
    expectedRunner: corporateRunner,
  },
  {
    name: "cli runner overrides environment runner",
    args: ["--runner", "dev-scripts/run-codex-corporate.sh"],
    env: { AMADEUS_CODEX_RUNNER: "dev-scripts/run-codex-personal.sh" },
    expectedRunner: corporateRunner,
  },
  {
    name: "claude runner uses claude print-mode command",
    args: ["--runner", "dev-scripts/run-claude-personal.sh"],
    expectedCommand: `'${claudePersonalRunner}' '-p'`,
  },
];

for (const testCase of cases) {
  runCase(testCase);
}

console.log("llm runner options eval: ok");
