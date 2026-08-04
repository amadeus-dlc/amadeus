// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type CanonicalCommitReceipt,
  type CanonicalCommitResult,
  type CanonicalEventCommitPort,
  createAmadeusPiExtension,
  DefaultCanonicalEventCommitPort,
  PiBridgeJournal,
  type PiCanonicalEvent,
  type PiExtensionApi,
  type PiExtensionContext,
  type PiExtensionHandler,
  PI_083_EVENT_NAMES,
  parsePi083Event,
} from "../../packages/framework/harness/pi/extensions/amadeus-pi-extension.ts";
import { readAllAuditShards } from "../../packages/framework/core/tools/amadeus-lib.ts";

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "fixtures", "pi-0.83-extension-events.json"), "utf8"),
) as { events: Record<string, Record<string, unknown>> };

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop()!, { recursive: true, force: true });
});

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-pi-adapter-"));
  scratch.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, "260804-pi-test");
  mkdirSync(record, { recursive: true });
  writeFileSync(join(root, "amadeus", "active-space"), "default\n");
  writeFileSync(join(intents, "active-intent"), "260804-pi-test\n");
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([{ uuid: "00000000-0000-7000-8000-000000000083", slug: "260804-pi-test", status: "in-flight" }])}\n`,
  );
  writeFileSync(
    join(record, "amadeus-state.md"),
    [
      "# State",
      "## Current Status",
      "- **Status**: Running",
      "- **Current Stage**: code-generation",
      "## Stage Progress",
      "- [>] Code Generation",
      "",
    ].join("\n"),
  );
  return root;
}

class MemoryCommitPort implements CanonicalEventCommitPort {
  readonly events: PiCanonicalEvent[] = [];
  readonly receipts = new Map<string, CanonicalCommitReceipt>();

  commitOnce(event: PiCanonicalEvent): CanonicalCommitResult {
    const prior = this.receipts.get(event.eventKey);
    if (prior !== undefined) {
      if (prior.fingerprint !== event.fingerprint) return { ok: false, reason: "conflict", detail: "fingerprint" };
      return { ok: true, receipt: { ...prior, disposition: "duplicate" } };
    }
    this.events.push(event);
    const receipt: CanonicalCommitReceipt = {
      eventKey: event.eventKey,
      fingerprint: event.fingerprint,
      disposition: "committed",
      audit: { status: "completed", receiptId: `a:${event.eventKey}` },
      sensor: { status: "not-applicable", receiptId: `s:${event.eventKey}` },
      stateValidation: { status: "not-applicable", receiptId: `v:${event.eventKey}` },
    };
    this.receipts.set(event.eventKey, receipt);
    return { ok: true, receipt };
  }
}

class FakePi implements PiExtensionApi {
  readonly handlers = new Map<string, PiExtensionHandler>();
  readonly entries: Array<Record<string, unknown>> = [];
  readonly messages: Array<{ message: Record<string, unknown>; options?: Record<string, unknown> }> = [];
  readonly notifications: string[] = [];
  readonly context: PiExtensionContext;
  leafId = "leaf-0";
  failRegistrationAt = Number.POSITIVE_INFINITY;
  registrationCount = 0;

  constructor(readonly root: string) {
    this.context = {
      cwd: root,
      sessionManager: {
        getSessionId: () => "pi-session-083",
        getLeafId: () => this.leafId,
        getEntries: () => this.entries,
      },
      ui: { notify: (message) => this.notifications.push(message) },
    };
  }

  on(event: Parameters<PiExtensionApi["on"]>[0], handler: PiExtensionHandler): void {
    this.registrationCount++;
    if (this.registrationCount === this.failRegistrationAt) throw new Error("registration injection");
    this.handlers.set(event, handler);
  }

  appendEntry<T>(customType: string, data?: T): void {
    this.entries.push({ type: "custom", customType, data, id: `entry-${this.entries.length}` });
  }

  sendMessage<T>(
    message: { customType: string; content: string; display: boolean; details?: T },
    options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" },
  ): void {
    this.messages.push({ message, options });
    this.entries.push({ type: "custom_message", ...message, id: `message-${this.entries.length}` });
    this.leafId = `leaf-${this.entries.length}`;
  }

  async emit(name: string, event: unknown): Promise<unknown> {
    const handler = this.handlers.get(name);
    if (handler === undefined) throw new Error(`missing handler ${name}`);
    return await handler(event, this.context);
  }
}

function allRuntimeJson(root: string, leaf: string): string {
  const dir = join(root, "amadeus", ".amadeus-sessions", "pi-lifecycle", leaf);
  return readdirSync(dir).map((name) => readFileSync(join(dir, name), "utf8")).join("\n");
}

function outboxPath(root: string): string {
  const dir = join(root, "amadeus", ".amadeus-sessions", "pi-lifecycle");
  const name = readdirSync(dir).find((item) => item.startsWith("continuation-outbox-"));
  if (name === undefined) throw new Error("missing continuation outbox");
  return join(dir, name);
}

describe("Pi 0.83 closed ExtensionEvent parser", () => {
  test("accepts the captured public event shapes and no wider input source", () => {
    const pairs: Array<[string, string]> = [
      ["session_start", "session_start"],
      ["session_shutdown", "session_shutdown"],
      ["input", "input_interactive"],
      ["input", "input_rpc"],
      ["input", "input_extension"],
      ["agent_start", "agent_start"],
      ["agent_end", "agent_end"],
      ["agent_settled", "agent_settled"],
      ["tool_execution_start", "tool_execution_start"],
      ["tool_execution_end", "tool_execution_end"],
      ["session_before_compact", "session_before_compact"],
      ["session_compact", "session_compact"],
    ];
    for (const [expected, key] of pairs) {
      expect(parsePi083Event(expected as Parameters<typeof parsePi083Event>[0], fixture.events[key])).not.toBeNull();
    }
    expect(parsePi083Event("input", { type: "input", text: "x", source: "tty" })).toBeNull();
    expect(parsePi083Event("tool_execution_end", { ...fixture.events.tool_execution_end, isError: "false" })).toBeNull();
    expect(parsePi083Event("agent_start", { type: "agent_end", messages: [] })).toBeNull();
  });
});

describe("Amadeus Pi lifecycle adapter", () => {
  test("canonicalizes shared references like equivalent repeated values", async () => {
    const shared = { value: 1 };
    const firstPi = new FakePi(project());
    const firstPort = new MemoryCommitPort();
    createAmadeusPiExtension({ commitPort: firstPort })(firstPi);
    await firstPi.emit("session_start", fixture.events.session_start);
    await firstPi.emit("tool_execution_start", {
      ...fixture.events.tool_execution_start,
      args: { left: shared, right: shared },
    });

    const secondPi = new FakePi(project());
    const secondPort = new MemoryCommitPort();
    createAmadeusPiExtension({ commitPort: secondPort })(secondPi);
    await secondPi.emit("session_start", fixture.events.session_start);
    await secondPi.emit("tool_execution_start", {
      ...fixture.events.tool_execution_start,
      args: { left: { value: 1 }, right: { value: 1 } },
    });

    expect(firstPort.events.find((event) => event.kind === "tool-started")?.fingerprint)
      .toBe(secondPort.events.find((event) => event.kind === "tool-started")?.fingerprint);
  });

  test("a rejected serialized event does not prevent the next event from committing", async () => {
    const root = project();
    const pi = new FakePi(root);
    const port = new MemoryCommitPort();
    createAmadeusPiExtension({ commitPort: port })(pi);
    await pi.emit("session_start", fixture.events.session_start);
    const handler = pi.handlers.get("input");
    if (handler === undefined) throw new Error("missing input handler");
    await expect(handler(fixture.events.input_interactive, { ...pi.context, cwd: `${root}-other` })).rejects.toThrow(
      "cwd changed",
    );
    pi.leafId = "leaf-after-rejection";
    await pi.emit("input", fixture.events.input_interactive);
    expect(port.events.filter((event) => event.kind === "input-received")).toHaveLength(1);
  });

  test("registers the closed event set and leaves partial registration mutation-free", async () => {
    const root = project();
    const pi = new FakePi(root);
    const port = new MemoryCommitPort();
    pi.failRegistrationAt = 4;
    expect(() => createAmadeusPiExtension({ commitPort: port })(pi)).toThrow("failed closed");
    expect(pi.handlers.size).toBe(3);
    await pi.emit("session_start", fixture.events.session_start);
    expect(port.events).toHaveLength(0);

    const complete = new FakePi(project());
    createAmadeusPiExtension({ commitPort: new MemoryCommitPort() })(complete);
    expect([...complete.handlers.keys()]).toEqual([...PI_083_EVENT_NAMES]);
    expect(complete.handlers.has("tool_result")).toBe(false);
  });

  test("only exact interactive input reaches the core as a presence candidate", async () => {
    const root = project();
    const pi = new FakePi(root);
    const port = new MemoryCommitPort();
    createAmadeusPiExtension({ commitPort: port })(pi);
    await pi.emit("session_start", fixture.events.session_start);
    pi.leafId = "leaf-rpc";
    await pi.emit("input", fixture.events.input_rpc);
    pi.leafId = "leaf-extension";
    await pi.emit("input", fixture.events.input_extension);
    pi.leafId = "leaf-human";
    await pi.emit("input", fixture.events.input_interactive);

    const inputs = port.events.filter((event) => event.kind === "input-received");
    expect(inputs.map((event) => event.safe.source)).toEqual(["rpc", "extension", "interactive"]);
    expect(inputs.filter((event) => event.safe.source === "interactive")).toHaveLength(1);
    expect(inputs.every((event) => !("text" in event.safe))).toBe(true);
  });

  test("requires strict tool start/end pairing and seals raw args/results", async () => {
    const root = project();
    const pi = new FakePi(root);
    const port = new MemoryCommitPort();
    createAmadeusPiExtension({ commitPort: port })(pi);
    await pi.emit("session_start", fixture.events.session_start);
    await pi.emit("tool_execution_start", fixture.events.tool_execution_start);
    await pi.emit("tool_execution_end", fixture.events.tool_execution_end);
    expect(port.events.filter((event) => event.kind.startsWith("tool-"))).toHaveLength(2);
    const journal = allRuntimeJson(root, "journal");
    expect(journal).not.toContain("super-secret-fixture-content");
    expect(journal).not.toContain("super-secret-fixture-result");

    const unmatchedRoot = project();
    const unmatchedPi = new FakePi(unmatchedRoot);
    const unmatchedPort = new MemoryCommitPort();
    createAmadeusPiExtension({ commitPort: unmatchedPort })(unmatchedPi);
    await unmatchedPi.emit("session_start", fixture.events.session_start);
    await unmatchedPi.emit("tool_execution_end", fixture.events.tool_execution_end);
    expect(unmatchedPort.events.some((event) => event.kind === "tool-ended")).toBe(false);
    expect(JSON.parse(readFileSync(join(unmatchedRoot, "amadeus", ".amadeus-sessions", "pi-lifecycle", "health.json"), "utf8")).state).toBe("blocked");
  });

  test("marks continuation observed only after token-bound native agent_start", async () => {
    const root = project();
    const pi = new FakePi(root);
    createAmadeusPiExtension({ commitPort: new MemoryCommitPort() })(pi);
    await pi.emit("session_start", fixture.events.session_start);
    await pi.emit("agent_settled", fixture.events.agent_settled);
    expect(pi.messages).toHaveLength(1);
    expect(pi.messages[0]?.options).toEqual({ triggerTurn: true, deliverAs: "nextTurn" });
    const persistedOutbox = outboxPath(root);
    expect(JSON.parse(readFileSync(persistedOutbox, "utf8")).status).toBe("entry-appended");
    await pi.emit("agent_start", fixture.events.agent_start);
    expect(JSON.parse(readFileSync(persistedOutbox, "utf8")).status).toBe("turn-observed");
  });

  test("accepts a token appended after agent_start when that same turn settles", async () => {
    const root = project();
    const pi = new FakePi(root);
    createAmadeusPiExtension({ commitPort: new MemoryCommitPort() })(pi);
    await pi.emit("session_start", fixture.events.session_start);
    await pi.emit("agent_settled", fixture.events.agent_settled);

    const firstToken = JSON.parse(readFileSync(outboxPath(root), "utf8")).token as string;
    const continuation = pi.entries.pop();
    expect(continuation?.customType).toBe("amadeus-continuation");

    pi.leafId = "leaf-overtaking-human-turn";
    await pi.emit("agent_start", fixture.events.agent_start);
    pi.entries.push(continuation!);
    await pi.emit("agent_settled", fixture.events.agent_settled);

    const next = JSON.parse(readFileSync(outboxPath(root), "utf8")) as { status: string; token: string };
    expect(pi.notifications).toEqual([]);
    expect(next.status).toBe("entry-appended");
    expect(next.token).not.toBe(firstToken);
  });

  test("reinjects fresh core mission after compaction without trusting summary or triggering a turn", async () => {
    const root = project();
    const pi = new FakePi(root);
    createAmadeusPiExtension({ commitPort: new MemoryCommitPort() })(pi);
    await pi.emit("session_start", fixture.events.session_start);
    await pi.emit("session_before_compact", fixture.events.session_before_compact);
    await pi.emit("session_compact", fixture.events.session_compact);
    expect(pi.messages).toHaveLength(1);
    expect(pi.messages[0]?.message.content).toContain("amadeus-orchestrate.ts next");
    expect(pi.messages[0]?.message.content).not.toContain("UNTRUSTED SUMMARY");
    expect(pi.messages[0]?.options).toEqual({ triggerTurn: false });
  });
});

describe("Pi bridge journal", () => {
  test("preserves observation order when multiple events share one millisecond", () => {
    const root = project();
    const journal = new PiBridgeJournal(root);
    const sessionIdDigest = "6".repeat(64);
    const base = {
      schemaVersion: 1,
      profile: "pi-coding-agent/0.83",
      sessionIdDigest,
      occurredAt: "2026-08-04T00:00:00.000Z",
      safe: {},
    } as const;
    journal.prepare({
      ...base,
      eventKey: "pi:v1:session:z-first",
      fingerprint: "1".repeat(64),
      kind: "session-started",
    }, { type: "session_start" });
    journal.prepare({
      ...base,
      eventKey: "pi:v1:session:a-second",
      fingerprint: "2".repeat(64),
      kind: "input-received",
    }, { type: "input" });

    expect(journal.prepared(sessionIdDigest).map(({ event }) => event.eventKey)).toEqual([
      "pi:v1:session:z-first",
      "pi:v1:session:a-second",
    ]);
  });
});

describe("default canonical core commit port", () => {
  test("projects a Pi lifecycle heartbeat into the canonical doctor health directory", async () => {
    const root = project();
    const port = new DefaultCanonicalEventCommitPort(root);
    const event: PiCanonicalEvent = {
      schemaVersion: 1,
      profile: "pi-coding-agent/0.83",
      eventKey: "pi:v1:session:input:heartbeat",
      fingerprint: "9".repeat(64),
      kind: "input-received",
      sessionIdDigest: "8".repeat(64),
      occurredAt: "2026-08-04T00:00:00Z",
      safe: { source: "rpc", textDigest: "7".repeat(64), imageCount: 0 },
      sealedPayloadRef: "amadeus/.amadeus-sessions/pi-lifecycle/journal/heartbeat.json",
    };

    expect((await port.commitOnce(event)).ok).toBe(true);
    expect(existsSync(join(
      root,
      "amadeus",
      "spaces",
      "default",
      "intents",
      "260804-pi-test",
      ".amadeus-hooks-health",
      "pi-extension.last",
    ))).toBe(true);
  });

  test("narrows malformed and non-canonical audit rows before identity matching", async () => {
    const root = project();
    const auditDir = join(root, "amadeus", "spaces", "default", "intents", "260804-pi-test", "audit");
    mkdirSync(auditDir, { recursive: true });
    writeFileSync(join(auditDir, "legacy-mixed.jsonl"), "{not-json\n{\"idempotencyKey\":7,\"eventId\":false}\n");
    const port = new DefaultCanonicalEventCommitPort(root);
    const event: PiCanonicalEvent = {
      schemaVersion: 1,
      profile: "pi-coding-agent/0.83",
      eventKey: "pi:v1:session:input:narrowed",
      fingerprint: "e".repeat(64),
      kind: "input-received",
      sessionIdDigest: "f".repeat(64),
      occurredAt: "2026-08-04T00:00:00Z",
      safe: { source: "rpc", textDigest: "a".repeat(64), imageCount: 0 },
      sealedPayloadRef: "amadeus/.amadeus-sessions/pi-lifecycle/journal/narrowed.json",
    };
    const result = await port.commitOnce(event);
    expect(result.ok).toBe(true);
    expect(readAllAuditShards(root)).not.toContain("HUMAN_TURN");
  });

  test("uses eventKey/fingerprint for durable same/same replay and same/different refusal", async () => {
    const root = project();
    const port = new DefaultCanonicalEventCommitPort(root);
    const base: PiCanonicalEvent = {
      schemaVersion: 1,
      profile: "pi-coding-agent/0.83",
      eventKey: "pi:v1:session:input:one",
      fingerprint: "a".repeat(64),
      kind: "input-received",
      sessionIdDigest: "b".repeat(64),
      occurredAt: "2026-08-04T00:00:00Z",
      safe: { source: "interactive", textDigest: "c".repeat(64), imageCount: 0 },
      sealedPayloadRef: "amadeus/.amadeus-sessions/pi-lifecycle/journal/one.json",
    };
    const first = await port.commitOnce(base);
    const replay = await port.commitOnce(base);
    const conflict = await port.commitOnce({ ...base, fingerprint: "d".repeat(64) });
    expect(first.ok && first.receipt.disposition).toBe("committed");
    expect(replay.ok && replay.receipt.disposition).toBe("duplicate");
    expect(conflict.ok).toBe(false);
    expect((readAllAuditShards(root).match(/HUMAN_TURN/g) ?? [])).toHaveLength(1);
  });
});
