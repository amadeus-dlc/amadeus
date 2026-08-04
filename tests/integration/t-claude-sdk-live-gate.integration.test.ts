import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { claudeSdkLiveRequirementsSkipReason, claudeSdkLiveSkipReason } from "../harness/claude-sdk-live.ts";
import { createClaudeSdkJourney } from "../harness/live-e2e/journey.ts";
import { capabilityById } from "../harness/live-e2e/registry.ts";
import {
  dispatchSdkWorker,
  emitResult,
  exitSdkWorker,
  lateAfterTerminal,
  parseCredentialFrame,
  runSdkWorker,
  sdkWorkerExitCode,
  sdkWorkerProbeSurface,
  type SdkWorkerPorts,
} from "../harness/live-e2e/claude-sdk-worker.ts";
import type { DriveResult } from "../harness/sdk-drive.ts";
import { buildRedGreenEvidence } from "../harness/live-e2e/testing/evidence.ts";
import {
  adjudicateClaudeSdkContract,
  type ClaudeSdkContractObservation,
} from "../harness/live-e2e/testing/claude-sdk-contract.ts";

function baseline(): ClaudeSdkContractObservation {
  return {
    ciDenied: true,
    boundaryCalls: [],
    optInValue: "1",
    gateAllowed: true,
    childEnvironmentKeys: ["PATH", "LANG", "LC_ALL", "NO_COLOR", "HOME", "TMPDIR"],
    settingSources: ["project"],
    credentialFrameWrites: 1,
    credentialFrameReads: 1,
    credentialReplayed: false,
    output: {
      singleEventBytes: 65_536,
      totalBytes: 1_048_576,
      eventCount: 4_096,
      queueEvents: 16,
      queueBytes: 262_144,
      truncated: false,
      aborted: false,
      reaped: true,
    },
  };
}

function credentialBytes(secret = "fixture-secret"): Uint8Array {
  const payload = new TextEncoder().encode(JSON.stringify({
    runNonce: "nonce",
    generation: 1,
    childKey: "ANTHROPIC_API_KEY",
    secret,
  }));
  return new Uint8Array([...new TextEncoder().encode(`${payload.byteLength}\n`), ...payload]);
}

function driveResult(isError = false): DriveResult {
  return {
    toolResults: [{
      toolName: "Write",
      input: {},
      toolUseId: "tool-1",
      resultText: "written",
      isError: false,
    }],
    assistantText: "done",
    resultEvent: undefined,
    resultEvents: [{
      type: "result",
      subtype: isError ? "error" : "success",
      is_error: isError,
      num_turns: 1,
      permissionDenialsCount: 0,
      raw: {},
    }],
    messageTypes: ["assistant", "result", "assistant"],
    askedQuestions: [],
    stateFile: "state",
    auditEvents: ["audit"],
  };
}

function workerPorts(overrides: Partial<SdkWorkerPorts> = {}): SdkWorkerPorts {
  const env: Record<string, string | undefined> = {};
  return {
    readFrameBytes: async () => credentialBytes(),
    drive: async () => driveResult(),
    cwd: () => "/fixture/project",
    env,
    onSignal: () => {},
    offSignal: () => {},
    write: () => {},
    ...overrides,
  };
}

describe("Claude SDK live contract", () => {
  test("worker probe reports measured surfaces and rejects error terminals", () => {
    expect(sdkWorkerProbeSurface()).toMatchObject({ query: true, abort: true });
    expect(sdkWorkerExitCode([])).toBe(1);
    expect(sdkWorkerExitCode([{
      type: "result",
      subtype: "error",
      is_error: true,
      num_turns: 1,
      permissionDenialsCount: 0,
      raw: {},
    }])).toBe(1);
    expect(sdkWorkerExitCode([{
      type: "result",
      subtype: "success",
      is_error: false,
      num_turns: 1,
      permissionDenialsCount: 0,
      raw: {},
    }])).toBe(0);
  });

  test("worker validates framed credentials and detects late events", () => {
    expect(parseCredentialFrame(credentialBytes())).toMatchObject({
      runNonce: "nonce",
      generation: 1,
      childKey: "ANTHROPIC_API_KEY",
      secret: "fixture-secret",
    });
    expect(() => parseCredentialFrame(new Uint8Array())).toThrow("prefix is missing");
    expect(() => parseCredentialFrame(new TextEncoder().encode("2\n{}"))).toThrow("frame is invalid");
    expect(() => parseCredentialFrame(new TextEncoder().encode("3\n{}"))).toThrow("length mismatch");
    expect(lateAfterTerminal(["assistant", "result"])).toBe(false);
    expect(lateAfterTerminal(["assistant", "result", "assistant"])).toBe(true);
  });

  test("worker emits bounded structured records", () => {
    const lines: string[] = [];
    emitResult(driveResult(), (line) => lines.push(line));
    const records = lines.map((line) => JSON.parse(line));
    expect(records.map((record) => record.kind)).toEqual([
      "tool",
      "state",
      "audit",
      "assistant",
      "terminal",
    ]);
    expect(records.at(-1)).toMatchObject({ isError: false, hasLateEvent: true });
  });

  test("worker installs abort handling, zeroes the frame, and clears credential state", async () => {
    const bytes = credentialBytes();
    const env: Record<string, string | undefined> = {};
    const signals: string[] = [];
    let observedCredential: string | undefined;
    const code = await runSdkWorker(workerPorts({
      readFrameBytes: async () => bytes,
      env,
      onSignal: (signal) => signals.push(`on:${signal}`),
      offSignal: (signal) => signals.push(`off:${signal}`),
      drive: async (_prompt, options) => {
        observedCredential = env.ANTHROPIC_API_KEY;
        expect(options).toMatchObject({
          projectDir: "/fixture/project",
          permissionMode: "bypassPermissions",
          settingSources: ["project"],
          settingsAuthority: "project-only",
        });
        return driveResult();
      },
    }));
    expect(code).toBe(0);
    expect(observedCredential).toBe("fixture-secret");
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(bytes.every((byte) => byte === 0)).toBe(true);
    expect(signals).toEqual(["on:SIGUSR1", "off:SIGUSR1"]);
  });

  test("worker dispatches probe and maps promise rejection to exit one", async () => {
    const output: string[] = [];
    expect(await dispatchSdkWorker(["worker", "--probe"], workerPorts({ write: (line) => output.push(line) })))
      .toBe(0);
    expect(JSON.parse(output.join(""))).toMatchObject({ query: true, abort: true });

    const exits: number[] = [];
    exitSdkWorker(Promise.resolve(0), (code) => exits.push(code));
    exitSdkWorker(Promise.reject(new Error("boom")), (code) => exits.push(code));
    await Bun.sleep(0);
    expect(exits).toEqual([0, 1]);
  });

  test("worker CLI delegates its probe through the main guard", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, "tests/harness/live-e2e/claude-sdk-worker.ts", "--probe"],
      cwd: process.cwd(),
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.toString())).toMatchObject({ query: true, abort: true });
  });

  test("GHA hard deny returns before SDK, dist, or auth probes", () => {
    expect(claudeSdkLiveRequirementsSkipReason({
      env: { GITHUB_ACTIONS: "true", AMADEUS_CLAUDE_SDK_LIVE: "1" },
      claudeBin: "/missing/claude",
      distributionDir: "/missing/dist",
      packageJsonPath: "/missing/package.json",
    })).toContain("forbidden on GitHub Actions");
  });

  test.each([undefined, "", "0", "true", " 1", "1 "])(
    "only exact one enables Claude SDK (%s is denied)",
    (value) => {
      expect(claudeSdkLiveSkipReason({ AMADEUS_CLAUDE_SDK_LIVE: value })).toContain(
        "AMADEUS_CLAUDE_SDK_LIVE=1",
      );
    },
  );

  test("requirements probe checks SDK version, distribution, and API-key auth", () => {
    const root = mkdtempSync(join(tmpdir(), "claude-sdk-gate-"));
    const packageJsonPath = join(root, "package.json");
    const distributionDir = join(root, "dist");
    const env = { AMADEUS_CLAUDE_SDK_LIVE: "1", ANTHROPIC_API_KEY: "fixture-key" };
    try {
      writeFileSync(packageJsonPath, JSON.stringify({ dependencies: { "@anthropic-ai/claude-agent-sdk": "0.3.157" } }));
      expect(claudeSdkLiveRequirementsSkipReason({ env, claudeBin: "unused", distributionDir, packageJsonPath }))
        .toContain("Claude Agent SDK >= 0.3.158 is unavailable");

      writeFileSync(packageJsonPath, JSON.stringify({ devDependencies: { "@anthropic-ai/claude-agent-sdk": "0.3.158" } }));
      expect(claudeSdkLiveRequirementsSkipReason({ env, claudeBin: "unused", distributionDir, packageJsonPath }))
        .toBe(`distributable missing: ${distributionDir}`);
      mkdirSync(distributionDir);
      expect(claudeSdkLiveRequirementsSkipReason({
        env: { ...env, ANTHROPIC_API_KEY: undefined },
        claudeBin: "unused",
        distributionDir,
        packageJsonPath,
      })).toBe("provide ANTHROPIC_API_KEY");
      expect(claudeSdkLiveRequirementsSkipReason({ env, claudeBin: "unused", distributionDir, packageJsonPath }))
        .toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("registry and journey expose the approved SDK contract", async () => {
    expect(capabilityById("claude-sdk")).toMatchObject({
      ok: true,
      value: {
        minimumVersion: "0.3.158",
        optInKey: "AMADEUS_CLAUDE_SDK_LIVE",
        anchorKinds: ["schema", "tool", "state", "audit"],
      },
    });
    const events = [
      { kind: "state", ordinal: 0, present: false, digest: "state" },
      { kind: "audit", ordinal: 1, eventCount: 0, digest: "audit" },
      { kind: "assistant", ordinal: 2, byteLength: 2, digest: "output" },
      {
        kind: "terminal",
        ordinal: 3,
        type: "result",
        subtype: "success",
        isError: false,
        numTurns: 1,
        permissionDenialsCount: 0,
        hasLateEvent: false,
      },
    ];
    const assertion = await createClaudeSdkJourney().assert(
      {
        exitCode: 0,
        timedOut: false,
        aborted: false,
        stdoutDigest: "stdout",
        stderrDigest: "stderr",
        structured: { sdkEvents: events, truncated: false },
      },
      { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" },
    );
    expect(assertion.passed).toBe(true);
    for (const mutant of [
      events.map((event) => event.kind === "terminal" ? { ...event, subtype: "error" } : event),
      events.map((event) => event.kind === "terminal" ? { ...event, permissionDenialsCount: 1 } : event),
      events.map((event) => event.kind === "terminal" ? { ...event, hasLateEvent: true } : event),
      events.map((event) => event.kind === "assistant" ? { ...event, byteLength: 0 } : event),
    ]) {
      const result = await createClaudeSdkJourney().assert(
        {
          exitCode: 0,
          timedOut: false,
          aborted: false,
          stdoutDigest: "stdout",
          stderrDigest: "stderr",
          structured: { sdkEvents: mutant, truncated: false },
        },
        { root: "scratch", homeDir: "home", projectDir: "project", state: "ready" },
      );
      expect(result.passed).toBe(false);
    }
  });

  test("SDK contract proves approved baseline green and each stable mutant red", () => {
    const cases = [
      { id: "ci", assertion: "POLICY_CI_ZERO_CALLS" as const, mutant: { ...baseline(), boundaryCalls: ["probe"] } },
      { id: "opt-in", assertion: "POLICY_STRICT_OPT_IN" as const, mutant: { ...baseline(), optInValue: "true" } },
      { id: "env", assertion: "ENV_ALLOWLIST_EXACT" as const, mutant: { ...baseline(), childEnvironmentKeys: [...baseline().childEnvironmentKeys, "ANTHROPIC_API_KEY"] } },
      { id: "settings", assertion: "SETTINGS_PROJECT_ONLY" as const, mutant: { ...baseline(), settingSources: ["project", "user"] } },
      { id: "credential", assertion: "SDK_CREDENTIAL_PIPE_SINGLE_USE" as const, mutant: { ...baseline(), credentialFrameReads: 2 } },
      {
        id: "output",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, singleEventBytes: 65_537, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "total-output",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, totalBytes: 1_048_577, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "event-count",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, eventCount: 4_097, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "queue-events",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, queueEvents: 17, truncated: false, aborted: false, reaped: false },
        },
      },
      {
        id: "queue-bytes",
        assertion: "SDK_OUTPUT_BOUNDED_DRAIN" as const,
        mutant: {
          ...baseline(),
          output: { ...baseline().output, queueBytes: 262_145, truncated: false, aborted: false, reaped: false },
        },
      },
    ];
    for (const item of cases) {
      expect(buildRedGreenEvidence({
        caseId: item.id,
        seed: 1717,
        requirementIds: ["FR-10"],
        baseline: adjudicateClaudeSdkContract(baseline()),
        mutant: adjudicateClaudeSdkContract(item.mutant),
        expectedAssertionIds: [item.assertion],
      })).toMatchObject({ baselineStatus: "green", mutantStatus: "red", proven: true });
    }
  });
});
