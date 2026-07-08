import { join } from "node:path";
import type { FsRead, FsWrite } from "../ports/fsops.ts";
import { Manifest, ManifestError } from "../domain/manifest.ts";
import { Result } from "../shared/result.ts";

export type ManifestIo = {
  read(targetDir: string): Promise<Result<Manifest | null, ManifestError>>;
  write(targetDir: string, manifest: Manifest): Promise<Result<void, ManifestError>>;
};

// BR-F11: manifest path is fixed relative to the install target.
const MANIFEST_RELATIVE_PATH = join("amadeus", ".installer", "amadeus-setup-manifest.json");

export function createManifestIo(fsRead: FsRead, fsWrite: FsWrite): ManifestIo {
  return Object.freeze({
    async read(targetDir: string): Promise<Result<Manifest | null, ManifestError>> {
      const path = join(targetDir, MANIFEST_RELATIVE_PATH);
      const exists = await fsRead.exists(path);
      if (!exists) return Result.ok(null); // BR-F15: absent manifest is not an error

      const contents = await fsRead.readText(path);
      if (contents.type === "err") return Result.err(ManifestError.io(contents.error.detail));

      let json: unknown;
      try {
        json = JSON.parse(contents.value);
      } catch (cause) {
        return Result.err(ManifestError.malformed(`manifest is not valid JSON: ${String(cause)}`));
      }
      return Manifest.parse(json);
    },

    async write(targetDir: string, manifest: Manifest): Promise<Result<void, ManifestError>> {
      const path = join(targetDir, MANIFEST_RELATIVE_PATH);
      const written = await fsWrite.writeText(path, JSON.stringify(manifest.toJSON(), null, 2));
      if (written.type === "err") return Result.err(ManifestError.io(written.error.detail));
      return Result.ok(undefined);
    },
  });
}
