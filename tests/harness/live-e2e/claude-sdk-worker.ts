import { query } from "@anthropic-ai/claude-agent-sdk";
import { digest } from "./contract.ts";
import { CLAUDE_SDK_PROMPT, probeClaudeSdkVersion } from "./claude-sdk.ts";
import { driveAidlc, type DriveResult, type ResultEvent } from "../sdk-drive.ts";

interface CredentialFrame {
  readonly runNonce: string;
  readonly generation: number;
  readonly childKey: string;
  readonly secret: string;
}

function parseCredentialFrame(bytes: Uint8Array): CredentialFrame {
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

function lateAfterTerminal(messageTypes: readonly string[]): boolean {
  const terminal = messageTypes.indexOf("result");
  return terminal >= 0 && messageTypes.slice(terminal + 1).some((kind) => kind !== "result");
}

function emitResult(result: DriveResult): void {
  let ordinal = 0;
  for (const tool of result.toolResults) {
    process.stdout.write(`${JSON.stringify({
      kind: "tool",
      ordinal: ordinal++,
      toolName: tool.toolName,
      isError: tool.isError,
      byteLength: byteLength(tool.resultText),
      digest: digest(tool.resultText),
    })}\n`);
  }
  process.stdout.write(`${JSON.stringify({
    kind: "state",
    ordinal: ordinal++,
    present: result.stateFile !== undefined,
    digest: digest(result.stateFile ?? ""),
  })}\n`);
  process.stdout.write(`${JSON.stringify({
    kind: "audit",
    ordinal: ordinal++,
    eventCount: result.auditEvents?.length ?? 0,
    digest: digest(JSON.stringify(result.auditEvents ?? [])),
  })}\n`);
  process.stdout.write(`${JSON.stringify({
    kind: "assistant",
    ordinal: ordinal++,
    byteLength: byteLength(result.assistantText),
    digest: digest(result.assistantText),
  })}\n`);
  for (const terminal of result.resultEvents ?? []) {
    emitTerminal(terminal, ordinal++, lateAfterTerminal(result.messageTypes ?? []));
  }
}

function emitTerminal(terminal: ResultEvent, ordinal: number, hasLateEvent: boolean): void {
  process.stdout.write(`${JSON.stringify({
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

async function main(): Promise<number> {
  const frameBytes = new Uint8Array(await Bun.stdin.arrayBuffer());
  let frame: CredentialFrame;
  try {
    frame = parseCredentialFrame(frameBytes);
  } finally {
    frameBytes.fill(0);
  }
  const abortController = new AbortController();
  const onAbort = () => abortController.abort();
  process.on("SIGUSR1", onAbort);
  if (frame.secret.length > 0 && !frame.childKey.startsWith("__")) {
    process.env[frame.childKey] = frame.secret;
  }
  try {
    const result = await driveAidlc(CLAUDE_SDK_PROMPT, {
      projectDir: process.cwd(),
      permissionMode: "bypassPermissions",
      settingSources: ["project"],
      settingsAuthority: "project-only",
      abortSignal: abortController.signal,
    });
    emitResult(result);
    return (result.resultEvents?.length ?? 0) > 0 ? 0 : 1;
  } finally {
    process.off("SIGUSR1", onAbort);
    if (!frame.childKey.startsWith("__")) delete process.env[frame.childKey];
    frame = { runNonce: "", generation: 0, childKey: "", secret: "" };
  }
}

if (import.meta.main) {
  if (process.argv.includes("--probe")) {
    process.stdout.write(JSON.stringify({
      version: probeClaudeSdkVersion(),
      query: typeof query === "function",
      abort: typeof AbortController === "function",
      projectSettings: true,
      structuredResult: true,
    }));
  } else {
    main().then(
      (code) => process.exit(code),
      () => process.exit(1),
    );
  }
}
