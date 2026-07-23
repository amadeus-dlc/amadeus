import { describe, expect, test } from "bun:test";
import testOnlyPositive from "../fixtures/team-up-codex-safety-wait/test-only-positive.json";
import {
  evaluateFingerprint,
  evaluateProductionFingerprint,
  HerdrSafetyWaitAdapter,
  parseSafetyWaitFingerprint,
  productionActivationEnabled,
  roleToAgentLabel,
  safetyWaitRunIsActive,
  SafetyWaitSupervisor,
  type SafetyWaitFingerprint,
} from "../../packages/framework/core/tools/team-up-codex-safety-wait.ts";

function readFingerprint(): SafetyWaitFingerprint {
  const parsed = parseSafetyWaitFingerprint(testOnlyPositive);
  if (parsed === null) throw new Error("invalid test-only fingerprint fixture");
  return parsed;
}

const TEST_CONFIRMED_ABSENT_TEXT = "test-only confirmed absence";

describe("team-up Codex safety-wait activation", () => {
  test("the test fingerprint schema rejects missing and additional fields", () => {
    const valid = testOnlyPositive as Record<string, unknown>;
    expect(parseSafetyWaitFingerprint(valid)?.id).toBe("test-only-positive");
    expect(parseSafetyWaitFingerprint({ ...valid, extra: true })).toBeNull();
    const { columns: _, ...missingColumns } = valid;
    expect(parseSafetyWaitFingerprint(missingColumns)).toBeNull();
    const { rows: __, ...missingRows } = valid;
    expect(parseSafetyWaitFingerprint(missingRows)).toBeNull();
  });

  test("production activation uses only the captured internal positive", () => {
    expect(productionActivationEnabled()).toBe(true);
  });

  test("only current-run Codex roles map to exact Herdr labels", () => {
    expect(roleToAgentLabel("leader")).toBe("leader");
    expect(roleToAgentLabel("e1")).toBe("engineer-1");
    expect(roleToAgentLabel("e6")).toBe("engineer-6");
    expect(roleToAgentLabel("engineer-1")).toBeNull();
    expect(roleToAgentLabel("e0")).toBeNull();
    expect(roleToAgentLabel("e7")).toBeNull();
  });

  test("a supervisor run is active only for its exact Codex lifecycle record", () => {
    const active = {
      expectedRun: "run-001",
      expectedSession: "test-session",
      runRecord: "/state/runs/run-001",
      recordedSession: "test-session",
      recordedRuntime: "codex",
      recordedStatus: "launching",
    } as const;

    expect(safetyWaitRunIsActive(active)).toBe(true);
    expect(safetyWaitRunIsActive({ ...active, recordedStatus: "running" })).toBe(true);
    expect(safetyWaitRunIsActive({ ...active, expectedRun: "run-002" })).toBe(false);
    expect(safetyWaitRunIsActive({ ...active, recordedSession: "other-session" })).toBe(
      false,
    );
    expect(safetyWaitRunIsActive({ ...active, recordedRuntime: "claude" })).toBe(false);
    expect(safetyWaitRunIsActive({ ...active, recordedStatus: "stopped" })).toBe(false);
  });

  test("the Herdr adapter resolves an exact role and uses visible/text plus Enter only", async () => {
    const commands: string[][] = [];
    const responses = new Map<string, { exitCode: number; stdout: string }>([
      ["codex --version", { exitCode: 0, stdout: "codex-cli 0.144.6\n" }],
      ["herdr --version", { exitCode: 0, stdout: "herdr 0.7.1\n" }],
      [
        "herdr --session test-session pane list",
        {
          exitCode: 0,
          stdout: JSON.stringify({
            result: { panes: [{ label: "engineer-1", pane_id: "pane-1" }] },
          }),
        },
      ],
      [
        "herdr --session test-session agent list",
        {
          exitCode: 0,
          stdout: JSON.stringify({
            result: {
              agents: [
                { agent: "codex", name: "engineer-1", pane_id: "pane-1" },
              ],
            },
          }),
        },
      ],
      [
        "herdr --session test-session pane layout --pane pane-1",
        {
          exitCode: 0,
          stdout: JSON.stringify({
            result: {
              layout: { panes: [{ pane_id: "pane-1", rect: { width: 120, height: 34 } }] },
            },
          }),
        },
      ],
      [
        "herdr --session test-session pane read pane-1 --source visible --format text",
        { exitCode: 0, stdout: "visible bytes" },
      ],
      [
        "herdr --session test-session pane send-keys pane-1 enter",
        { exitCode: 0, stdout: "" },
      ],
    ]);
    const run = async (command: string, args: readonly string[]) => {
      commands.push([command, ...args]);
      return responses.get([command, ...args].join(" ")) ?? { exitCode: 9, stdout: "" };
    };
    const adapter = new HerdrSafetyWaitAdapter({
      session: "test-session",
      herdrCommand: "herdr",
      codexCommand: "codex",
      run,
    });

    expect(await adapter.versions()).toEqual({
      herdrVersion: "0.7.1",
      codexVersion: "codex-cli 0.144.6",
    });
    expect(await adapter.resolve("e1")).toEqual([
      {
        session: "test-session",
        role: "e1",
        paneId: "pane-1",
        columns: 120,
        rows: 34,
      },
    ]);
    expect(await adapter.readVisible("pane-1")).toBe("visible bytes");
    expect(adapter.now()).toBeGreaterThanOrEqual(0);
    await adapter.sendEnter("pane-1");
    expect(commands.at(-1)).toEqual([
      "herdr",
      "--session",
      "test-session",
      "pane",
      "send-keys",
      "pane-1",
      "enter",
    ]);
  });

  test("the Herdr adapter excludes a same-name pane whose current runtime is not Codex", async () => {
    const responses = new Map<string, { exitCode: number; stdout: string }>([
      [
        "herdr --session test-session pane list",
        {
          exitCode: 0,
          stdout: JSON.stringify({
            result: { panes: [{ label: "engineer-1", pane_id: "pane-1" }] },
          }),
        },
      ],
      [
        "herdr --session test-session agent list",
        {
          exitCode: 0,
          stdout: JSON.stringify({
            result: {
              agents: [{ agent: "shell", name: "engineer-1", pane_id: "pane-1" }],
            },
          }),
        },
      ],
      [
        "herdr --session test-session pane layout --pane pane-1",
        {
          exitCode: 0,
          stdout: JSON.stringify({
            result: {
              layout: { panes: [{ pane_id: "pane-1", rect: { width: 120, height: 34 } }] },
            },
          }),
        },
      ],
    ]);
    const adapter = new HerdrSafetyWaitAdapter({
      session: "test-session",
      run: async (command, args) =>
        responses.get([command, ...args].join(" ")) ?? { exitCode: 9, stdout: "" },
    });

    expect(await adapter.resolve("e1")).toEqual([]);
  });


  test("the sanitized test fixture matches the independent production positive", () => {
    const fingerprint = readFingerprint();
    const snapshot = {
      herdrVersion: fingerprint.herdrVersion,
      codexVersion: fingerprint.codexVersion,
      columns: fingerprint.columns,
      rows: fingerprint.rows,
      visibleText: fingerprint.visibleText,
    };

    expect(evaluateFingerprint(snapshot, [fingerprint])).toEqual({
      kind: "matched",
      fingerprintId: "test-only-positive",
    });
    expect(evaluateProductionFingerprint(snapshot)).toEqual({
      kind: "matched",
      fingerprintId: "natural-20260721T100145Z",
    });
    expect(
      Reflect.apply(
        evaluateProductionFingerprint as unknown as (...args: unknown[]) => unknown,
        null,
        [snapshot, [fingerprint]],
      ),
    ).toEqual({ kind: "matched", fingerprintId: "natural-20260721T100145Z" });
  });

  test("fingerprint comparison normalizes CRLF and nothing else", () => {
    const fingerprint = readFingerprint();
    const snapshot = {
      herdrVersion: fingerprint.herdrVersion,
      codexVersion: fingerprint.codexVersion,
      columns: fingerprint.columns,
      rows: fingerprint.rows,
      visibleText: fingerprint.visibleText.replaceAll("\n", "\r\n"),
    };

    expect(evaluateFingerprint(snapshot, [fingerprint])).toEqual({
      kind: "matched",
      fingerprintId: "test-only-positive",
    });

    for (const changed of [
      { ...snapshot, herdrVersion: "0.7.2" },
      { ...snapshot, codexVersion: "codex-cli 0.144.7" },
      { ...snapshot, columns: 119 },
      { ...snapshot, rows: 33 },
      { ...snapshot, visibleText: `\u001b[31m${fingerprint.visibleText}` },
      { ...snapshot, visibleText: fingerprint.visibleText.replace("Keep waiting", "Keep  waiting") },
      { ...snapshot, visibleText: `${fingerprint.visibleText}\n` },
    ]) {
      expect(evaluateFingerprint(changed, [fingerprint])).toEqual({
        kind: "no-input",
        reason: "unsupported-fingerprint",
      });
    }
  });

  test("a stable positive transaction sends Enter once", async () => {
    const fingerprint = readFingerprint();
    const reads = [
      fingerprint.visibleText,
      fingerprint.visibleText,
      TEST_CONFIRMED_ABSENT_TEXT,
    ];
    const sent: string[] = [];
    const supervisor = new SafetyWaitSupervisor({
      session: "test-session",
      role: "e1",
      supportedFingerprints: [fingerprint],
      confirmedAbsentVisibleTexts: [TEST_CONFIRMED_ABSENT_TEXT],
    });
    const result = await supervisor.poll({
      versions: async () => ({
        herdrVersion: fingerprint.herdrVersion,
        codexVersion: fingerprint.codexVersion,
      }),
      resolve: async () => [
        {
          session: "test-session",
          role: "e1",
          paneId: "test-pane",
          columns: 120,
          rows: 34,
        },
      ],
      readVisible: async () => reads.shift() ?? "normal output",
      sendEnter: async (paneId) => {
        sent.push(paneId);
      },
      now: (() => {
        const times = [100, 150, 160, 170];
        return () => times.shift() ?? 170;
      })(),
    });

    expect(result).toEqual({ kind: "sent", paneId: "test-pane" });
    expect(sent).toEqual(["test-pane"]);
  });

  test("a modal that remains after Enter is reported without another input", async () => {
    const fingerprint = readFingerprint();
    const sent: string[] = [];
    const supervisor = new SafetyWaitSupervisor({
      session: "test-session",
      role: "leader",
      supportedFingerprints: [fingerprint],
    });
    const result = await supervisor.poll({
      versions: async () => ({
        herdrVersion: fingerprint.herdrVersion,
        codexVersion: fingerprint.codexVersion,
      }),
      resolve: async () => [
        {
          session: "test-session",
          role: "leader",
          paneId: "leader-pane",
          columns: 120,
          rows: 34,
        },
      ],
      readVisible: async () => fingerprint.visibleText,
      sendEnter: async (paneId) => {
        sent.push(paneId);
      },
      now: () => 100,
    });

    expect(result).toEqual({ kind: "sent-unconfirmed", paneId: "leader-pane" });
    expect(sent).toEqual(["leader-pane"]);
  });

  test("version drift before send fails closed", async () => {
    const fingerprint = readFingerprint();
    const versions = [
      { herdrVersion: fingerprint.herdrVersion, codexVersion: fingerprint.codexVersion },
      { herdrVersion: fingerprint.herdrVersion, codexVersion: "codex-cli 0.144.7" },
    ];
    const sent: string[] = [];
    const supervisor = new SafetyWaitSupervisor({
      session: "test-session",
      role: "e1",
      supportedFingerprints: [fingerprint],
    });
    const result = await supervisor.poll({
      versions: async () => versions.shift()!,
      resolve: async () => [
        {
          session: "test-session",
          role: "e1",
          paneId: "test-pane",
          columns: 120,
          rows: 34,
        },
      ],
      readVisible: async () => fingerprint.visibleText,
      sendEnter: async (paneId) => {
        sent.push(paneId);
      },
      now: () => 100,
    });

    expect(result).toEqual({ kind: "no-input", reason: "version-changed" });
    expect(sent).toEqual([]);
  });

  test("a slow post-send confirmation stays latched and unconfirmed", async () => {
    const fingerprint = readFingerprint();
    const reads = [fingerprint.visibleText, fingerprint.visibleText, "normal output"];
    const times = [0, 10, 20, 1_021];
    const sent: string[] = [];
    const supervisor = new SafetyWaitSupervisor({
      session: "test-session",
      role: "e1",
      supportedFingerprints: [fingerprint],
    });
    const result = await supervisor.poll({
      versions: async () => ({
        herdrVersion: fingerprint.herdrVersion,
        codexVersion: fingerprint.codexVersion,
      }),
      resolve: async () => [
        {
          session: "test-session",
          role: "e1",
          paneId: "test-pane",
          columns: 120,
          rows: 34,
        },
      ],
      readVisible: async () => reads.shift() ?? "normal output",
      sendEnter: async (paneId) => {
        sent.push(paneId);
      },
      now: () => times.shift() ?? 1_021,
    });

    expect(result).toEqual({ kind: "sent-unconfirmed", paneId: "test-pane" });
    expect(sent).toEqual(["test-pane"]);
  });

  test("ambiguous identity, unstable reads, expiry, and adapter errors send no input", async () => {
    const fingerprint = readFingerprint();
    const pane = {
      session: "test-session",
      role: "e1",
      paneId: "test-pane",
      columns: 120,
      rows: 34,
    };
    const cases = [
      {
        reason: "role-not-unique",
        resolves: [[]],
        reads: [fingerprint.visibleText],
        times: [0, 1],
      },
      {
        reason: "role-not-unique",
        resolves: [[pane, { ...pane, paneId: "other-pane" }]],
        reads: [fingerprint.visibleText],
        times: [0, 1],
      },
      {
        reason: "unstable-fingerprint",
        resolves: [[pane]],
        reads: [fingerprint.visibleText, `${fingerprint.visibleText}\n`],
        times: [0, 1],
      },
      {
        reason: "identity-changed",
        resolves: [[pane], [{ ...pane, paneId: "replacement-pane" }]],
        reads: [fingerprint.visibleText, fingerprint.visibleText],
        times: [0, 1, 2],
      },
      {
        reason: "transaction-expired",
        resolves: [[pane]],
        reads: [fingerprint.visibleText, fingerprint.visibleText],
        times: [0, 1_001],
      },
    ] as const;

    for (const scenario of cases) {
      const resolves = [...scenario.resolves];
      const reads = [...scenario.reads];
      const times = [...scenario.times];
      const sent: string[] = [];
      const supervisor = new SafetyWaitSupervisor({
        session: "test-session",
        role: "e1",
        supportedFingerprints: [fingerprint],
      });
      const result = await supervisor.poll({
        versions: async () => ({
          herdrVersion: fingerprint.herdrVersion,
          codexVersion: fingerprint.codexVersion,
        }),
        resolve: async () => resolves.shift() ?? [],
        readVisible: async () => reads.shift() ?? "normal output",
        sendEnter: async (paneId) => {
          sent.push(paneId);
        },
        now: () => times.shift() ?? 0,
      });
      expect(result).toEqual({ kind: "no-input", reason: scenario.reason });
      expect(sent).toEqual([]);
    }

    const failed = new SafetyWaitSupervisor({
      session: "test-session",
      role: "e1",
      supportedFingerprints: [fingerprint],
    });
    expect(
      await failed.poll({
        versions: async () => {
          throw new Error("version failed");
        },
        resolve: async () => [pane],
        readVisible: async () => fingerprint.visibleText,
        sendEnter: async () => {
          throw new Error("must not send");
        },
        now: () => 0,
      }),
    ).toEqual({ kind: "no-input", reason: "adapter-failure" });
  });

  test("the latch rearms only after two modal-absent polls", async () => {
    const fingerprint = readFingerprint();
    const reads = [
      fingerprint.visibleText,
      fingerprint.visibleText,
      TEST_CONFIRMED_ABSENT_TEXT,
      fingerprint.visibleText,
      TEST_CONFIRMED_ABSENT_TEXT,
      TEST_CONFIRMED_ABSENT_TEXT,
      fingerprint.visibleText,
      fingerprint.visibleText,
      TEST_CONFIRMED_ABSENT_TEXT,
    ];
    const sent: string[] = [];
    let now = 0;
    const adapter = {
      versions: async () => ({
        herdrVersion: fingerprint.herdrVersion,
        codexVersion: fingerprint.codexVersion,
      }),
      resolve: async () => [
        {
          session: "test-session",
          role: "e1",
          paneId: "test-pane",
          columns: 120,
          rows: 34,
        },
      ],
      readVisible: async () => reads.shift() ?? "normal output",
      sendEnter: async (paneId: string) => {
        sent.push(paneId);
      },
      now: () => {
        now += 1_000;
        return now;
      },
    };
    const supervisor = new SafetyWaitSupervisor({
      session: "test-session",
      role: "e1",
      supportedFingerprints: [fingerprint],
      confirmedAbsentVisibleTexts: [TEST_CONFIRMED_ABSENT_TEXT],
      transactionTtlMs: 3_000,
    });

    expect((await supervisor.poll(adapter)).kind).toBe("sent");
    expect(await supervisor.poll(adapter)).toEqual({
      kind: "no-input",
      reason: "already-latched",
    });
    expect((await supervisor.poll(adapter)).kind).toBe("no-input");
    expect((await supervisor.poll(adapter)).kind).toBe("no-input");
    expect((await supervisor.poll(adapter)).kind).toBe("sent");
    expect(sent).toEqual(["test-pane", "test-pane"]);
  });

  test.each([
    ["ANSI", (value: string) => `\u001b[31m${value}\u001b[0m`],
    [
      "wrapped",
      (value: string) => value.replace("Additional safety checks", "Additional safety\nchecks"),
    ],
    ["partial", (value: string) => value.split("\n").slice(1).join("\n")],
  ])("post-send %s text is unknown and keeps the one-Enter latch", async (_name, drift) => {
    const fingerprint = readFingerprint();
    const unknownModal = drift(fingerprint.visibleText);
    const reads = [
      fingerprint.visibleText,
      fingerprint.visibleText,
      unknownModal,
      unknownModal,
      unknownModal,
      fingerprint.visibleText,
    ];
    const sent: string[] = [];
    const supervisor = new SafetyWaitSupervisor({
      session: "test-session",
      role: "e1",
      supportedFingerprints: [fingerprint],
    });
    const adapter = {
      versions: async () => ({
        herdrVersion: fingerprint.herdrVersion,
        codexVersion: fingerprint.codexVersion,
      }),
      resolve: async () => [
        {
          session: "test-session",
          role: "e1",
          paneId: "test-pane",
          columns: 120,
          rows: 34,
        },
      ],
      readVisible: async () => reads.shift() ?? fingerprint.visibleText,
      sendEnter: async (paneId: string) => {
        sent.push(paneId);
      },
      now: () => 100,
    };

    expect(await supervisor.poll(adapter)).toEqual({
      kind: "sent-unconfirmed",
      paneId: "test-pane",
    });
    expect((await supervisor.poll(adapter)).kind).toBe("no-input");
    expect((await supervisor.poll(adapter)).kind).toBe("no-input");
    expect(await supervisor.poll(adapter)).toEqual({
      kind: "no-input",
      reason: "already-latched",
    });
    expect(sent).toEqual(["test-pane"]);
  });
});
