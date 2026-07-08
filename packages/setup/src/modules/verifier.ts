import { join } from "node:path";
import { engineDirNameFor } from "../domain/engine-layout.ts";
import type { Manifest } from "../domain/manifest.ts";
import { VerifyResult, type Check } from "../domain/verify-result.ts";
import type { VerifyRead } from "../ports/verify-read.ts";

export type Verifier = {
  verify(target: string, manifest: Manifest): Promise<VerifyResult>;
};

// FR-013/BR-I14: file-existence verification plus the 4-point doctor-equivalent
// check (harness-dir/tools-dir/memory-shell/state-absence). Read-only by
// construction (VerifyRead has no write capability).
export namespace Verifier {
  export function create(fsRead: VerifyRead): Verifier {
    return Object.freeze({
      async verify(target: string, manifest: Manifest): Promise<VerifyResult> {
        const checks: Check[] = [];

        const requiredPaths = manifest.requiredPaths();
        const missing: string[] = [];
        for (const path of requiredPaths) {
          if (!(await fsRead.fileExists(join(target, path)))) missing.push(path);
        }
        checks.push({
          name: "required-files",
          ok: missing.length === 0,
          detail:
            missing.length === 0
              ? `all ${requiredPaths.length} required files are present`
              : `missing required files: ${missing.join(", ")}`,
        });

        const engineDir = engineDirNameFor(manifest.harness);
        const harnessDirOk = await fsRead.dirExists(join(target, engineDir));
        checks.push({
          name: "harness-dir",
          ok: harnessDirOk,
          detail: harnessDirOk ? `${engineDir} exists` : `${engineDir} is missing`,
        });

        const toolsDirOk = await fsRead.dirExists(join(target, engineDir, "tools"));
        checks.push({
          name: "tools-dir",
          ok: toolsDirOk,
          detail: toolsDirOk ? `${engineDir}/tools exists` : `${engineDir}/tools is missing`,
        });

        const memoryDirOk = await fsRead.dirExists(join(target, "amadeus", "spaces", "default", "memory"));
        checks.push({
          name: "memory-shell",
          ok: memoryDirOk,
          detail: memoryDirOk ? "amadeus/spaces/default/memory exists" : "amadeus/spaces/default/memory is missing",
        });

        // Informational only: a fresh install having no active workflow
        // state yet is the expected, healthy condition (FR-013: "state/intent
        // 不在の正常処理"), not a failure mode this check should gate on.
        const activeIntentExists = await fsRead.fileExists(join(target, "amadeus", "spaces", "default", "intents", "active-intent"));
        checks.push({
          name: "state-absence",
          ok: true,
          detail: activeIntentExists
            ? "an existing intent state was found and left untouched"
            : "no active intent state found (expected for a fresh install)",
        });

        return VerifyResult.of(checks);
      },
    });
  }
}

Object.freeze(Verifier);
