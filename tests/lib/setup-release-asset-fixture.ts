import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";

const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases?per_page=100";
const TAGS_PATH = "/repos/amadeus-dlc/amadeus/tags?per_page=100";

export function buildReleaseAssetChecksums(archive: Uint8Array, tag: `v${string}`): Buffer {
  const archiveName = `amadeus-dist-${tag}.tar.gz`;
  const archiveDigest = createHash("sha256").update(archive).digest("hex");
  return Buffer.from(`${archiveDigest}  ${archiveName}\n${"0".repeat(64)}  amadeus-dist-${tag}.manifest.json\n`);
}

export function toReadableStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from(bytes)) as unknown as ReadableStream<Uint8Array>;
}

export function buildReleaseAssetHttp(archive: Uint8Array, tag: `v${string}`): Http {
  const checksums = buildReleaseAssetChecksums(archive, tag);
  return {
    async getJson(path: string) {
      if (path === RELEASES_PATH) return Result.ok([{ tag_name: tag, draft: false, prerelease: false }]);
      if (path === `/repos/amadeus-dlc/amadeus/git/ref/tags/${tag}`) {
        return Result.ok({ ref: `refs/tags/${tag}`, object: { sha: "0".repeat(40), type: "commit" } });
      }
      if (path === TAGS_PATH) return Result.ok([{ name: tag }]);
      throw new Error(`unexpected path in fixture: ${path}`);
    },
    async downloadArchive(url) {
      return Result.ok(toReadableStream(url.pathname.endsWith("/SHA256SUMS") ? checksums : archive));
    },
  };
}
