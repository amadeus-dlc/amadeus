import { createResolvedVersion } from "../internal/resolved-version-factory.ts";
import type { SemVer } from "./semver.ts";
import type { VersionSpec } from "./version-spec.ts";

export type ResolvedVersion = {
  readonly tag: `v${string}`;
  readonly semver: SemVer;
  readonly source: "release" | "tag";
  archiveUrl(): URL; // ADR-003: URL construction is owned by the instance that knows its own source
  isSameAs(other: SemVer): boolean; // upgrade-boundary check (US-B4)
};

export namespace ResolvedVersion {
  export function fromRelease(semver: SemVer): ResolvedVersion {
    return createResolvedVersion(semver, "release");
  }

  export function fromTag(semver: SemVer): ResolvedVersion {
    return createResolvedVersion(semver, "tag");
  }
}

Object.freeze(ResolvedVersion);

export type ResolveError =
  | { readonly type: "no-stable-version"; readonly detail: string }
  | { readonly type: "not-found"; readonly requested: string };

export namespace ResolveError {
  export function noStableVersion(detail = "no stable release or tag was found"): ResolveError {
    return Object.freeze({ type: "no-stable-version", detail });
  }

  export function notFound(spec: VersionSpec): ResolveError {
    return Object.freeze({ type: "not-found", requested: spec.describe() });
  }
}

Object.freeze(ResolveError);
