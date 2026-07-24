// amadeus-mirror-runner.ts — G4 Mirror process runner.
//
// The runner is the ONLY impure edge of the Gateway: it spawns `gh` with a
// fixed argument array (never a shell), enforces a per-profile deadline and a
// stdout byte cap before spawning, and reports a process observation. It knows
// nothing of the Mirror domain, C6, or state — it returns exit / timeout /
// capacity / termination facts and bounded output only.
//
// Termination (POSIX): the child is spawned `detached:true` so it leads its own
// process group; the recorded PGID equals its PID. A deadline or capacity
// trigger CAS-acquires `terminating` for one RunToken, sends SIGTERM to the
// negative PGID, escalates to SIGKILL after 1s, and confirms group death within
// a 5s total budget. If the group leader reaps before the group is confirmed
// empty, the PGID may be reused, so we do NOT re-signal — we settle
// `termination-failed` with `residualDescendantPossible`. Windows uses
// `taskkill /PID <pid> /T /F` as an argument array under the same 5s budget.
//
// Every timer, clock, spawn, and kill is injectable so deadline / capacity /
// termination behaviour is verified deterministically with a fake child.

const MiB = 1024 * 1024;

export type MirrorOperationProfile = "version-auth" | "single" | "paginated";

type ProfileLimits = Readonly<{ deadlineMs: number; stdoutLimitBytes: number }>;

const PROFILE_LIMITS: Readonly<Record<MirrorOperationProfile, ProfileLimits>> = {
  "version-auth": { deadlineMs: 10_000, stdoutLimitBytes: 1 * MiB },
  single: { deadlineMs: 30_000, stdoutLimitBytes: 1 * MiB },
  paginated: { deadlineMs: 60_000, stdoutLimitBytes: 64 * MiB },
};

// Total time budget from the first termination trigger to a forced settle.
const TERMINATION_BUDGET_MS = 5_000;
// SIGTERM grace before escalating to SIGKILL.
const SIGTERM_GRACE_MS = 1_000;
// Bounded stderr tail retained only for network-signal classification; never
// transcribed into any summary or outcome.
const STDERR_TAIL_BYTES = 4 * 1024;

export type MirrorProcessRequest = Readonly<{
  executable: string;
  args: readonly string[];
  profile: MirrorOperationProfile;
}>;

export type MirrorTermination =
  | { kind: "clean" }
  | { kind: "termination-failed"; residualDescendantPossible: boolean };

export type MirrorProcessResult =
  | { kind: "exited"; exitCode: number; stdout: Buffer; stderrTail: string }
  | { kind: "spawn-error" }
  | { kind: "timed-out"; termination: MirrorTermination }
  | { kind: "capacity-exceeded"; termination: MirrorTermination };

export interface MirrorProcessRunner {
  run(request: MirrorProcessRequest): Promise<MirrorProcessResult>;
}

// --- Injectable process seam -------------------------------------------------

type DataEmitter = { on(event: "data", cb: (chunk: Buffer) => void): void };

export type SpawnedChild = {
  pid: number | undefined;
  stdout: DataEmitter | null;
  stderr: DataEmitter | null;
  on(event: "close", cb: (code: number | null, signal: string | null) => void): void;
  on(event: "error", cb: (err: Error) => void): void;
};

export type SpawnFn = (
  executable: string,
  args: readonly string[],
  options: Readonly<{ shell: false; detached: boolean }>,
) => SpawnedChild;

// Sends a signal to a target (negative = process group). Must throw for an
// unknown target (ESRCH) so group death can be probed with signal 0.
export type KillFn = (target: number, signal: NodeJS.Signals | 0) => void;

export type MirrorRunnerDeps = Readonly<{
  spawn: SpawnFn;
  kill: KillFn;
  now: () => number;
  setTimer: (cb: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  platform: NodeJS.Platform;
}>;

function defaultDeps(): MirrorRunnerDeps {
  // Lazily require node:child_process so this module has no import-time process
  // dependency and stays trivially mockable.
  const childProcess = require("node:child_process") as {
    spawn: (
      cmd: string,
      args: readonly string[],
      opts: { shell: false; detached: boolean },
    ) => SpawnedChild;
  };
  return {
    spawn: (executable, args, options) =>
      childProcess.spawn(executable, args, options),
    kill: (target, signal) => {
      process.kill(target, signal);
    },
    now: () => Date.now(),
    setTimer: (cb, ms) => setTimeout(cb, ms),
    clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    platform: process.platform,
  };
}

// --- Real runner -------------------------------------------------------------

type RunState = "running" | "terminating" | "settled";

export function createMirrorProcessRunner(
  overrides: Partial<MirrorRunnerDeps> = {},
): MirrorProcessRunner {
  const deps: MirrorRunnerDeps = { ...defaultDeps(), ...overrides };

  return {
    run(request) {
      const limits = PROFILE_LIMITS[request.profile];
      return new Promise<MirrorProcessResult>((resolve) => {
        let state: RunState = "running";
        let trigger: "deadline" | "capacity" = "deadline";
        let stdoutBytes = 0;
        const stdoutChunks: Buffer[] = [];
        let stderrTail = Buffer.alloc(0);
        let deadlineTimer: unknown;
        let graceTimer: unknown;
        let budgetTimer: unknown;
        let pgid: number | null = null;

        const settle = (result: MirrorProcessResult): void => {
          if (state === "settled") return;
          state = "settled";
          deps.clearTimer(deadlineTimer);
          deps.clearTimer(graceTimer);
          deps.clearTimer(budgetTimer);
          resolve(result);
        };

        const groupAlive = (group: number): boolean => {
          try {
            deps.kill(-group, 0);
            return true;
          } catch {
            return false;
          }
        };

        // On POSIX, confirm the leader/group is gone after the child closes.
        // A surviving (or unprovable) group means the PGID could be reused, so
        // we never re-signal — we settle a typed termination failure.
        const finishTermination = (): void => {
          const termination: MirrorTermination =
            pgid !== null && groupAlive(pgid)
              ? { kind: "termination-failed", residualDescendantPossible: true }
              : { kind: "clean" };
          settleTerminated(termination);
        };

        const settleTerminated = (termination: MirrorTermination): void => {
          settle(
            trigger === "capacity"
              ? { kind: "capacity-exceeded", termination }
              : { kind: "timed-out", termination },
          );
        };

        const beginTermination = (cause: "deadline" | "capacity"): void => {
          if (state !== "running") return;
          state = "terminating";
          trigger = cause;
          deps.clearTimer(deadlineTimer);

          // Bound the whole cleanup so we never wait indefinitely.
          budgetTimer = deps.setTimer(() => {
            const residual = pgid !== null ? groupAlive(pgid) : true;
            settleTerminated({
              kind: "termination-failed",
              residualDescendantPossible: residual,
            });
          }, TERMINATION_BUDGET_MS);

          if (deps.platform === "win32") {
            terminateWindows();
            return;
          }
          terminatePosix();
        };

        const terminatePosix = (): void => {
          if (pgid === null) {
            // No group id was ever obtained; nothing safe to signal.
            settleTerminated({
              kind: "termination-failed",
              residualDescendantPossible: false,
            });
            return;
          }
          trySignal(-pgid, "SIGTERM");
          graceTimer = deps.setTimer(() => {
            if (pgid !== null) trySignal(-pgid, "SIGKILL");
          }, SIGTERM_GRACE_MS);
        };

        const terminateWindows = (): void => {
          const pid = pgid;
          if (pid === null) {
            settleTerminated({
              kind: "termination-failed",
              residualDescendantPossible: false,
            });
            return;
          }
          const killer = deps.spawn(
            "taskkill",
            ["/PID", String(pid), "/T", "/F"],
            { shell: false, detached: false },
          );
          killer.on("error", () => {
            settleTerminated({
              kind: "termination-failed",
              residualDescendantPossible: true,
            });
          });
          killer.on("close", () => {
            settleTerminated({ kind: "clean" });
          });
        };

        const trySignal = (target: number, signal: NodeJS.Signals): void => {
          try {
            deps.kill(target, signal);
          } catch {
            // ESRCH here means the target is already gone; the close handler or
            // budget timer settles the outcome.
          }
        };

        let child: SpawnedChild;
        try {
          child = deps.spawn(request.executable, request.args, {
            shell: false,
            detached: deps.platform !== "win32",
          });
        } catch {
          settle({ kind: "spawn-error" });
          return;
        }

        if (typeof child.pid !== "number" || child.pid <= 0) {
          settle({ kind: "spawn-error" });
          return;
        }
        pgid = child.pid;

        child.on("error", () => {
          // Spawn-level failure (e.g. ENOENT): nothing was started.
          settle({ kind: "spawn-error" });
        });

        child.stdout?.on("data", (chunk: Buffer) => {
          if (state === "settled") return;
          stdoutBytes += chunk.length;
          if (stdoutBytes > limits.stdoutLimitBytes) {
            beginTermination("capacity");
            return;
          }
          stdoutChunks.push(chunk);
        });

        child.stderr?.on("data", (chunk: Buffer) => {
          if (stderrTail.length >= STDERR_TAIL_BYTES) return;
          stderrTail = Buffer.concat([stderrTail, chunk]).subarray(
            0,
            STDERR_TAIL_BYTES,
          );
        });

        child.on("close", (code) => {
          if (state === "terminating") {
            deps.clearTimer(graceTimer);
            finishTermination();
            return;
          }
          settle({
            kind: "exited",
            exitCode: code ?? 1,
            stdout: Buffer.concat(stdoutChunks),
            stderrTail: stderrTail.toString("utf-8"),
          });
        });

        deadlineTimer = deps.setTimer(() => {
          beginTermination("deadline");
        }, limits.deadlineMs);
      });
    },
  };
}
