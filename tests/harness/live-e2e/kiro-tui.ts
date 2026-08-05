import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
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
import {
  bindKiroScratchHome,
  defaultKiroSourceHome,
  KIRO_HOME_BINDING_KEY,
  kiroHomeLayout,
} from "./kiro.ts";
import { buildChildEnvironment } from "./policy.ts";
import { requireCapability } from "./registry.ts";
import { cleanupReceiptFromRegistrar, type ResourceRegistrar } from "./resources.ts";
import {
  absentPrivateServer,
  commandFailed,
  MAX_PANE_LINES,
  paneLimitIssue,
  shellQuote,
  SpawnSyncTmuxCommandPort,
  type TmuxCommandOptions,
  type TmuxCommandPort,
  type TmuxCommandResult,
} from "./tmux.ts";
import { parseVersion, versionAtLeast } from "./version.ts";

export const KIRO_TUI_ANCHOR_FILE = ".amadeus-live-kiro-tui-anchor.json";
export const KIRO_TUI_PROMPT =
  "Create .amadeus-live-kiro-tui-anchor.json containing exactly " +
  '{"status":"ok","runId":"{{RUN_ID}}"}, then reply briefly.';

const CAPABILITY = requireCapability("kiro-tui");
const CREDENTIAL_DECLARATION: CredentialDeclaration = { childKey: KIRO_HOME_BINDING_KEY };
const RESOURCE_BINDING = "kiro-tui-home-binding";
const RESOURCE_SERVER = "kiro-tui-server";
const RESOURCE_SESSION = "kiro-tui-session";
const PANE_WIDTH = "200";
const PANE_HEIGHT = "50";
/**
 * The journey measures the TUI transport — private tmux, scratch isolation,
 * anchor, bounded evidence — so it pins Kiro's built-in agent rather than
 * riding whichever agent the installed distribution makes the workspace
 * default. The shipped conductor is a workflow surface with its own journeys;
 * letting it answer here would make the transport result depend on workflow
 * behaviour. This mirrors the Claude TUI adapter running with project-only
 * settings and no hooks.
 */
const KIRO_TRANSPORT_AGENT = "kiro_default";
/**
 * A UNIX domain socket path is capped near 104 bytes on macOS and 108 on Linux.
 * A scratch root under the system temp directory is already long enough that a
 * socket nested inside it overflows, so the run-private socket lives directly
 * in the temp directory under a short run-identified name and is unlinked by
 * cleanup. The guard keeps an unusually long temp directory a clear prepare
 * failure rather than a confusing connect error at execute time.
 */
const MAX_SOCKET_PATH_BYTES = 100;

/** The idle input footer Kiro paints once a turn has finished. */
const IDLE_PROMPT_PATTERN = /ask a question or describe a task/i;
/** The trust-all confirmation picker Kiro shows on launch; "Yes, I accept" is one Down away. */
const TRUST_PROMPT_PATTERN = /Yes, I accept/i;

interface PrivateTmuxIdentity {
  readonly runId: string;
  readonly socketPath: string;
  readonly sessionName: string;
  readonly target: string;
}

export interface KiroTuiAdapterOptions {
  readonly kiroBin: string;
  readonly tmuxBin?: string;
  readonly distributionDir: string;
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  /** Home owning the Kiro auth database and chat runtime; defaults to the user's home. */
  readonly sourceHome?: string;
  readonly tmux?: TmuxCommandPort;
  readonly createRunId?: () => string;
  readonly pollIntervalMs?: number;
  readonly readyTimeoutMs?: number;
}

/**
 * tmux runs a pane command through a shell whose startup files may rewrite
 * PATH, so a bare binary name can resolve in the parent and still be missing in
 * the pane. Resolving against the child PATH up front keeps the launch bound to
 * the executable preflight actually measured.
 */
function resolveExecutable(
  binary: string,
  childEnv: Readonly<Record<string, string>>,
): string | null {
  if (binary.includes("/")) return existsSync(binary) ? binary : null;
  return Bun.which(binary, { PATH: childEnv.PATH ?? "" });
}

function readCurrentAnchor(projectDir: string, runId: string): boolean {
  const path = join(projectDir, KIRO_TUI_ANCHOR_FILE);
  if (!existsSync(path)) return false;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { status?: unknown; runId?: unknown };
    return parsed.status === "ok" && parsed.runId === runId;
  } catch {
    return false;
  }
}

export class KiroTuiAdapter implements LiveAdapter {
  readonly capability = CAPABILITY;
  readonly #options: KiroTuiAdapterOptions;
  readonly #tmux: TmuxCommandPort;
  readonly #sourceHome: string;
  #binding: CredentialBinding | undefined;
  #identity: PrivateTmuxIdentity | undefined;
  #registrar: ResourceRegistrar | undefined;

  constructor(options: KiroTuiAdapterOptions) {
    this.#options = options;
    this.#tmux = options.tmux ?? new SpawnSyncTmuxCommandPort(options.tmuxBin ?? "tmux");
    this.#sourceHome = options.sourceHome ?? defaultKiroSourceHome(options.parentEnv);
  }

  async preflight(context: PreflightContext): Promise<PreflightResult> {
    const kiro = this.#probeKiro();
    const findings = [...kiro.findings, ...this.#probeTmux()];
    if (!existsSync(this.#options.distributionDir)) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING",
        diagnostic: "Kiro distribution is missing",
      });
    }
    if (!(await context.credentialSource.canLease(CREDENTIAL_DECLARATION))) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE",
        diagnostic: "Kiro CLI source authentication is unavailable",
      });
    }
    if (!existsSync(kiroHomeLayout(this.#sourceHome).chatBinary)) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: "Kiro CLI chat runtime is unavailable",
      });
    }
    return findings.length === 0
      ? { kind: "ready", measuredVersion: kiro.measuredVersion ?? "unknown", findings }
      : { kind: "skip", measuredVersion: kiro.measuredVersion, findings };
  }

  #probeKiro(): Readonly<{ measuredVersion?: string; findings: readonly PreflightFinding[] }> {
    const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
    if (!base.ok) {
      return { findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: `Kiro environment policy rejected ${base.error.key}`,
      }] };
    }
    const version = spawnSync(this.#options.kiroBin, ["--version"], {
      encoding: "utf8",
      env: base.value,
      maxBuffer: 64 * 1024,
      timeout: 15_000,
    });
    if (version.status !== 0) {
      return { findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
        diagnostic: "Kiro CLI executable is unavailable",
      }] };
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

  #probeTmux(): readonly PreflightFinding[] {
    const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
    const tmuxVersion = this.#tmux.run(["-V"], base.ok ? { env: base.value } : undefined);
    if (commandFailed(tmuxVersion)) {
      return [{
        code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
        diagnostic: "tmux executable is unavailable",
      }];
    }
    return /tmux\s+\d+\.\d+/i.test(tmuxVersion.stdout)
      ? []
      : [{
          code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
          diagnostic: "tmux version output is unsupported",
        }];
  }

  async prepare(
    context: PrepareContext,
  ): Promise<Result<PreparedRun, Readonly<{ kind: "prepare-failed"; diagnostic: string }>>> {
    const runId = (this.#options.createRunId ?? (() => randomBytes(16).toString("hex")))();
    if (!/^[a-f0-9]{32}$/.test(runId)) {
      return { ok: false, error: { kind: "prepare-failed", diagnostic: "run ID must be 128-bit lowercase hex" } };
    }
    const socketPath = join(tmpdir(), `amadeus-kiro-${runId.slice(0, 16)}.sock`);
    if (Buffer.byteLength(socketPath) > MAX_SOCKET_PATH_BYTES) {
      return {
        ok: false,
        error: { kind: "prepare-failed", diagnostic: "run-private tmux socket path is too long" },
      };
    }
    this.#identity = {
      runId,
      socketPath,
      sessionName: `amadeus-kiro-${runId.slice(0, 16)}`,
      target: `amadeus-kiro-${runId.slice(0, 16)}:0.0`,
    };
    this.#registrar = context.registrar;
    for (const resource of [
      { id: RESOURCE_BINDING, kind: "credential-binding", locator: "scratch-home:kiro", credentialBearing: true },
      { id: RESOURCE_SERVER, kind: "tmux-server", locator: "private-tmux-socket", credentialBearing: true },
      { id: RESOURCE_SESSION, kind: "tmux-session", locator: "private-tmux-session", credentialBearing: true },
    ] as const) {
      context.registrar.registerPlanned(resource);
    }
    try {
      this.#binding = await context.credentialSource.lease(CREDENTIAL_DECLARATION);
      // The source locator is consumed here and never travels further: the child
      // environment below is built from the allow-list alone.
      bindKiroScratchHome(context.scratch.homeDir, this.#binding.expose());
      context.registrar.markCreated(RESOURCE_BINDING);
      const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
      if (!base.ok) {
        return { ok: false, error: { kind: "prepare-failed", diagnostic: `environment policy rejected ${base.error.key}` } };
      }
      const environment = {
        ...base.value,
        HOME: context.scratch.homeDir,
        TMPDIR: join(context.scratch.root, "tmp"),
      };
      const executable = resolveExecutable(this.#options.kiroBin, environment);
      if (executable === null) {
        return { ok: false, error: { kind: "prepare-failed", diagnostic: "Kiro CLI executable is unresolvable" } };
      }
      return {
        ok: true,
        value: {
          cwd: context.scratch.projectDir,
          executable,
          args: ["chat", "--agent", KIRO_TRANSPORT_AGENT, "--trust-all-tools"],
          environmentKeys: Object.keys(environment),
          resolveEnvironment: () => ({ ...environment }),
          registeredResourceIds: [RESOURCE_BINDING, RESOURCE_SERVER, RESOURCE_SESSION],
        },
      };
    } catch (error) {
      return { ok: false, error: { kind: "prepare-failed", diagnostic: sanitizeText(String(error)) } };
    }
  }

  async execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution> {
    const identity = this.#identity;
    if (identity === undefined) return this.#failedExecution("private tmux identity is missing");
    const command = [run.executable, ...run.args].map(shellQuote).join(" ");
    const started = this.#privateCommand(
      [
        "new-session",
        "-d",
        "-s",
        identity.sessionName,
        "-x",
        PANE_WIDTH,
        "-y",
        PANE_HEIGHT,
        "-c",
        run.cwd,
        command,
      ],
      { cwd: run.cwd, env: run.resolveEnvironment() },
    );
    if (commandFailed(started)) return this.#failedExecution(started.stderr);
    this.#registrar?.markCreated(RESOURCE_SERVER);
    this.#registrar?.markCreated(RESOURCE_SESSION);

    const ready = await this.#waitForReady(signal);
    if (!ready.ok) return ready.execution;

    const prompt = (run.prompt ?? KIRO_TUI_PROMPT).replaceAll("{{RUN_ID}}", identity.runId);
    const sent = this.#privateCommand(["send-keys", "-t", identity.target, "-l", prompt]);
    if (commandFailed(sent)) return this.#failedExecution(sent.stderr);
    const entered = this.#privateCommand(["send-keys", "-t", identity.target, "Enter"]);
    if (commandFailed(entered)) return this.#failedExecution(entered.stderr);

    for (;;) {
      if (signal.aborted) {
        return { ...this.#failedExecution("journey aborted"), timedOut: true, aborted: true };
      }
      const captured = this.#capturePane(`-${MAX_PANE_LINES}`);
      if (!captured.ok) return captured.execution;
      if (readCurrentAnchor(run.cwd, identity.runId)) {
        return {
          exitCode: 0,
          timedOut: false,
          aborted: false,
          stdoutDigest: digest(captured.pane),
          stderrDigest: digest(""),
          structured: {
            anchorVerified: true,
            inputCount: 1,
            paneDigest: digest(captured.pane),
            sessionDigest: digest(identity.sessionName),
          },
        };
      }
      await this.#sleep();
    }
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    const failures: string[] = [];
    const identity = this.#identity;
    if (identity !== undefined) {
      this.#killPrivateResource(["kill-session", "-t", identity.sessionName], RESOURCE_SESSION, failures);
      this.#killPrivateResource(["kill-server"], RESOURCE_SERVER, failures);
      // The socket lives outside the scratch root, so removing the scratch tree
      // cannot reclaim it. tmux normally unlinks it on kill; force covers the
      // case where the server was never started.
      try {
        rmSync(identity.socketPath, { force: true });
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      }
    }
    if (this.#binding !== undefined) {
      try {
        await this.#binding.release();
        this.#registrar?.markReleased(RESOURCE_BINDING);
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#binding = undefined;
      }
    }
    try {
      // Removing the scratch root removes the scratch-side binding links. The
      // source auth database and chat runtime they pointed at are untouched.
      rmSync(target.scratch.root, { recursive: true, force: true });
      this.#registrar?.markReleased("scratch-root");
    } catch (error) {
      failures.push(sanitizeText(String(error)));
    }
    this.#identity = undefined;
    const receipt = cleanupReceiptFromRegistrar(this.#registrar, target, failures);
    this.#registrar = undefined;
    return receipt;
  }

  #privateCommand(args: readonly string[], options?: TmuxCommandOptions): TmuxCommandResult {
    const identity = this.#identity;
    if (identity === undefined) return { exitCode: 1, stdout: "", stderr: "private tmux identity is missing" };
    return this.#tmux.run(["-S", identity.socketPath, ...args], options);
  }

  #capturePane(
    since?: string,
  ): Readonly<{ ok: true; pane: string }> | Readonly<{ ok: false; execution: AdapterExecution }> {
    const args = ["capture-pane", "-t", this.#identity?.target ?? "", "-p", "-J", "-e"];
    if (since !== undefined) args.push("-S", since);
    const captured = this.#privateCommand(args);
    if (commandFailed(captured)) return { ok: false, execution: this.#failedExecution(captured.stderr) };
    const issue = paneLimitIssue(captured.stdout);
    return issue === null
      ? { ok: true, pane: captured.stdout }
      : { ok: false, execution: this.#failedExecution(issue, captured.stdout) };
  }

  /**
   * Kiro launches into a trust-all confirmation picker before it paints its
   * input footer. Clear the picker once, then wait for the footer — the footer
   * is what proves the TUI is accepting a prompt.
   */
  async #waitForReady(
    signal: AbortSignal,
  ): Promise<Readonly<{ ok: true }> | Readonly<{ ok: false; execution: AdapterExecution }>> {
    const identity = this.#identity;
    if (identity === undefined) {
      return { ok: false, execution: this.#failedExecution("private tmux identity is missing") };
    }
    const deadline = Date.now() + (this.#options.readyTimeoutMs ?? 60_000);
    let trustCleared = false;
    for (;;) {
      if (signal.aborted) {
        return {
          ok: false,
          execution: { ...this.#failedExecution("journey aborted"), timedOut: true, aborted: true },
        };
      }
      const captured = this.#capturePane();
      if (!captured.ok) return captured;
      if (IDLE_PROMPT_PATTERN.test(captured.pane)) return { ok: true };
      if (!trustCleared && TRUST_PROMPT_PATTERN.test(captured.pane)) {
        const moved = this.#privateCommand(["send-keys", "-t", identity.target, "Down"]);
        if (commandFailed(moved)) return { ok: false, execution: this.#failedExecution(moved.stderr) };
        const accepted = this.#privateCommand(["send-keys", "-t", identity.target, "Enter"]);
        if (commandFailed(accepted)) return { ok: false, execution: this.#failedExecution(accepted.stderr) };
        trustCleared = true;
      }
      if (Date.now() >= deadline) {
        return { ok: false, execution: this.#failedExecution("Kiro TUI readiness timed out", captured.pane) };
      }
      await this.#sleep();
    }
  }

  #killPrivateResource(args: readonly string[], resourceId: string, failures: string[]): void {
    const result = this.#privateCommand(args);
    if (commandFailed(result) && !absentPrivateServer(result)) {
      failures.push(sanitizeText(result.stderr || result.stdout));
      return;
    }
    this.#registrar?.markReleased(resourceId);
  }

  #sleep(): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, this.#options.pollIntervalMs ?? 250));
  }

  #failedExecution(diagnostic: string, pane = ""): AdapterExecution {
    return {
      exitCode: 1,
      timedOut: false,
      aborted: false,
      stdoutDigest: digest(pane),
      stderrDigest: digest(sanitizeText(diagnostic)),
    };
  }
}
