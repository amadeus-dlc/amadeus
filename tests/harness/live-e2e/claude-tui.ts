import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
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
import { createClaudeFamilyContext, type ClaudeFamilyContext } from "./claude.ts";
import { digest, type Result, sanitizeText } from "./contract.ts";
import { buildChildEnvironment } from "./policy.ts";
import { capabilityById } from "./registry.ts";
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

export {
  SpawnSyncTmuxCommandPort,
  type TmuxCommandOptions,
  type TmuxCommandPort,
  type TmuxCommandResult,
} from "./tmux.ts";

export const CLAUDE_TUI_ANCHOR_FILE = ".amadeus-live-tui-anchor.json";
export const CLAUDE_TUI_PROMPT =
  "Create .amadeus-live-tui-anchor.json containing exactly " +
  '{"status":"ok","runId":"{{RUN_ID}}"}, then reply briefly.';
export const CLAUDE_TUI_REQUIRED_HELP_FLAGS = ["--setting-sources", "--permission-mode"] as const;

const CAPABILITY = (() => {
  const resolved = capabilityById("claude-tui");
  if (!resolved.ok) throw new Error("claude-tui capability is not registered");
  return resolved.value;
})();
const CREDENTIAL_DECLARATION: CredentialDeclaration = { childKey: "ANTHROPIC_API_KEY" };
const READY_PROMPT_PATTERN = /^\s*❯\s*$/mu;

interface PrivateTmuxIdentity {
  readonly runId: string;
  readonly socketPath: string;
  readonly sessionName: string;
  readonly target: string;
}

export interface ClaudeTuiAdapterOptions {
  readonly claudeBin: string;
  readonly tmuxBin?: string;
  readonly distributionDir: string;
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  readonly family?: ClaudeFamilyContext;
  readonly tmux?: TmuxCommandPort;
  readonly createRunId?: () => string;
  readonly pollIntervalMs?: number;
  readonly readyTimeoutMs?: number;
}

function readCurrentAnchor(projectDir: string, runId: string): boolean {
  const path = join(projectDir, CLAUDE_TUI_ANCHOR_FILE);
  if (!existsSync(path)) return false;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { status?: unknown; runId?: unknown };
    return parsed.status === "ok" && parsed.runId === runId;
  } catch {
    return false;
  }
}

export class ClaudeTuiAdapter implements LiveAdapter {
  readonly capability = CAPABILITY;
  readonly #options: ClaudeTuiAdapterOptions;
  readonly #family: ClaudeFamilyContext;
  readonly #tmux: TmuxCommandPort;
  #binding: CredentialBinding | undefined;
  #identity: PrivateTmuxIdentity | undefined;
  #registrar: ResourceRegistrar | undefined;

  constructor(options: ClaudeTuiAdapterOptions) {
    this.#options = options;
    this.#family = options.family ?? createClaudeFamilyContext();
    this.#tmux = options.tmux ?? new SpawnSyncTmuxCommandPort(options.tmuxBin ?? "tmux");
  }

  async preflight(context: PreflightContext): Promise<PreflightResult> {
    const claude = this.#probeClaude();
    const findings = [...claude.findings, ...this.#probeTmux()];
    if (!existsSync(this.#options.distributionDir)) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING",
        diagnostic: "Claude distribution is missing",
      });
    }
    if (!(await context.credentialSource.canLease(CREDENTIAL_DECLARATION))) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE",
        diagnostic: "Claude credential binding is unavailable",
      });
    }
    return findings.length === 0
      ? { kind: "ready", measuredVersion: claude.measuredVersion ?? "unknown", findings }
      : { kind: "skip", measuredVersion: claude.measuredVersion, findings };
  }

  #probeClaude(): Readonly<{ measuredVersion?: string; findings: readonly PreflightFinding[] }> {
    const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
    const version = base.ok
      ? spawnSync(this.#options.claudeBin, ["--version"], {
          encoding: "utf8",
          env: base.value,
          maxBuffer: 64 * 1024,
        })
      : null;
    const parsed = version?.status === 0 ? this.#family.parseVersion(version.stdout) : null;
    if (!base.ok) {
      return { findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: `Claude environment policy rejected ${base.error.key}`,
      }] };
    }
    if (version === null || version.status !== 0) {
      return { findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
        diagnostic: "Claude executable is unavailable",
      }] };
    }
    if (parsed === null || !this.#family.versionAtLeast(parsed, [2, 1, 220])) {
      return { measuredVersion: parsed?.join("."), findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED",
        diagnostic: "Claude version is below 2.1.220",
      }] };
    }
    const help = spawnSync(this.#options.claudeBin, ["--help"], {
      encoding: "utf8",
      env: base.value,
      maxBuffer: 1024 * 1024,
    });
    const missingFlags = CLAUDE_TUI_REQUIRED_HELP_FLAGS.filter((flag) => !help.stdout.includes(flag));
    return help.status === 0 && missingFlags.length === 0
      ? { measuredVersion: parsed.join("."), findings: [] }
      : {
          measuredVersion: parsed.join("."),
          findings: [{
            code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
            diagnostic: `Claude TUI flags unavailable: ${missingFlags.join(",") || "help probe failed"}`,
          }],
        };
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
    if (!/tmux\s+\d+\.\d+/i.test(tmuxVersion.stdout)) {
      return [{
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: "tmux version output is unsupported",
      }];
    }
    return [];
  }

  async prepare(
    context: PrepareContext,
  ): Promise<Result<PreparedRun, Readonly<{ kind: "prepare-failed"; diagnostic: string }>>> {
    const runId = (this.#options.createRunId ?? (() => randomBytes(16).toString("hex")))();
    if (!/^[a-f0-9]{32}$/.test(runId)) {
      return { ok: false, error: { kind: "prepare-failed", diagnostic: "run ID must be 128-bit lowercase hex" } };
    }
    this.#identity = {
      runId,
      socketPath: join(context.scratch.root, `tmux-${runId}.sock`),
      sessionName: `amadeus-live-${runId.slice(0, 16)}`,
      target: `amadeus-live-${runId.slice(0, 16)}:0.0`,
    };
    this.#registrar = context.registrar;
    for (const resource of [
      { id: "claude-tui-credential", kind: "credential-binding", locator: "ambient:claude", credentialBearing: true },
      { id: "claude-tui-server", kind: "tmux-server", locator: "private-tmux-socket", credentialBearing: true },
      { id: "claude-tui-session", kind: "tmux-session", locator: "private-tmux-session", credentialBearing: true },
    ] as const) {
      context.registrar.registerPlanned(resource);
    }
    try {
      this.#binding = await context.credentialSource.lease(CREDENTIAL_DECLARATION);
      context.registrar.markCreated("claude-tui-credential");
      const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
      if (!base.ok) {
        return { ok: false, error: { kind: "prepare-failed", diagnostic: `environment policy rejected ${base.error.key}` } };
      }
      const binding = this.#binding;
      const environment = {
        ...base.value,
        HOME: context.scratch.homeDir,
        TMPDIR: join(context.scratch.root, "tmp"),
      };
      return {
        ok: true,
        value: {
          cwd: context.scratch.projectDir,
          executable: this.#options.claudeBin,
          args: ["--setting-sources", "project", "--permission-mode", "acceptEdits"],
          environmentKeys: [...Object.keys(environment), binding.key],
          resolveEnvironment: () => ({ ...environment, [binding.key]: binding.expose() }),
          registeredResourceIds: ["claude-tui-credential", "claude-tui-server", "claude-tui-session"],
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
      ["new-session", "-d", "-s", identity.sessionName, "-c", run.cwd, command],
      { cwd: run.cwd, env: run.resolveEnvironment() },
    );
    if (commandFailed(started)) return this.#failedExecution(started.stderr);
    this.#registrar?.markCreated("claude-tui-server");
    this.#registrar?.markCreated("claude-tui-session");

    const ready = await this.#waitForReady(signal);
    if (!ready.ok) return ready.execution;

    const prompt = (run.prompt ?? CLAUDE_TUI_PROMPT).replaceAll("{{RUN_ID}}", identity.runId);
    const sent = this.#privateCommand(["send-keys", "-t", identity.target, "-l", prompt]);
    if (commandFailed(sent)) return this.#failedExecution(sent.stderr);
    const entered = this.#privateCommand(["send-keys", "-t", identity.target, "Enter"]);
    if (commandFailed(entered)) return this.#failedExecution(entered.stderr);

    let pane = "";
    for (;;) {
      if (signal.aborted) {
        return {
          ...this.#failedExecution("journey aborted"),
          timedOut: true,
          aborted: true,
        };
      }
      const captured = this.#privateCommand([
        "capture-pane",
        "-t",
        identity.target,
        "-p",
        "-J",
        "-e",
        "-S",
        `-${MAX_PANE_LINES}`,
      ]);
      if (commandFailed(captured)) return this.#failedExecution(captured.stderr);
      pane = captured.stdout;
      const limitIssue = paneLimitIssue(pane);
      if (limitIssue !== null) return this.#failedExecution(limitIssue, pane);
      if (readCurrentAnchor(run.cwd, identity.runId)) {
        return {
          exitCode: 0,
          timedOut: false,
          aborted: false,
          stdoutDigest: digest(pane),
          stderrDigest: digest(""),
          structured: {
            anchorVerified: true,
            inputCount: 1,
            paneDigest: digest(pane),
            sessionDigest: digest(identity.sessionName),
          },
        };
      }
      await new Promise<void>((resolve) => setTimeout(resolve, this.#options.pollIntervalMs ?? 250));
    }
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    const failures: string[] = [];
    const identity = this.#identity;
    if (identity !== undefined) {
      this.#killPrivateResource(["kill-session", "-t", identity.sessionName], "claude-tui-session", failures);
      this.#killPrivateResource(["kill-server"], "claude-tui-server", failures);
    }
    if (this.#binding !== undefined) {
      try {
        await this.#binding.release();
        this.#registrar?.markReleased("claude-tui-credential");
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#binding = undefined;
      }
    }
    try {
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

  async #waitForReady(
    signal: AbortSignal,
  ): Promise<Readonly<{ ok: true }> | Readonly<{ ok: false; execution: AdapterExecution }>> {
    const deadline = Date.now() + (this.#options.readyTimeoutMs ?? 30_000);
    for (;;) {
      if (signal.aborted) {
        return {
          ok: false,
          execution: { ...this.#failedExecution("journey aborted"), timedOut: true, aborted: true },
        };
      }
      const captured = this.#privateCommand(["capture-pane", "-t", this.#identity?.target ?? "", "-p", "-J", "-e"]);
      if (commandFailed(captured)) return { ok: false, execution: this.#failedExecution(captured.stderr) };
      const issue = paneLimitIssue(captured.stdout);
      if (issue !== null) return { ok: false, execution: this.#failedExecution(issue, captured.stdout) };
      if (READY_PROMPT_PATTERN.test(captured.stdout)) return { ok: true };
      if (Date.now() >= deadline) {
        return { ok: false, execution: this.#failedExecution("Claude TUI readiness timed out", captured.stdout) };
      }
      await new Promise<void>((resolve) => setTimeout(resolve, this.#options.pollIntervalMs ?? 250));
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
