import type { Http } from "../ports/http.ts";
import { FetchError } from "../domain/payload.ts";
import { ResolveError, ResolvedVersion } from "../domain/resolved-version.ts";
import { SemVer } from "../domain/semver.ts";
import type { VersionSpec } from "../domain/version-spec.ts";
import { Result } from "../shared/result.ts";

export type Resolver = {
  resolveVersion(spec: VersionSpec): Promise<Result<ResolvedVersion, ResolveError | FetchError>>;
};

// ADR-003 endpoints. BR-F09 caps this module at 2 API calls per resolveVersion().
const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases";
const TAGS_PATH = "/repos/amadeus-dlc/amadeus/tags";

type RawTag = { readonly name?: unknown };
type RawRelease = { readonly tag_name?: unknown; readonly draft?: unknown; readonly prerelease?: unknown };

export function createResolver(http: Http): Resolver {
  async function fetchTagNames(): Promise<Result<readonly string[], FetchError>> {
    const response = await http.getJson(TAGS_PATH);
    if (response.type === "err") return response;
    if (!Array.isArray(response.value)) {
      return Result.err(FetchError.payloadInvalid("GitHub tags response was not an array"));
    }
    const names = (response.value as RawTag[])
      .map((entry) => entry?.name)
      .filter((name): name is string => typeof name === "string");
    return Result.ok(names);
  }

  async function fetchReleaseTagNames(): Promise<Result<readonly string[], FetchError>> {
    const response = await http.getJson(RELEASES_PATH);
    if (response.type === "err") return response;
    if (!Array.isArray(response.value)) {
      return Result.err(FetchError.payloadInvalid("GitHub releases response was not an array"));
    }
    const names = (response.value as RawRelease[])
      .filter((entry) => entry?.draft !== true && entry?.prerelease !== true)
      .map((entry) => entry?.tag_name)
      .filter((name): name is string => typeof name === "string");
    return Result.ok(names);
  }

  function parseAllStable(names: readonly string[]): SemVer[] {
    // BR-F05: invalid tag names are silently excluded, not treated as errors.
    const parsed: SemVer[] = [];
    for (const name of names) {
      const result = SemVer.parse(name);
      if (result.type === "ok") parsed.push(result.value);
    }
    return parsed;
  }

  return Object.freeze({
    async resolveVersion(spec: VersionSpec): Promise<Result<ResolvedVersion, ResolveError | FetchError>> {
      if (spec.kind === "exact") {
        const tagNames = await fetchTagNames();
        if (tagNames.type === "err") return tagNames;
        const hit = parseAllStable(tagNames.value).find((candidate) => spec.admits(candidate));
        return hit ? Result.ok(ResolvedVersion.fromTag(hit)) : Result.err(ResolveError.notFound(spec));
      }

      // spec.kind === "latest" — BR-F01: stable release first, stable tag fallback.
      const releaseTagNames = await fetchReleaseTagNames();
      if (releaseTagNames.type === "err") return releaseTagNames;
      const bestRelease = SemVer.latestStableOf(parseAllStable(releaseTagNames.value));
      if (bestRelease) return Result.ok(ResolvedVersion.fromRelease(bestRelease));

      const tagNames = await fetchTagNames();
      if (tagNames.type === "err") return tagNames;
      const bestTag = SemVer.latestStableOf(parseAllStable(tagNames.value));
      if (bestTag) return Result.ok(ResolvedVersion.fromTag(bestTag));

      return Result.err(ResolveError.noStableVersion());
    },
  });
}
