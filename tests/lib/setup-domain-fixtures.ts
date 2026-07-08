// Shared fixture helpers for setup-foundation (U1) domain unit tests.
// Consolidates the parse-or-throw SemVer helper and the ExtractedPayload fake
// that were duplicated across multiple test files (thermo-review finding #5).

import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import type { ExtractedPayload } from "../../packages/setup/src/domain/payload.ts";

export function semver(raw: string): SemVer {
  const result = SemVer.parse(raw);
  if (result.type === "err") throw new Error(`invalid fixture version: ${raw}`);
  return result.value;
}

export function fakePayload(version: ResolvedVersion = ResolvedVersion.fromRelease(semver("1.0.0"))): ExtractedPayload {
  return {
    version,
    harnessRoot: () => {
      throw new Error("not used in this test");
    },
    availableHarnesses: () => HarnessName.all,
  };
}
