import type { Harness } from "../domain/installer-contracts.ts";
import type { ApplyDecision } from "../domain/apply-types.ts";
import type { FileOperationPlan } from "../domain/plan-types.ts";
import type { ManifestReadResult } from "../domain/target-types.ts";

export type TargetManifestReadPort = {
  readManifestForDetection(targetPath: string): Promise<ManifestReadResult> | ManifestReadResult;
};

export type TargetReadOnlyFilePort = {
  exists(path: string): Promise<boolean> | boolean;
  readFile(path: string): Promise<Uint8Array> | Uint8Array;
  md5(path: string): Promise<string> | string;
};

export type PromptPort = {
  chooseHarness(request: {
    targetPath: string;
    candidates: readonly Harness[];
    reason: "kiro-kiro-ide-ambiguity";
  }): Promise<Harness | undefined> | Harness | undefined;
  chooseTarget?(request: {
    defaultTarget?: string;
    reason: "target-missing";
  }): Promise<string | undefined> | string | undefined;
  confirmApply?(plan: FileOperationPlan): Promise<ApplyDecision> | ApplyDecision;
};
