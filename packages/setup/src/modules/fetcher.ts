import { join } from "node:path";
import type { Http } from "../ports/http.ts";
import type { TmpWrite } from "../ports/fsops.ts";
import { extractTarGz, EXTRACT_RELATIVE_DIR } from "../internal/tar-archive-extractor.ts";
import { ExtractedPayload, FetchError } from "../domain/payload.ts";
import type { ResolvedVersion } from "../domain/resolved-version.ts";
import { Result } from "../shared/result.ts";

export type Fetcher = {
  fetchArchive(version: ResolvedVersion): Promise<Result<ExtractedPayload, FetchError>>;
};

const ARCHIVE_RELATIVE_PATH = "archive.tar.gz";

export function createFetcher(http: Http, tmpWrite: TmpWrite): Fetcher {
  async function downloadOnce(url: URL): Promise<Result<void, FetchError>> {
    const response = await http.downloadArchive(url);
    if (response.type === "err") return response;
    const written = await tmpWrite.writeStream(ARCHIVE_RELATIVE_PATH, response.value);
    if (written.type === "err") {
      return Result.err(FetchError.payloadInvalid(`could not save downloaded archive: ${written.error.detail}`));
    }
    return Result.ok(undefined);
  }

  return Object.freeze({
    async fetchArchive(version: ResolvedVersion): Promise<Result<ExtractedPayload, FetchError>> {
      const url = version.archiveUrl();
      let downloaded = await downloadOnce(url);
      if (downloaded.type === "err") {
        if (!downloaded.error.isTransient()) return downloaded;
        downloaded = await downloadOnce(url); // BR-F06: exactly one automatic retry
        if (downloaded.type === "err") return downloaded;
      }

      const archivePath = join(tmpWrite.root, ARCHIVE_RELATIVE_PATH);
      const extractDir = join(tmpWrite.root, EXTRACT_RELATIVE_DIR);
      const extraction = await extractTarGz(archivePath, extractDir, tmpWrite);
      if (extraction.type === "err") return extraction;

      return ExtractedPayload.locate(extractDir, version);
    },
  });
}
