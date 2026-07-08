import { createVersionSpec } from "../internal/version-spec-factory.ts";
import { SemVer, type VersionError } from "./semver.ts";
import { Result } from "../shared/result.ts";

export type VersionSpec = {
  readonly kind: "latest" | "exact";
  admits(candidate: SemVer): boolean;
  describe(): string;
};

export namespace VersionSpec {
  export function latest(): VersionSpec {
    return createVersionSpec("latest", null);
  }

  export function exact(raw: string): Result<VersionSpec, VersionError> {
    const parsed = SemVer.parse(raw); // smart constructor: no invalid VersionSpec can be built
    if (parsed.type === "err") return parsed;
    return Result.ok(createVersionSpec("exact", parsed.value));
  }
}

Object.freeze(VersionSpec);
