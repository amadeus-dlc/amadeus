// covers: file:tests/harness/live-e2e/kimi-print.ts, file:tests/harness/live-e2e/kimi.ts
// size: medium
//
// The Kimi print adapter driven through the REAL kernel (`runLiveJourney`)
// against a fake `kimi` binary. This is the contract normal CI can prove
// without a credit: gate deny with zero side effects, preflight skip before any
// spawn, allow-list-only child environment, source OAuth bound by reference and
// left untouched, the closed outcome taxonomy for pass / execution failure /
// anchor mismatch, and a cleanup barrier that closes before the ledger is
// written.
//
// Mechanism: real filesystem, real lifecycle, fake binary — the only thing
// stubbed is the model itself (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKimiPrintJourney } from "../harness/live-e2e/journey.ts";
import type { LiveJourney } from "../harness/live-e2e/adapter.ts";
import {
  bindKimiScratchHome,
  KIMI_BOUND_HOME_ENTRIES,
  KimiHomeCredentialSource,
  kimiHomeLayout,
  KimiScratchAllocator,
} from "../harness/live-e2e/kimi.ts";
import { KIMI_PRINT_ANCHOR_FILE, KimiPrintAdapter } from "../harness/live-e2e/kimi-print.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";

const SOURCE_SECRET = "source-oauth-fixture";
const ENV_RECORD = "child-env-keys.txt";

interface Fixture {
  readonly root: string;
  readonly kimiBin: string;
  readonly distribution: string;
  readonly sourceHome: string;
  readonly envRecord: string;
}

/**
 * A fake `kimi` that answers `--version`, records the environment KEY NAMES it
 * was handed (never the values), and writes the journey anchor into its cwd.
 */
function fixture(options: { exitCode?: number; anchor?: string; hangSeconds?: number } = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-live-kimi-print-"));
  const kimiBin = join(root, "fake-kimi");
  const distribution = join(root, "dist", "kimi");
  const sourceHome = join(root, "source-home");
  const envRecord = join(root, ENV_RECORD);
  const layout = kimiHomeLayout(sourceHome);
  mkdirSync(join(distribution, ".kimi-code"), { recursive: true });
  writeFileSync(join(distribution, "AGENTS.md"), "# Fixture\n");
  mkdirSync(layout.credentialsDir, { recursive: true });
  mkdirSync(layout.oauthDir, { recursive: true });
  writeFileSync(join(layout.credentialsDir, "kimi-code.json"), SOURCE_SECRET);
  const anchor = options.anchor ?? '{"amadeus_live_e2e":"ok"}';
  writeFileSync(
    kimiBin,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then printf '%s\\n' '0.37.2'; exit 0; fi",
      `env | sed 's/=.*//' | sort > ${JSON.stringify(envRecord)}`,
      `printf '%s' ${JSON.stringify(anchor)} > ${JSON.stringify(KIMI_PRINT_ANCHOR_FILE)}`,
      ...(options.hangSeconds === undefined ? [] : [`sleep ${options.hangSeconds}`]),
      "printf '%s\\n' 'done'",
      `exit ${options.exitCode ?? 0}`,
      "",
    ].join("\n"),
  );
  chmodSync(kimiBin, 0o755);
  return { root, kimiBin, distribution, sourceHome, envRecord };
}

interface RunOptions {
  readonly optIn?: string;
  readonly githubActions?: string;
  readonly distributionDir?: string;
  readonly sourceHome?: string;
  /** Override the journey, e.g. to force the timeout arm on a hanging child. */
  readonly journey?: LiveJourney;
}

function runFixture(item: Fixture, options: RunOptions = {}) {
  const allocator = new KimiScratchAllocator({
    prefix: "kimi-print-fixture-",
    distributionDir: options.distributionDir ?? item.distribution,
  });
  const result = runLiveJourney(
    new KimiPrintAdapter({
      kimiBin: item.kimiBin,
      distributionDir: options.distributionDir ?? item.distribution,
      parentEnv: {
        PATH: process.env.PATH,
        LANG: "C.UTF-8",
        HOME: "/source/home",
        KIMI_CODE_HOME: "/source/kimi-code",
        KIMI_API_KEY: "must-not-leak",
      },
    }),
    options.journey ?? createKimiPrintJourney(),
    {
      env: {
        ...(options.githubActions === undefined ? {} : { GITHUB_ACTIONS: options.githubActions }),
        ...(options.optIn === undefined ? {} : { AMADEUS_KIMI_PRINT_LIVE: options.optIn }),
      },
      gitSha: "e".repeat(40),
      now: () => new Date("2026-08-21T00:00:00.000Z"),
      ledgerPath: join(item.root, "runs.jsonl"),
      durability: "file-only",
      credentialSource: new KimiHomeCredentialSource({
        sourceHome: options.sourceHome ?? item.sourceHome,
      }),
      allocator,
      leakCheck: async () => [],
    },
  );
  return { result, allocator };
}

function childEnvironmentKeys(item: Fixture): readonly string[] {
  return readFileSync(item.envRecord, "utf8").split("\n").filter((line) => line.length > 0);
}

describe("Kimi print live adapter", () => {
  test("the anchor journey closes cleanup before a ledger-backed success", async () => {
    const item = fixture();
    try {
      const { result } = runFixture(item, { optIn: "1" });
      expect(await result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "kimi-print",
          journeyId: "kimi-print-anchor-v1",
          measuredVersion: "0.37.2",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
          cleanup: { failures: [], retainedResourceIds: [], leakFindings: [] },
        },
      });
      // The receipt is the only durable artefact and it carries no secret, no
      // source path, and no raw output.
      const serialized = JSON.stringify(await result);
      expect(serialized).not.toContain("must-not-leak");
      expect(serialized).not.toContain(SOURCE_SECRET);
      expect(serialized).not.toContain(item.sourceHome);
      expect(existsSync(join(item.root, "runs.jsonl"))).toBe(true);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("the child environment is rebuilt from the allow-list, pointed at scratch", async () => {
    const item = fixture();
    try {
      await runFixture(item, { optIn: "1" }).result;
      const keys = childEnvironmentKeys(item);
      // Declared allow-list plus the three scratch bindings, and nothing that
      // could carry the developer's own credential or config location.
      expect(keys).toContain("PATH");
      expect(keys).toContain("HOME");
      expect(keys).toContain("KIMI_CODE_HOME");
      expect(keys).toContain("TMPDIR");
      expect(keys).not.toContain("KIMI_API_KEY");
      expect(keys).not.toContain("AMADEUS_KIMI_SOURCE_HOME");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a run leaves the source credential entries present and unmodified", async () => {
    const item = fixture();
    const layout = kimiHomeLayout(item.sourceHome);
    const credentialFile = join(layout.credentialsDir, "kimi-code.json");
    try {
      const before = readdirSync(layout.credentialsDir).sort();
      await runFixture(item, { optIn: "1" }).result;
      expect(readFileSync(credentialFile, "utf8")).toBe(SOURCE_SECRET);
      expect(readdirSync(layout.credentialsDir).sort()).toEqual(before);
      expect(existsSync(layout.oauthDir)).toBe(true);
      // Scratch, and therefore every link into the source, is gone.
      const leftovers = readdirSync(tmpdir()).filter((entry) => entry.startsWith("kimi-print-fixture-"));
      expect(leftovers).toEqual([]);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("the scratch binding is a symlink to the source, never a copy", () => {
    const item = fixture();
    const scratchHome = join(item.root, "scratch-home");
    try {
      const bound = bindKimiScratchHome(scratchHome, item.sourceHome);
      expect(bound.length).toBe(KIMI_BOUND_HOME_ENTRIES.length);
      for (const entry of KIMI_BOUND_HOME_ENTRIES) {
        const link = join(scratchHome, entry);
        expect(lstatSync(link).isSymbolicLink()).toBe(true);
      }
      // Re-binding is idempotent and a same-home bind is a no-op.
      expect(bindKimiScratchHome(scratchHome, item.sourceHome)).toEqual([]);
      expect(bindKimiScratchHome(scratchHome, scratchHome)).toEqual([]);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test.each([
    ["opt-in absent", { optIn: undefined }, "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED"],
    ["opt-in not exactly one", { optIn: "true" }, "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED"],
    ["GitHub Actions", { optIn: "1", githubActions: "true" }, "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN"],
  ])("a denied gate (%s) skips with zero side effects", async (_label, options, code) => {
    const item = fixture();
    try {
      const { result, allocator } = runFixture(item, options as RunOptions);
      expect(await result).toMatchObject({
        ok: true,
        value: { kind: "skipped", adapterId: "kimi-print", outcome: { status: "skip", code } },
      });
      // No scratch, no spawn, no ledger: the deny happened before any of them.
      expect(allocator.allocationCount).toBe(0);
      expect(existsSync(item.envRecord)).toBe(false);
      expect(existsSync(join(item.root, "runs.jsonl"))).toBe(false);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a missing distribution is a preflight skip taken before any spawn", async () => {
    const item = fixture();
    try {
      const { result, allocator } = runFixture(item, {
        optIn: "1",
        distributionDir: join(item.root, "absent-dist"),
      });
      expect(await result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING" } },
      });
      expect(allocator.allocationCount).toBe(0);
      expect(existsSync(item.envRecord)).toBe(false);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("an unauthenticated source home is a preflight skip, not a failure", async () => {
    const item = fixture();
    const emptyHome = join(item.root, "logged-out");
    mkdirSync(emptyHome, { recursive: true });
    try {
      const { result, allocator } = runFixture(item, { optIn: "1", sourceHome: emptyHome });
      expect(await result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE" } },
      });
      expect(allocator.allocationCount).toBe(0);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a non-zero exit is an execution failure, still fully cleaned", async () => {
    const item = fixture({ exitCode: 3 });
    try {
      const { result } = runFixture(item, { optIn: "1" });
      expect(await result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { status: "failure", code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED" },
          cleanup: { failures: [], retainedResourceIds: [] },
        },
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a clean exit without the anchor is an assertion failure, never a pass", async () => {
    const item = fixture({ anchor: '{"amadeus_live_e2e":"not-ok"}' });
    try {
      const { result } = runFixture(item, { optIn: "1" });
      expect(await result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { status: "failure", code: "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED" },
        },
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a child still running at the deadline is a journey timeout, then reaped", async () => {
    const item = fixture({ hangSeconds: 30 });
    const impatient: LiveJourney = {
      ...createKimiPrintJourney(),
      id: "kimi-print-anchor-v1",
      timeoutMs: 250,
    };
    try {
      const { result } = runFixture(item, { optIn: "1", journey: impatient });
      // The timeout is reported as a timeout — not as an execution failure and
      // not as an assertion failure — and cleanup still closes every resource,
      // which is only reachable through the reap path in the adapter.
      expect(await result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { status: "timeout", code: "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT" },
          cleanup: { failures: [], retainedResourceIds: [], leakFindings: [] },
        },
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  }, 30_000);
});
