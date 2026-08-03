import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createAmadeusPiExtension,
  type PiExtensionApi,
  type PiExtensionContext,
  type PiExtensionHandler,
} from "../../packages/framework/harness/pi/extensions/amadeus-pi-extension.ts";
import { readAllAuditShards } from "../../packages/framework/core/tools/amadeus-lib.ts";

const fixture = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "fixtures", "pi-0.83-extension-events.json"), "utf8"),
) as { events: Record<string, Record<string, unknown>> };

const cleanup: string[] = [];

afterEach(() => {
  while (cleanup.length > 0) rmSync(cleanup.pop()!, { recursive: true, force: true });
});

function seedProject(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-pi-integration-"));
  cleanup.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const intent = join(intents, "260804-pi-integration");
  mkdirSync(intent, { recursive: true });
  writeFileSync(join(root, "amadeus", "active-space"), "default\n");
  writeFileSync(join(intents, "active-intent"), "260804-pi-integration\n");
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([{ uuid: "00000000-0000-7000-8000-000000000084", slug: "260804-pi-integration", status: "in-flight" }])}\n`,
  );
  writeFileSync(
    join(intent, "amadeus-state.md"),
    [
      "# AIDLC State",
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

class RuntimePi implements PiExtensionApi {
  readonly handlers = new Map<string, PiExtensionHandler>();
  readonly entries: Array<Record<string, unknown>> = [];
  readonly sent: Array<Record<string, unknown>> = [];
  readonly context: PiExtensionContext;
  leaf = "leaf-start";
  failSend = false;

  constructor(readonly root: string) {
    this.context = {
      cwd: root,
      sessionManager: {
        getSessionId: () => "pi-083-integration-session",
        getLeafId: () => this.leaf,
        getEntries: () => this.entries,
      },
      ui: { notify: () => {} },
    };
  }

  on(event: Parameters<PiExtensionApi["on"]>[0], handler: PiExtensionHandler): void {
    this.handlers.set(event, handler);
  }

  appendEntry<T>(customType: string, data?: T): void {
    this.entries.push({ type: "custom", customType, data, id: `entry-${this.entries.length}` });
  }

  sendMessage<T>(
    message: { customType: string; content: string; display: boolean; details?: T },
    options?: { triggerTurn?: boolean; deliverAs?: "steer" | "followUp" | "nextTurn" },
  ): void {
    if (this.failSend) throw new Error("injected append-after crash boundary");
    this.sent.push({ message, options });
    this.entries.push({ type: "custom_message", ...message, id: `message-${this.entries.length}` });
  }

  async emit(name: string, event: unknown): Promise<void> {
    const handler = this.handlers.get(name);
    if (handler === undefined) throw new Error(`missing handler ${name}`);
    await handler(event, this.context);
  }
}

function health(root: string): { state: string; reason?: string } {
  return JSON.parse(
    readFileSync(join(root, "amadeus", ".amadeus-sessions", "pi-lifecycle", "health.json"), "utf8"),
  ) as { state: string; reason?: string };
}

function outboxPath(root: string): string {
  const dir = join(root, "amadeus", ".amadeus-sessions", "pi-lifecycle");
  const name = readdirSync(dir).find((item) => item.startsWith("continuation-outbox-"));
  if (name === undefined) throw new Error("missing continuation outbox");
  return join(dir, name);
}

describe("Pi lifecycle adapter with the real canonical core port", () => {
  test("writes one presence row only for interactive input and keeps raw prompts out of audit", async () => {
    const root = seedProject();
    const pi = new RuntimePi(root);
    createAmadeusPiExtension()(pi);

    await pi.emit("session_start", fixture.events.session_start);
    pi.leaf = "leaf-rpc";
    await pi.emit("input", fixture.events.input_rpc);
    pi.leaf = "leaf-extension";
    await pi.emit("input", fixture.events.input_extension);
    pi.leaf = "leaf-human";
    await pi.emit("input", fixture.events.input_interactive);
    await pi.emit("session_shutdown", fixture.events.session_shutdown);

    const audit = readAllAuditShards(root);
    expect((audit.match(/SESSION_STARTED/g) ?? [])).toHaveLength(1);
    expect((audit.match(/HUMAN_TURN/g) ?? [])).toHaveLength(1);
    expect((audit.match(/SESSION_ENDED/g) ?? [])).toHaveLength(1);
    expect(audit).not.toContain("machine request");
    expect(audit).not.toContain("extension request");
    expect(audit).not.toContain("continue the workflow");
  });

  test("does not auto-mark or resend an append-after crash on session recovery", async () => {
    const root = seedProject();
    const first = new RuntimePi(root);
    first.failSend = true;
    createAmadeusPiExtension()(first);
    await first.emit("session_start", fixture.events.session_start);
    await first.emit("agent_settled", fixture.events.agent_settled);
    expect(health(root).state).toBe("blocked");

    const persistedOutbox = outboxPath(root);
    expect(JSON.parse(readFileSync(persistedOutbox, "utf8")).status).toBe("entry-appended");

    const recovered = new RuntimePi(root);
    createAmadeusPiExtension()(recovered);
    await recovered.emit("session_start", fixture.events.session_start);
    expect(recovered.sent).toHaveLength(0);
    expect(JSON.parse(readFileSync(persistedOutbox, "utf8")).status).toBe("blocked-ambiguous");
    expect(health(root).state).toBe("blocked");
  });
});
