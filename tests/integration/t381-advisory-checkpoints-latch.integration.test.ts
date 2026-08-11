// covers: file:plugins/formal-model-check/tools/plugin-activation.ts, file:packages/framework/core/tools/amadeus-plugin-runtime.ts, function:advisoryLatchDir
// size: medium

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ACTIVATION_PLUGIN,
  ACTIVATION_WATCH_GLOBS,
  activationAdvisoriesForHost,
  main as activationMain,
  recordActivationVerdict,
  specRootForHost,
} from "../../plugins/formal-model-check/tools/plugin-activation.ts";
import {
  advisoryLatchPath,
  unlatchedAdvisories,
  type Advisory,
} from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import { advisoryLatchDir } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { writeActivationModelAssets } from "../harness/formal-model-fixture.ts";

const roots: string[] = [];

function changedHost(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t381-"));
  roots.push(root);
  const host = join(root, ".claude");
  mkdirSync(host, { recursive: true });
  writeActivationModelAssets(root);
  writeFileSync(
    join(host, ".amadeus-plugin-composition.json"),
    JSON.stringify({ plugins: [[ACTIVATION_PLUGIN, { stageIndex: [{ slug: ACTIVATION_PLUGIN }] }]] }),
  );
  expect(recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS)).toBe(true);
  writeFileSync(join(specRootForHost(host), "tla", "FormalElection.tla"), "---- MODULE FormalElection ----\nVARIABLE x\n====\n");
  return host;
}

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe("plugin-owned activation and generic host latch", () => {
  test("plugin computes its own changed-spec advisory", () => {
    const raised = activationAdvisoriesForHost(changedHost(), "build-and-test");
    expect(raised).toHaveLength(1);
    expect(raised[0]).toMatchObject({ plugin: ACTIVATION_PLUGIN, code: "changed", stage: "build-and-test" });
  });

  test("host latch is generic over arbitrary plugin names and codes", () => {
    const advisory: Advisory = {
      plugin: "fixture-plugin",
      code: "fixture-hold",
      message: "hold",
      stage: "fixture-stage",
    };
    const dir = join(mkdtempSync(join(tmpdir(), "amadeus-t381-latch-")), "latch");
    roots.push(join(dir, ".."));
    expect(unlatchedAdvisories(dir, [advisory], "2026-08-11T00:00:00Z")).toEqual([advisory]);
    expect(unlatchedAdvisories(dir, [advisory])).toEqual([]);
    expect(advisoryLatchPath(dir, advisory.plugin, advisory.code)).toEndWith("fixture-plugin.fixture-hold");
    expect(advisoryLatchDir("/project", "intent-a", "space-a")).toEndWith(
      "amadeus/spaces/space-a/intents/intent-a/.amadeus-advisory-latch",
    );
  });

  test("an unreadable latch fails open", () => {
    const advisory: Advisory = { plugin: "p", code: "c", message: "m", stage: "s" };
    const raised = unlatchedAdvisories("/unused", [advisory], "now", {
      existsSync: () => { throw new Error("EACCES"); },
      mkdirSync: () => { throw new Error("EACCES"); },
      writeFileSync: () => { throw new Error("EACCES"); },
    });
    expect(raised).toEqual([advisory]);
  });

  test("plugin CLI validates arguments and emits both advisory verdicts", () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const stdoutWrite = spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    const stderrWrite = spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
    try {
      expect(activationMain(["invalid"])).toBe(2);
      expect(stderr.join("")).toContain("expected advisory|record");

      const host = changedHost();
      expect(activationMain(["advisory", host, "build-and-test"])).toBe(1);
      expect(JSON.parse(stdout.pop() ?? "{}").verdict.kind).toBe("hold");

      expect(activationMain(["record", host])).toBe(0);
      expect(activationMain(["advisory", host, "build-and-test"])).toBe(0);
      expect(JSON.parse(stdout.pop() ?? "{}").verdict.kind).toBe("no-hold");
    } finally {
      stdoutWrite.mockRestore();
      stderrWrite.mockRestore();
    }
  });
});
