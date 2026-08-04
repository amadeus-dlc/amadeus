import { query } from "@anthropic-ai/claude-agent-sdk";
import { digest } from "./contract.ts";
import { CLAUDE_SDK_PROMPT, probeClaudeSdkVersion } from "./claude-sdk.ts";
import { driveAidlc, type DriveResult, type ResultEvent } from "../sdk-drive.ts";

export interface CredentialFrame {
  readonly runNonce: string;
  readonly generation: number;
  readonly childKey: string;
  readonly secret: string;
}

export function parseCredentialFrame(bytes: Uint8Array): CredentialFrame {
  const newline = bytes.indexOf(10);
  if (newline <= 0) throw new Error("credential frame prefix is missing");
  const declared = Number(new TextDecoder().decode(bytes.slice(0, newline)));
  const payload = bytes.slice(newline + 1);
  if (!Number.isSafeInteger(declared) || declared !== payload.byteLength) {
    throw new Error("credential frame length mismatch");
  }
  const parsed = JSON.parse(new TextDecoder().decode(payload)) as Partial<CredentialFrame>;
  if (
    typeof parsed.runNonce !== "string" ||
    parsed.runNonce.length === 0 ||
    parsed.generation !== 1 ||
    typeof parsed.childKey !== "string" ||
    typeof parsed.secret !== "string"
  ) {
    throw new Error("credential frame is invalid");
  }
  return parsed as CredentialFrame;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function lateAfterTerminal(messageTypes: readonly string[]): boolean {
  const terminal = messageTypes.indexOf("result");
  return terminal >= 0 && messageTypes.slice(terminal + 1).some((kind) => kind !== "result");
}

export function emitResult(
  result: DriveResult,
  write: (line: string) => void = (line) => process.stdout.write(line),
): void {
  let ordinal = 0;
  for (const tool of result.toolResults) {
    write(`${JSON.stringify({
      kind: "tool",
      ordinal: ordinal++,
      toolName: tool.toolName,
      isError: tool.isError,
      byteLength: byteLength(tool.resultText),
      digest: digest(tool.resultText),
    })}\n`);
  }
  write(`${JSON.stringify({
    kind: "state",
    ordinal: ordinal++,
    present: result.stateFile !== undefined,
    digest: digest(result.stateFile ?? ""),
  })}\n`);
  write(`${JSON.stringify({
    kind: "audit",
    ordinal: ordinal++,
    eventCount: result.auditEvents?.length ?? 0,
    digest: digest(JSON.stringify(result.auditEvents ?? [])),
  })}\n`);
  write(`${JSON.stringify({
    kind: "assistant",
    ordinal: ordinal++,
    byteLength: byteLength(result.assistantText),
    digest: digest(result.assistantText),
  })}\n`);
  for (const terminal of result.resultEvents) {
    emitTerminal(terminal, ordinal++, lateAfterTerminal(result.messageTypes), write);
  }
}

function emitTerminal(
  terminal: ResultEvent,
  ordinal: number,
  hasLateEvent: boolean,
  write: (line: string) => void,
): void {
  write(`${JSON.stringify({
    kind: "terminal",
    ordinal,
    type: terminal.type,
    subtype: terminal.subtype,
    isError: terminal.is_error,
    numTurns: terminal.num_turns,
    permissionDenialsCount: terminal.permissionDenialsCount,
    hasLateEvent,
  })}\n`);
}

export function sdkWorkerExitCode(resultEvents: readonly ResultEvent[]): 0 | 1 {
  return resultEvents.length > 0 && resultEvents.every((event) => event.is_error !== true) ? 0 : 1;
}

export function sdkWorkerProbeSurface(): Readonly<{
  version: string | null;
  query: boolean;
  abort: boolean;
}> {
  return {
    version: probeClaudeSdkVersion(),
    query: typeof query === "function",
    abort: typeof AbortController === "function",
  };
}

export interface SdkWorkerPorts {
  readonly readFrameBytes: () => Promise<Uint8Array>;
  readonly drive: typeof driveAidlc;
  readonly cwd: () => string;
  readonly env: Record<string, string | undefined>;
  readonly onSignal: (signal: NodeJS.Signals, listener: () => void) => void;
  readonly offSignal: (signal: NodeJS.Signals, listener: () => void) => void;
  readonly write: (line: string) => void;
}

const DEFAULT_PORTS: SdkWorkerPorts = {
  readFrameBytes: async () => new Uint8Array(await Bun.stdin.arrayBuffer()),
  drive: driveAidlc,
  cwd: () => process.cwd(),
  env: process.env,
  onSignal: (signal, listener) => process.on(signal, listener),
  offSignal: (signal, listener) => process.off(signal, listener),
  write: (line) => process.stdout.write(line),
};

export async function runSdkWorker(ports: SdkWorkerPorts = DEFAULT_PORTS): Promise<number> {
  const abortController = new AbortController();
  const onAbort = () => abortController.abort();
  ports.onSignal("SIGUSR1", onAbort);
  const frameBytes = await ports.readFrameBytes();
  const frame: CredentialFrame = (() => {
    try {
      return parseCredentialFrame(frameBytes);
    } finally {
      frameBytes.fill(0);
    }
  })();
  if (frame.secret.length > 0) {
    ports.env[frame.childKey] = frame.secret;
  }
  try {
    const result = await ports.drive(CLAUDE_SDK_PROMPT, {
      projectDir: ports.cwd(),
      permissionMode: "bypassPermissions",
      settingSources: ["project"],
      settingsAuthority: "project-only",
      abortSignal: abortController.signal,
    });
    emitResult(result, ports.write);
    return sdkWorkerExitCode(result.resultEvents);
  } finally {
    ports.offSignal("SIGUSR1", onAbort);
    delete ports.env[frame.childKey];
  }
}

export async function dispatchSdkWorker(
  argv: readonly string[],
  ports: SdkWorkerPorts = DEFAULT_PORTS,
): Promise<number> {
  if (argv.includes("--probe")) {
    ports.write(JSON.stringify(sdkWorkerProbeSurface()));
    return 0;
  }
  return runSdkWorker(ports);
}

export function exitSdkWorker(
  result: Promise<number>,
  exit: (code: number) => void = (code) => process.exit(code),
): void {
  result.then(exit, () => exit(1));
}

if (import.meta.main) {
  exitSdkWorker(dispatchSdkWorker(process.argv));
}
