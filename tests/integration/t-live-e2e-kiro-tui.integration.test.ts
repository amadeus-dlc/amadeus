import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKiroTuiJourney } from "../harness/live-e2e/journey.ts";
import {
  KiroHomeCredentialSource,
  kiroHomeLayout,
  KiroScratchAllocator,
} from "../harness/live-e2e/kiro.ts";
import { KiroTuiAdapter } from "../harness/live-e2e/kiro-tui.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import type {
  TmuxCommandOptions,
  TmuxCommandPort,
  TmuxCommandResult,
} from "../harness/live-e2e/tmux.ts";

const RUN_ID = "0123456789abcdef0123456789abcdef";
const ANCHOR_FILE = ".amadeus-live-kiro-tui-anchor.json";
const IDLE_PANE = "kiro_default · auto\nask a question or describe a task ↵\n";
const TRUST_PANE = "By proceeding, you confirm that you understand the risks.\n❯ No, exit\n  Yes, I accept\n";

interface TmuxCall {
  readonly args: readonly string[];
  readonly environmentKeys: readonly string[];
}

interface FakeTmuxOptions {
  readonly failKillServer?: boolean;
  /** Never leave the trust picker, so readiness must hit its deadline. */
  readonly stuckOnTrustPrompt?: boolean;
  /** Keep answering as a live server, so the cleanup reap barrier must fail. */
  readonly serverNeverReaps?: boolean;
}

/**
 * A private tmux server whose pane walks the real Kiro launch sequence: the
 * trust-all confirmation picker first, then the idle input footer, then the
 * anchor the prompt asks the agent to write.
 */
class FakePrivateTmux implements TmuxCommandPort {
  readonly calls: TmuxCall[] = [];
  readonly #options: FakeTmuxOptions;
  #projectDir: string | undefined;
  #prompt = "";
  #trustCleared = false;

  constructor(options: FakeTmuxOptions = {}) {
    this.#options = options;
  }

  run(args: readonly string[], options: TmuxCommandOptions = {}): TmuxCommandResult {
    this.calls.push({ args: [...args], environmentKeys: Object.keys(options.env ?? {}).sort() });
    if (args[0] === "-V") return { exitCode: 0, stdout: "tmux 3.5a\n", stderr: "" };
    const command = args[2];
    if (command === "new-session") {
      const cwdIndex = args.indexOf("-c");
      this.#projectDir = cwdIndex < 0 ? undefined : args[cwdIndex + 1];
    }
    if (command === "send-keys") this.#handleSendKeys(args);
    if (command === "kill-server" && this.#options.failKillServer === true) {
      return { exitCode: 1, stdout: "", stderr: "injected server cleanup failure" };
    }
    if (command === "list-sessions") {
      return this.#options.serverNeverReaps === true
        ? { exitCode: 0, stdout: "amadeus-kiro: 1 windows\n", stderr: "" }
        : { exitCode: 1, stdout: "", stderr: "no server running on the private socket" };
    }
    const pane = command === "capture-pane" ? (this.#trustCleared ? IDLE_PANE : TRUST_PANE) : "";
    return { exitCode: 0, stdout: pane, stderr: "" };
  }

  #handleSendKeys(args: readonly string[]): void {
    if (args.includes("-l")) {
      this.#prompt = args.at(-1) ?? "";
      return;
    }
    if (args.at(-1) !== "Enter") return;
    if (!this.#trustCleared) {
      this.#trustCleared = this.#options.stuckOnTrustPrompt !== true;
      return;
    }
    this.#writeAnchor();
  }

  #writeAnchor(): void {
    const runId = this.#prompt.match(/"runId":"([a-f0-9]{32})"/)?.[1];
    if (this.#projectDir === undefined || runId === undefined) return;
    writeFileSync(join(this.#projectDir, ANCHOR_FILE), JSON.stringify({ status: "ok", runId }));
  }
}

interface Fixture {
  readonly root: string;
  readonly kiroBin: string;
  readonly distribution: string;
  readonly sourceHome: string;
}

/** A source home carrying the auth database and chat runtime the adapter binds. */
function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-live-kiro-tui-"));
  const kiroBin = join(root, "fake-kiro-cli");
  const distribution = join(root, "dist", "kiro");
  const sourceHome = join(root, "source-home");
  const layout = kiroHomeLayout(sourceHome);
  mkdirSync(join(distribution, ".kiro"), { recursive: true });
  writeFileSync(join(distribution, "AGENTS.md"), "# Fixture\n");
  mkdirSync(layout.dataDir, { recursive: true });
  writeFileSync(layout.authFile, "source-auth-fixture");
  writeFileSync(join(layout.dataDir, "tui.js"), "// fixture runtime\n");
  mkdirSync(join(sourceHome, ".local", "bin"), { recursive: true });
  writeFileSync(layout.chatBinary, "#!/bin/sh\nexit 0\n");
  chmodSync(layout.chatBinary, 0o755);
  writeFileSync(kiroBin, "#!/bin/sh\nprintf '%s\\n' 'kiro-cli 2.13.0'\n");
  chmodSync(kiroBin, 0o755);
  return { root, kiroBin, distribution, sourceHome };
}

function runFixture(item: Fixture, tmux: FakePrivateTmux, readyTimeoutMs?: number) {
  return runLiveJourney(
    new KiroTuiAdapter({
      kiroBin: item.kiroBin,
      distributionDir: item.distribution,
      sourceHome: item.sourceHome,
      parentEnv: {
        PATH: process.env.PATH,
        LANG: "C.UTF-8",
        HOME: "/source/home",
        KIRO_HOME: "/source/kiro",
        AWS_SESSION_TOKEN: "must-not-leak",
      },
      tmux,
      createRunId: () => RUN_ID,
      pollIntervalMs: 1,
      readyTimeoutMs,
    }),
    createKiroTuiJourney(),
    {
      env: { AMADEUS_KIRO_TUI_LIVE: "1" },
      gitSha: "d".repeat(40),
      now: () => new Date("2026-08-05T00:00:00.000Z"),
      ledgerPath: join(item.root, "runs.jsonl"),
      durability: "file-only",
      credentialSource: new KiroHomeCredentialSource({ sourceHome: item.sourceHome }),
      allocator: new KiroScratchAllocator({
        prefix: "kiro-tui-fixture-",
        distributionDir: item.distribution,
      }),
      leakCheck: async () => [],
    },
  );
}

describe("Kiro TUI live adapter", () => {
  test("private socket journey closes cleanup before ledger-backed success", async () => {
    const item = fixture();
    const tmux = new FakePrivateTmux();
    try {
      const result = await runFixture(item, tmux);
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "kiro-tui",
          measuredVersion: "2.13.0",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
          cleanup: { failures: [], retainedResourceIds: [] },
        },
      });
      const serverCalls = tmux.calls.filter((call) => call.args[0] !== "-V");
      expect(serverCalls.length).toBeGreaterThan(5);
      // Every command is bound to the run-private socket, and the socket path
      // stays inside the portable UNIX domain socket length limit.
      expect(serverCalls.every((call) =>
        call.args[0] === "-S" &&
        call.args[1]?.includes(RUN_ID.slice(0, 16)) === true &&
        Buffer.byteLength(call.args[1] ?? "") <= 100
      )).toBe(true);
      expect(serverCalls.some((call) => call.args[2] === "kill-session")).toBe(true);
      expect(serverCalls.some((call) => call.args[2] === "kill-server")).toBe(true);
      const launch = serverCalls.find((call) => call.args[2] === "new-session");
      // The transport journey pins Kiro's built-in agent so the result does not
      // depend on whichever agent the distribution makes the workspace default.
      expect(launch?.args.at(-1)).toContain("'chat' '--agent' 'kiro_default' '--trust-all-tools'");
      // The child environment is rebuilt from the allow-list: no ambient
      // credential, no source home, and no source config path reaches it.
      expect(launch?.environmentKeys).toContain("HOME");
      expect(launch?.environmentKeys).not.toContain("KIRO_HOME");
      expect(launch?.environmentKeys).not.toContain("AWS_SESSION_TOKEN");
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("must-not-leak");
      expect(serialized).not.toContain("source-auth-fixture");
      expect(serialized).not.toContain(item.sourceHome);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("the scratch home binds source auth by reference and never copies or mutates it", async () => {
    const item = fixture();
    const layout = kiroHomeLayout(item.sourceHome);
    const before = readFileSync(layout.authFile, "utf8");
    const allocator = new KiroScratchAllocator({
      prefix: "kiro-tui-binding-",
      distributionDir: item.distribution,
    });
    const adapter = new KiroTuiAdapter({
      kiroBin: item.kiroBin,
      distributionDir: item.distribution,
      sourceHome: item.sourceHome,
      parentEnv: { PATH: process.env.PATH },
      tmux: new FakePrivateTmux(),
      createRunId: () => RUN_ID,
    });
    const { ResourceRegistrar } = await import("../harness/live-e2e/resources.ts");
    const registrar = new ResourceRegistrar();
    try {
      const scratch = await allocator.allocate(registrar);
      const prepared = await adapter.prepare({
        scratch,
        registrar,
        credentialSource: new KiroHomeCredentialSource({ sourceHome: item.sourceHome }),
      });
      expect(prepared.ok).toBe(true);
      const scratchLayout = kiroHomeLayout(scratch.homeDir);
      // Bound by symlink: the credential bytes never enter the scratch tree.
      expect(lstatSync(scratchLayout.authFile).isSymbolicLink()).toBe(true);
      expect(lstatSync(scratchLayout.chatBinary).isSymbolicLink()).toBe(true);
      expect(existsSync(join(scratchLayout.dataDir, "tui.js"))).toBe(true);
      await adapter.cleanup({ scratch, registeredResources: registrar.snapshot() });
      expect(existsSync(scratch.root)).toBe(false);
      expect(readFileSync(layout.authFile, "utf8")).toBe(before);
      expect(existsSync(layout.chatBinary)).toBe(true);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a server that outlives the kill fails the cleanup barrier", async () => {
    const item = fixture();
    const allocator = new KiroScratchAllocator({
      prefix: "kiro-tui-reap-",
      distributionDir: item.distribution,
    });
    const adapter = new KiroTuiAdapter({
      kiroBin: item.kiroBin,
      distributionDir: item.distribution,
      sourceHome: item.sourceHome,
      parentEnv: { PATH: process.env.PATH },
      tmux: new FakePrivateTmux({ serverNeverReaps: true }),
      createRunId: () => RUN_ID,
      pollIntervalMs: 1,
      reapTimeoutMs: 0,
    });
    const { ResourceRegistrar } = await import("../harness/live-e2e/resources.ts");
    const registrar = new ResourceRegistrar();
    try {
      const scratch = await allocator.allocate(registrar);
      const prepared = await adapter.prepare({
        scratch,
        registrar,
        credentialSource: new KiroHomeCredentialSource({ sourceHome: item.sourceHome }),
      });
      expect(prepared.ok).toBe(true);
      // The fake server answers list-sessions as if it were still alive, so the
      // barrier must report it rather than call the run closed.
      const receipt = await adapter.cleanup({ scratch, registeredResources: registrar.snapshot() });
      expect(receipt.failures).toContain("private tmux server was not reaped");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("cleanup barrier failure never invokes the ledger", async () => {
    const item = fixture();
    try {
      const result = await runFixture(item, new FakePrivateTmux({ failKillServer: true }));
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

  test("a trust picker that never clears reaches the readiness deadline", async () => {
    const item = fixture();
    try {
      const result = await runFixture(item, new FakePrivateTmux({ stuckOnTrustPrompt: true }), 0);
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "recorded", outcome: { code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED" } },
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("preflight skips before any spawn when the source auth seam is absent", async () => {
    const item = fixture();
    const unauthenticated = join(item.root, "empty-home");
    mkdirSync(unauthenticated, { recursive: true });
    const tmux = new FakePrivateTmux();
    try {
      const result = await runLiveJourney(
        new KiroTuiAdapter({
          kiroBin: item.kiroBin,
          distributionDir: item.distribution,
          sourceHome: unauthenticated,
          parentEnv: { PATH: process.env.PATH },
          tmux,
        }),
        createKiroTuiJourney(),
        {
          env: { AMADEUS_KIRO_TUI_LIVE: "1" },
          gitSha: "d".repeat(40),
          now: () => new Date("2026-08-05T00:00:00.000Z"),
          ledgerPath: join(item.root, "skip.jsonl"),
          durability: "file-only",
          credentialSource: new KiroHomeCredentialSource({ sourceHome: unauthenticated }),
          allocator: new KiroScratchAllocator({
            prefix: "kiro-tui-skip-",
            distributionDir: item.distribution,
          }),
          leakCheck: async () => [],
        },
      );
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE" } },
      });
      expect(tmux.calls.some((call) => call.args.includes("new-session"))).toBe(false);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("the gate denies before any tmux probe or scratch allocation", async () => {
    const item = fixture();
    const tmux = new FakePrivateTmux();
    const allocator = new KiroScratchAllocator({
      prefix: "kiro-tui-gate-",
      distributionDir: item.distribution,
    });
    try {
      for (const env of [{}, { GITHUB_ACTIONS: "true", AMADEUS_KIRO_TUI_LIVE: "1" }]) {
        const result = await runLiveJourney(
          new KiroTuiAdapter({
            kiroBin: item.kiroBin,
            distributionDir: item.distribution,
            sourceHome: item.sourceHome,
            parentEnv: { PATH: process.env.PATH },
            tmux,
          }),
          createKiroTuiJourney(),
          {
            env,
            gitSha: "d".repeat(40),
            now: () => new Date("2026-08-05T00:00:00.000Z"),
            ledgerPath: join(item.root, "gate.jsonl"),
            durability: "file-only",
            credentialSource: new KiroHomeCredentialSource({ sourceHome: item.sourceHome }),
            allocator,
            leakCheck: async () => [],
          },
        );
        expect(result).toMatchObject({ ok: true, value: { kind: "skipped" } });
      }
      expect(tmux.calls).toHaveLength(0);
      expect(allocator.allocationCount).toBe(0);
      expect(existsSync(join(item.root, "gate.jsonl"))).toBe(false);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });
});
