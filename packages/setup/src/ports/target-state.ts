import type { Harness } from "../cli/types.ts";
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
};
