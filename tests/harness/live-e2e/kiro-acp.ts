import { scaleTestTime } from "../../lib/test-time-factor.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  AdapterExecution,
  CleanupReceipt,
  CleanupTarget,
  CredentialBinding,
  CredentialDeclaration,
  LiveAdapter,
  PreflightContext,
  PreflightFinding,
  PreflightResult,
  PrepareContext,
  PreparedRun,
} from "./adapter.ts";
import { digest, type Result, sanitizeText } from "./contract.ts";
import { bindKiroScratchHome, KIRO_HOME_BINDING_KEY } from "./kiro.ts";
import { buildChildEnvironment } from "./policy.ts";
import { requireCapability } from "./registry.ts";
import { cleanupReceiptFromRegistrar, type ResourceRegistrar } from "./resources.ts";
import { removeTreeVerified } from "./testing/remove-tree-verified.ts";
import { parseVersion, versionAtLeast } from "./version.ts";

/**
 * Kiro's programmatic surface is `kiro-cli acp`: newline-delimited JSON-RPC 2.0
 * over stdio, no TTY. The transport half — request identity, the permission
 * channel, and the session lifecycle — is what this adapter owns; the gate,
 * scratch lifecycle, cleanup barrier, and outcome taxonomy stay in the kernel.
 *
 * Authentication is the same seam the rendered-TUI adapter uses: Kiro keeps its
 * auth database and chat runtime under the user's home, reachable through no
 * environment variable, so the scratch home binds those source entries by
 * reference and copies nothing.
 */

export const KIRO_ACP_ANCHOR_FILE = ".amadeus-live-kiro-acp-anchor.json";

export const KIRO_ACP_PROMPT =
  `Use your file-writing tool to create ${KIRO_ACP_ANCHOR_FILE} in the current directory ` +
  `containing exactly {"amadeus_live_e2e":"ok"}, then reply with one short sentence.`;

const CAPABILITY = requireCapability("kiro-acp");
const CREDENTIAL_DECLARATION: CredentialDeclaration = { childKey: KIRO_HOME_BINDING_KEY };
const CREDENTIAL_RESOURCE_ID = "kiro-acp-credential-binding";
const PROCESS_RESOURCE_ID = "kiro-acp-process";

/** Per-turn capture bound; only digests and counts ever leave this module. */
export const KIRO_ACP_TOOL_OUTPUT_LIMIT = 4_096;

export const ACP_PROTOCOL_VERSION = 1;

/** One live `kiro-cli acp` process, reduced to the four things we need. */
export interface AcpChannel {
  send(line: string): void;
  lines(): AsyncIterable<string>;
  kill(): void;
  readonly exited: Promise<number | null>;
}

export interface AcpOpenOptions {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}

export interface AcpTransportPort {
  open(options: AcpOpenOptions): AcpChannel;
}

/** The real transport. Tests inject a fake so CI never needs kiro-cli. */
export class BunAcpTransport implements AcpTransportPort {
  open(options: AcpOpenOptions): AcpChannel {
    const handle = Bun.spawn({
      cmd: [options.executable, ...options.args],
      cwd: options.cwd,
      env: options.env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "ignore",
    });
    const encoder = new TextEncoder();
    return {
      send: (line) => {
        (handle.stdin as { write(data: Uint8Array): void }).write(encoder.encode(`${line}\n`));
      },
      lines: async function* () {
        const decoder = new TextDecoder();
        let buffered = "";
        for await (const chunk of handle.stdout as AsyncIterable<Uint8Array>) {
          buffered += decoder.decode(chunk, { stream: true });
          let index = buffered.indexOf("\n");
          while (index >= 0) {
            yield buffered.slice(0, index);
            buffered = buffered.slice(index + 1);
            index = buffered.indexOf("\n");
          }
        }
      },
      kill: () => {
        try {
          handle.kill();
        } catch {
          // Already dead; cleanup proves closure by waiting on `exited`.
        }
      },
      exited: handle.exited,
    };
  }
}

interface AcpTurn {
  readonly stopReason: string | undefined;
  readonly toolCallCount: number;
  readonly toolTitleDigest: string;
  readonly permissionCount: number;
  readonly violations: readonly string[];
}

/**
 * Drive one ACP turn. Request identity is enforced here (BR-ACP-03): a reply
 * whose id was never issued, a second terminal reply for the same id, and a
 * frame that is neither a reply nor a known notification are all recorded as
 * protocol violations rather than being ignored into a green run.
 */
class AcpConversation {
  readonly #channel: AcpChannel;
  readonly #pending = new Map<number, (message: Record<string, unknown>) => void>();
  readonly #settled = new Set<number>();
  readonly violations: string[] = [];
  #nextId = 1;
  toolCallCount = 0;
  permissionCount = 0;
  #toolTitles: string[] = [];
  #capturedBytes = 0;

  constructor(channel: AcpChannel) {
    this.#channel = channel;
  }

  async pump(): Promise<void> {
    for await (const line of this.#channel.lines()) {
      if (line.trim().length === 0) continue;
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(line) as Record<string, unknown>;
      } catch {
        // Non-JSON noise on stdout is not a protocol frame; the spike observed
        // none, and inventing a meaning for it would hide a real fault.
        this.violations.push("non-json-frame");
        continue;
      }
      this.#dispatch(message);
    }
  }

  #dispatch(message: Record<string, unknown>): void {
    const id = typeof message.id === "number" ? message.id : undefined;
    if (id !== undefined && ("result" in message || "error" in message)) {
      this.#settle(id, message);
      return;
    }
    const method = typeof message.method === "string" ? message.method : undefined;
    const params = (message.params ?? {}) as Record<string, unknown>;
    if (method === "session/request_permission") {
      this.#answerPermission(message.id, params);
      return;
    }
    if (method === "session/update" || method === "_kiro.dev/session/update") {
      this.#observeUpdate((params.update ?? {}) as Record<string, unknown>);
    }
    // Other `_kiro.dev/*` notifications are vendor metadata this journey does
    // not depend on; they are neither violations nor evidence.
  }

  /** Terminal replies are matched to an issued id, exactly once (BR-ACP-03). */
  #settle(id: number, message: Record<string, unknown>): void {
    if (this.#settled.has(id)) {
      this.violations.push("duplicate-terminal-response");
      return;
    }
    const pending = this.#pending.get(id);
    if (pending === undefined) {
      this.violations.push("response-id-mismatch");
      return;
    }
    this.#settled.add(id);
    this.#pending.delete(id);
    pending(message);
  }

  /**
   * The programmatic gate-answer channel. `--trust-all-tools` normally keeps it
   * silent, so a request arriving here is recorded as evidence rather than
   * quietly answered.
   */
  #answerPermission(id: unknown, params: Record<string, unknown>): void {
    this.permissionCount += 1;
    const options = (params.options ?? []) as Array<{ optionId?: string; kind?: string }>;
    const allow = options.find((option) => /allow/i.test(option.kind ?? option.optionId ?? "")) ??
      options[0];
    this.#write({
      jsonrpc: "2.0",
      id,
      result: { outcome: { outcome: "selected", optionId: allow?.optionId ?? "allow" } },
    });
  }

  #observeUpdate(update: Record<string, unknown>): void {
    if (update.sessionUpdate === "tool_call") {
      this.toolCallCount += 1;
      if (typeof update.title === "string") this.#toolTitles.push(update.title);
      return;
    }
    if (update.sessionUpdate !== "tool_call_update") return;
    const content = (update.content ?? []) as Array<{ content?: { text?: string } }>;
    for (const item of content) {
      const text = item.content?.text ?? "";
      // Bounded: only the byte count is retained, never the text itself.
      this.#capturedBytes = Math.min(
        KIRO_ACP_TOOL_OUTPUT_LIMIT,
        this.#capturedBytes + Buffer.byteLength(text, "utf8"),
      );
    }
  }

  #write(payload: unknown): void {
    this.#channel.send(JSON.stringify(payload));
  }

  request(method: string, params: unknown, timeoutMs: number): Promise<Record<string, unknown>> {
    const id = this.#nextId++;
    this.#write({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.#pending.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
  }

  summary(stopReason: string | undefined): AcpTurn {
    return {
      stopReason,
      toolCallCount: this.toolCallCount,
      toolTitleDigest: digest(this.#toolTitles.join("|")),
      permissionCount: this.permissionCount,
      violations: [...this.violations],
    };
  }
}

export interface KiroAcpAdapterOptions {
  readonly kiroBin: string;
  readonly distributionDir: string;
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  readonly sourceHome?: string;
  /** Agent name; the built-in agent keeps the journey about the transport. */
  readonly agent?: string;
  readonly transport?: AcpTransportPort;
  /** Per-request budget inside the turn; the journey timeout still dominates. */
  readonly requestTimeoutMs?: number;
  /** Window the reader is given to deliver frames that trail the last reply. */
  readonly settleMs?: number;
}

/** Named rather than inline: bun's lcov leaves the continuation lines of a
 *  multi-line return type at DA:0, which reads as an untested probe. */
interface KiroCliProbe {
  readonly measuredVersion?: string;
  readonly findings: readonly PreflightFinding[];
}

function probeKiroCli(options: KiroAcpAdapterOptions): KiroCliProbe {
  const base = buildChildEnvironment(options.parentEnv, CAPABILITY.environment);
  if (!base.ok) {
    return {
      findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: `Kiro environment policy rejected ${base.error.key}`,
      }],
    };
  }
  const version = spawnSync(options.kiroBin, ["--version"], {
    encoding: "utf8",
    env: base.value,
    maxBuffer: 64 * 1024,
    timeout: scaleTestTime(15_000),
  });
  if (version.status !== 0) {
    return {
      findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
        diagnostic: "Kiro CLI executable is unavailable",
      }],
    };
  }
  const parsed = parseVersion(version.stdout);
  const minimum = parseVersion(CAPABILITY.minimumVersion);
  if (minimum === null) throw new Error(`invalid minimumVersion: ${CAPABILITY.minimumVersion}`);
  if (parsed === null || !versionAtLeast(parsed, minimum)) {
    return {
      measuredVersion: parsed?.join("."),
      findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED",
        diagnostic: `Kiro CLI version is below ${CAPABILITY.minimumVersion}`,
      }],
    };
  }
  return { measuredVersion: parsed.join("."), findings: [] };
}

export class KiroAcpAdapter implements LiveAdapter {
  readonly capability = CAPABILITY;
  readonly #options: KiroAcpAdapterOptions;
  readonly #transport: AcpTransportPort;
  #binding: CredentialBinding | undefined;
  #channel: AcpChannel | undefined;
  #registrar: ResourceRegistrar | undefined;

  constructor(options: KiroAcpAdapterOptions) {
    this.#options = options;
    this.#transport = options.transport ?? new BunAcpTransport();
  }

  async preflight(context: PreflightContext): Promise<PreflightResult> {
    const cliProbe = probeKiroCli(this.#options);
    const findings = [...cliProbe.findings];
    if (!existsSync(this.#options.distributionDir)) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING",
        diagnostic: "Kiro distribution is missing",
      });
    }
    if (!(await context.credentialSource.canLease(CREDENTIAL_DECLARATION))) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE",
        diagnostic: "Kiro CLI is not authenticated (run `kiro-cli login`)",
      });
    }
    return findings.length === 0
      ? { kind: "ready", measuredVersion: cliProbe.measuredVersion ?? "unknown", findings }
      : { kind: "skip", measuredVersion: cliProbe.measuredVersion, findings };
  }

  async prepare(
    context: PrepareContext,
  ): Promise<Result<PreparedRun, Readonly<{ kind: "prepare-failed"; diagnostic: string }>>> {
    this.#registrar = context.registrar;
    context.registrar.registerPlanned({
      id: CREDENTIAL_RESOURCE_ID,
      kind: "credential-binding",
      locator: "home-binding:kiro",
      credentialBearing: true,
    });
    try {
      this.#binding = await context.credentialSource.lease(CREDENTIAL_DECLARATION);
      bindKiroScratchHome(context.scratch.homeDir, this.#binding.expose());
      context.registrar.markCreated(CREDENTIAL_RESOURCE_ID);
      const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
      if (!base.ok) {
        return {
          ok: false,
          error: { kind: "prepare-failed", diagnostic: `environment policy rejected ${base.error.key}` },
        };
      }
      const environment = {
        ...base.value,
        HOME: context.scratch.homeDir,
        TMPDIR: join(context.scratch.root, "tmp"),
      };
      const args = ["acp", "--agent", this.#options.agent ?? "kiro_default", "--trust-all-tools"];
      context.registrar.registerPlanned({
        id: PROCESS_RESOURCE_ID,
        kind: "process",
        locator: "kiro-cli:acp",
        credentialBearing: false,
      });
      return {
        ok: true,
        value: {
          cwd: context.scratch.projectDir,
          executable: this.#options.kiroBin,
          args,
          environmentKeys: Object.keys(environment),
          resolveEnvironment: () => ({ ...environment }),
          registeredResourceIds: [CREDENTIAL_RESOURCE_ID, PROCESS_RESOURCE_ID],
        },
      };
    } catch (error) {
      return { ok: false, error: { kind: "prepare-failed", diagnostic: sanitizeText(String(error)) } };
    }
  }

  async execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution> {
    const requestTimeoutMs = this.#options.requestTimeoutMs ?? scaleTestTime(240_000);
    const channel = this.#transport.open({
      executable: run.executable,
      args: run.args,
      cwd: run.cwd,
      env: run.resolveEnvironment(),
    });
    this.#channel = channel;
    this.#registrar?.markCreated(PROCESS_RESOURCE_ID);
    const conversation = new AcpConversation(channel);
    // The reader runs until the channel closes, which is what cleanup causes;
    // the turn below is driven by request/response, not by awaiting the pump.
    void conversation.pump();
    let stopReason: string | undefined;
    let failure: string | undefined;
    try {
      await conversation.request(
        "initialize",
        { protocolVersion: ACP_PROTOCOL_VERSION, clientCapabilities: {} },
        requestTimeoutMs,
      );
      const session = await conversation.request(
        "session/new",
        { cwd: run.cwd, mcpServers: [] },
        requestTimeoutMs,
      );
      const sessionId = (session.result as { sessionId?: unknown } | undefined)?.sessionId;
      if (typeof sessionId !== "string" || sessionId.length === 0) {
        failure = "session/new returned no sessionId";
      } else {
        const turn = await conversation.request(
          "session/prompt",
          { sessionId, prompt: [{ type: "text", text: run.prompt ?? KIRO_ACP_PROMPT }] },
          requestTimeoutMs,
        );
        const reason = (turn.result as { stopReason?: unknown } | undefined)?.stopReason;
        stopReason = typeof reason === "string" ? reason : undefined;
      }
    } catch (error) {
      failure = sanitizeText(String(error));
    }
    // A duplicate terminal reply, a forged id, or a trailing notification can
    // only arrive AFTER the reply that ended the turn, so summarising the
    // moment the request resolves would read those frames as absent and pass a
    // run the protocol rules reject (BR-ACP-03). Give the reader a bounded
    // window to deliver what is already in flight before judging.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, this.#options.settleMs ?? scaleTestTime(50));
    });
    const summary = conversation.summary(stopReason);
    const healthy = failure === undefined && summary.violations.length === 0;
    return {
      // The ACP process outlives the turn by design — cleanup closes it — so the
      // exit code reports whether the TURN completed cleanly, and a protocol
      // violation is an execution failure rather than a silent pass.
      exitCode: healthy ? 0 : 1,
      timedOut: signal.aborted,
      aborted: false,
      stdoutDigest: digest(`${summary.stopReason}:${summary.toolCallCount}`),
      stderrDigest: digest(failure ?? ""),
      structured: {
        stopReason: summary.stopReason,
        toolCallCount: summary.toolCallCount,
        toolTitleDigest: summary.toolTitleDigest,
        permissionCount: summary.permissionCount,
        violations: summary.violations,
        ...(failure === undefined ? {} : { failureDigest: digest(failure) }),
      },
    };
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    const failures: string[] = [];
    if (this.#channel !== undefined) {
      const channel = this.#channel;
      let reapTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        channel.kill();
        // The cancel acknowledgement is never treated as proof of closure
        // (BR-ACP-06): the process exit is (BR-ACP-09f).
        await Promise.race([
          channel.exited,
          new Promise<never>((_, reject) => {
            reapTimer = setTimeout(() => reject(new Error("Kiro ACP reap timed out")), scaleTestTime(10_000));
          }),
        ]);
        this.#registrar?.markReleased(PROCESS_RESOURCE_ID);
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        if (reapTimer !== undefined) clearTimeout(reapTimer);
        this.#channel = undefined;
      }
    }
    if (this.#binding !== undefined) {
      try {
        await this.#binding.release();
        this.#registrar?.markReleased(CREDENTIAL_RESOURCE_ID);
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#binding = undefined;
      }
    }
    try {
      removeTreeVerified(target.scratch.root);
      this.#registrar?.markReleased("scratch-root");
    } catch (error) {
      failures.push(sanitizeText(String(error)));
    }
    const receipt = cleanupReceiptFromRegistrar(this.#registrar, target, failures);
    this.#registrar = undefined;
    return receipt;
  }
}
