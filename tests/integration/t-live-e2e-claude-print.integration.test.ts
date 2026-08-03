import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ClaudeAmbientCredentialSource,
  ClaudePrintAdapter,
  ClaudeScratchAllocator,
} from "../harness/live-e2e/claude.ts";
import { createClaudeStructuredJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import { ResourceRegistrar } from "../harness/live-e2e/resources.ts";

function createFixture(helpFlags = true, outputFlood = false): {
  readonly root: string;
  readonly binary: string;
  readonly distribution: string;
  readonly observation: string;
} {
  const root = mkdtempSync(join(tmpdir(), "amadeus-live-claude-print-"));
  const binary = join(root, "fake-claude");
  const distribution = join(root, "dist", "claude");
  const observation = join(root, "observation.json");
  mkdirSync(join(distribution, ".claude"), { recursive: true });
  writeFileSync(join(distribution, "CLAUDE.md"), "# Fixture\n", "utf8");
  writeFileSync(join(distribution, ".claude", "settings.json.example"), "{}", "utf8");
  const help = helpFlags
    ? "--print --setting-sources --tools --no-session-persistence --output-format --json-schema --max-budget-usd"
    : "--print";
  writeFileSync(
    binary,
    `#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
if (process.argv.includes("--version")) {
  process.stdout.write("2.1.220 (Claude Code)\\n");
  process.exit(0);
}
if (process.argv.includes("--help")) {
  process.stdout.write(${JSON.stringify(help)});
  process.exit(0);
}
writeFileSync(${JSON.stringify(observation)}, JSON.stringify({
  args: process.argv.slice(2),
  cwd: process.cwd(),
  environmentKeys: Object.keys(process.env).sort(),
  home: process.env.HOME,
  tmpdir: process.env.TMPDIR,
  hasCredential: Boolean(process.env.ANTHROPIC_API_KEY),
  sourceConfigLeaked: Boolean(process.env.CLAUDE_CONFIG_DIR),
  sourceHomeLeaked: process.env.HOME === "/source/home",
  settings: JSON.parse(readFileSync(join(process.cwd(), ".claude", "settings.json"), "utf8")),
}));
process.stdout.write(${outputFlood ? '"x".repeat(1_048_577)' : `JSON.stringify({
  type: "result",
  subtype: "success",
  is_error: false,
  num_turns: 1,
  structured_output: { amadeus_live_e2e: "ok" },
})`});
`,
    "utf8",
  );
  chmodSync(binary, 0o755);
  return { root, binary, distribution, observation };
}

describe("Claude print live adapter", () => {
  test("fake CLI proves project-only settings, exact env, structured anchor, cleanup, and ledger", async () => {
    const fixture = createFixture();
    const allocator = new ClaudeScratchAllocator({
      prefix: "claude-print-fixture-",
      distributionDir: fixture.distribution,
    });
    const credentialSource = new ClaudeAmbientCredentialSource({ ANTHROPIC_API_KEY: "secret-fixture-value" });
    const adapter = new ClaudePrintAdapter({
      claudeBin: fixture.binary,
      distributionDir: fixture.distribution,
      parentEnv: {
        PATH: process.env.PATH,
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
        NO_COLOR: "1",
        HOME: "/source/home",
        CLAUDE_CONFIG_DIR: "/source/config",
        SECRET_TOKEN: "must-not-leak",
      },
    });
    try {
      const result = await runLiveJourney(adapter, createClaudeStructuredJourney(), {
        env: { AMADEUS_CLAUDE_PRINT_LIVE: "1" },
        gitSha: "b".repeat(40),
        now: () => new Date("2026-08-03T00:00:00.000Z"),
        ledgerPath: join(fixture.root, "runs.jsonl"),
        durability: "file-only",
        credentialSource,
        allocator,
        leakCheck: async () => [],
      });
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "claude-print",
          measuredVersion: "2.1.220",
          timeoutMs: 90_000,
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
          cleanup: { failures: [], leakFindings: [] },
        },
      });
      const observed = JSON.parse(readFileSync(fixture.observation, "utf8")) as {
        args: string[];
        cwd: string;
        environmentKeys: string[];
        home: string;
        tmpdir: string;
        hasCredential: boolean;
        sourceConfigLeaked: boolean;
        sourceHomeLeaked: boolean;
        settings: unknown;
      };
      expect(observed.args).toEqual([
        "-p",
        "--setting-sources",
        "project",
        "--tools",
        "",
        "--no-session-persistence",
        "--output-format",
        "json",
        "--json-schema",
        '{"type":"object","properties":{"amadeus_live_e2e":{"const":"ok"}},"required":["amadeus_live_e2e"],"additionalProperties":false}',
        "--max-budget-usd",
        "0.25",
        "Return the status object required by the JSON schema. Do not use tools.",
      ]);
      expect(
        observed.environmentKeys.filter((key) => !key.startsWith("__MISE_") && key !== "__CF_USER_TEXT_ENCODING"),
      ).toEqual([
        "ANTHROPIC_API_KEY",
        "HOME",
        "LANG",
        "LC_ALL",
        "NO_COLOR",
        "PATH",
        "TMPDIR",
      ]);
      expect(observed.settings).toEqual({ hooks: {} });
      expect(observed.hasCredential).toBe(true);
      expect(observed.sourceConfigLeaked).toBe(false);
      expect(observed.sourceHomeLeaked).toBe(false);
      expect(Bun.file(observed.cwd).size).toBe(0);
      expect(Bun.file(observed.home).size).toBe(0);
      expect(Bun.file(observed.tmpdir).size).toBe(0);
      expect(JSON.stringify(result)).not.toContain("secret-fixture-value");
      expect(readFileSync(join(fixture.root, "runs.jsonl"), "utf8")).not.toContain("secret-fixture-value");
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("missing required help flags is a capability skip before scratch", async () => {
    const fixture = createFixture(false);
    const allocator = new ClaudeScratchAllocator({
      prefix: "claude-print-no-capability-",
      distributionDir: fixture.distribution,
    });
    try {
      const result = await runLiveJourney(
        new ClaudePrintAdapter({
          claudeBin: fixture.binary,
          distributionDir: fixture.distribution,
          parentEnv: { PATH: process.env.PATH },
        }),
        createClaudeStructuredJourney(),
        {
          env: { AMADEUS_CLAUDE_PRINT_LIVE: "1" },
          gitSha: "b".repeat(40),
          now: () => new Date("2026-08-03T00:00:00.000Z"),
          ledgerPath: join(fixture.root, "runs.jsonl"),
          durability: "file-only",
          credentialSource: new ClaudeAmbientCredentialSource({ ANTHROPIC_API_KEY: "secret" }),
          allocator,
          leakCheck: async () => [],
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED" } },
      });
      expect(allocator.allocationCount).toBe(0);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("native keychain binding adds no credential environment key", async () => {
    const fixture = createFixture();
    const allocator = new ClaudeScratchAllocator({
      prefix: "claude-print-native-",
      distributionDir: fixture.distribution,
    });
    const registrar = new ResourceRegistrar();
    const credentialSource = new ClaudeAmbientCredentialSource({}, { nativeKeychainAvailable: true });
    const adapter = new ClaudePrintAdapter({
      claudeBin: fixture.binary,
      distributionDir: fixture.distribution,
      parentEnv: { PATH: process.env.PATH },
    });
    const scratch = await allocator.allocate(registrar);
    try {
      const prepared = await adapter.prepare({ scratch, registrar, credentialSource });
      expect(prepared.ok).toBe(true);
      if (!prepared.ok) return;
      expect(prepared.value.environmentKeys).toEqual(["PATH", "HOME", "TMPDIR"]);
      expect(prepared.value.resolveEnvironment()).not.toHaveProperty("ANTHROPIC_API_KEY");
    } finally {
      const cleanup = await adapter.cleanup({ scratch, registeredResources: registrar.snapshot() });
      expect(cleanup.failures).toEqual([]);
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("oversized output is bounded and can never produce a green receipt", async () => {
    const fixture = createFixture(true, true);
    const allocator = new ClaudeScratchAllocator({
      prefix: "claude-print-output-flood-",
      distributionDir: fixture.distribution,
    });
    try {
      const result = await runLiveJourney(
        new ClaudePrintAdapter({
          claudeBin: fixture.binary,
          distributionDir: fixture.distribution,
          parentEnv: { PATH: process.env.PATH },
        }),
        createClaudeStructuredJourney(),
        {
          env: { AMADEUS_CLAUDE_PRINT_LIVE: "1" },
          gitSha: "b".repeat(40),
          now: () => new Date("2026-08-03T00:00:00.000Z"),
          ledgerPath: join(fixture.root, "runs.jsonl"),
          durability: "file-only",
          credentialSource: new ClaudeAmbientCredentialSource({ ANTHROPIC_API_KEY: "secret" }),
          allocator,
          leakCheck: async () => [],
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: { code: "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED" },
        },
      });
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
