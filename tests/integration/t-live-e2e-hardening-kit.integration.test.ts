import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CredentialBinding, LiveRunContext } from "../harness/live-e2e/adapter.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  allocateOfflineScratch,
  createScriptedJourney,
  ScriptedLiveAdapter,
} from "../harness/live-e2e/testing/fakes.ts";

function fixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), "amadeus-live-hardening-"));
}

function context(root: string, runId: string, releases: string[]): LiveRunContext {
  return {
    env: { AMADEUS_CODEX_EXEC_LIVE: "1" },
    gitSha: "a".repeat(40),
    now: () => new Date("2026-08-03T00:00:00.000Z"),
    ledgerPath: join(root, "runs.jsonl"),
    durability: "file-only",
    credentialSource: {
      canLease: async () => true,
      lease: async (): Promise<CredentialBinding> => ({
        key: "FIXTURE_CREDENTIAL",
        expose: () => "fixture-canary",
        release: async () => {
          releases.push(runId);
        },
      }),
    },
    allocator: {
      allocate: async (registrar) => allocateOfflineScratch(root, runId, registrar),
    },
    leakCheck: async () => [],
  };
}

describe("live E2E hardening kit integration", () => {
  test("drives the production lifecycle offline and releases run-owned credentials", async () => {
    const root = fixtureRoot();
    const runId = "success-run";
    const releases: string[] = [];
    const adapter = new ScriptedLiveAdapter({ runId });
    try {
      const result = await runLiveJourney(adapter, createScriptedJourney(), context(root, runId, releases));
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
          cleanup: { failures: [], leakFindings: [] },
        },
      });
      expect(adapter.calls.map((call) => call.boundary)).toEqual(["probe", "prepare", "spawn", "cleanup"]);
      expect(adapter.calls.every((call) => call.runId === runId)).toBe(true);
      expect(releases).toEqual([runId]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("cleans a credential registered before prepare throws", async () => {
    const root = fixtureRoot();
    const runId = "prepare-fault-run";
    const releases: string[] = [];
    const adapter = new ScriptedLiveAdapter({ runId, fault: "prepare-throw" });
    try {
      const result = await runLiveJourney(adapter, createScriptedJourney(), context(root, runId, releases));
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED" },
        },
      });
      expect(adapter.calls.map((call) => call.boundary)).toEqual(["probe", "prepare", "cleanup"]);
      expect(releases).toEqual([runId]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("observes abort and reap before cleanup for a deterministic timeout", async () => {
    const root = fixtureRoot();
    const runId = "timeout-run";
    const releases: string[] = [];
    const adapter = new ScriptedLiveAdapter({ runId, fault: "timeout" });
    try {
      const result = await runLiveJourney(
        adapter,
        createScriptedJourney({ timeoutMs: 5 }),
        context(root, runId, releases),
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { code: "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT" },
        },
      });
      expect(adapter.calls.map((call) => call.boundary)).toEqual([
        "probe",
        "prepare",
        "spawn",
        "abort",
        "reap",
        "cleanup",
      ]);
      expect(releases).toEqual([runId]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
