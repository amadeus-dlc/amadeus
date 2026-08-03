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
import { digest, type Result, sanitizeText } from "./contract.ts";
import { buildChildEnvironment } from "./policy.ts";
import { LIVE_CAPABILITIES } from "./registry.ts";
import type { ResourceRegistrar } from "./resources.ts";

const CREDENTIAL_DECLARATION: CredentialDeclaration = { childKey: "OPENAI_API_KEY" };

export class EnvironmentCredentialSource implements CredentialSourcePort {
  readonly #env: Readonly<Record<string, string | undefined>>;

  constructor(env: Readonly<Record<string, string | undefined>>) {
    this.#env = env;
  }

  async canLease(declaration: CredentialDeclaration): Promise<boolean> {
    return Boolean(this.#env[declaration.childKey]);
  }

  async lease(declaration: CredentialDeclaration): Promise<CredentialBinding> {
    let value = this.#env[declaration.childKey];
    if (!value) throw new Error(`credential unavailable for ${declaration.childKey}`);
    return {
      key: declaration.childKey,
      expose: () => {
        if (!value) throw new Error("credential binding was released");
        return value;
      },
      release: async () => {
        value = undefined;
      },
    };
  }
}

export interface CodexScratchAllocatorOptions {
  readonly prefix: string;
  readonly distributionDir: string;
}

export class CodexScratchAllocator implements ScratchAllocator {
  readonly #options: CodexScratchAllocatorOptions;
  allocationCount = 0;

  constructor(options: CodexScratchAllocatorOptions) {
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
    const homeDir = join(root, "codex-home");
    try {
      cpSync(this.#options.distributionDir, projectDir, { recursive: true });
      mkdirSync(homeDir, { recursive: true });
      const exampleConfig = join(projectDir, ".codex", "config.toml.example");
      if (existsSync(exampleConfig)) {
        cpSync(exampleConfig, join(projectDir, ".codex", "config.toml"));
      }
      writeFileSync(
        join(homeDir, "config.toml"),
        `[projects.${JSON.stringify(projectDir)}]\ntrust_level = "trusted"\n`,
        "utf8",
      );
      initializeGit(projectDir);
      return { root, projectDir, homeDir, state: "ready" };
    } catch (error) {
      rmSync(root, { recursive: true, force: true });
      throw error;
    }
  }
}

function initializeGit(projectDir: string): void {
  for (const args of [
    ["init", "-q"],
    ["add", "-A"],
    ["-c", "user.email=live@example.invalid", "-c", "user.name=Amadeus Live", "commit", "-qm", "install"],
  ]) {
    const result = spawnSync("git", args, { cwd: projectDir, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${sanitizeText(result.stderr)}`);
  }
}

export interface CodexExecAdapterOptions {
  readonly codexBin: string;
  readonly distributionDir: string;
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  readonly model?: string;
}

function parseVersion(text: string): readonly [number, number, number] | null {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)/);
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])];
}

function versionAtLeast(
  actual: readonly [number, number, number],
  minimum: readonly [number, number, number],
): boolean {
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }
  return true;
}

export class CodexExecAdapter implements LiveAdapter {
  readonly capability = LIVE_CAPABILITIES[0];
  readonly #options: CodexExecAdapterOptions;
  #binding: CredentialBinding | undefined;
  #activeProcess: Bun.Subprocess | undefined;

  constructor(options: CodexExecAdapterOptions) {
    this.#options = options;
  }

  async preflight(context: PreflightContext): Promise<PreflightResult> {
    const findings: PreflightFinding[] = [];
    const baseEnvironment = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
    const version = baseEnvironment.ok
      ? spawnSync(this.#options.codexBin, ["--version"], {
          encoding: "utf8",
          env: baseEnvironment.value,
        })
      : null;
    const parsed = version?.status === 0 ? parseVersion(version.stdout) : null;
    if (version === null || version.status !== 0) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
        diagnostic: "Codex executable is unavailable",
      });
    } else if (parsed === null || !versionAtLeast(parsed, [0, 139, 0])) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED",
        diagnostic: "Codex version is below 0.139.0",
      });
    }
    if (!existsSync(this.#options.distributionDir)) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING",
        diagnostic: "Codex distribution is missing",
      });
    }
    if (!(await context.credentialSource.canLease(CREDENTIAL_DECLARATION))) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE",
        diagnostic: "OPENAI_API_KEY credential lease is unavailable",
      });
    }
    return findings.length === 0
      ? { kind: "ready", measuredVersion: parsed?.join(".") ?? "unknown", findings }
      : { kind: "skip", measuredVersion: parsed?.join("."), findings };
  }

  async prepare(context: PrepareContext): Promise<Result<PreparedRun, { kind: "prepare-failed"; diagnostic: string }>> {
    const resourceId = "codex-credential-binding";
    context.registrar.registerPlanned({
      id: resourceId,
      kind: "credential-binding",
      locator: "env:OPENAI_API_KEY",
      credentialBearing: true,
    });
    try {
      this.#binding = await context.credentialSource.lease(CREDENTIAL_DECLARATION);
      context.registrar.markCreated(resourceId);
      const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
      if (!base.ok) {
        return { ok: false, error: { kind: "prepare-failed", diagnostic: `environment policy rejected ${base.error.key}` } };
      }
      const args = [
        "exec",
        "--json",
        "--ephemeral",
        "--ignore-user-config",
        "--sandbox",
        "workspace-write",
        "-C",
        context.scratch.projectDir,
      ];
      if (this.#options.model !== undefined) args.push("--model", this.#options.model);
      return {
        ok: true,
        value: {
          cwd: context.scratch.projectDir,
          executable: this.#options.codexBin,
          args,
          environmentKeys: [...Object.keys(base.value), "HOME", "CODEX_HOME", this.#binding.key],
          resolveEnvironment: () => ({
            ...base.value,
            HOME: context.scratch.homeDir,
            CODEX_HOME: context.scratch.homeDir,
            [this.#binding?.key ?? CREDENTIAL_DECLARATION.childKey]: this.#binding?.expose() ?? "",
          }),
          registeredResourceIds: [resourceId],
        },
      };
    } catch (error) {
      return { ok: false, error: { kind: "prepare-failed", diagnostic: sanitizeText(String(error)) } };
    }
  }

  async execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution> {
    const processHandle = Bun.spawn({
      cmd: [run.executable, ...run.args, run.prompt ?? ""],
      cwd: run.cwd,
      env: run.resolveEnvironment(),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      signal,
    });
    this.#activeProcess = processHandle;
    const stdoutPromise = new Response(processHandle.stdout).text();
    const stderrPromise = new Response(processHandle.stderr).text();
    const exitCode = await processHandle.exited;
    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
    this.#activeProcess = undefined;
    const structured = stdout
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as Readonly<Record<string, unknown>>];
        } catch {
          return [];
        }
      })
      .at(-1);
    return {
      exitCode,
      timedOut: signal.aborted,
      aborted: signal.aborted,
      stdoutDigest: digest(stdout),
      stderrDigest: digest(stderr),
      structured,
    };
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    const failures: string[] = [];
    if (this.#activeProcess !== undefined) {
      try {
        this.#activeProcess.kill();
        await this.#activeProcess.exited;
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#activeProcess = undefined;
      }
    }
    if (this.#binding !== undefined) {
      try {
        await this.#binding.release();
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        this.#binding = undefined;
      }
    }
    try {
      rmSync(target.scratch.root, { recursive: true, force: true });
    } catch (error) {
      failures.push(sanitizeText(String(error)));
    }
    const attempted = target.registeredResources.map((resource) => resource.id);
    return {
      attemptedResourceIds: attempted,
      releasedResourceIds: failures.length === 0 ? attempted : [],
      retainedResourceIds: [],
      failures,
      leakFindings: [],
    };
  }
}
