// tla-referee-toolchain.ts — the production TlcToolchain port for U3.
//
// It wires the referee's port (tla-referees.ts) to the shipped TLC child
// process contract without changing it: the planned toolchain path
// (createDefaultModelCheckToolchain → acquire → preparePlanned → runPlanned)
// already accepts a VerifiedTlaModelReceipt, validates the on-disk bytes
// against that receipt, and returns the toolchain's own TlcExploration. The
// registered-model byte pin in run-model-check-source.ts is a different entry
// point and is left untouched — mutants are transient by construction and never
// enter it (ADR-5, BR-U3-03).

import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import { createDefaultModelCheckToolchain } from "./run-model-check.ts";
import { resolveAuxiliaryModules, type ModuleDepsError } from "./tla-module-deps.ts";
import { createVerifiedTlaModelReceipt } from "./tla-model-receipt.ts";
import type { VerifiedModelSource } from "./tla-model-loader-internal.ts";
import type { ModelMapAssetIdentity, ModelMapModel } from "./amadeus-formal-verif-model-map.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR, FIXED_JDK_RUN_PROFILE, type TraceVocabulary } from "./tlc-toolchain.ts";
import { createDockerPlannerConfig, selectTlcSpawnPlanner, NodePlannerEnvironmentPort } from "./tlc-spawn-planner.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import type { Result } from "./contract.ts";
import type { TlcRunRequest, TlcToolchain } from "./tla-referees.ts";

const MODULE_IDENTITY_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const CFG_IDENTITY_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";
const DEFAULT_DEADLINE_MS = 180_000;

/** `VARIABLE x` / `VARIABLES x, y` — the trace vocabulary the toolchain labels states with. */
const VARIABLES_RE = /^\s*VARIABLES?\s+(.+?)\s*$/m;
const CONFIG_INVARIANT_RE = /^\s*INVARIANTS?\s+(.+?)\s*$/gm;

export interface RefereeToolchainOptions {
  /** Where the TLC jar and the sealed JDK snapshot are cached between runs. */
  readonly cacheRoot?: string;
  readonly deadlineMs?: number;
}

function sourceIdentityOf(bytes: Uint8Array, domain: string): string {
  return canonicalIdentity({ bytes: Buffer.from(bytes).toString("base64") }, domain).sha256;
}

function declaredInvariantsOf(config: string): readonly string[] {
  const names: string[] = [];
  for (const match of config.matchAll(CONFIG_INVARIANT_RE)) {
    for (const name of (match[1] as string).split(/[\s,]+/)) if (name !== "") names.push(name);
  }
  return names;
}

function traceStateVariablesOf(source: string): readonly string[] {
  const match = VARIABLES_RE.exec(source);
  if (match === null) return [];
  return (match[1] as string).split(/[\s,]+/).filter((name) => name !== "");
}

function assetIdentity(path: string, identity: string): ModelMapAssetIdentity {
  return { path, identity };
}

/**
 * Describes the mutant to the toolchain in its own vocabulary. The receipt is
 * derived from the very bytes on disk, so the toolchain's byte check compares
 * the mutant against itself — the guarantee it makes for a registered model
 * (bytes match the receipt) holds here too.
 */
function describeMutant(
  modulePath: string,
  configPath: string,
): Result<{ model: ModelMapModel; source: VerifiedModelSource; vocabulary: TraceVocabulary }, ModuleDepsError> {
  const moduleBytes = new Uint8Array(readFileSync(modulePath));
  const cfgBytes = new Uint8Array(readFileSync(configPath));
  const moduleSource = new TextDecoder().decode(moduleBytes);
  const cfgSource = new TextDecoder().decode(cfgBytes);
  const moduleName = basename(modulePath, ".tla");
  const workspaceRoot = dirname(modulePath);

  const readModule = (name: string): Result<string, ModuleDepsError> => {
    const path = join(workspaceRoot, `${name}.tla`);
    try {
      return { ok: true, value: readFileSync(path, "utf8") };
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: "MODULE_DEPS",
          code: "MODULE_DEP_UNRESOLVED",
          relativePath: path,
          detail: cause instanceof Error ? cause.message : String(cause),
        },
      };
    }
  };
  const auxiliaries = resolveAuxiliaryModules(moduleName, readModule);
  if (!auxiliaries.ok) return auxiliaries;

  const auxIdentities = auxiliaries.value.map((name) => {
    const path = join(workspaceRoot, `${name}.tla`);
    return assetIdentity(path, sourceIdentityOf(new Uint8Array(readFileSync(path)), MODULE_IDENTITY_DOMAIN));
  });
  const vocabulary: TraceVocabulary = {
    moduleName,
    namedInvariants: declaredInvariantsOf(cfgSource),
    traceStateVariables: traceStateVariablesOf(moduleSource),
  };
  const model: ModelMapModel = {
    name: moduleName,
    model: assetIdentity(modulePath, sourceIdentityOf(moduleBytes, MODULE_IDENTITY_DOMAIN)),
    cfg: assetIdentity(configPath, sourceIdentityOf(cfgBytes, CFG_IDENTITY_DOMAIN)),
    auxiliaries: auxIdentities,
    entries: [],
    vocabulary: {
      namedInvariants: [...vocabulary.namedInvariants],
      traceStateVariables: [...vocabulary.traceStateVariables],
    },
  };
  const source: VerifiedModelSource = {
    model,
    moduleBytes,
    cfgBytes,
    moduleSource,
    cfgSource,
    moduleIdentity: model.model.identity,
    cfgIdentity: model.cfg.identity,
    auxIdentities,
  };
  return { ok: true, value: { model, source, vocabulary } };
}

function fail(detail: string): never {
  throw new Error(`referee toolchain: ${detail}`);
}

/**
 * Runs one model through the shipped planned toolchain. Every run gets its own
 * cache-adjacent scratch and JDK snapshot root because the toolchain refuses to
 * reuse an existing snapshot root, and its workspace is the directory holding
 * the model — for mutants, the workshop's temporary run directory.
 */
async function runOnce(
  request: TlcRunRequest,
  options: RefereeToolchainOptions,
): Promise<import("./tlc-toolchain.ts").TlcExploration> {
  const modulePath = realpathSync(request.modulePath);
  const configPath = realpathSync(request.configPath);
  const workspaceRoot = realpathSync(dirname(modulePath));
  const cacheRoot = options.cacheRoot ?? join(tmpdir(), "amadeus-tla-referee-cache");

  const described = describeMutant(modulePath, configPath);
  if (!described.ok) fail(described.error.detail);
  const receipt = createVerifiedTlaModelReceipt(described.value.source);
  if (!receipt.ok) fail(receipt.error.message);

  const toolchain = createDefaultModelCheckToolchain(cacheRoot, workspaceRoot);
  const acquired = await toolchain.acquire();
  if (!acquired.ok) fail(JSON.stringify(acquired.error));

  const planner = selectTlcSpawnPlanner(
    "auto",
    { imageRef: FIXED_DOCKER_IMAGE, jarPath: acquired.value.cachePath, jarSha256: acquired.value.actualSha256 },
    new NodePlannerEnvironmentPort(),
  );
  if (!planner.ok) fail(JSON.stringify(planner.error));

  const prepared = await toolchain.preparePlanned({
    artifact: acquired.value,
    modelReceipt: receipt.value,
    vocabulary: described.value.vocabulary,
    modulePath,
    cfgPath: configPath,
    subjectAlias: `tla-referee-${request.kind}`,
    deadlineMs: options.deadlineMs ?? DEFAULT_DEADLINE_MS,
    runId: randomUUID(),
    scratchRoot: mkdtempSync(join(tmpdir(), "amadeus-tla-referee-run-")),
    planner: planner.value,
  });
  if (!prepared.ok) fail(JSON.stringify(prepared.error));

  const executed = await toolchain.runPlanned(prepared.value);
  if (!executed.ok) fail(JSON.stringify(executed.error));
  return executed.value.exploration;
}

/** The version line every receipt records: the pinned jar plus the pinned JDK. */
export function refereeToolchainVersionLine(): string {
  return `tla2tools ${FIXED_TLC_ARTIFACT_DESCRIPTOR.version} / ${FIXED_JDK_RUN_PROFILE.vendor} ${FIXED_JDK_RUN_PROFILE.version}`;
}

export function createRefereeToolchain(options: RefereeToolchainOptions = {}): TlcToolchain {
  return {
    versionLine: refereeToolchainVersionLine(),
    run: (request) => runOnce(request, options),
  };
}

export const RefereeToolchainInternals = {
  describeMutant,
  declaredInvariantsOf,
  traceStateVariablesOf,
} as const;
