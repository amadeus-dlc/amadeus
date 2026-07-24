// t273 — G4 process runner: deterministic deadline/capacity/termination state
// machine (fake spawn + fake clock) and a real POSIX process-group kill.
// covers: packages/framework/core/tools/amadeus-mirror-runner.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { spawn as realSpawn } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  createMirrorProcessRunner,
  type MirrorRunnerDeps,
  type SpawnedChild,
} from "../../packages/framework/core/tools/amadeus-mirror-runner.ts";

// --- fake clock --------------------------------------------------------------

function makeTimers() {
  type Timer = { id: number; cb: () => void; ms: number; active: boolean };
  const timers: Timer[] = [];
  let seq = 0;
  return {
    setTimer: (cb: () => void, ms: number) => {
      const id = ++seq;
      timers.push({ id, cb, ms, active: true });
      return id;
    },
    clearTimer: (handle: unknown) => {
      const t = timers.find((x) => x.id === handle);
      if (t) t.active = false;
    },
    fireByMs: (ms: number) => {
      for (const t of timers.filter((x) => x.active && x.ms === ms)) {
        t.active = false;
        t.cb();
      }
    },
    activeMs: () => timers.filter((x) => x.active).map((x) => x.ms),
  };
}

// --- fake child --------------------------------------------------------------

type FakeChild = EventEmitter & {
  pid: number;
  stdout: EventEmitter;
  stderr: EventEmitter;
};

function makeChild(pid: number): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.pid = pid;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}

type KillCall = { target: number; signal: NodeJS.Signals | 0 };

function makeHarness(pid = 4242) {
  const timers = makeTimers();
  const child = makeChild(pid);
  const killLog: KillCall[] = [];
  let groupAlive = true;
  const deps: Partial<MirrorRunnerDeps> = {
    spawn: () => child as unknown as SpawnedChild,
    kill: (target, signal) => {
      killLog.push({ target, signal });
      if (signal === 0 && !groupAlive) {
        throw Object.assign(new Error("ESRCH"), { code: "ESRCH" });
      }
    },
    now: () => 0,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    platform: "linux",
  };
  return {
    child,
    timers,
    killLog,
    deps,
    setGroupAlive: (v: boolean) => {
      groupAlive = v;
    },
    realSignals: () => killLog.filter((k) => k.signal !== 0),
  };
}

describe("runner deterministic state machine", () => {
  test("a clean exit before deadline returns the captured stdout", async () => {
    const h = makeHarness();
    const runner = createMirrorProcessRunner(h.deps);
    const promise = runner.run({ executable: "gh", args: ["x"], profile: "single" });
    h.child.stdout?.emit("data", Buffer.from("hello"));
    h.child.emit("close", 0, null);
    const result = await promise;
    expect(result).toEqual({
      kind: "exited",
      exitCode: 0,
      stdout: Buffer.from("hello"),
      stderrTail: "",
    });
  });

  test("spawn error settles not-started", async () => {
    const h = makeHarness();
    const runner = createMirrorProcessRunner(h.deps);
    const promise = runner.run({ executable: "gh", args: ["x"], profile: "single" });
    h.child.emit("error", new Error("ENOENT"));
    expect(await promise).toEqual({ kind: "spawn-error" });
  });

  test("a synchronous spawn throw settles not-started", async () => {
    const runner = createMirrorProcessRunner({
      ...makeHarness().deps,
      spawn: () => {
        throw new Error("ENOENT");
      },
    });
    expect(
      await runner.run({ executable: "gh", args: ["x"], profile: "single" }),
    ).toEqual({ kind: "spawn-error" });
  });

  test("deadline sends SIGTERM to the negative pgid and settles clean on close", async () => {
    const h = makeHarness(100);
    const runner = createMirrorProcessRunner(h.deps);
    const promise = runner.run({ executable: "gh", args: ["x"], profile: "single" });
    h.timers.fireByMs(30_000); // single-op deadline
    expect(h.realSignals()).toEqual([{ target: -100, signal: "SIGTERM" }]);
    h.setGroupAlive(false); // group confirmed gone
    h.child.emit("close", null, "SIGTERM");
    const result = await promise;
    expect(result).toEqual({ kind: "timed-out", termination: { kind: "clean" } });
    // grace was cleared on close: no SIGKILL was ever sent.
    expect(h.realSignals().some((k) => k.signal === "SIGKILL")).toBe(false);
  });

  test("SIGTERM grace escalates to SIGKILL after 1s", async () => {
    const h = makeHarness(200);
    const runner = createMirrorProcessRunner(h.deps);
    const promise = runner.run({ executable: "gh", args: ["x"], profile: "single" });
    h.timers.fireByMs(30_000);
    h.timers.fireByMs(1_000); // grace
    expect(h.realSignals()).toEqual([
      { target: -200, signal: "SIGTERM" },
      { target: -200, signal: "SIGKILL" },
    ]);
    h.setGroupAlive(false);
    h.child.emit("close", null, "SIGKILL");
    expect(await promise).toEqual({
      kind: "timed-out",
      termination: { kind: "clean" },
    });
  });

  test("leader-first-exit: surviving group settles termination-failed, no re-signal", async () => {
    const h = makeHarness(300);
    const runner = createMirrorProcessRunner(h.deps);
    const promise = runner.run({ executable: "gh", args: ["x"], profile: "single" });
    h.timers.fireByMs(30_000); // SIGTERM
    const signalsBeforeClose = h.realSignals().length;
    h.setGroupAlive(true); // group still alive when leader reaps
    h.child.emit("close", null, "SIGTERM");
    const result = await promise;
    expect(result).toEqual({
      kind: "timed-out",
      termination: {
        kind: "termination-failed",
        residualDescendantPossible: true,
      },
    });
    // No signal was sent after the leader closed.
    expect(h.realSignals().length).toBe(signalsBeforeClose);
  });

  test("cleanup budget bounds a hung termination to termination-failed", async () => {
    const h = makeHarness(400);
    const runner = createMirrorProcessRunner(h.deps);
    const promise = runner.run({ executable: "gh", args: ["x"], profile: "single" });
    h.timers.fireByMs(30_000); // SIGTERM
    h.timers.fireByMs(1_000); // SIGKILL
    h.setGroupAlive(true);
    h.timers.fireByMs(5_000); // budget elapses, child never closed
    expect(await promise).toEqual({
      kind: "timed-out",
      termination: {
        kind: "termination-failed",
        residualDescendantPossible: true,
      },
    });
  });

  test("stdout over the profile cap triggers a capacity termination", async () => {
    const h = makeHarness(500);
    const runner = createMirrorProcessRunner(h.deps);
    const promise = runner.run({ executable: "gh", args: ["x"], profile: "single" });
    h.child.stdout?.emit("data", Buffer.alloc(1024 * 1024 + 1)); // > 1 MiB
    expect(h.realSignals()).toEqual([{ target: -500, signal: "SIGTERM" }]);
    h.setGroupAlive(false);
    h.child.emit("close", null, "SIGTERM");
    expect(await promise).toEqual({
      kind: "capacity-exceeded",
      termination: { kind: "clean" },
    });
  });

  test("each profile fixes its own deadline", async () => {
    for (const [profile, ms] of [
      ["version-auth", 10_000],
      ["single", 30_000],
      ["paginated", 60_000],
    ] as const) {
      const h = makeHarness();
      const runner = createMirrorProcessRunner(h.deps);
      const promise = runner.run({ executable: "gh", args: ["x"], profile });
      expect(h.timers.activeMs()).toContain(ms);
      h.setGroupAlive(false);
      h.timers.fireByMs(ms);
      h.child.emit("close", null, "SIGTERM");
      await promise;
    }
  });
});

// --- real POSIX process-group termination ------------------------------------

describe("runner real process termination (POSIX)", () => {
  test.skipIf(process.platform === "win32")(
    "deadline kills a real detached group including its descendant",
    async () => {
      let capturedPid: number | null = null;
      const timers = makeTimers();
      const deps: Partial<MirrorRunnerDeps> = {
        spawn: (executable, args, options) => {
          const child = realSpawn(executable, args as string[], options);
          capturedPid = child.pid ?? null;
          return child as unknown as SpawnedChild;
        },
        // real kill / now / platform
        setTimer: timers.setTimer,
        clearTimer: timers.clearTimer,
      };
      const runner = createMirrorProcessRunner(deps);
      // sh becomes the group leader; the backgrounded sleep is a descendant.
      const promise = runner.run({
        executable: "sh",
        args: ["-c", "sleep 30 & sleep 30"],
        profile: "single",
      });
      if (capturedPid === null) throw new Error("expected a spawned pid");
      const pgid = capturedPid;

      // Fire the deadline manually to send a real SIGTERM to -pgid.
      timers.fireByMs(30_000);
      const result = await promise;
      expect(result.kind).toBe("timed-out");

      // Descendant 0: the whole group is gone shortly after.
      let alive = true;
      for (let i = 0; i < 40 && alive; i++) {
        try {
          process.kill(-pgid, 0);
          await new Promise((r) => setTimeout(r, 50));
        } catch {
          alive = false;
        }
      }
      expect(alive).toBe(false);
    },
  );
});
