// covers: harness-instrument:amadeus-mirror
//
// t232 (process/fs boundary) — drives the amadeus-mirror CLI seam against a
// temp workspace fixture (real fs). Mutations delegate one-to-one to the v1
// lifecycle through the injected runner (C6); status precondition/usage exits
// and the real gh process boundary (C4, spawnGh) are exercised here. The v1
// read regression (status recognises a recorded issue, duplicate-create guard)
// lives in tests/integration/t300-amadeus-mirror-state-read.integration.test.ts.

import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type GhResult,
  type GhRunner,
  handleStatus,
  main,
  spawnGh,
} from "../../packages/framework/core/tools/amadeus-mirror.ts";

const DIR = "260717-mirror-issue-tool";
const roots: string[] = [];

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

function makeWorkspace(over: { status?: string; intentStatus?: string } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-t232-"));
  roots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  mkdirSync(join(intents, DIR), { recursive: true });
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([
      {
        uuid: "019f7003-e273-7c0b-85ba-0a6c99d0aa9d",
        slug: "mirror-issue-tool",
        dirName: DIR,
        scope: "amadeus",
        status: over.intentStatus ?? "in-flight",
      },
    ])}\n`,
  );
  const state = [
    "# Amadeus State",
    "",
    "## Project Information",
    "- **Project**: amadeus-mirror ツール(試運転)",
    "- **Scope**: amadeus",
    "",
    "## Current Status",
    "- **Lifecycle Phase**: INCEPTION",
    "- **Current Stage**: reverse-engineering",
    `- **Status**: ${over.status ?? "Running"}`,
    "- **Last Updated**: 2026-07-17T13:23:34Z",
    "",
  ].join("\n");
  writeFileSync(join(intents, DIR, "amadeus-state.md"), state);
  return root;
}

function fakeGh(
  responses: Record<string, GhResult>,
): { run: GhRunner; calls: string[][] } {
  const calls: string[][] = [];
  const run: GhRunner = (args) => {
    calls.push(args);
    const key = args.slice(0, 2).join(" ");
    return responses[key] ?? { kind: "ok", stdout: "" };
  };
  return { run, calls };
}

describe("t232 main dispatch through the injected lifecycle seam (C6)", () => {
  test("mutations delegate one-to-one to lifecycle manual without direct gh calls", async () => {
    const root = makeWorkspace();
    const gh = fakeGh({});
    const lifecycleCalls: Array<{
      manualOperation?: string;
      invocationId?: string;
      intentDir?: string;
    }> = [];
    const lifecycle = async (request: {
      manualOperation?: "create" | "sync" | "close";
      invocationId?: string;
      intentDir?: string;
    }) => {
      lifecycleCalls.push(request);
      return {
        kind: "ok" as const,
        outcome: {
          kind: "continued" as const,
          outcomes: [
            {
              kind: "completed" as const,
              operation: request.manualOperation!,
              issueNumber: 1161,
            },
          ],
          workflowMayAdvance: true as const,
        },
      };
    };
    const delegatedMain = main as unknown as (
      argv: string[],
      projectDir: string,
      run: GhRunner,
      runLifecycle: typeof lifecycle,
    ) => Promise<number>;

    for (const operation of ["create", "sync", "close"] as const) {
      expect(
        await delegatedMain(
          [operation, "--instance", `${operation}-1`, "--intent", DIR],
          root,
          gh.run,
          lifecycle,
        ),
      ).toBe(0);
    }

    expect(
      lifecycleCalls.map((request) => ({
        operation: request.manualOperation,
        instance: request.invocationId,
        intentDir: request.intentDir,
      })),
    ).toEqual(
      (["create", "sync", "close"] as const).map((operation) => ({
        operation,
        instance: `${operation}-1`,
        intentDir: DIR,
      })),
    );
    expect(gh.calls).toEqual([]);
  });

  test("usage path returns 2 without touching gh", async () => {
    const gh = fakeGh({});
    expect(await main(["bogus"], "/nonexistent", gh.run)).toBe(2);
    expect(gh.calls.length).toBe(0);
  });

  test("mutation without --instance is usage and has no side effects", async () => {
    const root = makeWorkspace();
    const gh = fakeGh({});
    const before = readFileSync(
      join(root, "amadeus", "spaces", "default", "intents", DIR, "amadeus-state.md"),
      "utf-8",
    );
    expect(await main(["create", "--intent", DIR], root, gh.run)).toBe(2);
    expect(gh.calls).toEqual([]);
    expect(
      readFileSync(
        join(root, "amadeus", "spaces", "default", "intents", DIR, "amadeus-state.md"),
        "utf-8",
      ),
    ).toBe(before);
  });
});

describe("t232 status precondition paths (C2 fail-closed)", () => {
  test("returns precondition exit 2 for gh-unready before reading the record", () => {
    const gh = fakeGh({
      "auth status": { kind: "error", exitCode: 127, stderr: "gh not runnable" },
    });
    expect(handleStatus("/nonexistent", null, gh.run)).toBe(2);
    expect(gh.calls).toEqual([["auth", "status"]]);
  });

  test("returns precondition exit 2 when the record cannot be resolved", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-mirror-t232-empty-"));
    roots.push(root);
    mkdirSync(join(root, "amadeus", "spaces", "default", "intents"), { recursive: true });
    expect(handleStatus(root, null, fakeGh({}).run)).toBe(2);
  });
});

describe("t232 spawnGh against a stub gh executable (C4 real process boundary)", () => {
  test("ok, non-zero, and missing-binary paths", () => {
    const bin = mkdtempSync(join(tmpdir(), "amadeus-mirror-ghstub-"));
    roots.push(bin);
    const stub = join(bin, "gh");
    writeFileSync(stub, '#!/bin/sh\nif [ "$1" = "boom" ]; then echo "kaput" >&2; exit 3; fi\necho "ok $@"\n');
    chmodSync(stub, 0o755);
    const oldPath = process.env.PATH;
    process.env.PATH = bin;
    try {
      const ok = spawnGh(["auth", "status"]);
      expect(ok).toEqual({ kind: "ok", stdout: "ok auth status\n" });
      const bad = spawnGh(["boom"]);
      expect(bad.kind).toBe("error");
      if (bad.kind === "error") {
        expect(bad.exitCode).toBe(3);
        expect(bad.stderr).toContain("kaput");
      }
      process.env.PATH = "/nonexistent-empty-path";
      const missing = spawnGh(["auth", "status"]);
      expect(missing.kind).toBe("error");
    } finally {
      process.env.PATH = oldPath;
    }
  });
});
