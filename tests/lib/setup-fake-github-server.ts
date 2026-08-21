// Offline stand-in for the GitHub endpoints amadeus-setup talks to, shared by
// the install and upgrade E2E tests. It serves the *whole* ADR-003 asset path
// the CLI actually walks for a modern tag — the release/tag listings, the git
// ref lookup used by exact --version resolution (#774/#802), the
// amadeus-dist-<tag>.tar.gz asset itself, and the SHA256SUMS the fetcher
// verifies it against — so a real checksum verification happens in-process
// instead of being stubbed out. Requests reach it because setup-fetch-shim.ts
// rewrites the github hosts onto its port.
//
// Anything not explicitly served answers 404, which is what makes the
// asset-missing / checksum-unavailable failure modes reachable rather than
// masked: a fixture that answered every path would have hidden #2152's
// asset-missing regression instead of surfacing it.

import { createServer, type Server } from "node:http";
import { buildReleaseAssetChecksums } from "./setup-release-asset-fixture.ts";

export type ReleaseEntry = { tag_name: string; draft: boolean; prerelease: boolean };
export type TagEntry = { name: string };

export type FakeGitHubServer = { readonly port: number; close: () => Promise<void> };

export type FakeGitHubOptions = {
  /** The tag whose release asset is published, e.g. "v9.9.8". */
  readonly tag: `v${string}`;
  /** Release-asset-shaped archive bytes for `tag` (see setup-dist-fixture.ts). */
  readonly archive: Buffer;
  /** Entries returned by GET /repos/:owner/:repo/releases. Defaults to `tag` alone. */
  readonly releases?: readonly ReleaseEntry[];
  /** Entries returned by GET /repos/:owner/:repo/tags, and the refs that resolve. Defaults to `tag` alone. */
  readonly tags?: readonly TagEntry[];
};

export function startFakeGitHubServer(options: FakeGitHubOptions): Promise<FakeGitHubServer> {
  const { tag, archive } = options;
  const releases = options.releases ?? [{ tag_name: tag, draft: false, prerelease: false }];
  const tags = options.tags ?? [{ name: tag }];
  const checksums = buildReleaseAssetChecksums(archive, tag);
  const assetBase = `/amadeus-dlc/amadeus/releases/download/${tag}`;

  // Exact --version resolution goes through the git ref direct lookup
  // (resolver.ts GIT_REF_TAGS_PATH) since #774/#802, so refs the fixture knows
  // resolve and the rest 404, mirroring the real API's not-found shape.
  function resolveGitRef(pathname: string): Reply | null {
    const refTag = pathname.match(/^\/repos\/amadeus-dlc\/amadeus\/git\/ref\/tags\/(.+)$/);
    if (refTag === null) return null;
    const tagName = decodeURIComponent(refTag[1] as string);
    if (!tags.some((t) => t.name === tagName)) return NOT_FOUND;
    return json({ ref: `refs/tags/${tagName}`, object: { sha: "0".repeat(40), type: "commit" } });
  }

  function route(pathname: string): Reply {
    switch (pathname) {
      case "/repos/amadeus-dlc/amadeus/releases":
        return json(releases);
      case "/repos/amadeus-dlc/amadeus/tags":
        return json(tags);
      // ADR-003 release asset + its checksum manifest.
      case `${assetBase}/amadeus-dist-${tag}.tar.gz`:
        return { status: 200, contentType: "application/gzip", body: archive };
      case `${assetBase}/SHA256SUMS`:
        return { status: 200, contentType: "text/plain", body: checksums };
      default:
        return resolveGitRef(pathname) ?? NOT_FOUND;
    }
  }

  return new Promise((resolveReady) => {
    const server: Server = createServer((req, res) => {
      const { status, contentType, body } = route(new URL(req.url ?? "/", "http://localhost").pathname);
      res.writeHead(status, { "content-type": contentType });
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolveReady({ port, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

type Reply = { readonly status: number; readonly contentType: string; readonly body: string | Buffer };

const NOT_FOUND: Reply = {
  status: 404,
  contentType: "application/json",
  body: JSON.stringify({ message: "Not Found" }),
};

function json(body: unknown): Reply {
  return { status: 200, contentType: "application/json", body: JSON.stringify(body) };
}
