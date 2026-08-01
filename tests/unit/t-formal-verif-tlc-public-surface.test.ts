import { describe, expect, test } from "bun:test";
import { FsTlcToolchain } from "../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import * as fsToolchainSurface from "../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import * as tlcToolchainSurface from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
  type FrozenTlaModelBundle,
  type FrozenTlaModelReceipt,
  type TlaInvariantSourceLocation,
} from "../../plugins/formal-model-check/tools/tla-arm.ts";
import {
  FIXED_JDK_RUN_PROFILE,
  FIXED_JDK_RUN_PROFILE_IDENTITY,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  FIXED_TLC_PROFILE,
  FIXED_TLC_PROFILE_IDENTITY,
  parseTlcOutput174,
  type CompleteTlcExploration,
  type CounterexampleTlcExploration,
  type FailedTlcExploration,
  type JdkRunProfile,
  type PreparedTlcRun,
  type RawTlcOutcome,
  type TlcArtifactDescriptor,
  type TlcCellBinding,
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
} from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

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
  test("exposes one composed filesystem toolchain without leaking its internal artifact store", () => {
    expect(FsTlcToolchain.name).toBe("FsTlcToolchain");
    expect(Object.keys(fsToolchainSurface)).not.toContain("FsTlcArtifactCache");
    expect(Object.keys(tlcToolchainSurface)).not.toContain("normalizeTlcExploration");
  });

  test("freezes the U5 bridge runtime constants and keeps their U4 issuers callable", () => {
    expect(Object.isFrozen(FIXED_JDK_RUN_PROFILE)).toBe(true);
    expect(Object.isFrozen(FIXED_TLC_ARTIFACT_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(FIXED_TLC_PROFILE)).toBe(true);
    for (const identity of [FIXED_JDK_RUN_PROFILE_IDENTITY, FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, FIXED_TLC_PROFILE_IDENTITY]) {
      expect(identity).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(typeof createFrozenTlaModelReceipt).toBe("function");
    expect(typeof generateFrozenTlaModel).toBe("function");
    expect(typeof parseTlcOutput174).toBe("function");
  });
});
