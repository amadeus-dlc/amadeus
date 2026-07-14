// covers: module:amadeus-swarm-native-capture, requirement:FR-18, requirement:FR-20, requirement:FR-21
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { constants as filesystemConstants } from "node:fs";
import {
  lstat,
  mkdtemp,
  mkdir,
  open,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  EvidenceCapturePlan,
  ProcessTerminal,
  RawEvidenceFrame,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-adapter-contract.ts";
import { digestValue } from "../../packages/framework/core/tools/amadeus-swarm-canonical.ts";
import {
  captureErrnoCode,
  createNativeCaptureSupervisor,
  type NativeCaptureDirectory,
  type NativeCaptureFilesystem,
} from "../../packages/framework/core/tools/amadeus-swarm-native-capture.ts";
import type { RawEvidenceSink } from "../../packages/framework/core/tools/amadeus-swarm-native-execution.ts";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

async function root(): Promise<string> {
  const created = await mkdtemp(join(tmpdir(), "amadeus-capture-"));
  roots.push(created);
  return created;
}

function terminal(nativeRunId = "run-1"): ProcessTerminal {
  return Object.freeze({
    transport: "stdio-json",
    exitCode: 0,
    processGroupId: 101,
    nativeRunId,
    processIdentityDigest: "identity-digest",
  });
}

const discardEvidence: RawEvidenceSink = Object.freeze({
  ingest: () => {},
  close: () => {},
  fail: () => {},
});

function startInput(
  nativeRunId: string,
  plan: EvidenceCapturePlan,
  evidence: RawEvidenceSink = discardEvidence,
) {
  return Object.freeze({
    nativeRunId,
    plan,
    identity: Object.freeze({
      executionId: "execution-1",
      attemptId: "attempt-1",
      attemptNonceHash: "nonce",
      planDigest: "plan",
      waveIndex: 0,
      waveDigest: "wave",
    }),
    resources: Object.freeze({
      preparationDigest: "preparation",
      receiptDigest: "receipt",
      resources: Object.freeze([]),
    }),
    evidence,
  });
}

function stdout(bytes: Uint8Array) {
  return Object.freeze({
    kind: "evidence" as const,
    transport: "stdio-json" as const,
    channel: "stdout" as const,
    bytes,
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("condition timeout");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
  }
}

describe("production native capture supervisor", () => {
  test("maps every supported openat errno without depending on the host platform", () => {
    expect([
      captureErrnoCode(2),
      captureErrnoCode(20),
      captureErrnoCode(40),
      captureErrnoCode(62),
      captureErrnoCode(1),
    ]).toEqual(["ENOENT", "ENOTDIR", "ELOOP", "ELOOP", "EIO"]);
  });

  test("passes stdout once to the attempt sink without terminal replay", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    const provider = join(base, "provider.json");
    await mkdir(hooks);
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5, settleMs: 20 });
    const frames: RawEvidenceFrame[] = [];
    const session = await supervisor.capture.start(startInput(
      "run-1",
      { kind: "event-bound-provider-path", hookDir: hooks },
      Object.freeze({
        ingest: (frame) => frames.push(frame),
        close: () => {},
        fail: () => {},
      }),
    ));
    const streamBytes = new TextEncoder().encode("stream-one");
    supervisor.output.publish("run-1", stdout(streamBytes));
    expect(frames.map((frame) => [frame.source, new TextDecoder().decode(frame.bytes)])).toEqual([
      ["process-stream", "stream-one"],
    ]);

    const exactPaths = Object.freeze([provider]);
    await session.applyBinding(Object.freeze({
      kind: "event-bound-provider-path",
      nativeRunId: "run-1",
      exactPaths,
      exactPathDigest: digestValue(exactPaths),
      sourceEventDigest: "event-digest",
    }));
    await writeFile(provider, "provider-state");
    await writeFile(join(hooks, "hook.json"), "hook-event");
    await waitFor(() => frames.some((frame) => frame.source === "provider-state") &&
      frames.some((frame) => frame.source === "hook"));
    supervisor.output.close("run-1");

    await session.stopAndWait(terminal());
    expect(frames).toHaveLength(3);
    expect(frames.map((frame) => [frame.source, new TextDecoder().decode(frame.bytes)])).toContainEqual(
      ["hook", "hook-event"],
    );
    expect(frames.map((frame) => [frame.source, new TextDecoder().decode(frame.bytes)])).toContainEqual(
      ["provider-state", "provider-state"],
    );
    expect(supervisor.activeObserverCount()).toBe(0);
  });

  test("rejects an event-bound terminal without a binding", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    await mkdir(hooks);
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5, settleMs: 10 });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "event-bound-provider-path",
      hookDir: hooks,
    }));
    supervisor.output.close("run-1");
    await expect(session.stopAndWait(terminal())).rejects.toThrow("CAPTURE_BINDING_MISSING");
    expect(supervisor.activeObserverCount()).toBe(0);
  });

  test("includes a late hook write before the terminal seal", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    await mkdir(hooks);
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5, settleMs: 50 });
    const frames: RawEvidenceFrame[] = [];
    const session = await supervisor.capture.start(startInput(
      "run-1",
      { kind: "hook-only", hookDir: hooks },
      Object.freeze({
        ingest: (frame) => frames.push(frame),
        close: () => {},
        fail: () => {},
      }),
    ));
    supervisor.output.close("run-1");
    setTimeout(() => void writeFile(join(hooks, "late.json"), "late-hook"), 15);
    await session.stopAndWait(terminal());
    expect(frames.map((frame) => new TextDecoder().decode(frame.bytes))).toEqual(["late-hook"]);
  });

  test("fails the join on a capture read error", async () => {
    const base = await root();
    const broken = join(base, "broken.json");
    await writeFile(broken, "unreadable");
    let closed = false;
    const injected: Partial<NativeCaptureFilesystem> = Object.freeze({
      openReadOnlyNoFollow: async (path) => {
        const handle = await open(
          path,
          filesystemConstants.O_RDONLY | filesystemConstants.O_NOFOLLOW,
        );
        return Object.freeze({
          stat: async () => handle.stat({ bigint: true }),
          readFile: async () => {
            if (path === broken) throw new Error("injected read failure");
            return handle.readFile();
          },
          close: async () => {
            await handle.close();
            closed = true;
          },
        });
      },
    });
    const supervisor = createNativeCaptureSupervisor({
      filesystem: injected,
      pollIntervalMs: 5,
      settleMs: 10,
    });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "hook-only",
      hookDir: broken,
    }));
    supervisor.output.close("run-1");
    await expect(session.stopAndWait(terminal())).rejects.toThrow("CAPTURE_READ_FAILED");
    expect(closed).toBeTrue();
    expect(supervisor.activeObserverCount()).toBe(0);
  });

  test("times out when process output never closes", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    await mkdir(hooks);
    const supervisor = createNativeCaptureSupervisor({
      pollIntervalMs: 5,
      settleMs: 10,
      joinTimeoutMs: 30,
    });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "hook-only",
      hookDir: hooks,
    }));
    await expect(session.stopAndWait(terminal())).rejects.toThrow("CAPTURE_JOIN_TIMEOUT");
    expect(supervisor.activeObserverCount()).toBe(0);
  });

  test("abort removes every observer and rejects later process output", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    await mkdir(hooks);
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5 });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "hook-only",
      hookDir: hooks,
    }));
    await session.abortAndWait("test abort");
    expect(supervisor.activeObserverCount()).toBe(0);
    expect(() => supervisor.output.publish("run-1", stdout(new Uint8Array([1])))).toThrow(
      "CAPTURE_SESSION_NOT_FOUND",
    );
  });

  test("forwards the first process output failure and ignores duplicates", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    await mkdir(hooks);
    const failures: unknown[] = [];
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5 });
    const session = await supervisor.capture.start(startInput(
      "run-1",
      { kind: "hook-only", hookDir: hooks },
      Object.freeze({
        ingest: () => {},
        close: () => {},
        fail: (error) => failures.push(error),
      }),
    ));

    supervisor.output.fail("run-1", "non-error failure");
    supervisor.output.fail("run-1", new Error("duplicate failure"));

    await expect(session.stopAndWait(terminal())).rejects.toThrow(
      "CAPTURE_PROCESS_OUTPUT_FAILED",
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual(new Error("CAPTURE_PROCESS_OUTPUT_FAILED"));
    expect(supervisor.activeObserverCount()).toBe(0);
  });

  test("captures nested files through pinned directory descriptors", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    const nested = join(hooks, "nested");
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, "event.json"), "nested-event");
    const frames: RawEvidenceFrame[] = [];
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5, settleMs: 10 });
    const session = await supervisor.capture.start(startInput(
      "run-1",
      { kind: "hook-only", hookDir: hooks },
      Object.freeze({
        ingest: (frame) => frames.push(frame),
        close: () => {},
        fail: () => {},
      }),
    ));
    supervisor.output.close("run-1");

    await session.stopAndWait(terminal());
    expect(frames.map((frame) => new TextDecoder().decode(frame.bytes))).toEqual([
      "nested-event",
    ]);
  });

  test("fails loudly and closes the pinned parent when openat is unsupported", async () => {
    const hooks = "/virtual/hooks";
    const statFor = (directory: boolean) => Object.freeze({
      dev: 1n,
      ino: directory ? 1n : 2n,
      isDirectory: () => directory,
      isFile: () => !directory,
      isSymbolicLink: () => false,
    });
    let directoryClosed = false;
    const filesystem: Partial<NativeCaptureFilesystem> = Object.freeze({
      lstat: async (path) => statFor(path === hooks),
      readdir: async () => ["event.json"],
      openDirectoryNoFollow: async () => Object.freeze({
        stat: async () => statFor(true),
        openDirectoryNoFollow: async () => {
          throw new Error("CAPTURE_PLATFORM_UNSUPPORTED");
        },
        openFileNoFollow: async () => {
          throw new Error("CAPTURE_PLATFORM_UNSUPPORTED");
        },
        close: async () => {
          directoryClosed = true;
        },
      }),
    });
    const supervisor = createNativeCaptureSupervisor({
      filesystem,
      pollIntervalMs: 1,
      settleMs: 1,
      joinTimeoutMs: 100,
    });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "hook-only",
      hookDir: hooks,
    }));
    supervisor.output.close("run-1");

    await expect(session.stopAndWait(terminal())).rejects.toThrow(
      "CAPTURE_PLATFORM_UNSUPPORTED",
    );
    expect(directoryClosed).toBeTrue();
  });

  test("rejects symlinked capture entries", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    const outside = join(base, "outside.json");
    await mkdir(hooks);
    await writeFile(outside, "outside");
    await symlink(outside, join(hooks, "linked.json"));
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5, settleMs: 10 });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "hook-only",
      hookDir: hooks,
    }));
    supervisor.output.close("run-1");
    await expect(session.stopAndWait(terminal())).rejects.toThrow("CAPTURE_SYMLINK_REJECTED");
  });

  test("rejects a capture file replaced by a symlink after its descriptor opens", async () => {
    const base = await root();
    const victim = join(base, "victim.json");
    const outside = join(base, "outside.json");
    await writeFile(victim, "original");
    await writeFile(outside, "outside");
    let replaced = false;
    const filesystem: Partial<NativeCaptureFilesystem> = Object.freeze({
      openReadOnlyNoFollow: async (path) => {
        const handle = await open(
          path,
          filesystemConstants.O_RDONLY | filesystemConstants.O_NOFOLLOW,
        );
        if (path === victim && !replaced) {
          replaced = true;
          await rm(victim);
          await symlink(outside, victim);
        }
        return Object.freeze({
          stat: async () => handle.stat({ bigint: true }),
          readFile: async () => handle.readFile(),
          close: async () => handle.close(),
        });
      },
    });
    const supervisor = createNativeCaptureSupervisor({
      filesystem,
      pollIntervalMs: 5,
      settleMs: 10,
    });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "hook-only",
      hookDir: victim,
    }));
    supervisor.output.close("run-1");

    await expect(session.stopAndWait(terminal())).rejects.toThrow("CAPTURE_SYMLINK_REJECTED");
  });

  test("rejects a foreign child reached through an ancestor swap and restore", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    const parked = join(base, "parked-hooks");
    const foreign = join(base, "foreign-hooks");
    const child = join(hooks, "event.json");
    await mkdir(hooks);
    await mkdir(foreign);
    await writeFile(child, "trusted-event");
    await writeFile(join(foreign, "event.json"), "foreign-secret");
    let foreignActive = false;
    let attackStarted = false;
    let swapQueue = Promise.resolve();
    const serializeSwap = (operation: () => Promise<void>): Promise<void> => {
      const scheduled = swapQueue.then(operation, operation);
      swapQueue = scheduled.catch(() => {});
      return scheduled;
    };
    const activateForeign = (): Promise<void> => serializeSwap(async () => {
      if (foreignActive) return;
      await rename(hooks, parked);
      await rename(foreign, hooks);
      foreignActive = true;
    });
    const restoreTrusted = (): Promise<void> => serializeSwap(async () => {
      if (!foreignActive) return;
      await rename(hooks, foreign);
      await rename(parked, hooks);
      foreignActive = false;
    });
    const filesystem: Partial<NativeCaptureFilesystem> = Object.freeze({
      lstat: async (path) => {
        if (path === child && !attackStarted) {
          attackStarted = true;
          await activateForeign();
        } else if (path === hooks && attackStarted) {
          await restoreTrusted();
        }
        return lstat(path, { bigint: true });
      },
    });
    const supervisor = createNativeCaptureSupervisor({
      filesystem,
      pollIntervalMs: 1,
      settleMs: 1,
      joinTimeoutMs: 100,
    });
    const frames: RawEvidenceFrame[] = [];
    const session = await supervisor.capture.start(startInput(
      "run-1",
      { kind: "hook-only", hookDir: hooks },
      Object.freeze({
        ingest: (frame) => frames.push(frame),
        close: () => {},
        fail: () => {},
      }),
    ));
    supervisor.output.close("run-1");

    await expect(session.stopAndWait(terminal())).rejects.toThrow("CAPTURE_PATH_CHANGED");
    expect(frames.map((frame) => new TextDecoder().decode(frame.bytes))).not.toContain(
      "foreign-secret",
    );
    await restoreTrusted();
  });

  test("compares file identities as bigint beyond Number precision", async () => {
    const path = "/virtual/large-inode.json";
    let read = false;
    const fileStat = (ino: bigint) => Object.freeze({
      dev: 1n,
      ino,
      isDirectory: () => false,
      isFile: () => true,
      isSymbolicLink: () => false,
    });
    const filesystem: Partial<NativeCaptureFilesystem> = Object.freeze({
      lstat: async () => fileStat(9_007_199_254_740_992n),
      openReadOnlyNoFollow: async () => Object.freeze({
        stat: async () => fileStat(9_007_199_254_740_993n),
        readFile: async () => {
          read = true;
          return new TextEncoder().encode("must-not-be-read");
        },
        close: async () => {},
      }),
    });
    const supervisor = createNativeCaptureSupervisor({
      filesystem,
      pollIntervalMs: 1,
      settleMs: 1,
      joinTimeoutMs: 100,
    });
    const session = await supervisor.capture.start(startInput("run-1", {
      kind: "hook-only",
      hookDir: path,
    }));
    supervisor.output.close("run-1");

    await expect(session.stopAndWait(terminal())).rejects.toThrow("CAPTURE_PATH_CHANGED");
    expect(read).toBeFalse();
  });

  test("streams a large stdout attempt without replaying raw frames at the terminal seal", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    await mkdir(hooks);
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5, settleMs: 10 });
    let ingested = 0;
    const session = await supervisor.capture.start(startInput(
      "run-1",
      { kind: "hook-only", hookDir: hooks },
      Object.freeze({
        ingest: (frame) => {
          if (
            frame.bytes.length !== canary.length ||
            frame.bytes.some((byte, index) => byte !== canary[index])
          ) {
            throw new Error("raw frame changed before incremental ingestion");
          }
          ingested += 1;
        },
        close: () => {},
        fail: () => {},
      }),
    ));
    const canary = new TextEncoder().encode("secret-canary-must-not-be-retained");

    for (let index = 0; index < 100_000; index += 1) {
      supervisor.output.publish("run-1", stdout(canary));
    }
    supervisor.output.close("run-1");

    await session.stopAndWait(terminal());
    expect(ingested).toBe(100_000);
  });

  test("lets the attempt reducer retain only the last provider snapshot for each file", async () => {
    const hooks = "/virtual/hooks";
    const provider = "/virtual/provider";
    const entries = Object.freeze(
      Array.from({ length: 10_000 }, (_, index) => `snapshot-${index}.json`),
    );
    let version = 1;
    let providerReads = 0;
    let ingested = 0;
    const lastSnapshots = new Map<string, Uint8Array>();
    let completePass: (() => void) | undefined;
    const passCompleted = (): Promise<void> => new Promise((resolvePass) => {
      completePass = resolvePass;
    });
    let nextPass = passCompleted();
    const statFor = (path: string, directory: boolean) => Object.freeze({
      dev: 1n,
      ino: BigInt(path.split("").reduce(
        (sum, character) => sum + character.charCodeAt(0),
        0,
      )),
      isDirectory: () => directory,
      isFile: () => !directory,
      isSymbolicLink: () => false,
    });
    const fileFor = (path: string) => Object.freeze({
      stat: async () => statFor(path, false),
      readFile: async () => {
        const bytes = new TextEncoder().encode(`${version}:${path}`);
        providerReads += 1;
        if (providerReads % entries.length === 0) completePass?.();
        return bytes;
      },
      close: async () => {},
    });
    const directoryFor = (path: string): NativeCaptureDirectory => Object.freeze({
      stat: async () => statFor(path, true),
      openDirectoryNoFollow: async (name) => directoryFor(join(path, name)),
      openFileNoFollow: async (name) => fileFor(join(path, name)),
      close: async () => {},
    });
    const filesystem: NativeCaptureFilesystem = Object.freeze({
      lstat: async (path) => statFor(path, path === hooks || path === provider),
      readdir: async (path) => path === provider ? entries : [],
      openDirectoryNoFollow: async (path) => directoryFor(path),
      openReadOnlyNoFollow: async (path) => fileFor(path),
    });
    const exactPaths = Object.freeze([provider]);
    const supervisor = createNativeCaptureSupervisor({
      filesystem,
      pollIntervalMs: 0,
      settleMs: 0,
      joinTimeoutMs: 2_000,
    });
    const session = await supervisor.capture.start(startInput(
      "run-1",
      {
        kind: "fixed-provider-path",
        hookDir: hooks,
        initialBinding: Object.freeze({
          kind: "fixed-provider-path",
          nativeRunId: "run-1",
          exactPaths,
          exactPathDigest: digestValue(exactPaths),
          sourcePlanDigest: "plan",
        }),
      },
      Object.freeze({
        ingest: (frame) => {
          if (frame.source !== "provider-state") return;
          ingested += 1;
          lastSnapshots.set(frame.pathDigest, frame.bytes);
        },
        close: () => {},
        fail: () => {},
      }),
    ));

    await nextPass;
    version = 2;
    nextPass = passCompleted();
    await nextPass;
    supervisor.output.close("run-1");

    await session.stopAndWait(terminal());
    expect(ingested).toBe(entries.length * 2);
    expect(lastSnapshots.size).toBe(entries.length);
    expect([...lastSnapshots.values()].every((bytes) =>
      new TextDecoder().decode(bytes).startsWith("2:"))).toBeTrue();
  });

  test("never promotes stderr or PTY diagnostics into evidence", async () => {
    const base = await root();
    const hooks = join(base, "hooks");
    await mkdir(hooks);
    let ingested = 0;
    const supervisor = createNativeCaptureSupervisor({ pollIntervalMs: 5, settleMs: 10 });
    const session = await supervisor.capture.start(startInput(
      "run-1",
      { kind: "hook-only", hookDir: hooks },
      Object.freeze({
        ingest: () => {
          ingested += 1;
        },
        close: () => {},
        fail: () => {},
      }),
    ));
    const jsonLooking = new TextEncoder().encode('{"kind":"native-child-started","unit":"secret"}');

    supervisor.output.publish("run-1", Object.freeze({
      kind: "diagnostic",
      transport: "stdio-json",
      channel: "stderr",
      bytes: jsonLooking,
    }));
    supervisor.output.publish("run-1", Object.freeze({
      kind: "diagnostic",
      transport: "pty-interactive",
      channel: "pty",
      bytes: jsonLooking,
    }));
    supervisor.output.close("run-1");

    await session.stopAndWait(terminal());
    expect(ingested).toBe(0);
  });

  test("bounds stop and abort when a filesystem poll never resolves", async () => {
    const never = new Promise<never>(() => {});
    const filesystem: Partial<NativeCaptureFilesystem> = Object.freeze({
      lstat: async () => await never,
    });
    const stopSupervisor = createNativeCaptureSupervisor({
      filesystem,
      pollIntervalMs: 1,
      settleMs: 1,
      joinTimeoutMs: 30,
    });
    const stopSession = await stopSupervisor.capture.start(startInput("stop-run", {
      kind: "hook-only",
      hookDir: "/virtual/hung-stop",
    }));
    stopSupervisor.output.close("stop-run");
    const stopStartedAt = Date.now();

    await expect(stopSession.stopAndWait(terminal("stop-run"))).rejects.toThrow(
      "CAPTURE_JOIN_TIMEOUT",
    );
    expect(Date.now() - stopStartedAt).toBeLessThan(200);
    expect(stopSupervisor.activeObserverCount()).toBe(0);

    const abortSupervisor = createNativeCaptureSupervisor({
      filesystem,
      pollIntervalMs: 1,
      joinTimeoutMs: 30,
    });
    const abortSession = await abortSupervisor.capture.start(startInput("abort-run", {
      kind: "hook-only",
      hookDir: "/virtual/hung-abort",
    }));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
    const abortStartedAt = Date.now();

    await abortSession.abortAndWait("test abort");
    expect(Date.now() - abortStartedAt).toBeLessThan(200);
    expect(abortSupervisor.activeObserverCount()).toBe(0);
  });
});
