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
// FR-2 (#774): latest resolution pages up to 100 entries so a recent stable
// release/tag is not missed behind GitHub's default 30-entry page.
const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases?per_page=100";
const TAGS_PATH = "/repos/amadeus-dlc/amadeus/tags?per_page=100";
// FR-1 (#774): exact resolution asks git for the ref directly, so it resolves a
// real tag in one call regardless of how many tags exist.
const GIT_REF_TAGS_PATH = "/repos/amadeus-dlc/amadeus/git/ref/tags";

type RawEntry = Record<string, unknown>;

export function createResolver(http: Http): Resolver {
  // fetchTagNames/fetchReleaseTagNames converge here: both call the same GitHub
  // API shape (getJson -> array of objects), differing only in which field
  // holds the name and whether entries need filtering first.
  async function fetchNames(
    apiPath: string,
    nameField: "name" | "tag_name",
    includeEntry: (entry: RawEntry) => boolean = () => true,
  ): Promise<Result<readonly string[], FetchError>> {
    const response = await http.getJson(apiPath);
    if (response.type === "err") return response;
    if (!Array.isArray(response.value)) {
      return Result.err(FetchError.payloadInvalid(`GitHub API response at ${apiPath} was not an array`));
    }
    const names = (response.value as RawEntry[])
      .filter(includeEntry)
      .map((entry) => entry[nameField])
      .filter((name): name is string => typeof name === "string");
    return Result.ok(names);
  }

  function fetchTagNames(): Promise<Result<readonly string[], FetchError>> {
    return fetchNames(TAGS_PATH, "name");
  }

  function fetchReleaseTagNames(): Promise<Result<readonly string[], FetchError>> {
    return fetchNames(RELEASES_PATH, "tag_name", (entry) => entry.draft !== true && entry.prerelease !== true);
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
        const tag = spec.exactTag();
        if (tag === null) return Result.err(ResolveError.notFound(spec));
        // BR-F09: a single git ref lookup. Existence of the ref is enough; a 404
        // is the domain's not-found, any other FetchError propagates verbatim.
        const ref = await http.getJson(`${GIT_REF_TAGS_PATH}/${tag}`);
        if (ref.type === "err") {
          return ref.error.status === 404 ? Result.err(ResolveError.notFound(spec)) : ref;
        }
        const parsed = SemVer.parse(tag);
        if (parsed.type === "err") return Result.err(ResolveError.notFound(spec));
        return Result.ok(ResolvedVersion.fromTag(parsed.value));
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
