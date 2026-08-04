// Authenticated process-group guardian for one Pi RPC child.

import { generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

interface GuardianArgs {
  readonly piExecutable: string;
  readonly piArgv0: string;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly runId: string;
  readonly driverPublicKey: string;
  readonly snapshotDigest: string;
  readonly stdoutLimitBytes: number;
  readonly stderrLimitBytes: number;
}

type DriverControl =
  | {
      readonly kind: "go";
      readonly runId: string;
      readonly nonce: string;
      readonly seq: number;
      readonly correlationId: string;
      readonly prompt: string;
    }
  | {
      readonly kind: "terminate";
      readonly runId: string;
      readonly nonce: string;
      readonly seq: number;
      readonly reason: "cancelled" | "timed-out" | "driver-refused";
    };

interface SignedControl {
  readonly payload: DriverControl;
  readonly signature: string;
}

interface GuardianEnvelope {
  readonly payload: Record<string, unknown>;
  readonly signature: string;
}

const CONTROL_LINE_CAP = 4 * 1024 * 1024 + 4096;
const RPC_LINE_CAP = 1024 * 1024;
const TERM_GRACE_MS = 250;
const KILL_GRACE_MS = 750;

function parseArgs(argv: readonly string[]): GuardianArgs {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === undefined || value === undefined || !key.startsWith("--")) throw new Error("guardian-args-invalid");
    values.set(key, value);
  }
  const piExecutable = values.get("--pi-executable");
  const piArgv0 = values.get("--pi-argv0");
  const runId = values.get("--run-id");
  const driverPublicKey = values.get("--driver-public-key");
  const snapshotDigest = values.get("--snapshot-digest");
  const stdoutLimitBytes = Number(values.get("--stdout-limit-bytes"));
  const stderrLimitBytes = Number(values.get("--stderr-limit-bytes"));
  const providerId = values.get("--provider-id");
  const modelId = values.get("--model-id");
  if (
    !piExecutable ||
    !piArgv0 ||
    !runId ||
    !driverPublicKey ||
    !snapshotDigest ||
    !Number.isSafeInteger(stdoutLimitBytes) ||
    stdoutLimitBytes < 1 ||
    !Number.isSafeInteger(stderrLimitBytes) ||
    stderrLimitBytes < 1 ||
    (providerId !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(providerId)) ||
    (modelId !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(modelId))
  ) {
    throw new Error("guardian-args-invalid");
  }
  return {
    piExecutable,
    piArgv0,
    ...(providerId === undefined ? {} : { providerId }),
    ...(modelId === undefined ? {} : { modelId }),
    runId,
    driverPublicKey,
    snapshotDigest,
    stdoutLimitBytes,
    stderrLimitBytes,
  };
}

function bytes(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value && typeof value.code === "string";
}

function parseSignedControl(line: string): SignedControl | null {
  try {
    const value: unknown = JSON.parse(line);
    if (!isRecord(value) || !isRecord(value.payload) || typeof value.signature !== "string") return null;
    const payload = value.payload;
    if (
      (payload.kind !== "go" && payload.kind !== "terminate")
      || typeof payload.runId !== "string"
      || typeof payload.nonce !== "string"
      || typeof payload.seq !== "number"
      || !Number.isSafeInteger(payload.seq)
    ) return null;
    if (payload.kind === "go") {
      if (typeof payload.correlationId !== "string" || typeof payload.prompt !== "string") return null;
      return {
        payload: {
          kind: "go",
          runId: payload.runId,
          nonce: payload.nonce,
          seq: payload.seq,
          correlationId: payload.correlationId,
          prompt: payload.prompt,
        },
        signature: value.signature,
      };
    }
    if (payload.reason !== "cancelled" && payload.reason !== "timed-out" && payload.reason !== "driver-refused") {
      return null;
    }
    return {
      payload: {
        kind: "terminate",
        runId: payload.runId,
        nonce: payload.nonce,
        seq: payload.seq,
        reason: payload.reason,
      },
      signature: value.signature,
    };
  } catch {
    return null;
  }
}

type SignalResult = "sent" | "absent" | "failed";

function signalProcessGroup(signalName: NodeJS.Signals): SignalResult {
  try {
    process.kill(-process.pid, signalName);
    return "sent";
  } catch (error) {
    return isErrnoException(error) && error.code === "ESRCH" ? "absent" : "failed";
  }
}

function writeAbort(child: ChildProcessWithoutNullStreams | null): boolean {
  try {
    child?.stdin.write(`${JSON.stringify({ type: "abort" })}\n`);
    return true;
  } catch {
    return false;
  }
}

function run(args: GuardianArgs): void {
  const guardianKeys = generateKeyPairSync("ed25519");
  const guardianPublicKey = guardianKeys.publicKey.export({ type: "spki", format: "pem" }).toString();
  const driverPublicKey = Buffer.from(args.driverPublicKey, "base64").toString("utf8");
  const nonce = randomUUID();
  let envelopeSeq = 0;
  let controlSeq = 0;
  let child: ChildProcessWithoutNullStreams | null = null;
  let terminating = false;
  let stdoutBytes = 0;
  let stderrBytes = 0;

  const emit = (payload: Record<string, unknown>): void => {
    const sequenced = { ...payload, seq: ++envelopeSeq };
    const envelope: GuardianEnvelope = {
      payload: sequenced,
      signature: sign(null, bytes(sequenced), guardianKeys.privateKey).toString("base64"),
    };
    process.stdout.write(`${JSON.stringify(envelope)}\n`);
  };

  const closeGroup = (reason: string): void => {
    if (terminating) return;
    terminating = true;
    if (!writeAbort(child)) emit({ kind: "failure", runId: args.runId, reason: "pi-abort-write-failed" });
    setTimeout(() => {
      const signal = signalProcessGroup("SIGTERM");
      if (signal === "failed") emit({ kind: "failure", runId: args.runId, reason: "guardian-sigterm-failed" });
    }, TERM_GRACE_MS);
    setTimeout(() => {
      const signal = signalProcessGroup("SIGKILL");
      if (signal === "failed") emit({ kind: "failure", runId: args.runId, reason: "guardian-sigkill-failed" });
    }, KILL_GRACE_MS);
    emit({ kind: "termination-started", runId: args.runId, reason });
  };

  process.on("SIGTERM", () => {
    // The guardian stays alive long enough to escalate its own detached group.
  });

  const acceptControl = (line: string): void => {
    if (Buffer.byteLength(line, "utf8") > CONTROL_LINE_CAP) {
      closeGroup("control-line-cap-exceeded");
      return;
    }
    const signed = parseSignedControl(line);
    if (signed === null) {
      closeGroup("control-json-invalid");
      return;
    }
    if (
      !signed ||
      typeof signed !== "object" ||
      !signed.payload ||
      typeof signed.signature !== "string" ||
      !verify(null, bytes(signed.payload), driverPublicKey, Buffer.from(signed.signature, "base64")) ||
      signed.payload.runId !== args.runId ||
      signed.payload.nonce !== nonce ||
      signed.payload.seq !== controlSeq + 1
    ) {
      closeGroup("control-authentication-failed");
      return;
    }
    controlSeq = signed.payload.seq;
    if (signed.payload.kind === "terminate") {
      closeGroup(signed.payload.reason);
      return;
    }
    if (child !== null || controlSeq !== 1) {
      closeGroup("go-replayed");
      return;
    }
    child = spawn(args.piExecutable, [
      "--mode",
      "rpc",
      "--no-session",
      ...(args.providerId === undefined ? [] : ["--provider", args.providerId]),
      ...(args.modelId === undefined ? [] : ["--model", args.modelId]),
    ], {
      argv0: args.piArgv0,
      cwd: process.cwd(),
      shell: false,
      detached: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.once("error", () => {
      emit({ kind: "failure", runId: args.runId, reason: "pi-spawn-failed" });
      closeGroup("pi-spawn-failed");
    });
    const rpcLines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
    rpcLines.on("line", (rpcLine) => {
      const size = Buffer.byteLength(rpcLine, "utf8");
      stdoutBytes += size + 1;
      if (size > RPC_LINE_CAP || stdoutBytes > args.stdoutLimitBytes) {
        emit({ kind: "failure", runId: args.runId, reason: "pi-stdout-cap-exceeded" });
        closeGroup("pi-stdout-cap-exceeded");
        return;
      }
      emit({ kind: "rpc", runId: args.runId, line: rpcLine });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > args.stderrLimitBytes) {
        emit({ kind: "failure", runId: args.runId, reason: "pi-stderr-cap-exceeded" });
        closeGroup("pi-stderr-cap-exceeded");
      }
    });
    child.once("close", (code, signalName) => {
      emit({
        kind: "exit",
        runId: args.runId,
        exitCode: code,
        signal: signalName,
        terminating,
      });
      child = null;
      process.exitCode = code ?? (terminating ? 0 : 1);
      process.stdin.destroy();
    });
    child.stdin.write(`${JSON.stringify({
      type: "prompt",
      id: signed.payload.correlationId,
      message: signed.payload.prompt,
    })}\n`);
  };

  const controls = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  controls.on("line", acceptControl);
  controls.on("close", () => {
    if (child !== null) closeGroup("control-channel-closed");
  });

  emit({
    kind: "ready",
    runId: args.runId,
    pid: process.pid,
    pgid: process.pid,
    nonce,
    publicKey: guardianPublicKey,
    snapshotDigest: args.snapshotDigest,
  });
}

function main(): void {
  try {
    run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`Pi guardian startup failed: ${String(error)}\n`);
    process.exitCode = 1;
    return;
  }
}

if (import.meta.main) main();
