import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type {
  AdapterExecution,
  CleanupReceipt,
  CleanupTarget,
  CredentialBinding,
  LiveAdapter,
  LiveJourney,
  PreflightResult,
  PrepareContext,
  PreparedRun,
} from "../adapter.ts";
import { digest, type Result } from "../contract.ts";
import { LIVE_CAPABILITIES } from "../registry.ts";
import type { ResourceRegistrar } from "../resources.ts";
import type { FaultPoint } from "./contract-case.ts";

export interface ScriptedAdapterOptions {
  readonly runId: string;
  readonly fault?: Extract<FaultPoint, "prepare-throw" | "execute-failure" | "timeout" | "cleanup" | "leak">;
}

export interface FakeBoundaryCall {
  readonly boundary: string;
  readonly runId: string;
}

export class ScriptedLiveAdapter implements LiveAdapter {
  readonly capability = LIVE_CAPABILITIES[0];
  readonly calls: FakeBoundaryCall[] = [];
  readonly #options: ScriptedAdapterOptions;
  #binding: CredentialBinding | undefined;

  constructor(options: ScriptedAdapterOptions) {
    this.#options = options;
  }

  async preflight(): Promise<PreflightResult> {
    this.#record("probe");
    return { kind: "ready", measuredVersion: "0.146.0", findings: [] };
  }

  async prepare(
    context: PrepareContext,
  ): Promise<Result<PreparedRun, Readonly<{ kind: "prepare-failed"; diagnostic: string }>>> {
    this.#record("prepare");
    context.registrar.registerPlanned({
      id: `${this.#options.runId}-credential`,
      kind: "credential-binding",
      locator: "fixture-credential",
      credentialBearing: true,
    });
    this.#binding = await context.credentialSource.lease({ childKey: "FIXTURE_CREDENTIAL" });
    const binding = this.#binding;
    context.registrar.markCreated(`${this.#options.runId}-credential`);
    if (this.#options.fault === "prepare-throw") throw new Error("injected prepare fault");
    return {
      ok: true,
      value: {
        cwd: context.scratch.projectDir,
        executable: "offline-fake",
        args: [],
        environmentKeys: ["PATH", binding.key],
        resolveEnvironment: () => ({ PATH: "/fixture/bin", [binding.key]: "canary" }),
        registeredResourceIds: [`${this.#options.runId}-credential`],
      },
    };
  }

  async execute(_run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution> {
    this.#record("spawn");
    if (this.#options.fault === "timeout") {
      const abort = () => {
        this.#record("abort");
        this.#record("reap");
      };
      if (signal.aborted) abort();
      else {
      await new Promise<void>((resolve) => {
        signal.addEventListener(
          "abort",
          () => {
            abort();
            resolve();
          },
          { once: true },
        );
      });
      }
      return this.#execution(null, true, true);
    }
    return this.#options.fault === "execute-failure"
      ? this.#execution(1, false, false)
      : this.#execution(0, false, false, { status: "ok" });
  }

  async cleanup(target: CleanupTarget): Promise<CleanupReceipt> {
    this.#record("cleanup");
    const failures: string[] = [];
    if (this.#binding !== undefined) {
      try {
        await this.#binding.release();
      } catch {
        failures.push("credential release failed");
      } finally {
        this.#binding = undefined;
      }
    }
    if (this.#options.fault === "cleanup") failures.push("injected cleanup fault");
    rmSync(target.scratch.root, { recursive: true, force: true });
    const attempted = target.registeredResources.map((resource) => resource.id);
    return {
      attemptedResourceIds: attempted,
      releasedResourceIds: failures.length === 0 ? attempted : [],
      retainedResourceIds: failures.length === 0 ? [] : attempted,
      failures,
      leakFindings: this.#options.fault === "leak" ? ["fixture-canary"] : [],
    };
  }

  #record(boundary: string): void {
    this.calls.push({ boundary, runId: this.#options.runId });
  }

  #execution(
    exitCode: number | null,
    timedOut: boolean,
    aborted: boolean,
    structured?: Readonly<Record<string, unknown>>,
  ): AdapterExecution {
    return {
      exitCode,
      timedOut,
      aborted,
      stdoutDigest: digest(structured === undefined ? "" : JSON.stringify(structured)),
      stderrDigest: digest(exitCode === 0 ? "" : "fixture failure"),
      structured,
    };
  }
}

export function createScriptedJourney(input: Readonly<{
  id?: string;
  timeoutMs?: number;
  fault?: Extract<FaultPoint, "assertion">;
}> = {}): LiveJourney {
  return {
    id: input.id ?? "offline-contract-journey",
    prompt: "offline fixture prompt",
    timeoutMs: input.timeoutMs ?? 20,
    retryPolicy: { maxAttempts: 1 },
    assert: (execution) => ({
      passed: input.fault !== "assertion" && execution.exitCode === 0 && execution.structured?.status === "ok",
      diagnostic: input.fault === "assertion" ? "injected assertion mismatch" : "structured anchor matched",
      evidence: [],
    }),
  };
}

export function allocateOfflineScratch(root: string, runId: string, registrar: ResourceRegistrar): Readonly<{
  root: string;
  homeDir: string;
  projectDir: string;
  state: "ready";
}> {
  const scratch = join(root, runId);
  const homeDir = join(scratch, "home");
  const projectDir = join(scratch, "project");
  registrar.registerPlanned({
    id: `${runId}-scratch`,
    kind: "scratch-root",
    locator: "fixture-root",
    credentialBearing: false,
  });
  mkdirSync(homeDir, { recursive: true });
  mkdirSync(projectDir, { recursive: true });
  registrar.markCreated(`${runId}-scratch`);
  return { root: scratch, homeDir, projectDir, state: "ready" };
}
