import { join } from "node:path";
import type { Http } from "../ports/http.ts";
import type { TmpWrite } from "../ports/fsops.ts";
import { extractTarGz, EXTRACT_RELATIVE_DIR } from "../internal/tar-archive-extractor.ts";
import { verifySha256 } from "../internal/checksum-verifier.ts";
import { ASSET_INTRO_VERSION } from "../internal/resolved-version-factory.ts";
import { ExtractedPayload, FetchError } from "../domain/payload.ts";
import type { ArchiveSource, ResolvedVersion } from "../domain/resolved-version.ts";
import { Result } from "../shared/result.ts";

export type Fetcher = {
  fetchArchive(version: ResolvedVersion): Promise<Result<ExtractedPayload, FetchError>>;
};

const ARCHIVE_RELATIVE_PATH = "archive.tar.gz";
const CHECKSUM_RELATIVE_PATH = "SHA256SUMS";

export function createFetcher(http: Http, tmpWrite: TmpWrite): Fetcher {
  async function downloadOnce(url: URL, relPath: string): Promise<Result<void, FetchError>> {
    const response = await http.downloadArchive(url);
    if (response.type === "err") return response;
    const written = await tmpWrite.writeStream(relPath, response.value);
    if (written.type === "err") {
      return Result.err(FetchError.payloadInvalid(`could not save downloaded file: ${written.error.detail}`));
    }
    return Result.ok(undefined);
  }

  async function downloadWithRetry(url: URL, relPath: string): Promise<Result<void, FetchError>> {
    let downloaded = await downloadOnce(url, relPath);
    if (downloaded.type === "err" && downloaded.error.isTransient()) {
      downloaded = await downloadOnce(url, relPath); // BR-F06: exactly one automatic retry
    }
    return downloaded;
  }

  async function downloadAssetChecksum(
    version: ResolvedVersion,
    source: Extract<ArchiveSource, { kind: "asset" }>,
  ): Promise<Result<void, FetchError>> {
    const checksum = await downloadWithRetry(source.checksumUrl, CHECKSUM_RELATIVE_PATH);
    if (checksum.type === "err") {
      if (checksum.error.status === 404) return Result.err(FetchError.checksumUnavailable(version.tag));
      return checksum;
    }
    return verifySha256(
      join(tmpWrite.root, ARCHIVE_RELATIVE_PATH),
      join(tmpWrite.root, CHECKSUM_RELATIVE_PATH),
      source.archiveName,
    );
  }

  async function downloadVerifiedArchive(version: ResolvedVersion): Promise<Result<void, FetchError>> {
    const source = version.archiveSource();
    const downloaded = await downloadWithRetry(source.archiveUrl, ARCHIVE_RELATIVE_PATH);
    if (downloaded.type === "err") {
      if (source.kind === "asset" && downloaded.error.status === 404) {
        return Result.err(FetchError.assetMissing(version.tag, ASSET_INTRO_VERSION));
      }
      return downloaded;
    }
    return source.kind === "asset" ? downloadAssetChecksum(version, source) : Result.ok(undefined);
  }

  return Object.freeze({
    async fetchArchive(version: ResolvedVersion): Promise<Result<ExtractedPayload, FetchError>> {
      const ready = await downloadVerifiedArchive(version);
      if (ready.type === "err") return ready;

      const archivePath = join(tmpWrite.root, ARCHIVE_RELATIVE_PATH);
      const extractDir = join(tmpWrite.root, EXTRACT_RELATIVE_DIR);
      const extraction = await extractTarGz(archivePath, extractDir, tmpWrite);
      if (extraction.type === "err") return extraction;

      return ExtractedPayload.locate(extractDir, version);
    },
  });
}
