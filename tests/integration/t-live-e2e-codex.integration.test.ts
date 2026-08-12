import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  CodexExecAdapter,
  CodexScratchAllocator,
  EnvironmentCredentialSource,
} from "../harness/live-e2e/codex.ts";
import { createCodexAnchorJourney } from "../harness/live-e2e/journey.ts";

function createFixture(): {
  root: string;
  binary: string;
  distribution: string;
  observation: string;
} {
  const root = mkdtempSync(join(tmpdir(), "amadeus-live-codex-"));
  const binary = join(root, "fake-codex");
  const distribution = join(root, "dist", "codex");
  const observation = join(root, "observation.json");
  mkdirSync(join(distribution, ".codex"), { recursive: true });
  mkdirSync(join(distribution, ".agents", "skills", "amadeus"), { recursive: true });
  writeFileSync(join(distribution, "AGENTS.md"), "# Fixture\n", "utf8");
  writeFileSync(join(distribution, ".codex", "config.toml.example"), "# Fixture\n", "utf8");
  writeFileSync(
    binary,
    `#!${process.execPath}
import { writeFileSync } from "node:fs";
import { join } from "node:path";
if (process.argv.includes("--version")) {
  process.stdout.write("codex-cli 0.146.0\\n");
  process.exit(0);
}
const prompt = process.argv.at(-1) ?? "{}";
const parsed = JSON.parse(prompt);
writeFileSync(join(process.cwd(), ".amadeus-live-anchor.json"), JSON.stringify({ status: "ok" }));
writeFileSync(parsed.observation, JSON.stringify({
  cwd: process.cwd(),
  hasCredential: Boolean(process.env.OPENAI_API_KEY),
  leakedAuthHome: Boolean(process.env.AMADEUS_CODEX_EXEC_AUTH_HOME),
  leakedSourceHome: process.env.HOME === "/source/home",
  codeHome: process.env.CODEX_HOME,
  args: process.argv.slice(2),
}));
process.stdout.write(JSON.stringify({ type: "turn.completed", status: "ok" }) + "\\n");
`,
    "utf8",
  );
  chmodSync(binary, 0o755);
  return { root, binary, distribution, observation };
}

describe("Codex live adapter", () => {
  test("fake executable proves isolated env, deterministic anchor, cleanup, and ledger", async () => {
    const fixture = createFixture();
    const credentialSource = new EnvironmentCredentialSource({ OPENAI_API_KEY: "sk-fixture-secret" });
    const allocator = new CodexScratchAllocator({
      prefix: "codex-live-fixture-",
      distributionDir: fixture.distribution,
    });
    const adapter = new CodexExecAdapter({
      codexBin: fixture.binary,
      distributionDir: fixture.distribution,
      parentEnv: {
        PATH: process.env.PATH,
        HOME: "/source/home",
        AMADEUS_CODEX_EXEC_AUTH_HOME: "/source/auth",
        SECRET_TOKEN: "must-not-leak",
      },
    });
    const journey = createCodexAnchorJourney({
      prompt: JSON.stringify({ observation: fixture.observation }),
      timeoutMs: scaleTestTime(1_000),
    });
    try {
      const result = await runLiveJourney(adapter, journey, {
        env: { AMADEUS_CODEX_EXEC_LIVE: "1" },
        gitSha: "a".repeat(40),
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
          measuredVersion: "0.146.0",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
      const observed = JSON.parse(readFileSync(fixture.observation, "utf8")) as {
        cwd: string;
        hasCredential: boolean;
        leakedAuthHome: boolean;
        leakedSourceHome: boolean;
        codeHome: string;
        args: string[];
      };
      expect(observed.hasCredential).toBe(true);
      expect(observed.leakedAuthHome).toBe(false);
      expect(observed.leakedSourceHome).toBe(false);
      expect(observed.args).toContain("--ignore-user-config");
      expect(observed.args).toContain("--ephemeral");
      expect(JSON.stringify(result)).not.toContain("sk-fixture-secret");
      expect(readFileSync(join(fixture.root, "runs.jsonl"), "utf8")).not.toContain(
        "sk-fixture-secret",
      );
      expect(existsSync(observed.codeHome)).toBe(false);
      expect(existsSync(observed.cwd)).toBe(false);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test("auth absence is a preflight skip before scratch or execution", async () => {
    const fixture = createFixture();
    const allocator = new CodexScratchAllocator({
      prefix: "codex-live-no-auth-",
      distributionDir: fixture.distribution,
    });
    const adapter = new CodexExecAdapter({
      codexBin: fixture.binary,
      distributionDir: fixture.distribution,
      parentEnv: { PATH: process.env.PATH },
    });
    try {
      const result = await runLiveJourney(
        adapter,
        createCodexAnchorJourney({ prompt: "unused", timeoutMs: 100 }),
        {
          env: { AMADEUS_CODEX_EXEC_LIVE: "1" },
          gitSha: "a".repeat(40),
          now: () => new Date("2026-08-03T00:00:00.000Z"),
          ledgerPath: join(fixture.root, "runs.jsonl"),
          durability: "file-only",
          credentialSource: new EnvironmentCredentialSource({}),
          allocator,
          leakCheck: async () => [],
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "skipped",
          outcome: { code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE" },
        },
      });
      expect(allocator.allocationCount).toBe(0);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
