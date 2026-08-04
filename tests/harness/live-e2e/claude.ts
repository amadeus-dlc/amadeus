import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AdapterExecution,
  CleanupReceipt,
  CleanupTarget,
  CredentialBinding,
  CredentialDeclaration,
  CredentialSourcePort,
  LiveAdapter,
  PreflightContext,
  PreflightFinding,
  PreflightResult,
  PrepareContext,
  PreparedRun,
  ScratchAllocator,
  ScratchReceipt,
} from "./adapter.ts";
import { type Result, sanitizeText } from "./contract.ts";
import { buildChildEnvironment } from "./policy.ts";
import { capabilityById } from "./registry.ts";
import { cleanupReceiptFromRegistrar, type ResourceRegistrar } from "./resources.ts";
import { collectBounded } from "./stream.ts";
import { parseVersion, type Version, versionAtLeast } from "./version.ts";

export const CLAUDE_PRINT_PROMPT =
  "Return the status object required by the JSON schema. Do not use tools.";
export const CLAUDE_PRINT_SCHEMA = {
  type: "object",
  properties: { amadeus_live_e2e: { const: "ok" } },
  required: ["amadeus_live_e2e"],
  additionalProperties: false,
} as const;
export const CLAUDE_REQUIRED_HELP_FLAGS = [
  "--print",
  "--setting-sources",
  "--tools",
  "--no-session-persistence",
  "--output-format",
  "--json-schema",
  "--max-budget-usd",
] as const;

const CAPABILITY = (() => {
  const resolved = capabilityById("claude-print");
  if (!resolved.ok) throw new Error("claude-print capability is not registered");
  return resolved.value;
})();
const CREDENTIAL_DECLARATION: CredentialDeclaration = { childKey: "ANTHROPIC_API_KEY" };
const STDOUT_LIMIT_BYTES = 1_048_576;
const STDERR_LIMIT_BYTES = 262_144;

export interface ClaudeFamilyContext {
  parseVersion(text: string): Version | null;
  versionAtLeast(actual: Version, minimum: Version): boolean;
  writeProjectSettings(projectDir: string): string;
  normalizeJsonEnvelope(bytes: Uint8Array, overflowed: boolean): Readonly<Record<string, unknown>> | undefined;
}

export function createClaudeFamilyContext(): ClaudeFamilyContext {
  return {
    parseVersion(text) {
      return parseVersion(text);
    },
    versionAtLeast(actual, minimum) {
      return versionAtLeast(actual, minimum);
    },
    writeProjectSettings(projectDir) {
      const settingsDir = join(projectDir, ".claude");
      mkdirSync(settingsDir, { recursive: true });
      const settingsPath = join(settingsDir, "settings.json");
      writeFileSync(settingsPath, JSON.stringify({ hooks: {} }), { encoding: "utf8", mode: 0o600 });
      return settingsPath;
    },
    normalizeJsonEnvelope(bytes, overflowed) {
      if (overflowed) return undefined;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(bytes));
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed as Readonly<Record<string, unknown>>
          : undefined;
      } catch {
        return undefined;
      }
    },
  };
}

export class ClaudeAmbientCredentialSource implements CredentialSourcePort {
  readonly #apiKey: string | undefined;

  constructor(env: Readonly<Record<string, string | undefined>>) {
    this.#apiKey = env.ANTHROPIC_API_KEY || undefined;
  }

  async canLease(declaration: CredentialDeclaration): Promise<boolean> {
    return declaration.childKey === CREDENTIAL_DECLARATION.childKey && this.#apiKey !== undefined;
  }

  async lease(declaration: CredentialDeclaration): Promise<CredentialBinding> {
    if (!(await this.canLease(declaration))) {
      throw new Error("Claude ambient credential is unavailable");
    }
    let value = this.#apiKey;
    let active = true;
    return {
      key: declaration.childKey,
      expose: () => {
        if (!active) throw new Error("credential binding was released");
        return value ?? "";
      },
      release: async () => {
        value = undefined;
        active = false;
      },
    };
  }
}

export interface ClaudeScratchAllocatorOptions {
  readonly prefix: string;
  readonly distributionDir: string;
  readonly family?: ClaudeFamilyContext;
}

export class ClaudeScratchAllocator implements ScratchAllocator {
  readonly #options: ClaudeScratchAllocatorOptions;
  allocationCount = 0;

  constructor(options: ClaudeScratchAllocatorOptions) {
    this.#options = options;
  }

  async allocate(registrar: ResourceRegistrar): Promise<ScratchReceipt> {
    this.allocationCount += 1;
    registrar.registerPlanned({
      id: "scratch-root",
      kind: "scratch-root",
      locator: "temporary-directory",
      credentialBearing: false,
    });
    const root = mkdtempSync(join(tmpdir(), this.#options.prefix));
    registrar.markCreated("scratch-root");
    const projectDir = join(root, "project");
    const homeDir = join(root, "home");
    try {
      cpSync(this.#options.distributionDir, projectDir, { recursive: true });
      mkdirSync(homeDir, { recursive: true });
      mkdirSync(join(root, "tmp"), { recursive: true });
      (this.#options.family ?? createClaudeFamilyContext()).writeProjectSettings(projectDir);
      initializeGit(projectDir, homeDir, process.env);
      return { root, projectDir, homeDir, state: "ready" };
    } catch (error) {
      rmSync(root, { recursive: true, force: true });
      throw error;
    }
  }
}

function initializeGit(
  projectDir: string,
  homeDir: string,
  parentEnv: Readonly<Record<string, string | undefined>>,
): void {
  const base = buildChildEnvironment(parentEnv, CAPABILITY.environment);
  if (!base.ok) throw new Error(`git environment rejected ${base.error.key}`);
  const env = {
    ...base.value,
    HOME: homeDir,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
  };
  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
    [
      "-c", "user.email=live@example.invalid",
      "-c", "user.name=Amadeus Live",
      "-c", "commit.gpgsign=false",
      "-c", "core.hooksPath=",
      "commit", "-qm", "install",
    ],
  ]) {
    const result = spawnSync("git", args, { cwd: projectDir, encoding: "utf8", env, timeout: 30_000 });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${sanitizeText(result.stderr)}`);
  }
}

export interface ClaudePrintAdapterOptions {
  readonly claudeBin: string;
  readonly distributionDir: string;
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  readonly family?: ClaudeFamilyContext;
}

interface ClaudeCliProbe {
  readonly measuredVersion?: string;
  readonly findings: readonly PreflightFinding[];
}

function probeClaudeCli(
  options: ClaudePrintAdapterOptions,
  family: ClaudeFamilyContext,
): ClaudeCliProbe {
  const base = buildChildEnvironment(options.parentEnv, CAPABILITY.environment);
  if (!base.ok) {
    return {
      findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: `Claude environment policy rejected ${base.error.key}`,
      }],
    };
  }
  const version = spawnSync(options.claudeBin, ["--version"], {
    encoding: "utf8",
    env: base.value,
    maxBuffer: 64 * 1024,
    timeout: 15_000,
  });
  if (version.status !== 0) {
    return {
      findings: [{ code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING", diagnostic: "Claude executable is unavailable" }],
    };
  }
  const parsed = family.parseVersion(version.stdout);
  const minimum = family.parseVersion(CAPABILITY.minimumVersion);
  if (minimum === null) throw new Error(`invalid minimumVersion: ${CAPABILITY.minimumVersion}`);
  if (parsed === null || !family.versionAtLeast(parsed, minimum)) {
    return {
      measuredVersion: parsed?.join("."),
      findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED",
        diagnostic: `Claude version is below ${CAPABILITY.minimumVersion}`,
      }],
    };
  }
  const help = spawnSync(options.claudeBin, ["--help"], {
    encoding: "utf8",
    env: base.value,
    maxBuffer: 1024 * 1024,
    timeout: 15_000,
  });
  const missingFlags = CLAUDE_REQUIRED_HELP_FLAGS.filter((flag) => !help.stdout.includes(flag));
  return {
    measuredVersion: parsed.join("."),
    findings: help.status === 0 && missingFlags.length === 0
      ? []
      : [{
          code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
          diagnostic: `Claude print flags unavailable: ${missingFlags.join(",") || "help probe failed"}`,
        }],
  };
}

export class ClaudePrintAdapter implements LiveAdapter {
  readonly capability = CAPABILITY;
  readonly #options: ClaudePrintAdapterOptions;
  readonly #family: ClaudeFamilyContext;
  #binding: CredentialBinding | undefined;
  #activeProcess: Bun.Subprocess | undefined;
  #registrar: ResourceRegistrar | undefined;

  constructor(options: ClaudePrintAdapterOptions) {
    this.#options = options;
    this.#family = options.family ?? createClaudeFamilyContext();
  }

  async preflight(context: PreflightContext): Promise<PreflightResult> {
    const cliProbe = probeClaudeCli(this.#options, this.#family);
    const findings = [...cliProbe.findings];
    if (!existsSync(this.#options.distributionDir)) {
      findings.push({ code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING", diagnostic: "Claude distribution is missing" });
    }
    if (!(await context.credentialSource.canLease(CREDENTIAL_DECLARATION))) {
      findings.push({ code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE", diagnostic: "Claude credential binding is unavailable" });
    }
    return findings.length === 0
      ? { kind: "ready", measuredVersion: cliProbe.measuredVersion ?? "unknown", findings }
      : { kind: "skip", measuredVersion: cliProbe.measuredVersion, findings };
  }

  async prepare(
    context: PrepareContext,
  ): Promise<Result<PreparedRun, Readonly<{ kind: "prepare-failed"; diagnostic: string }>>> {
    this.#registrar = context.registrar;
    const resourceId = "claude-credential-binding";
    context.registrar.registerPlanned({
      id: resourceId,
      kind: "credential-binding",
      locator: "ambient:claude",
      credentialBearing: true,
    });
    try {
      this.#binding = await context.credentialSource.lease(CREDENTIAL_DECLARATION);
      context.registrar.markCreated(resourceId);
      const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
      if (!base.ok) {
        return { ok: false, error: { kind: "prepare-failed", diagnostic: `environment policy rejected ${base.error.key}` } };
      }
      const schema = JSON.stringify(CLAUDE_PRINT_SCHEMA);
      const args = [
        "-p",
        "--setting-sources",
        "project",
        "--tools",
        "",
        "--no-session-persistence",
        "--output-format",
        "json",
        "--json-schema",
        schema,
        "--max-budget-usd",
        "0.25",
      ];
      const binding = this.#binding;
      const environment = {
        ...base.value,
        HOME: context.scratch.homeDir,
        TMPDIR: join(context.scratch.root, "tmp"),
        [binding.key]: binding.expose(),
      };
      return {
        ok: true,
        value: {
          cwd: context.scratch.projectDir,
          executable: this.#options.claudeBin,
          args,
          environmentKeys: Object.keys(environment),
          resolveEnvironment: () => ({ ...environment }),
          registeredResourceIds: [resourceId],
        },
      };
    } catch (error) {
      return { ok: false, error: { kind: "prepare-failed", diagnostic: sanitizeText(String(error)) } };
    }
  }

  async execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution> {
    const processHandle = Bun.spawn({
      cmd: run.prompt === undefined
        ? [run.executable, ...run.args]
        : [run.executable, ...run.args, run.prompt],
      cwd: run.cwd,
      env: run.resolveEnvironment(),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      signal,
    });
    this.#activeProcess = processHandle;
    const stdoutPromise = collectBounded(processHandle.stdout, STDOUT_LIMIT_BYTES);
    const stderrPromise = collectBounded(processHandle.stderr, STDERR_LIMIT_BYTES);
    const exitCode = await processHandle.exited;
    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
    this.#activeProcess = undefined;
    return {
      exitCode,
      timedOut: signal.aborted,
      aborted: false,
      stdoutDigest: stdout.digest,
      stderrDigest: stderr.digest,
      structured: this.#family.normalizeJsonEnvelope(stdout.bytes, stdout.overflowed || stderr.overflowed),
    };
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    const failures: string[] = [];
    if (this.#activeProcess !== undefined) {
      try {
        this.#activeProcess.kill();
        await Promise.race([
          this.#activeProcess.exited,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Claude reap timed out")), 10_000)),
        ]);
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#activeProcess = undefined;
      }
    }
    if (this.#binding !== undefined) {
      try {
        await this.#binding.release();
        this.#registrar?.markReleased("claude-credential-binding");
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
    const receipt = cleanupReceiptFromRegistrar(this.#registrar, target, failures);
    this.#registrar = undefined;
    return receipt;
  }
}
