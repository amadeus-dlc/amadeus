import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  FIXED_TLC_RESERVATION_BYTES,
  DarwinSandboxExecProvider,
  FsTlcToolchain,
  NodePhysicalReservationPort,
  type FsTlcToolchainDependencies,
} from "../../scripts/formal-verif/fs-tlc-toolchain.ts";
import { createFrozenTlaModelReceipt, generateFrozenTlaModel } from "../../scripts/formal-verif/tla-arm.ts";
import type { PreparedTlcRun } from "../../scripts/formal-verif/tlc-toolchain.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR, MAX_TLC_STREAM_BYTES } from "../../scripts/formal-verif/tlc-toolchain.ts";

const artifactBytes = new TextEncoder().encode("fixed-tlc-1.7.4-runtime-artifact");
const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const frozenModel = generateFrozenTlaModel({ publicContractIdentity: sha256("fixed-public-contract") });
const modelReceipt = createFrozenTlaModelReceipt(frozenModel);
const moduleSource = frozenModel.moduleSource;
const cfgSource = frozenModel.cfgSource;

function errorCode(result: { readonly ok: boolean; readonly error?: unknown }): string | null {
  if (result.ok || result.error === null || typeof result.error !== "object" || !("code" in result.error)) return null;
  return typeof result.error.code === "string" ? result.error.code : null;
}

function envelope(code: number, severity: number, payload: string): string {
  return `@!@!@STARTMSG ${code}:${severity} @!@!@\n${payload}\n@!@!@ENDMSG ${code} @!@!@\n`;
}

function closedLifecycle(modulePath: string, standardModuleDirectory: string): string {
  return [
    envelope(2262, 0, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
    envelope(2187, 0, "Running breadth-first search Model-Checking with fp 92 and seed 5 with 1 worker."),
    envelope(2220, 0, "Starting SANY..."),
    [
      `Parsing file ${modulePath}`,
      ...["Naturals", "Sequences", "FiniteSets", "TLC"].map((name) => `Parsing file ${standardModuleDirectory}/${name}.tla`),
      ...["Naturals", "Sequences", "FiniteSets", "TLC", "FormalElection"].map((name) => `Semantic processing of module ${name}`),
      "",
    ].join("\n"),
    envelope(2219, 0, "SANY finished."),
    envelope(2185, 0, "Starting... (2026-07-21 09:26:25)"),
    envelope(2189, 0, "Computing initial states..."),
    envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-07-21 09:26:25."),
  ].join("");
}

function completeExplorationOutput(modulePath: string, standardModuleDirectory: string): string {
  return [
    closedLifecycle(modulePath, standardModuleDirectory),
    envelope(2200, 0, "Progress(1) at 2026-07-21 09:26:25: 1 states generated (60 s/min), 1 distinct states found (60 ds/min), 1 states left on queue."),
    envelope(2193, 0, [
      "Model checking completed. No error has been found.",
      "  Estimates of the probability that TLC did not check all reachable states",
      "  because two distinct states had the same fingerprint:",
      "  calculated (optimistic):  val = 1.1E-19",
      "  based on the actual fingerprints:  val = 2.4E-8",
    ].join("\n")),
    envelope(2200, 0, "Progress(1): 1 states generated, 1 distinct states found, 1 states left on queue."),
    envelope(2200, 0, "Progress(2): 3 states generated, 2 distinct states found, 0 states left on queue."),
    envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 2."),
    envelope(2186, 0, "Finished in 272ms at (2026-07-21 09:26:25)"),
  ].join("");
}

function namedCounterexampleOutput(modulePath: string, standardModuleDirectory: string): string {
  const state = (ordinal: number, label: string) => envelope(2217, 4, `${ordinal}: <${label}>\n${[
    "/\\ initialBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ amendBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ accepted = (V1 :> [choice |-> C1])",
    "/\\ holdMarkers = <<>>",
    "/\\ holdBudget = 1",
    "/\\ tally = [kind |-> \"NONE\"]",
    "/\\ reexamRequired = FALSE",
  ].join("\n")}`);
  return [
    closedLifecycle(modulePath, standardModuleDirectory),
    envelope(2110, 1, "Invariant InvalidTimestampRejected is violated."),
    envelope(2121, 1, "The behavior up to this point is:"),
    state(1, "Initial predicate"),
    state(2, "Next line 160, col 8 to line 161, col 66 of module FormalElection"),
    state(3, "Next line 170, col 8 to line 171, col 66 of module FormalElection"),
    envelope(2200, 0, "Progress(3): 3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2199, 0, "3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 3."),
    envelope(2186, 0, "Finished in 311ms at (2026-07-21 09:26:26)"),
  ].join("");
}

function typeOkCounterexample(modulePath: string): string {
  const state = (ordinal: number, label: string) => envelope(2217, 4, `${ordinal}: <${label}>\n${[
    "/\\ initialBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ amendBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ accepted = (V1 :> [choice |-> C1])",
    "/\\ holdMarkers = <<>>",
    "/\\ holdBudget = 1",
    "/\\ tally = [kind |-> \"NONE\"]",
    "/\\ reexamRequired = FALSE",
  ].join("\n")}`);
  return [
    envelope(2262, 0, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
    envelope(2187, 0, "Running breadth-first search Model-Checking with fp 92 and seed 5 with 1 worker."),
    envelope(2220, 0, "Starting SANY..."),
    `Parsing file ${modulePath}\nSemantic processing of module Model\n`,
    envelope(2219, 0, "SANY finished."),
    envelope(2185, 0, "Starting... (2026-07-21 09:26:25)"),
    envelope(2189, 0, "Computing initial states..."),
    envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-07-21 09:26:25."),
    envelope(2110, 1, "Invariant TypeOK is violated."),
    envelope(2121, 1, "The behavior up to this point is:"),
    state(1, "Initial predicate"),
    state(2, "Next line 160, col 8 to line 161, col 66 of module FormalElection"),
    state(3, "Next line 170, col 8 to line 171, col 66 of module FormalElection"),
    envelope(2200, 0, "Progress(3): 3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2199, 0, "3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 3."),
    envelope(2186, 0, "Finished in 311ms at (2026-07-21 09:26:26)"),
  ].join("");
}

const dependencies = (spawn: (input?: unknown) => unknown, overrides: Record<string, unknown> = {}): FsTlcToolchainDependencies => {
  const reservations = new Set<string>();
  return ({
  network: {
    request: async (input) => ({
      status: 200,
      headers: { "content-length": String(artifactBytes.byteLength) },
      connectedAtMs: input.startedAtMs,
      headersAtMs: input.startedAtMs,
      body: (async function* () { yield artifactBytes; })(),
    }),
  },
  digest: {
    createStreamingDigest: () => ({ update: () => {}, digest: () => FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256 }),
    digest: (path) => {
      const bytes = new Uint8Array(readFileSync(path));
      return {
        sha256: bytes.byteLength === artifactBytes.byteLength && bytes.every((byte, index) => byte === artifactBytes[index])
          ? FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
          : sha256(bytes),
        byteLength: bytes.byteLength,
      };
    },
  },
  reservation: {
    availableBytes: () => FIXED_TLC_RESERVATION_BYTES,
    reserve: (path) => { reservations.add(path); },
    release: (path) => { reservations.delete(path); },
    isReserved: (path) => reservations.has(path),
  },
  clock: { nowMs: () => 0, utcNow: () => "2026-07-21T00:00:00Z" },
  owner: { host: "test-host", pid: 42, processStartedAt: "test-process-start" },
  liveness: () => "dead",
  randomUuid: () => "00000000-0000-4000-8000-000000000001",
  jdkVersion: "OpenJDK 26.0.1",
  process: { spawn },
  javaVersion: { inspect: async ({ javaExecutablePath }) => ({ executableRealpath: realpathSync(javaExecutablePath), output: "openjdk version \"26.0.1\"\nOpenJDK Runtime Environment\n" }) },
  evidencePublishReserveMs: 10,
  ...overrides,
  } as FsTlcToolchainDependencies);
};

function makeMiniJdk(root: string): void {
  for (const directory of ["bin", "lib", "conf/security", "Contents"]) mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, "bin/java"), "mini-java");
  chmodSync(join(root, "bin/java"), 0o755);
  writeFileSync(join(root, "lib/modules"), "mini-modules");
  writeFileSync(join(root, "lib/libjli.dylib"), "mini-native");
  writeFileSync(join(root, "conf/security/java.security"), "mini-conf");
  symlinkSync(root, join(root, "Contents/Home"));
}

function makeRemovable(path: string): void {
  if (!existsSync(path) || lstatSync(path).isSymbolicLink()) return;
  if (lstatSync(path).isDirectory()) {
    chmodSync(path, 0o755);
    for (const name of readdirSync(path)) makeRemovable(join(path, name));
  }
}

function resizeFile(path: string, bytes: number): void {
  const fd = openSync(path, "w");
  try { ftruncateSync(fd, bytes); } finally { closeSync(fd); }
}

describe("formal verification TLC runtime", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => {
    makeRemovable(root);
    rmSync(root, { recursive: true, force: true });
  }));

  const acquireRuntime = async (spawn: (input?: unknown) => unknown, overrides: Record<string, unknown> = {}) => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-runtime-"));
    roots.push(root);
    const distributionRoot = join(root, "jdk-distribution");
    const snapshotRoot = join(root, "jdk-snapshot");
    const workspaceRoot = join(root, "workspace");
    makeMiniJdk(distributionRoot);
    mkdirSync(workspaceRoot);
    writeFileSync(join(workspaceRoot, "FormalElection.tla"), moduleSource);
    writeFileSync(join(workspaceRoot, "FormalElection.cfg"), cfgSource);
    const toolchain = new FsTlcToolchain(root, dependencies(spawn, {
      workspaceRoot,
      jdkDistributionRoot: distributionRoot,
      jdkSnapshotRoot: snapshotRoot,
      sandboxProvider: {
        available: () => true,
        probe: async (kind: string) => ({ kind, denied: true, exitCode: 1, signal: null, evidenceIdentity: sha256(kind) }),
      },
      ...overrides,
    }));
    const acquired = await toolchain.acquire();
    if (!acquired.ok) throw new Error(JSON.stringify(acquired.error));
    return { toolchain, distributionRoot, snapshotRoot, workspaceRoot, prepareInput: {
      artifact: acquired.value,
      modelReceipt,
      modulePath: join(workspaceRoot, "FormalElection.tla"),
      cfgPath: join(workspaceRoot, "FormalElection.cfg"),
      subjectAlias: "opaque-subject",
      deadlineMs: 180_000,
    } };
  };

  const prepareRuntime = async (spawn: (input?: unknown) => unknown, overrides: Record<string, unknown> = {}) => {
    const acquired = await acquireRuntime(spawn, overrides);
    const prepared = await acquired.toolchain.prepare(acquired.prepareInput);
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.error));
    return { ...acquired, prepared: prepared.value };
  };

  test("rejects a structurally forged prepared run before a process can spawn", async () => {
    let spawns = 0;
    const toolchain = new FsTlcToolchain("/unused", dependencies(() => {
      spawns++;
      throw new Error("synthetic capability reached spawn");
    }));

    const result = await toolchain.run(Object.freeze({}) as PreparedTlcRun);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("InvocationError");
    expect(spawns).toBe(0);
  });

  test("requires an explicit canonical JAVA_HOME before the real toolchain probe touches its evidence root", () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-probe-input-"));
    roots.push(root);
    const evidenceRoot = join(root, "not-a-directory");
    writeFileSync(evidenceRoot, "probe must reject configuration first");
    const environment = { ...process.env };
    delete environment.JAVA_HOME;

    const result = Bun.spawnSync({
      cmd: [process.execPath, join(process.cwd(), "tests/formal-verif/support/tla-real-toolchain-probe.ts"), evidenceRoot],
      cwd: process.cwd(),
      env: environment,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    expect(new TextDecoder().decode(result.stderr)).toContain("JAVA_HOME is required and must point to OpenJDK 26.0.1");
  });

  test("does not accept an st_size-only sparse backing file as a physical reservation", () => {
    const root = mkdtempSync(join(tmpdir(), "fv-tlc-sparse-"));
    roots.push(root);
    const backing = join(root, "backing");
    const fd = openSync(backing, "wx", 0o600);
    try { ftruncateSync(fd, FIXED_TLC_RESERVATION_BYTES); } finally { closeSync(fd); }

    expect(new NodePhysicalReservationPort().isReserved(backing)).toBe(false);
  });

  test("rejects a structurally genuine-looking artifact copied by a direct-import caller", async () => {
    let spawns = 0;
    const acquired = await acquireRuntime(() => { spawns++; throw new Error("forged artifact reached spawn"); });
    const result = await acquired.toolchain.prepare({
      ...acquired.prepareInput,
      artifact: Object.freeze({ ...acquired.prepareInput.artifact }),
    });

    expect(result.ok).toBe(false);
    expect(errorCode(result)).toBe("ARTIFACT_CAPABILITY");
    expect(spawns).toBe(0);
  });

  test("prepare snapshots and seals every miniature JDK file and canonicalizes an internal absolute symlink", async () => {
    const { prepared, snapshotRoot } = await prepareRuntime(() => { throw new Error("unexpected spawn"); });
    expect(prepared.jdk.manifest.entries.map(({ path }) => path)).toEqual([
      "Contents/Home",
      "bin/java",
      "conf/security/java.security",
      "lib/libjli.dylib",
      "lib/modules",
    ]);
    expect(prepared.jdk.manifest.entries[0]?.target).toBe(".");
    expect(readlinkSync(join(snapshotRoot, "Contents/Home"))).toBe("..");
    expect(lstatSync(join(snapshotRoot, "bin/java")).mode & 0o222).toBe(0);
  });

  test("rejects a JDK symlink that resolves outside the distribution before spawn", async () => {
    let spawns = 0;
    const acquired = await acquireRuntime(() => { spawns++; throw new Error("escape reached spawn"); });
    const external = join(dirname(acquired.distributionRoot), "external-jdk-file");
    writeFileSync(external, "external");
    symlinkSync(external, join(acquired.distributionRoot, "lib/escape"));

    const result = await acquired.toolchain.prepare(acquired.prepareInput);

    expect(result.ok).toBe(false);
    expect(errorCode(result)).toBe("JDK_ESCAPE");
    expect(spawns).toBe(0);
  });

  test("fails closed when sandbox probes are unavailable and never spawns TLC", async () => {
    let spawns = 0;
    const acquired = await acquireRuntime(() => { spawns++; throw new Error("unprobed run reached spawn"); }, {
      sandboxProvider: { available: () => false, probe: async () => { throw new Error("must not probe"); } },
    });

    const result = await acquired.toolchain.prepare(acquired.prepareInput);

    expect(result.ok).toBe(false);
    expect(errorCode(result)).toBe("SANDBOX_UNAVAILABLE");
    expect(spawns).toBe(0);
  });

  test("freshly re-probes sandbox enforcement and rejects observation drift before spawn", async () => {
    let probes = 0;
    let spawns = 0;
    const sandboxProvider = {
      available: () => true,
      probe: async (kind: string) => {
        probes++;
        return { kind, denied: true, exitCode: 1, signal: null, evidenceIdentity: sha256(`${kind}:${probes <= 3 ? "prepared" : "drifted"}`) };
      },
    };
    const runtime = await prepareRuntime(() => { spawns++; throw new Error("sandbox drift reached spawn"); }, { sandboxProvider });

    const result = await runtime.toolchain.run(runtime.prepared);

    expect(errorCode(result)).toBe("SANDBOX_DRIFT");
    expect(probes).toBe(6);
    expect(spawns).toBe(0);
  });

  test("rejects a wrong Java vendor or version before sandbox probing", async () => {
    let probes = 0;
    const acquired = await acquireRuntime(() => { throw new Error("wrong Java reached spawn"); }, {
      javaVersion: { inspect: async ({ javaExecutablePath }: { javaExecutablePath: string }) => ({ executableRealpath: realpathSync(javaExecutablePath), output: "java version \"25\"\nVendor Runtime\n" }) },
      sandboxProvider: { available: () => true, probe: async () => { probes++; throw new Error("wrong Java reached probe"); } },
    });

    const result = await acquired.toolchain.prepare(acquired.prepareInput);

    expect(errorCode(result)).toBe("JDK_VERSION");
    expect(probes).toBe(0);
  });

  test("rejects an oversized module by metadata before reading or sandbox probing", async () => {
    let probes = 0;
    const acquired = await acquireRuntime(() => { throw new Error("drift reached spawn"); }, {
      sandboxProvider: {
        available: () => true,
        probe: async () => { probes++; throw new Error("source drift reached probe"); },
      },
    });
    resizeFile(join(acquired.workspaceRoot, "FormalElection.tla"), 2 * 1024 * 1024);

    const result = await acquired.toolchain.prepare(acquired.prepareInput);

    expect(result.ok).toBe(false);
    expect(errorCode(result)).toBe("SOURCE_IDENTITY");
    expect(probes).toBe(0);
  });

  test("rejects an arbitrary model identity even when canonical source bytes are correct", async () => {
    let probes = 0;
    let spawns = 0;
    const acquired = await acquireRuntime(() => { spawns++; throw new Error("unbound model reached spawn"); }, {
      sandboxProvider: {
        available: () => true,
        probe: async () => { probes++; throw new Error("unbound model reached sandbox probe"); },
      },
    });

    const result = await acquired.toolchain.prepare({
      ...acquired.prepareInput,
      modelReceipt: { ...acquired.prepareInput.modelReceipt, modelIdentity: sha256("arbitrary-unbound-model") },
    });

    expect(errorCode(result)).toBe("MODEL_RECEIPT");
    expect(probes).toBe(0);
    expect(spawns).toBe(0);
  });

  test("rehashes the complete JDK snapshot and refuses a replacement before spawn", async () => {
    let spawns = 0;
    const { toolchain, prepared, snapshotRoot } = await prepareRuntime(() => {
      spawns++;
      throw new Error("replacement reached spawn");
    });
    chmodSync(snapshotRoot, 0o755);
    chmodSync(join(snapshotRoot, "lib"), 0o755);
    chmodSync(join(snapshotRoot, "lib/modules"), 0o644);
    writeFileSync(join(snapshotRoot, "lib/modules"), "replacement");

    const result = await toolchain.run(prepared);

    expect(result.ok).toBe(false);
    expect(errorCode(result)).toBe("JDK_DRIFT");
    expect(spawns).toBe(0);
  });

  test("rejects a same-byte workspace path swap to an external symlink before spawn", async () => {
    let spawns = 0;
    const runtime = await prepareRuntime(() => { spawns++; throw new Error("path escape reached spawn"); });
    const external = join(dirname(runtime.workspaceRoot), "outside-model.tla");
    writeFileSync(external, moduleSource);
    unlinkSync(join(runtime.workspaceRoot, "FormalElection.tla"));
    symlinkSync(external, join(runtime.workspaceRoot, "FormalElection.tla"));

    const result = await runtime.toolchain.run(runtime.prepared);

    expect(errorCode(result)).toBe("WORKSPACE_PATH");
    expect(spawns).toBe(0);
  });

  test("rejects an oversized source replacement before fresh sandbox probes or spawn", async () => {
    let probes = 0;
    let spawns = 0;
    const runtime = await prepareRuntime(() => { spawns++; throw new Error("oversized source reached spawn"); }, {
      sandboxProvider: {
        available: () => true,
        probe: async (kind: string) => { probes++; return { kind, denied: true, exitCode: 1, signal: null, evidenceIdentity: sha256(kind) }; },
      },
    });
    expect(probes).toBe(3);
    resizeFile(join(runtime.workspaceRoot, "FormalElection.tla"), 2 * 1024 * 1024);

    const result = await runtime.toolchain.run(runtime.prepared);

    expect(errorCode(result)).toBe("SOURCE_DRIFT");
    expect(probes).toBe(3);
    expect(spawns).toBe(0);
  });

  test("rejects a workspace standard-module shadow before fresh sandbox probes or spawn", async () => {
    let probes = 0;
    let spawns = 0;
    const runtime = await prepareRuntime(() => { spawns++; throw new Error("standard-module shadow reached spawn"); }, {
      sandboxProvider: {
        available: () => true,
        probe: async (kind: string) => { probes++; return { kind, denied: true, exitCode: 1, signal: null, evidenceIdentity: sha256(kind) }; },
      },
    });
    expect(probes).toBe(3);
    writeFileSync(join(runtime.workspaceRoot, "Naturals.tla"), "---- MODULE Naturals ----\n====\n");

    const result = await runtime.toolchain.run(runtime.prepared);

    expect(errorCode(result)).toBe("STDLIB_ORIGIN");
    expect(probes).toBe(3);
    expect(spawns).toBe(0);
  });

  test("spawns one sandboxed process with array argv, a closed environment, and raw output preservation", async () => {
    const requests: Record<string, unknown>[] = [];
    const { toolchain, prepared, workspaceRoot } = await prepareRuntime((request) => {
      requests.push(request as Record<string, unknown>);
      return {
        stdout: (async function* () { yield new TextEncoder().encode("raw stdout\n"); })(),
        stderr: (async function* () { yield new TextEncoder().encode("raw stderr\n"); })(),
        wait: async () => ({ exitCode: 12, signal: null }),
        signalGroup: async () => {},
      };
    });

    const result = await toolchain.run(prepared);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(requests).toHaveLength(1);
    expect((requests[0]!.argv as string[]).slice(0, 3)).toEqual([
      "/usr/bin/sandbox-exec",
      "-p",
      "(version 1)(deny default)(allow process*)(allow file*)(allow system*)(allow mach*)(allow ipc*)(allow sysctl*)(deny network*)(allow network-inbound (local tcp \"localhost:*\"))",
    ]);
    expect(requests[0]!.argv as string[]).toContain(`-Djava.io.tmpdir=${realpathSync(workspaceRoot)}/.tlc-stdlib`);
    expect(requests[0]?.shell).toBe(false);
    expect(requests[0]?.processGroup).toBe(true);
    expect(Object.keys(requests[0]?.environment as object).sort()).toEqual(["JAVA_HOME", "LANG", "LC_ALL", "TZ"]);
    expect(result.value.exitCode).toBe(12);
    expect(result.value.stdoutIdentity).toBe(sha256("raw stdout\n"));
    expect(result.value.stderrIdentity).toBe(sha256("raw stderr\n"));
  });

  test("uses an absolute deadline and escalates the process group from TERM to KILL", async () => {
    const signals: string[] = [];
    let resolveStatus!: (status: { exitCode: null; signal: string }) => void;
    const status = new Promise<{ exitCode: null; signal: string }>((resolve) => { resolveStatus = resolve; });
    const { toolchain, prepared } = await prepareRuntime(() => ({
      stdout: (async function* () {})(),
      stderr: (async function* () {})(),
      wait: () => status,
      signalGroup: async (signal: string) => {
        signals.push(signal);
        if (signal === "SIGKILL") resolveStatus({ exitCode: null, signal });
      },
    }), { timer: { wait: async () => {} }, suiteRemainingMs: () => 50 });

    const result = await toolchain.run(prepared);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.timedOut).toBe(true);
    expect(result.value.signal).toBe("SIGKILL");
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
  });

  test("charges revalidation to the suite budget at publish-reserve minus one, exact, and plus one", async () => {
    for (const afterRevalidation of [9, 10, 11]) {
      const remaining = [20, 20, 20, 20, afterRevalidation];
      const waits: number[] = [];
      let spawns = 0;
      const runtime = await prepareRuntime(() => {
        spawns++;
        return { stdout: (async function* () {})(), stderr: (async function* () {})(), wait: async () => ({ exitCode: 0, signal: null }), signalGroup: async () => {} };
      }, { suiteRemainingMs: () => remaining.shift()!, timer: { wait: async (milliseconds: number) => { waits.push(milliseconds); } } });

      const result = await runtime.toolchain.run(runtime.prepared);

      expect(result.ok).toBe(afterRevalidation === 11);
      expect(spawns).toBe(afterRevalidation === 11 ? 1 : 0);
      if (afterRevalidation === 11) expect(waits[0]).toBe(1);
      else expect(errorCode(result)).toBe("DEADLINE");
    }
  });

  test("preserves the full 180 second process budget when the suite separately covers publication", async () => {
    const waits: number[] = [];
    const runtime = await prepareRuntime(() => ({
      stdout: (async function* () {})(), stderr: (async function* () {})(),
      wait: async () => ({ exitCode: 0, signal: null }), signalGroup: async () => {},
    }), {
      evidencePublishReserveMs: 5_000,
      suiteRemainingMs: () => 185_000,
      timer: { wait: async (milliseconds: number) => { waits.push(milliseconds); } },
    });

    expect((await runtime.toolchain.run(runtime.prepared)).ok).toBe(true);
    expect(waits[0]).toBe(180_000);
  });

  test("rechecks the shared suite budget before every fresh sandbox probe", async () => {
    const remaining = [20, 16, 15, 10];
    let probes = 0;
    let spawns = 0;
    const runtime = await prepareRuntime(() => { spawns++; throw new Error("publish reserve reached spawn"); }, {
      suiteRemainingMs: () => remaining.shift()!,
      sandboxProvider: {
        available: () => true,
        probe: async (kind: string) => { probes++; return { kind, denied: true, exitCode: 1, signal: null, evidenceIdentity: sha256(kind) }; },
      },
    });

    const result = await runtime.toolchain.run(runtime.prepared);

    expect(errorCode(result)).toBe("DEADLINE");
    expect(probes).toBe(5);
    expect(spawns).toBe(0);
  });

  test("preserves a natural process signal as raw outcome without normalizing it into invocation failure", async () => {
    const { toolchain, prepared } = await prepareRuntime(() => ({
      stdout: (async function* () {})(), stderr: (async function* () {})(),
      wait: async () => ({ exitCode: null, signal: "SIGSEGV" }), signalGroup: async () => {},
    }));

    const result = await toolchain.run(prepared);

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toMatchObject({ exitCode: null, signal: "SIGSEGV", timedOut: false, outputLimitExceeded: false });
  });

  test.each(["stdout", "stderr"] as const)("caps the %s stream at 16 MiB and terminates the whole process group", async (limited) => {
    const signals: string[] = [];
    let resolveStatus!: (status: { exitCode: null; signal: string }) => void;
    const status = new Promise<{ exitCode: null; signal: string }>((resolve) => { resolveStatus = resolve; });
    const { toolchain, prepared } = await prepareRuntime(() => ({
      stdout: limited === "stdout" ? (async function* () { yield new Uint8Array(MAX_TLC_STREAM_BYTES + 1); })() : (async function* () {})(),
      stderr: limited === "stderr" ? (async function* () { yield new Uint8Array(MAX_TLC_STREAM_BYTES + 1); })() : (async function* () {})(),
      wait: () => status,
      signalGroup: async (signal: string) => {
        signals.push(signal);
        resolveStatus({ exitCode: null, signal });
      },
    }));

    const result = await toolchain.run(prepared);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.outputLimitExceeded).toBe(true);
    expect(result.value[limited === "stdout" ? "stdoutChunks" : "stderrChunks"].reduce((total, chunk) => total + chunk.byteLength, 0)).toBe(MAX_TLC_STREAM_BYTES);
    expect(signals).toEqual(["SIGTERM"]);
  });

  test("attempts KILL even when signalling TERM itself fails", async () => {
    const signals: string[] = [];
    let resolveStatus!: (status: { exitCode: null; signal: string }) => void;
    const status = new Promise<{ exitCode: null; signal: string }>((resolve) => { resolveStatus = resolve; });
    const { toolchain, prepared } = await prepareRuntime(() => ({
      stdout: (async function* () {})(), stderr: (async function* () {})(), wait: () => status,
      signalGroup: async (signal: string) => {
        signals.push(signal);
        if (signal === "SIGTERM") throw new Error("TERM transport failed");
        resolveStatus({ exitCode: null, signal });
      },
    }), { timer: { wait: async () => {} } });

    const result = await toolchain.run(prepared);

    expect(result.ok).toBe(true);
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
  });

  test("races non-byte stream rejection and cleans up the process group", async () => {
    const signals: string[] = [];
    let resolveStatus!: (status: { exitCode: null; signal: string }) => void;
    const status = new Promise<{ exitCode: null; signal: string }>((resolve) => { resolveStatus = resolve; });
    const { toolchain, prepared } = await prepareRuntime(() => ({
      stdout: (async function* () { yield "not bytes" as never; })(), stderr: (async function* () {})(), wait: () => status,
      signalGroup: async (signal: string) => { signals.push(signal); resolveStatus({ exitCode: null, signal }); },
    }));

    const result = await toolchain.run(prepared);

    expect(result.ok).toBe(false);
    expect(errorCode(result)).toBe("OUTPUT");
    expect(signals).toEqual(["SIGTERM"]);
  });

  test("fails closed and escalates when stdio remains open after process exit", async () => {
    const signals: string[] = [];
    const neverEnding = {
      [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<Uint8Array>>(() => {}) }),
    };
    const runtime = await prepareRuntime(() => ({
      stdout: neverEnding,
      stderr: (async function* () {})(),
      wait: async () => ({ exitCode: 0, signal: null }),
      signalGroup: async (signal: string) => { signals.push(signal); },
    }), { timer: { wait: async () => {} } });

    const result = await runtime.toolchain.run(runtime.prepared);

    expect(errorCode(result)).toBe("PROCESS_CLEANUP");
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
  });

  test("the concrete Darwin provider launches all three probes through sandbox-exec array argv", async () => {
    const requests: Record<string, unknown>[] = [];
    const provider = new DarwinSandboxExecProvider({
      spawn: (request) => {
        requests.push(request as unknown as Record<string, unknown>);
        return {
          stdout: (async function* () {})(),
          stderr: (async function* () { yield new TextEncoder().encode("SANDBOX_DENIED\n"); })(),
          wait: async () => ({ exitCode: 77, signal: null }),
          signalGroup: async () => {},
        };
      },
    }, process.execPath);

    const observations = await Promise.all((["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"] as const).map((kind) => provider.probe(kind, {
      executable: "/usr/bin/sandbox-exec", profile: "fixed-profile", deadlineMs: 1_000,
    })));

    expect(observations.every(({ denied }) => denied)).toBe(true);
    expect(requests).toHaveLength(3);
    expect(requests.every(({ argv }) => (argv as string[])[0] === "/usr/bin/sandbox-exec" && (argv as string[])[1] === "-p")).toBe(true);
    const tcpModuleSpecifier = ["node", "net"].join(":");
    const tcpScript = requests.map(({ argv }) => (argv as string[]).at(-1) ?? "").find((script) => script.includes(tcpModuleSpecifier));
    expect(tcpScript).toMatch(/\.connect\([1-9][0-9]*,'127\.0\.0\.1'\)/);
    expect(tcpScript).not.toContain(".connect(9,'127.0.0.1')");
    expect(tcpScript).toContain("ECONNREFUSED");
  });

  test("the concrete sandbox provider is unavailable off Darwin", () => {
    const provider = new DarwinSandboxExecProvider({ spawn: () => { throw new Error("unavailable provider spawned"); } }, process.execPath, undefined, "linux");

    expect(provider.available()).toBe(false);
  });

  test("the concrete Darwin provider fails closed and escalates a hung probe", async () => {
    const signals: string[] = [];
    let resolveStatus!: (status: { exitCode: null; signal: string }) => void;
    const status = new Promise<{ exitCode: null; signal: string }>((resolve) => { resolveStatus = resolve; });
    const provider = new DarwinSandboxExecProvider({
      spawn: () => ({
        stdout: (async function* () {})(), stderr: (async function* () {})(), wait: () => status,
        signalGroup: async (signal) => { signals.push(signal); if (signal === "SIGKILL") resolveStatus({ exitCode: null, signal }); },
      }),
    }, process.execPath, { wait: async () => {} });

    await expect(provider.probe("DNS", { executable: "/usr/bin/sandbox-exec", profile: "fixed-profile", deadlineMs: 1 })).rejects.toThrow("absolute deadline");
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
  });

  test("the concrete Darwin provider bounds output pipes that remain open after exit", async () => {
    const signals: string[] = [];
    const pending = { [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<Uint8Array>>(() => {}) }) };
    const provider = new DarwinSandboxExecProvider({
      spawn: () => ({
        stdout: pending,
        stderr: (async function* () { yield new TextEncoder().encode("SANDBOX_DENIED\n"); })(),
        wait: async () => ({ exitCode: 77, signal: null }),
        signalGroup: async (signal) => { signals.push(signal); },
      }),
    }, process.execPath, { wait: async () => {} });

    await expect(provider.probe("DNS", { executable: "/usr/bin/sandbox-exec", profile: "fixed-profile", deadlineMs: 1_000 })).rejects.toThrow("output streams survived");
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);
  });

  test("normalization never treats a non-contract TypeOK operator as a named invariant", async () => {
    let preparedPath = "";
    const { toolchain, prepared } = await prepareRuntime(() => ({
      stdout: (async function* () { yield new TextEncoder().encode(typeOkCounterexample(preparedPath)); })(),
      stderr: (async function* () {})(),
      wait: async () => ({ exitCode: 12, signal: null }),
      signalGroup: async () => {},
    }));
    preparedPath = prepared.manifest.modulePath;
    const outcome = await toolchain.run(prepared);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));

    const normalized = toolchain.normalize({
      prepared,
      outcome: outcome.value,
      binding: { fixtureId: "OPAQUE_SUBJECT", baselineSha: "b".repeat(64), armSha: "a".repeat(64), startedAt: "2026-07-21T00:00:00Z", finishedAt: "2026-07-21T00:00:01Z", evidencePaths: [] },
    });

    expect(normalized.ok).toBe(true);
    expect(normalized.ok && normalized.value.verdict).toBe("HARNESS_ERROR");
  });

  test("normalizes only issued complete and counterexample outcomes into verdict cells", async () => {
    let completePath = "";
    let completeStandardDirectory = "";
    const complete = await prepareRuntime(() => ({
      stdout: (async function* () { yield new TextEncoder().encode(completeExplorationOutput(completePath, completeStandardDirectory)); })(),
      stderr: (async function* () {})(),
      wait: async () => ({ exitCode: 0, signal: null }),
      signalGroup: async () => {},
    }));
    completePath = complete.prepared.manifest.modulePath;
    completeStandardDirectory = join(complete.prepared.manifest.cwd, ".tlc-stdlib");
    const completeOutcome = await complete.toolchain.run(complete.prepared);
    if (!completeOutcome.ok) throw new Error(JSON.stringify(completeOutcome.error));
    const binding = { fixtureId: "OPAQUE_SUBJECT", baselineSha: "b".repeat(64), armSha: "a".repeat(64), startedAt: "2026-07-21T00:00:00Z", finishedAt: "2026-07-21T00:00:01Z", evidencePaths: [] };
    const completeCell = complete.toolchain.normalize({ prepared: complete.prepared, outcome: completeOutcome.value, binding });

    let counterexamplePath = "";
    let counterexampleStandardDirectory = "";
    const counterexample = await prepareRuntime(() => ({
      stdout: (async function* () { yield new TextEncoder().encode(namedCounterexampleOutput(counterexamplePath, counterexampleStandardDirectory)); })(),
      stderr: (async function* () {})(),
      wait: async () => ({ exitCode: 12, signal: null }),
      signalGroup: async () => {},
    }));
    counterexamplePath = counterexample.prepared.manifest.modulePath;
    counterexampleStandardDirectory = join(counterexample.prepared.manifest.cwd, ".tlc-stdlib");
    const counterexampleOutcome = await counterexample.toolchain.run(counterexample.prepared);
    if (!counterexampleOutcome.ok) throw new Error(JSON.stringify(counterexampleOutcome.error));
    const counterexampleCell = counterexample.toolchain.normalize({ prepared: counterexample.prepared, outcome: counterexampleOutcome.value, binding });
    const invalidCell = complete.toolchain.normalize({ prepared: complete.prepared, outcome: completeOutcome.value, binding: { ...binding, baselineSha: "invalid" } });

    expect(completeCell).toMatchObject({ ok: true, value: { verdict: "NOT_DETECTED", exitCode: 0, counterexampleId: null } });
    expect(counterexampleCell).toMatchObject({ ok: true, value: { verdict: "DETECTED", exitCode: 12 } });
    expect(counterexampleCell.ok && counterexampleCell.value.counterexampleId).toMatch(/^[0-9a-f]{64}$/);
    expect(errorCode(invalidCell)).toBe("CELL_RESULT");
  });

  test("rejects an outcome cross-paired with a different prepared run from the same instance", async () => {
    const runtime = await prepareRuntime(() => ({
      stdout: (async function* () {})(), stderr: (async function* () {})(),
      wait: async () => ({ exitCode: 0, signal: null }), signalGroup: async () => {},
    }));
    const second = await runtime.toolchain.prepare(runtime.prepareInput);
    if (!second.ok) throw new Error(JSON.stringify(second.error));
    const outcome = await runtime.toolchain.run(runtime.prepared);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));

    const result = runtime.toolchain.normalize({
      prepared: second.value,
      outcome: outcome.value,
      binding: { fixtureId: "OPAQUE_SUBJECT", baselineSha: "b".repeat(64), armSha: "a".repeat(64), startedAt: "2026-07-21T00:00:00Z", finishedAt: "2026-07-21T00:00:01Z", evidencePaths: [] },
    });

    expect(errorCode(result)).toBe("CAPABILITY");
  });

  test("rejects an oversized module replacement before normalization parsing", async () => {
    const runtime = await prepareRuntime(() => ({
      stdout: (async function* () {})(), stderr: (async function* () {})(),
      wait: async () => ({ exitCode: 0, signal: null }), signalGroup: async () => {},
    }));
    const outcome = await runtime.toolchain.run(runtime.prepared);
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    resizeFile(join(runtime.workspaceRoot, "FormalElection.tla"), 2 * 1024 * 1024);

    const result = runtime.toolchain.normalize({
      prepared: runtime.prepared,
      outcome: outcome.value,
      binding: { fixtureId: "OPAQUE_SUBJECT", baselineSha: "b".repeat(64), armSha: "a".repeat(64), startedAt: "2026-07-21T00:00:00Z", finishedAt: "2026-07-21T00:00:01Z", evidencePaths: [] },
    });

    expect(errorCode(result)).toBe("SOURCE_DRIFT");
  });
});
