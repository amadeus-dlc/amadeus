import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArchiveFetchRequest, ArchiveSourcePort } from "../ports/archive-source.ts";
import type { TagSourcePort } from "../ports/tag-source.ts";
import { CANONICAL_SOURCE_REPO, setupSourceError, type ArchiveFetchOutcome, type SourceResult } from "../domain/source-types.ts";

type FetchLike = (input: string) => Promise<Response>;

type GitHubTag = {
  name?: unknown;
};

function githubRepoPath(sourceRepo: string): string | undefined {
  if (sourceRepo !== CANONICAL_SOURCE_REPO) {
    return undefined;
  }
  return "amadeus-dlc/amadeus";
}

export class GitHubTagSource implements TagSourcePort {
  readonly #fetch: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.#fetch = fetchImpl;
  }

  async listTags(sourceRepo: string): Promise<SourceResult<string[]>> {
    const repoPath = githubRepoPath(sourceRepo);
    if (repoPath === undefined) {
      return {
        ok: false,
        error: setupSourceError({
          code: "tag-list-failed",
          message: `Unsupported source repository: ${sourceRepo}.`,
          nextAction: "Use the canonical Amadeus source repository.",
          details: { sourceRepo },
        }),
      };
    }

    try {
      const tags: string[] = [];
      for (let page = 1; page <= 10; page += 1) {
        const response = await this.#fetch(`https://api.github.com/repos/${repoPath}/tags?per_page=100&page=${page}`);
        if (!response.ok) {
          return {
            ok: false,
            error: setupSourceError({
              code: "tag-list-failed",
              message: `Could not list Amadeus distribution tags from GitHub. HTTP ${response.status}.`,
              nextAction: "Check network access to GitHub and retry.",
              details: { sourceRepo, status: String(response.status) },
            }),
          };
        }
        const body = (await response.json()) as GitHubTag[];
        const pageTags = body.flatMap((item) => (typeof item.name === "string" ? [item.name] : []));
        tags.push(...pageTags);
        if (pageTags.length < 100) {
          break;
        }
      }
      return { ok: true, value: tags };
    } catch {
      return {
        ok: false,
        error: setupSourceError({
          code: "tag-list-failed",
          message: "Could not list Amadeus distribution tags from GitHub.",
          nextAction: "Check network access to GitHub and retry.",
          details: { sourceRepo },
        }),
      };
    }
  }
}

export class GitHubArchiveSource implements ArchiveSourcePort {
  readonly #fetch: FetchLike;

  constructor(fetchImpl: FetchLike = fetch) {
    this.#fetch = fetchImpl;
  }

  async fetchArchive(request: ArchiveFetchRequest): Promise<SourceResult<ArchiveFetchOutcome>> {
    const repoPath = githubRepoPath(request.sourceRepo);
    if (repoPath === undefined) {
      return {
        ok: false,
        error: setupSourceError({
          code: "archive-fetch-failed",
          message: `Unsupported source repository: ${request.sourceRepo}.`,
          nextAction: "Use the canonical Amadeus source repository.",
          details: { sourceRepo: request.sourceRepo },
        }),
      };
    }

    const archiveUrl = `https://github.com/${repoPath}/archive/refs/tags/${encodeURIComponent(request.sourceTag)}.tar.gz`;
    const diagnostics: string[] = [];
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const tempRoot = mkdtempSync(join(tmpdir(), "amadeus-setup-archive-"));
      const archivePath = join(tempRoot, `${request.sourceTag}.tar.gz`);
      try {
        const response = await this.#fetch(archiveUrl);
        if (!response.ok) {
          diagnostics.push(`attempt ${attempt}: HTTP ${response.status}`);
          rmSync(tempRoot, { recursive: true, force: true });
          continue;
        }
        await Bun.write(archivePath, await response.arrayBuffer());
        return { ok: true, value: { archivePath, diagnostics } };
      } catch {
        diagnostics.push(`attempt ${attempt}: fetch failed`);
        rmSync(tempRoot, { recursive: true, force: true });
      }
    }

    return {
      ok: false,
      error: setupSourceError({
        code: "archive-fetch-failed",
        message: `Could not fetch Amadeus distribution archive for ${request.sourceTag} after one retry.`,
        nextAction: "Check network access to GitHub and retry the setup command.",
        details: { sourceRepo: request.sourceRepo, sourceTag: request.sourceTag },
      }),
    };
  }
}

export class GitHubSourceAdapter implements TagSourcePort, ArchiveSourcePort {
  readonly #tagSource: GitHubTagSource;
  readonly #archiveSource: GitHubArchiveSource;

  constructor(fetchImpl: FetchLike = fetch) {
    this.#tagSource = new GitHubTagSource(fetchImpl);
    this.#archiveSource = new GitHubArchiveSource(fetchImpl);
  }

  async listTags(sourceRepo: string): Promise<SourceResult<string[]>> {
    return this.#tagSource.listTags(sourceRepo);
  }

  async fetchArchive(request: ArchiveFetchRequest): Promise<SourceResult<ArchiveFetchOutcome>> {
    return this.#archiveSource.fetchArchive(request);
  }
}
