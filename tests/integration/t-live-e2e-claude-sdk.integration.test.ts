import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CredentialBinding, CredentialDeclaration, CredentialSourcePort } from "../harness/live-e2e/adapter.ts";
import { ClaudeSdkAdapter, type ClaudeSdkAdapterOptions } from "../harness/live-e2e/claude-sdk.ts";
import { ClaudeAmbientCredentialSource, ClaudeScratchAllocator } from "../harness/live-e2e/claude.ts";
import { createClaudeSdkJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";

type FixtureMode = "success" | "duplicate" | "timeout" | "overflow";

function createFixture(mode: FixtureMode): {
  readonly root: string;
  readonly worker: string;
  readonly distribution: string;
  readonly observation: string;
} {
  const root = mkdtempSync(join(tmpdir(), "amadeus-live-claude-sdk-"));
  const worker = join(root, "fake-sdk-worker.ts");
  const distribution = join(root, "dist", "claude");
  const observation = join(root, "observation.json");
  mkdirSync(join(distribution, ".claude"), { recursive: true });
  writeFileSync(join(distribution, "CLAUDE.md"), "# Fixture\n", "utf8");
  writeFileSync(
    worker,
    `#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const input = await Bun.stdin.text();
const newline = input.indexOf("\\n");
const declaredLength = Number(input.slice(0, newline));
const payload = input.slice(newline + 1);
const frame = JSON.parse(payload);
const secondReadLength = (await Bun.stdin.text()).length;
writeFileSync(${JSON.stringify(observation)}, JSON.stringify({
  declaredLength,
  payloadLength: new TextEncoder().encode(payload).byteLength,
  secondReadLength,
  childKey: frame.childKey,
  receivedSecret: frame.secret === "sdk-secret-canary",
  environmentKeys: Object.keys(process.env).filter((key) => !key.startsWith("__MISE_")).sort(),
  hasCredentialEnv: Boolean(process.env.ANTHROPIC_API_KEY),
  settings: JSON.parse(readFileSync(join(process.cwd(), ".claude", "settings.json"), "utf8")),
}));
const events = [
  { kind: "tool", ordinal: 0, toolName: "Bash", isError: false, byteLength: 3, digest: "tool" },
  { kind: "state", ordinal: 1, present: false, digest: "state" },
  { kind: "audit", ordinal: 2, eventCount: 0, digest: "audit" },
  { kind: "assistant", ordinal: 3, byteLength: 2, digest: "assistant" },
  { kind: "terminal", ordinal: 4, type: "result", subtype: "success", isError: false, numTurns: 1, permissionDenialsCount: 0, hasLateEvent: false },
];
if (${JSON.stringify(mode)} === "timeout") {
  process.on("SIGUSR1", () => {});
  await new Promise(() => {});
} else if (${JSON.stringify(mode)} === "overflow") {
  process.stdout.write(JSON.stringify({ kind: "tool", ordinal: 0, padding: "x".repeat(65_537) }) + "\\n");
} else {
  for (const event of events) process.stdout.write(JSON.stringify(event) + "\\n");
  if (${JSON.stringify(mode)} === "duplicate") {
    process.stdout.write(JSON.stringify({ ...events[4], ordinal: 5 }) + "\\n");
  }
}
`,
    { encoding: "utf8" },
  );
  return { root, worker, distribution, observation };
}

class TrackingCredentialSource implements CredentialSourcePort {
  releaseCount = 0;

  async canLease(declaration: CredentialDeclaration): Promise<boolean> {
    return declaration.childKey === "ANTHROPIC_API_KEY";
  }

  async lease(declaration: CredentialDeclaration): Promise<CredentialBinding> {
    let active = true;
    return {
      key: declaration.childKey,
      expose: () => {
        if (!active) throw new Error("released");
        return "sdk-secret-canary";
      },
      release: async () => {
        active = false;
        this.releaseCount += 1;
      },
    };
  }
}

function liveContext(fixture: ReturnType<typeof createFixture>, credentialSource: CredentialSourcePort) {
  return {
    env: { AMADEUS_CLAUDE_SDK_LIVE: "1" },
    gitSha: "c".repeat(40),
    now: () => new Date("2026-08-04T00:00:00.000Z"),
    ledgerPath: join(fixture.root, "runs.jsonl"),
    durability: "file-only" as const,
    credentialSource,
    allocator: new ClaudeScratchAllocator({
      prefix: "claude-sdk-fixture-",
      distributionDir: fixture.distribution,
    }),
    leakCheck: async () => [],
  };
}

function adapter(
  fixture: ReturnType<typeof createFixture>,
  overrides: Partial<ClaudeSdkAdapterOptions> = {},
): ClaudeSdkAdapter {
  return new ClaudeSdkAdapter({
    distributionDir: fixture.distribution,
    parentEnv: {
      PATH: process.env.PATH,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      NO_COLOR: "1",
      HOME: "/source/home",
      CLAUDE_CONFIG_DIR: "/source/config",
      ANTHROPIC_API_KEY: "ambient-must-not-cross",
    },
    workerScript: fixture.worker,
    sdkVersion: "0.3.158",
    ...overrides,
  });
}

describe("Claude SDK live adapter", () => {
  test("child worker receives a one-shot credential frame and emits a green structured receipt", async () => {
    const fixture = createFixture("success");
    const credentials = new TrackingCredentialSource();
    try {
      const result = await runLiveJourney(
        adapter(fixture),
        createClaudeSdkJourney(10_000),
        liveContext(fixture, credentials),
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "claude-sdk",
          measuredVersion: "0.3.158",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
          cleanup: { failures: [], leakFindings: [] },
        },
      });
      const observed = JSON.parse(readFileSync(fixture.observation, "utf8")) as {
        declaredLength: number;
        payloadLength: number;
        secondReadLength: number;
        receivedSecret: boolean;
        environmentKeys: string[];
        hasCredentialEnv: boolean;
        settings: unknown;
      };
      expect(observed.declaredLength).toBe(observed.payloadLength);
      expect(observed.secondReadLength).toBe(0);
      expect(observed.receivedSecret).toBe(true);
      expect(observed.hasCredentialEnv).toBe(false);
      expect(observed.environmentKeys.filter((key) => key !== "__CF_USER_TEXT_ENCODING")).toEqual([
        "HOME",
        "LANG",
        "LC_ALL",
        "NO_COLOR",
        "PATH",
        "TMPDIR",
      ]);
      expect(observed.settings).toEqual({ hooks: {} });
      expect(credentials.releaseCount).toBe(1);
      expect(JSON.stringify(result)).not.toContain("sdk-secret-canary");
      expect(readFileSync(join(fixture.root, "runs.jsonl"), "utf8")).not.toContain("sdk-secret-canary");
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("duplicate terminal is a deterministic assertion failure", async () => {
    const fixture = createFixture("duplicate");
    try {
      const result = await runLiveJourney(
        adapter(fixture),
        createClaudeSdkJourney(10_000),
        liveContext(fixture, new TrackingCredentialSource()),
      );
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "recorded", outcome: { code: "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED" } },
      });
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("abort-ignoring worker is terminated, reaped, and credential-cleaned before timeout returns", async () => {
    const fixture = createFixture("timeout");
    const credentials = new TrackingCredentialSource();
    try {
      const result = await runLiveJourney(
        adapter(fixture, { abortGraceMs: 20, termGraceMs: 20, reapGraceMs: 20 }),
        createClaudeSdkJourney(30),
        liveContext(fixture, credentials),
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { code: "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT" },
          cleanup: { failures: [], retainedResourceIds: [] },
        },
      });
      expect(credentials.releaseCount).toBe(1);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("single-event overflow closes acceptance, aborts the worker, and cannot be green", async () => {
    const fixture = createFixture("overflow");
    try {
      const result = await runLiveJourney(
        adapter(fixture, { abortGraceMs: 20, termGraceMs: 20, reapGraceMs: 20 }),
        createClaudeSdkJourney(10_000),
        liveContext(fixture, new TrackingCredentialSource()),
      );
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "recorded", outcome: { code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED" } },
      });
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("old SDK version skips before scratch allocation", async () => {
    const fixture = createFixture("success");
    const allocator = new ClaudeScratchAllocator({ prefix: "claude-sdk-old-", distributionDir: fixture.distribution });
    try {
      const result = await runLiveJourney(
        new ClaudeSdkAdapter({
          distributionDir: fixture.distribution,
          parentEnv: { PATH: process.env.PATH },
          workerScript: fixture.worker,
          sdkVersion: "0.3.157",
        }),
        createClaudeSdkJourney(10_000),
        {
          ...liveContext(fixture, new ClaudeAmbientCredentialSource({ ANTHROPIC_API_KEY: "secret" })),
          allocator,
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED" } },
      });
      expect(allocator.allocationCount).toBe(0);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
