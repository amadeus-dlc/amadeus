import type { TagSourcePort } from "../ports/tag-source.ts";
import { CANONICAL_SOURCE_REPO, setupSourceError, type IgnoredTag, type ResolvedVersion, type SourceResult, type TagCandidate, type VersionRequest } from "./source-types.ts";

type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
};

type IndexedTag = {
  tag: string;
  version: string;
  parsed: ParsedSemver;
  hasVPrefix: boolean;
};

const SEMVER_TAG_PATTERN = /^v?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?$/;

function parseSemverTag(tag: string): ParsedSemver | undefined {
  const match = SEMVER_TAG_PATTERN.exec(tag);
  if (match === null) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

function normalizeVersion(parsed: ParsedSemver): string {
  const stable = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  return parsed.prerelease === undefined ? stable : `${stable}-${parsed.prerelease}`;
}

function compareSemverDesc(left: IndexedTag, right: IndexedTag): number {
  for (const key of ["major", "minor", "patch"] as const) {
    const difference = right.parsed[key] - left.parsed[key];
    if (difference !== 0) {
      return difference;
    }
  }
  return Number(right.hasVPrefix) - Number(left.hasVPrefix);
}

function candidateFor(tag: string): TagCandidate {
  const parsed = parseSemverTag(tag);
  if (parsed === undefined) {
    return { tag, kind: "malformed", preferred: false, ignoredReason: "malformed" };
  }
  return {
    tag,
    kind: parsed.prerelease === undefined ? "stable" : "prerelease",
    version: normalizeVersion(parsed),
    preferred: tag.startsWith("v"),
  };
}

function buildIndex(tags: string[]): { candidates: TagCandidate[]; index: Map<string, IndexedTag[]>; diagnostics: IgnoredTag[] } {
  const candidates = tags.map(candidateFor);
  const diagnostics: IgnoredTag[] = [];
  const index = new Map<string, IndexedTag[]>();

  for (const candidate of candidates) {
    if (candidate.kind === "malformed" || candidate.version === undefined) {
      diagnostics.push({ tag: candidate.tag, reason: "malformed" });
      continue;
    }
    const parsed = parseSemverTag(candidate.tag);
    if (parsed === undefined) {
      diagnostics.push({ tag: candidate.tag, reason: "malformed" });
      continue;
    }
    const group = index.get(candidate.version) ?? [];
    group.push({
      tag: candidate.tag,
      version: candidate.version,
      parsed,
      hasVPrefix: candidate.tag.startsWith("v"),
    });
    index.set(candidate.version, group);
  }

  return { candidates, index, diagnostics };
}

function preferredTag(group: IndexedTag[]): IndexedTag {
  const vPrefixed = group.find((item) => item.hasVPrefix);
  return vPrefixed ?? group[0];
}

function duplicateDiagnostics(index: Map<string, IndexedTag[]>, selectedTag: string): IgnoredTag[] {
  return Array.from(index.values()).flatMap((group) => {
    const preferred = preferredTag(group);
    return group
      .filter((item) => item.tag !== selectedTag && item.tag !== preferred.tag)
      .map((item) => ({
        tag: item.tag,
        reason: item.hasVPrefix ? ("duplicate-v-tag" as const) : ("duplicate-bare-tag" as const),
      }));
  });
}

function resolveExplicitVersion(requestedVersion: string, allowExplicitPrerelease: boolean, index: Map<string, IndexedTag[]>, diagnostics: IgnoredTag[]): SourceResult<ResolvedVersion> {
  const parsed = parseSemverTag(requestedVersion);
  if (parsed === undefined) {
    return {
      ok: false,
      error: setupSourceError({
        code: "version-not-found",
        message: `Requested version is not a SemVer tag: ${requestedVersion}.`,
        nextAction: "Use a tag like v1.2.3 or a SemVer version like 1.2.3.",
        details: { requestedVersion },
      }),
    };
  }
  if (parsed.prerelease !== undefined && !allowExplicitPrerelease) {
    return {
      ok: false,
      error: setupSourceError({
        code: "version-not-found",
        message: `Requested prerelease version is not allowed in this context: ${requestedVersion}.`,
        nextAction: "Pass the prerelease through the explicit --version flow.",
        details: { requestedVersion },
      }),
    };
  }

  const version = normalizeVersion(parsed);
  const group = index.get(version) ?? [];
  const selected = requestedVersion.startsWith("v")
    ? group.find((item) => item.tag === requestedVersion)
    : (group.find((item) => item.tag === `v${requestedVersion}`) ?? group.find((item) => item.tag === requestedVersion));

  if (selected === undefined) {
    return {
      ok: false,
      error: setupSourceError({
        code: "version-not-found",
        message: `Requested Amadeus distribution version was not found: ${requestedVersion}.`,
        nextAction: "Pick an existing stable tag or explicit prerelease tag.",
        details: { requestedVersion },
      }),
    };
  }

  return {
    ok: true,
    value: {
      distributionVersion: selected.version,
      sourceTag: selected.tag,
      sourceRepo: CANONICAL_SOURCE_REPO,
      ignoredTags: [...diagnostics, ...duplicateDiagnostics(index, selected.tag)],
    },
  };
}

function resolveLatestStable(index: Map<string, IndexedTag[]>, candidates: TagCandidate[], diagnostics: IgnoredTag[]): SourceResult<ResolvedVersion> {
  const stableGroups = Array.from(index.values())
    .filter((group) => group[0]?.parsed.prerelease === undefined)
    .map((group) => preferredTag(group))
    .sort(compareSemverDesc);

  const prereleaseDiagnostics: IgnoredTag[] = candidates
    .filter((candidate) => candidate.kind === "prerelease")
    .map((candidate) => ({ tag: candidate.tag, reason: "prerelease-excluded" }));

  if (stableGroups.length === 0) {
    return {
      ok: false,
      error: setupSourceError({
        code: "no-stable-version",
        message: "No stable SemVer Amadeus distribution tag was found.",
        nextAction: "Publish a stable tag like v1.2.3 or pass an explicit prerelease with --version.",
      }),
    };
  }

  const selected = stableGroups[0];
  return {
    ok: true,
    value: {
      distributionVersion: selected.version,
      sourceTag: selected.tag,
      sourceRepo: CANONICAL_SOURCE_REPO,
      ignoredTags: [...diagnostics, ...prereleaseDiagnostics, ...duplicateDiagnostics(index, selected.tag)],
    },
  };
}

export function resolveVersionFromTags(request: VersionRequest, tags: string[]): SourceResult<ResolvedVersion> {
  const { candidates, index, diagnostics } = buildIndex(tags);
  if (request.requestedVersion !== undefined && request.requestedVersion.length > 0) {
    return resolveExplicitVersion(request.requestedVersion, request.allowExplicitPrerelease, index, diagnostics);
  }
  return resolveLatestStable(index, candidates, diagnostics);
}

export async function resolveVersion(request: VersionRequest & { tagSource: TagSourcePort }): Promise<SourceResult<ResolvedVersion>> {
  const listedTags = await request.tagSource.listTags(request.sourceRepo);
  if (!listedTags.ok) {
    return listedTags;
  }

  return resolveVersionFromTags(request, listedTags.value);
}
