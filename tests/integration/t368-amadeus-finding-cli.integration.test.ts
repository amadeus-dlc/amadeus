// covers: function:runFindingCli
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultFindingDependencies,
  type FindingCoordinatorDependencies,
  runFindingCli,
} from "../../packages/framework/core/tools/amadeus-finding.ts";

const roots: string[] = [];

function project(): { root: string; body: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-finding-cli-unit-"));
  roots.push(root);
  mkdirSync(join(root, "amadeus"), { recursive: true });
  writeFileSync(
    join(root, "amadeus", "config.json"),
    `${JSON.stringify({ "auto-file-findings": "prompt" })}\n`,
    "utf-8",
  );
  const body = join(root, "finding.md");
  writeFileSync(body, "Evidence", "utf-8");
  return { root, body };
}

function argv(root: string, body: string): string[] {
  return [
    "file",
    "--project-dir",
    root,
    "--kind",
    "defect",
    "--title",
    "Finding",
    "--body-file",
    body,
    "--fingerprint",
    "finding:fingerprint",
  ];
}

const unreachableDependencies: FindingCoordinatorDependencies = {
  resolveConfig: () => {
    throw new Error("config must not be resolved");
  },
  gateway: {
    readiness: async () => {
      throw new Error("GitHub must not be accessed");
    },
    findIssuesByMarker: async () => {
      throw new Error("GitHub must not be accessed");
    },
    createFindingIssue: async () => {
      throw new Error("GitHub must not be accessed");
    },
  },
};

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("runFindingCli", () => {
  test("adapts the layered config to the finding-only policy shape", () => {
    const { root } = project();
    expect(defaultFindingDependencies.resolveConfig(root)).toEqual({
      kind: "resolved",
      autoFileFindings: "prompt",
    });

    writeFileSync(
      join(root, "amadeus", "config.json"),
      `${JSON.stringify({ "auto-file-findings": "sometimes" })}\n`,
      "utf-8",
    );
    expect(defaultFindingDependencies.resolveConfig(root)).toEqual({
      kind: "invalid",
    });
  });

  test.each([
    [
      "unknown argument",
      (args: string[]) => [...args, "--unknown"],
      "unknown argument: --unknown",
    ],
    [
      "missing value",
      (args: string[]) => args.slice(0, -1),
      "missing value for --fingerprint",
    ],
    [
      "invalid kind",
      (args: string[]) => args.map((value, index) => (index === 4 ? "incident" : value)),
      "invalid --kind",
    ],
    [
      "oversized title",
      (args: string[]) => args.map((value, index) => (index === 6 ? "T".repeat(257) : value)),
      "invalid or missing --title",
    ],
    [
      "oversized fingerprint",
      (args: string[]) => args.map((value, index) => (index === 10 ? "F".repeat(513) : value)),
      "invalid or missing --fingerprint",
    ],
  ] as const)("rejects %s as invalid input", async (_name, mutate, reason) => {
    const { root, body } = project();

    const result = await runFindingCli(
      mutate(argv(root, body)),
      unreachableDependencies,
    );

    expect(result).toEqual({
      exitCode: 2,
      stdout: "",
      stderr: `amadeus-finding: ${reason}\n`,
    });
  });

  test("rejects body files that are outside, linked, non-regular, oversized, or empty", async () => {
    const { root, body } = project();
    const outside = mkdtempSync(join(tmpdir(), "amadeus-finding-outside-"));
    roots.push(outside);
    const outsideFile = join(outside, "outside.md");
    const linked = join(root, "linked.md");
    const directory = join(root, "directory");
    const oversized = join(root, "oversized.md");
    const empty = join(root, "empty.md");
    writeFileSync(outsideFile, "Outside", "utf-8");
    symlinkSync(body, linked);
    mkdirSync(directory);
    writeFileSync(oversized, "X".repeat(64 * 1024 + 1), "utf-8");
    writeFileSync(empty, "", "utf-8");

    for (const rejected of [outsideFile, linked, directory, oversized, empty]) {
      const result = await runFindingCli(
        argv(root, rejected),
        unreachableDependencies,
      );
      expect(result.exitCode).toBe(2);
    }
  });

  test("returns exit code 1 for a typed filing failure", async () => {
    const { root, body } = project();
    const result = await runFindingCli(argv(root, body), {
      ...unreachableDependencies,
      resolveConfig: () => ({ kind: "invalid", issues: [] }),
    });

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: "failure",
      reason: "invalid-config",
    });
    expect(result.stderr).toBe("");
  });

  test("returns an approval candidate without contacting GitHub", async () => {
    const { root, body } = project();
    const result = await runFindingCli(argv(root, body), {
      ...unreachableDependencies,
      resolveConfig: () => ({
        kind: "resolved",
        autoFileFindings: "prompt",
      }),
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: "approval-required",
    });
    expect(result.stderr).toBe("");
  });

  test("explicit approval bypasses prompt mode and reaches readiness", async () => {
    const { root, body } = project();
    let readinessCalls = 0;
    const result = await runFindingCli([...argv(root, body), "--approved"], {
      resolveConfig: () => ({
        kind: "resolved",
        autoFileFindings: "prompt",
      }),
      gateway: {
        readiness: async () => {
          readinessCalls += 1;
          return {
            kind: "failure",
            classification: "api",
            summary: "unavailable",
            retryable: true,
            effect: "no-effect-confirmed",
          };
        },
        findIssuesByMarker: unreachableDependencies.gateway.findIssuesByMarker,
        createFindingIssue: unreachableDependencies.gateway.createFindingIssue,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(readinessCalls).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: "failure",
      reason: "github",
    });
  });
});
