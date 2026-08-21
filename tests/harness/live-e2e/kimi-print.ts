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
import { type Result, sanitizeText } from "./contract.ts";
import { bindKimiScratchHome, KIMI_HOME_BINDING_KEY, writeKimiScratchConfig } from "./kimi.ts";
import { buildChildEnvironment } from "./policy.ts";
import { requireCapability } from "./registry.ts";
import { cleanupReceiptFromRegistrar, type ResourceRegistrar } from "./resources.ts";
import { collectBounded } from "./stream.ts";
import { removeTreeVerified } from "./testing/remove-tree-verified.ts";
import { parseVersion, versionAtLeast } from "./version.ts";

/**
 * The anchor file the journey asks Kimi to write into the scratch project. A
 * file the model had to create is the deterministic half of the PASS product;
 * the model's own prose is never asserted (BR-KIMI-13).
 */
export const KIMI_PRINT_ANCHOR_FILE = ".amadeus-live-kimi-anchor.json";

export const KIMI_PRINT_PROMPT =
  `Create a file named ${KIMI_PRINT_ANCHOR_FILE} in the current directory containing exactly ` +
  `{"amadeus_live_e2e":"ok"}, then reply with one short sentence.`;

const CAPABILITY = requireCapability("kimi-print");
const CREDENTIAL_DECLARATION: CredentialDeclaration = { childKey: KIMI_HOME_BINDING_KEY };
const CREDENTIAL_RESOURCE_ID = "kimi-credential-binding";

/**
 * security-design.md pins 4,096 UTF-8 bytes per stream. The kernel hashes the
 * FULL stream and retains only this prefix, so the digest still covers
 * everything the child wrote while nothing beyond the bound is held in memory.
 */
export const KIMI_STREAM_LIMIT_BYTES = 4_096;

export interface KimiPrintAdapterOptions {
  readonly kimiBin: string;
  readonly distributionDir: string;
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  /** Model id seeded into the scratch config; defaults to the journey model. */
  readonly model?: string;
}

interface KimiCliProbe {
  readonly measuredVersion?: string;
  readonly findings: readonly PreflightFinding[];
}

/**
 * Version probing runs under the SAME allow-list environment the child will
 * get, so a probe can never succeed through ambient state the journey is not
 * allowed to inherit.
 */
function probeKimiCli(options: KimiPrintAdapterOptions): KimiCliProbe {
  const base = buildChildEnvironment(options.parentEnv, CAPABILITY.environment);
  if (!base.ok) {
    return {
      findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED",
        diagnostic: `Kimi environment policy rejected ${base.error.key}`,
      }],
    };
  }
  const version = spawnSync(options.kimiBin, ["--version"], {
    encoding: "utf8",
    env: base.value,
    maxBuffer: 64 * 1024,
    timeout: scaleTestTime(15_000),
  });
  if (version.status !== 0) {
    return {
      findings: [{
        code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING",
        diagnostic: "Kimi executable is unavailable",
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
        diagnostic: `Kimi version is below ${CAPABILITY.minimumVersion}`,
      }],
    };
  }
  return { measuredVersion: parsed.join("."), findings: [] };
}

export class KimiPrintAdapter implements LiveAdapter {
  readonly capability = CAPABILITY;
  readonly #options: KimiPrintAdapterOptions;
  #binding: CredentialBinding | undefined;
  #activeProcess: Bun.Subprocess | undefined;
  #registrar: ResourceRegistrar | undefined;

  constructor(options: KimiPrintAdapterOptions) {
    this.#options = options;
  }

  async preflight(context: PreflightContext): Promise<PreflightResult> {
    const cliProbe = probeKimiCli(this.#options);
    const findings = [...cliProbe.findings];
    if (!existsSync(this.#options.distributionDir)) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING",
        diagnostic: "Kimi distribution is missing",
      });
    }
    // Presence only: preflight never reads, copies, or opens the credential.
    if (!(await context.credentialSource.canLease(CREDENTIAL_DECLARATION))) {
      findings.push({
        code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE",
        diagnostic: "Kimi Code is not authenticated (run `kimi login`)",
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
      locator: "home-binding:kimi",
      credentialBearing: true,
    });
    try {
      this.#binding = await context.credentialSource.lease(CREDENTIAL_DECLARATION);
      bindKimiScratchHome(context.scratch.homeDir, this.#binding.expose());
      context.registrar.markCreated(CREDENTIAL_RESOURCE_ID);
      writeKimiScratchConfig(context.scratch.homeDir, this.#options.model);
      const base = buildChildEnvironment(this.#options.parentEnv, this.capability.environment);
      if (!base.ok) {
        return {
          ok: false,
          error: { kind: "prepare-failed", diagnostic: `environment policy rejected ${base.error.key}` },
        };
      }
      // HOME and KIMI_CODE_HOME are declared source-path keys, so they are never
      // inherited; the scratch values are bound here and nowhere else.
      const environment = {
        ...base.value,
        HOME: context.scratch.homeDir,
        KIMI_CODE_HOME: context.scratch.homeDir,
        TMPDIR: join(context.scratch.root, "tmp"),
      };
      return {
        ok: true,
        value: {
          cwd: context.scratch.projectDir,
          executable: this.#options.kimiBin,
          args: ["-p"],
          environmentKeys: Object.keys(environment),
          resolveEnvironment: () => ({ ...environment }),
          registeredResourceIds: [CREDENTIAL_RESOURCE_ID],
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
    const stdoutPromise = collectBounded(processHandle.stdout, KIMI_STREAM_LIMIT_BYTES);
    const stderrPromise = collectBounded(processHandle.stderr, KIMI_STREAM_LIMIT_BYTES);
    const exitCode = await processHandle.exited;
    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
    this.#activeProcess = undefined;
    return {
      exitCode,
      timedOut: signal.aborted,
      aborted: false,
      stdoutDigest: stdout.digest,
      stderrDigest: stderr.digest,
      // `kimi -p` emits prose, not a structured envelope, so the only run-level
      // structure is how much each stream produced. The PASS anchor is the file.
      structured: {
        stdoutTruncated: stdout.overflowed,
        stderrTruncated: stderr.overflowed,
      },
    };
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    const failures: string[] = [];
    if (this.#activeProcess !== undefined) {
      let reapTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        this.#activeProcess.kill();
        await Promise.race([
          this.#activeProcess.exited,
          new Promise<never>((_, reject) => {
            reapTimer = setTimeout(() => reject(new Error("Kimi reap timed out")), scaleTestTime(10_000));
          }),
        ]);
      } catch (error) {
        failures.push(sanitizeText(String(error)));
      } finally {
        if (reapTimer !== undefined) clearTimeout(reapTimer);
        this.#activeProcess = undefined;
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
    // Removing the scratch tree removes the symlinks; the source entries they
    // pointed at are never followed, edited, or deleted.
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
