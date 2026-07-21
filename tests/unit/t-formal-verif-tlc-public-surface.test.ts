import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FIXED_JDK_RUN_PROFILE,
  FIXED_JDK_RUN_PROFILE_IDENTITY,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  FIXED_TLC_PROFILE,
  FIXED_TLC_PROFILE_IDENTITY,
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
  normalizeTlcExploration,
  parseTlcOutput174,
  type CompleteTlcExploration,
  type CounterexampleTlcExploration,
  type FailedTlcExploration,
  type FrozenTlaModelBundle,
  type FrozenTlaModelReceipt,
  type JdkRunProfile,
  type PreparedTlcRun,
  type RawTlcOutcome,
  type TlaInvariantSourceLocation,
  type TlcArtifactDescriptor,
  type TlcCellBinding,
  type TlcCellNormalizationError,
  type TlcCellNormalizationInput,
  type TlcClosedEnvironment,
  type TlcExploration,
  type TlcNormalizationInput,
  type TlcOperationError,
  type TlcOutputInput,
  type TlcPrepareInput,
  type TlcProfile,
  type TlcRunManifest,
  type TlcToolchainError,
  type TlcToolchainFacade,
  type TlcTraceState,
  type ToolchainDomainError,
  type VerifiedJdkSnapshot,
  type VerifiedSandbox,
  type VerifiedTlcArtifact,
} from "../../scripts/formal-verif/index.ts";
import * as publicSurface from "../../scripts/formal-verif/index.ts";

type U5BridgeSurface = {
  model: FrozenTlaModelBundle;
  modelReceipt: FrozenTlaModelReceipt;
  sourceLocation: TlaInvariantSourceLocation;
  outputInput: TlcOutputInput;
  complete: CompleteTlcExploration;
  counterexample: CounterexampleTlcExploration;
  failure: FailedTlcExploration;
  exploration: TlcExploration;
  trace: TlcTraceState;
  cellInput: TlcCellNormalizationInput;
  cellError: TlcCellNormalizationError;
  descriptor: TlcArtifactDescriptor;
  profile: TlcProfile;
  jdkProfile: JdkRunProfile;
  domainError: ToolchainDomainError;
  operationError: TlcOperationError;
  toolchainError: TlcToolchainError;
  artifact: VerifiedTlcArtifact;
  jdk: VerifiedJdkSnapshot;
  sandbox: VerifiedSandbox;
  manifest: TlcRunManifest;
  environment: TlcClosedEnvironment;
  prepareInput: TlcPrepareInput;
  prepared: PreparedTlcRun;
  outcome: RawTlcOutcome;
  binding: TlcCellBinding;
  normalizationInput: TlcNormalizationInput;
  facade: TlcToolchainFacade;
};

const acceptU5BridgeSurface = (_surface: U5BridgeSurface): void => {};
void acceptU5BridgeSurface;

describe("formal verification TLC root public surface", () => {
  test("exports only the U5 bridge runtime values needed from U4", () => {
    const requiredRuntime = {
      FIXED_JDK_RUN_PROFILE,
      FIXED_JDK_RUN_PROFILE_IDENTITY,
      FIXED_TLC_ARTIFACT_DESCRIPTOR,
      FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      FIXED_TLC_PROFILE,
      FIXED_TLC_PROFILE_IDENTITY,
      createFrozenTlaModelReceipt,
      generateFrozenTlaModel,
      normalizeTlcExploration,
      parseTlcOutput174,
    };

    expect(Object.keys(requiredRuntime).sort()).toEqual([
      "FIXED_JDK_RUN_PROFILE",
      "FIXED_JDK_RUN_PROFILE_IDENTITY",
      "FIXED_TLC_ARTIFACT_DESCRIPTOR",
      "FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY",
      "FIXED_TLC_PROFILE",
      "FIXED_TLC_PROFILE_IDENTITY",
      "createFrozenTlaModelReceipt",
      "generateFrozenTlaModel",
      "normalizeTlcExploration",
      "parseTlcOutput174",
    ]);
    const exportedRuntime = [
      publicSurface.FIXED_JDK_RUN_PROFILE,
      publicSurface.FIXED_JDK_RUN_PROFILE_IDENTITY,
      publicSurface.FIXED_TLC_ARTIFACT_DESCRIPTOR,
      publicSurface.FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      publicSurface.FIXED_TLC_PROFILE,
      publicSurface.FIXED_TLC_PROFILE_IDENTITY,
      publicSurface.createFrozenTlaModelReceipt,
      publicSurface.generateFrozenTlaModel,
      publicSurface.normalizeTlcExploration,
      publicSurface.parseTlcOutput174,
    ];
    expect(exportedRuntime).toEqual(Object.values(requiredRuntime));
    expect(Object.isFrozen(FIXED_JDK_RUN_PROFILE)).toBe(true);
    expect(Object.isFrozen(FIXED_TLC_ARTIFACT_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(FIXED_TLC_PROFILE)).toBe(true);
  });

  test("keeps U4 adapters, ports, composition, and issuers behind the root seam", () => {
    const runtimeKeys = Object.keys(publicSurface);
    const internalNames = [
      "ArtifactNetworkPort",
      "DarwinSandboxExecProvider",
      "FIXED_TLC_174_GRAMMAR_DESCRIPTOR_IDENTITY",
      "FsTlcArtifactCache",
      "PhysicalReservationPort",
      "TlcExecutionPort",
      "TlcProcessPort",
      "TlcSandboxProvider",
      "applyTlaElectionAction",
      "createInitialTlaElectionState",
      "createJdkDistributionManifest",
      "createJdkSnapshotIdentity",
      "createSandboxProbeReceipt",
      "createTlcRunManifest",
      "resolveTlaBallots",
      "tlaCfgBytesIdentity",
      "tlaModuleBytesIdentity",
      "validateFrozenTlaModelReceipt",
      "validateFixedJdkRunProfile",
      "validateFixedTlcArtifactDescriptor",
      "validateFixedTlcProfile",
    ];

    for (const name of internalNames) expect(runtimeKeys).not.toContain(name);
    expect(runtimeKeys.filter((name) => /issuer/i.test(name))).toEqual([]);

    const barrel = readFileSync(resolve("scripts/formal-verif/index.ts"), "utf8");
    expect(barrel).not.toContain('export * from "./tla-arm.ts"');
    expect(barrel).not.toContain('export * from "./tlc-toolchain.ts"');
    expect(barrel).not.toContain('export * from "./fs-tlc-toolchain.ts"');
  });
});
