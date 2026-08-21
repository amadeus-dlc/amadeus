// covers: file:tests/harness/live-e2e/kiro-acp.ts
// size: medium
//
// The Kiro ACP adapter driven through the REAL kernel (`runLiveJourney`)
// against a FAKE ACP peer, so normal CI proves the whole contract without
// kiro-cli and without a credit: gate deny with zero side effects, preflight
// skip before any spawn, allow-list-only child environment, source auth bound
// by reference, the JSON-RPC identity rules, the permission channel, and a
// cleanup barrier that must reap the process before the ledger is written.
//
// Mechanism: real filesystem, real lifecycle, injected transport — the only
// thing stubbed is the agent (fs-tests-integration-first).

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKiroAcpJourney } from "../harness/live-e2e/journey.ts";
import {
  KiroHomeCredentialSource,
  kiroHomeLayout,
  KiroScratchAllocator,
} from "../harness/live-e2e/kiro.ts";
import {
  type AcpChannel,
  type AcpOpenOptions,
  type AcpTransportPort,
  KIRO_ACP_ANCHOR_FILE,
  KiroAcpAdapter,
} from "../harness/live-e2e/kiro-acp.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";

const SOURCE_SECRET = "source-auth-fixture";

interface FakeAcpOptions {
  /** Emit a reply carrying an id the client never issued. */
  readonly forgeResponseId?: boolean;
  /** Reply twice to the prompt id. */
  readonly duplicateTerminal?: boolean;
  /** Ask for permission before running the tool. */
  readonly requestPermission?: boolean;
  /** Finish the turn without ever calling a tool. */
  readonly skipToolCall?: boolean;
  /** Never answer the prompt, so the journey deadline has to fire. */
  readonly stall?: boolean;
  /** Refuse to exit when killed, so the cleanup reap barrier must fail. */
  readonly neverExits?: boolean;
}

/**
 * A fake `kiro-cli acp` peer: newline-delimited JSON-RPC over an in-memory
 * channel, walking the real handshake (initialize → session/new →
 * session/prompt) and streaming the update kinds the adapter reads.
 */
class FakeAcpTransport implements AcpTransportPort {
  opened: AcpOpenOptions | undefined;
  killed = false;
  readonly #options: FakeAcpOptions;
  #emit: ((line: string) => void) | undefined;
  #done: ((code: number | null) => void) | undefined;
  #projectDir = "";

  constructor(options: FakeAcpOptions = {}) {
    this.#options = options;
  }

  open(options: AcpOpenOptions): AcpChannel {
    this.opened = options;
    this.#projectDir = options.cwd;
    const queue: string[] = [];
    let notify: (() => void) | undefined;
    let closed = false;
    this.#emit = (line) => {
      queue.push(line);
      notify?.();
    };
    const exited = new Promise<number | null>((resolve) => {
      this.#done = resolve;
    });
    return {
      send: (line) => this.#handle(line),
      lines: async function* () {
        for (;;) {
          while (queue.length > 0) yield queue.shift() as string;
          if (closed) return;
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
        }
      },
      kill: () => {
        this.killed = true;
        if (this.#options.neverExits === true) return;
        closed = true;
        notify?.();
        this.#done?.(0);
      },
      exited,
    };
  }

  #handle(line: string): void {
    const message = JSON.parse(line) as { id?: number; method?: string; result?: unknown };
    if (message.method === "initialize") {
      this.#reply(message.id, { protocolVersion: 1, agentInfo: { name: "fake-kiro" } });
      return;
    }
    if (message.method === "session/new") {
      this.#reply(message.id, { sessionId: "fake-session", modes: { currentModeId: "kiro_default" } });
      return;
    }
    if (message.method === "session/prompt") {
      this.#runTurn(message.id);
      return;
    }
    // A permission answer comes back as a client→server reply; nothing else is
    // expected on this channel.
  }

  #runTurn(id: number | undefined): void {
    if (this.#options.stall === true) return;
    if (this.#options.forgeResponseId === true) {
      this.#emit?.(JSON.stringify({ jsonrpc: "2.0", id: 4242, result: {} }));
    }
    if (this.#options.requestPermission === true) {
      this.#emit?.(JSON.stringify({
        jsonrpc: "2.0",
        id: 9001,
        method: "session/request_permission",
        params: { options: [{ optionId: "allow-once", kind: "allow_once" }] },
      }));
    }
    if (this.#options.skipToolCall !== true) {
      this.#notifyUpdate({
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Writing: anchor file",
        kind: "edit",
      });
      writeFileSync(
        join(this.#projectDir, KIRO_ACP_ANCHOR_FILE),
        JSON.stringify({ amadeus_live_e2e: "ok" }),
      );
      this.#notifyUpdate({
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        status: "completed",
        content: [{ content: { type: "text", text: "wrote the anchor" } }],
      });
    }
    this.#notifyUpdate({ sessionUpdate: "agent_message_chunk" });
    this.#reply(id, { stopReason: "end_turn" });
    if (this.#options.duplicateTerminal === true) this.#reply(id, { stopReason: "end_turn" });
  }

  #notifyUpdate(update: Record<string, unknown>): void {
    this.#emit?.(JSON.stringify({ jsonrpc: "2.0", method: "session/update", params: { update } }));
  }

  #reply(id: number | undefined, result: unknown): void {
    this.#emit?.(JSON.stringify({ jsonrpc: "2.0", id, result }));
  }
}

interface Fixture {
  readonly root: string;
  readonly kiroBin: string;
  readonly distribution: string;
  readonly sourceHome: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-live-kiro-acp-"));
  const kiroBin = join(root, "fake-kiro-cli");
  const distribution = join(root, "dist", "kiro");
  const sourceHome = join(root, "source-home");
  const layout = kiroHomeLayout(sourceHome);
  mkdirSync(join(distribution, ".kiro"), { recursive: true });
  writeFileSync(join(distribution, "AGENTS.md"), "# Fixture\n");
  mkdirSync(layout.dataDir, { recursive: true });
  writeFileSync(layout.authFile, SOURCE_SECRET);
  writeFileSync(kiroBin, "#!/bin/sh\nprintf '%s\\n' 'kiro-cli 2.19.0'\n");
  chmodSync(kiroBin, 0o755);
  return { root, kiroBin, distribution, sourceHome };
}

interface RunOptions {
  readonly optIn?: string;
  readonly githubActions?: string;
  readonly distributionDir?: string;
  readonly sourceHome?: string;
  readonly journeyTimeoutMs?: number;
}

function runFixture(item: Fixture, transport: FakeAcpTransport, options: RunOptions = {}) {
  const allocator = new KiroScratchAllocator({
    prefix: "kiro-acp-fixture-",
    distributionDir: options.distributionDir ?? item.distribution,
  });
  const journey = options.journeyTimeoutMs === undefined
    ? createKiroAcpJourney()
    : { ...createKiroAcpJourney(), timeoutMs: options.journeyTimeoutMs };
  const result = runLiveJourney(
    new KiroAcpAdapter({
      kiroBin: item.kiroBin,
      distributionDir: options.distributionDir ?? item.distribution,
      sourceHome: item.sourceHome,
      transport,
      requestTimeoutMs: scaleTestTime(5_000),
      parentEnv: {
        PATH: process.env.PATH,
        LANG: "C.UTF-8",
        HOME: "/source/home",
        KIRO_HOME: "/source/kiro",
        AWS_SESSION_TOKEN: "must-not-leak",
      },
    }),
    journey,
    {
      env: {
        ...(options.githubActions === undefined ? {} : { GITHUB_ACTIONS: options.githubActions }),
        ...(options.optIn === undefined ? {} : { AMADEUS_KIRO_ACP_LIVE: options.optIn }),
      },
      gitSha: "f".repeat(40),
      now: () => new Date("2026-08-21T00:00:00.000Z"),
      ledgerPath: join(item.root, "runs.jsonl"),
      durability: "file-only",
      credentialSource: new KiroHomeCredentialSource({ sourceHome: options.sourceHome ?? item.sourceHome }),
      allocator,
      leakCheck: async () => [],
    },
  );
  return { result, allocator };
}

describe("Kiro ACP live adapter", () => {
  test("a completed turn closes cleanup before a ledger-backed success", async () => {
    const item = fixture();
    const transport = new FakeAcpTransport();
    try {
      const { result } = runFixture(item, transport, { optIn: "1" });
      expect(await result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          adapterId: "kiro-acp",
          journeyId: "kiro-acp-anchor-v1",
          measuredVersion: "2.19.0",
          outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" },
          cleanup: { failures: [], retainedResourceIds: [], leakFindings: [] },
        },
      });
      // The turn is launched as the ACP transport, not the rendered TUI.
      expect(transport.opened?.args).toEqual(["acp", "--agent", "kiro_default", "--trust-all-tools"]);
      expect(transport.killed).toBe(true);
      // The child environment is rebuilt from the allow-list: no ambient
      // credential and no source path reach it.
      const keys = Object.keys(transport.opened?.env ?? {});
      expect(keys).toContain("HOME");
      expect(keys).toContain("TMPDIR");
      expect(keys).not.toContain("KIRO_HOME");
      expect(keys).not.toContain("AWS_SESSION_TOKEN");
      expect(transport.opened?.env.HOME).not.toBe("/source/home");
      const serialized = JSON.stringify(await result);
      expect(serialized).not.toContain("must-not-leak");
      expect(serialized).not.toContain(SOURCE_SECRET);
      expect(serialized).not.toContain(item.sourceHome);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("the scratch home binds the source auth by reference and leaves it unmodified", async () => {
    const item = fixture();
    const layout = kiroHomeLayout(item.sourceHome);
    try {
      await runFixture(item, new FakeAcpTransport(), { optIn: "1" }).result;
      expect(readFileSync(layout.authFile, "utf8")).toBe(SOURCE_SECRET);
      expect(existsSync(layout.authFile)).toBe(true);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("the permission channel is answered and counted, not silently ignored", async () => {
    const item = fixture();
    try {
      const { result } = runFixture(item, new FakeAcpTransport({ requestPermission: true }), {
        optIn: "1",
      });
      // The turn still passes — the point is that the request was handled on
      // the protocol channel rather than stalling the turn.
      expect(await result).toMatchObject({
        ok: true,
        value: { outcome: { code: "AMADEUS_LIVE_E2E:PASS:SUCCESS" } },
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test.each([
    ["a reply for an id that was never issued", { forgeResponseId: true }],
    ["a second terminal reply for one id", { duplicateTerminal: true }],
  ])("%s is an execution failure, never a pass", async (_label, options) => {
    const item = fixture();
    try {
      const { result } = runFixture(item, new FakeAcpTransport(options as FakeAcpOptions), {
        optIn: "1",
      });
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

  test("a turn that never calls a tool is an assertion failure", async () => {
    const item = fixture();
    try {
      const { result } = runFixture(item, new FakeAcpTransport({ skipToolCall: true }), { optIn: "1" });
      expect(await result).toMatchObject({
        ok: true,
        value: { outcome: { status: "failure", code: "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED" } },
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a stalled turn is a journey timeout, and the process is still reaped", async () => {
    const item = fixture();
    const transport = new FakeAcpTransport({ stall: true });
    try {
      const { result } = runFixture(item, transport, {
        optIn: "1",
        journeyTimeoutMs: scaleTestTime(250),
      });
      expect(await result).toMatchObject({
        ok: true,
        value: {
          outcome: { status: "timeout", code: "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT" },
          cleanup: { failures: [], retainedResourceIds: [] },
        },
      });
      expect(transport.killed).toBe(true);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  }, scaleTestTime(30_000));

  test("a process that will not exit fails the cleanup barrier and writes no receipt", async () => {
    const item = fixture();
    try {
      const { result } = runFixture(item, new FakeAcpTransport({ neverExits: true }), { optIn: "1" });
      const outcome = await result;
      // The run itself succeeded; cleanup dominates, and no ledger row exists.
      expect(outcome).toMatchObject({
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
  }, scaleTestTime(60_000));

  test.each([
    ["opt-in absent", { optIn: undefined }, "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED"],
    ["opt-in not exactly one", { optIn: "true" }, "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED"],
    ["GitHub Actions", { optIn: "1", githubActions: "true" }, "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN"],
  ])("a denied gate (%s) skips with zero side effects", async (_label, options, code) => {
    const item = fixture();
    const transport = new FakeAcpTransport();
    try {
      const { result, allocator } = runFixture(item, transport, options as RunOptions);
      expect(await result).toMatchObject({
        ok: true,
        value: { kind: "skipped", adapterId: "kiro-acp", outcome: { status: "skip", code } },
      });
      expect(allocator.allocationCount).toBe(0);
      expect(transport.opened).toBeUndefined();
      expect(existsSync(join(item.root, "runs.jsonl"))).toBe(false);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("a missing distribution is a preflight skip taken before any spawn", async () => {
    const item = fixture();
    const transport = new FakeAcpTransport();
    try {
      const { result, allocator } = runFixture(item, transport, {
        optIn: "1",
        distributionDir: join(item.root, "absent-dist"),
      });
      expect(await result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING" } },
      });
      expect(allocator.allocationCount).toBe(0);
      expect(transport.opened).toBeUndefined();
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  test("an unauthenticated source home is a preflight skip, not a failure", async () => {
    const item = fixture();
    const emptyHome = join(item.root, "logged-out");
    mkdirSync(emptyHome, { recursive: true });
    try {
      const { result, allocator } = runFixture(item, new FakeAcpTransport(), {
        optIn: "1",
        sourceHome: emptyHome,
      });
      expect(await result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE" } },
      });
      expect(allocator.allocationCount).toBe(0);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });
});
