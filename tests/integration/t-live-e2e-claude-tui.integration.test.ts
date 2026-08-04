import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeAmbientCredentialSource, ClaudeScratchAllocator } from "../harness/live-e2e/claude.ts";
import {
  ClaudeTuiAdapter,
  type TmuxCommandOptions,
  type TmuxCommandPort,
  type TmuxCommandResult,
} from "../harness/live-e2e/claude-tui.ts";
import { createClaudeTuiJourney } from "../harness/live-e2e/journey.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";

const RUN_ID = "0123456789abcdef0123456789abcdef";

interface TmuxCall {
  readonly args: readonly string[];
  readonly environmentKeys: readonly string[];
}

class FakePrivateTmux implements TmuxCommandPort {
  readonly calls: TmuxCall[] = [];
  readonly #failKillServer: boolean;
  readonly #ready: boolean;
  #projectDir: string | undefined;
  #prompt = "";

  constructor(failKillServer = false, ready = true) {
    this.#failKillServer = failKillServer;
    this.#ready = ready;
  }

  run(args: readonly string[], options: TmuxCommandOptions = {}): TmuxCommandResult {
    this.calls.push({ args: [...args], environmentKeys: Object.keys(options.env ?? {}).sort() });
    if (args[0] === "-V") return { exitCode: 0, stdout: "tmux 3.5a\n", stderr: "" };
    const command = args[2];
    if (command === "new-session") {
      const cwdIndex = args.indexOf("-c");
      this.#projectDir = cwdIndex < 0 ? undefined : args[cwdIndex + 1];
    }
    if (command === "send-keys" && args.includes("-l")) this.#prompt = args.at(-1) ?? "";
    if (command === "send-keys" && args.at(-1) === "Enter") this.#writeAnchor();
    if (command === "kill-server" && this.#failKillServer) {
      return { exitCode: 1, stdout: "", stderr: "injected server cleanup failure" };
    }
    const pane = command === "capture-pane"
      ? this.#ready ? "Claude Code ready\n❯ \nanchor complete\n" : "Claude Code loading\n"
      : "";
    return { exitCode: 0, stdout: pane, stderr: "" };
  }

  #writeAnchor(): void {
    const runId = this.#prompt.match(/"runId":"([a-f0-9]{32})"/)?.[1];
    if (this.#projectDir === undefined || runId === undefined) return;
    writeFileSync(join(this.#projectDir, ".amadeus-live-tui-anchor.json"), JSON.stringify({ status: "ok", runId }));
  }
}

function fixture(): Readonly<{ root: string; binary: string; distribution: string }> {
  const root = mkdtempSync(join(tmpdir(), "amadeus-live-claude-tui-"));
  const binary = join(root, "fake-claude");
  const distribution = join(root, "dist", "claude");
  mkdirSync(join(distribution, ".claude"), { recursive: true });
  writeFileSync(join(distribution, "CLAUDE.md"), "# Fixture\n");
  writeFileSync(
    binary,
    '#!/bin/sh\nif [ "$1" = "--help" ]; then echo "--setting-sources --permission-mode"; else echo "2.1.220 (Claude Code)"; fi\n',
  );
  chmodSync(binary, 0o755);
  return { root, binary, distribution };
}

async function runFixture(
  root: string,
  binary: string,
  distribution: string,
  tmux: FakePrivateTmux,
  readyTimeoutMs?: number,
) {
  return runLiveJourney(
    new ClaudeTuiAdapter({
      claudeBin: binary,
      distributionDir: distribution,
      parentEnv: {
        PATH: process.env.PATH,
        LANG: "C.UTF-8",
        HOME: "/source/home",
        CLAUDE_CONFIG_DIR: "/source/config",
        SECRET_TOKEN: "must-not-leak",
      },
      tmux,
      createRunId: () => RUN_ID,
      pollIntervalMs: 1,
      readyTimeoutMs,
    }),
    createClaudeTuiJourney(),
    {
      env: { AMADEUS_TUI_LIVE: "1" },
      gitSha: "c".repeat(40),
      now: () => new Date("2026-08-04T00:00:00.000Z"),
      ledgerPath: join(root, "runs.jsonl"),
      durability: "file-only",
      credentialSource: new ClaudeAmbientCredentialSource({ ANTHROPIC_API_KEY: "secret-fixture" }),
      allocator: new ClaudeScratchAllocator({ prefix: "claude-tui-fixture-", distributionDir: distribution }),
      leakCheck: async () => [],
    },
  );
}

describe("Claude TUI live adapter", () => {
  test("private socket journey closes cleanup before ledger-backed success", async () => {
    const item = fixture();
    const tmux = new FakePrivateTmux();
    try {
      const result = await runFixture(item.root, item.binary, item.distribution, tmux);
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "claude-tui",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
          cleanup: { failures: [], retainedResourceIds: [] },
        },
      });
      const serverCalls = tmux.calls.filter((call) => call.args[0] !== "-V");
      expect(serverCalls.length).toBeGreaterThan(5);
      expect(serverCalls.every((call) => call.args[0] === "-S" && call.args[1]?.includes(RUN_ID))).toBe(true);
      expect(serverCalls.some((call) => call.args[2] === "kill-session")).toBe(true);
      expect(serverCalls.some((call) => call.args[2] === "kill-server")).toBe(true);
      const launch = serverCalls.find((call) => call.args[2] === "new-session");
      expect(launch?.environmentKeys).toContain("ANTHROPIC_API_KEY");
      expect(launch?.environmentKeys).not.toContain("CLAUDE_CONFIG_DIR");
      expect(JSON.stringify(result)).not.toContain("secret-fixture");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("cleanup barrier failure never invokes the ledger", async () => {
    const item = fixture();
    try {
      const result = await runFixture(item.root, item.binary, item.distribution, new FakePrivateTmux(true));
      expect(result).toMatchObject({
        ok: false,
        error: {
          kind: "cleanup-barrier-failed",
          originalOutcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
        },
      });
      expect(existsSync(join(item.root, "runs.jsonl"))).toBe(false);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("startup output without an input prompt reaches the readiness deadline", async () => {
    const item = fixture();
    try {
      const result = await runFixture(
        item.root,
        item.binary,
        item.distribution,
        new FakePrivateTmux(false, false),
        0,
      );
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "recorded", outcome: { code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED" } },
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });
});
