import type { Disposition, ManifestFile, ManifestFiles } from "../domain/manifest.ts";

export function createManifestFiles(entries: readonly ManifestFile[]): ManifestFiles {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));

  return Object.freeze({
    requiredPaths(): readonly string[] {
      return entries.filter((entry) => entry.required).map((entry) => entry.path);
    },
    dispositionFor(path: string, actualMd5: string | null): Disposition {
      const entry = byPath.get(path);
      if (!entry || entry.class === "owned") {
        return Object.freeze({ type: "overwrite" });
      }
      if (entry.class === "user-preserved") {
        return Object.freeze({ type: "preserve" });
      }
      // shared: overwrite only when on-disk content still matches the recorded
      // expectation; any drift (including an unreadable/missing file) is user
      // customization and must be preserved via backup (FR-008).
      return actualMd5 === entry.md5 ? Object.freeze({ type: "overwrite" }) : Object.freeze({ type: "backup-then-copy" });
    },
    entries(): ReadonlyArray<ManifestFile> {
      return entries;
    },
  });
}
