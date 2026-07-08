import { stat } from "node:fs/promises";

// Verifier.create(fsRead: VerifyRead) — read-only by construction (REL: no
// write capability is reachable from verification), distinct from U1's
// FsRead (which is text-oriented and not directory-aware).
export type VerifyRead = {
  fileExists(path: string): Promise<boolean>;
  dirExists(path: string): Promise<boolean>;
};

export function createVerifyRead(): VerifyRead {
  return Object.freeze({
    async fileExists(path: string): Promise<boolean> {
      try {
        const info = await stat(path);
        return info.isFile();
      } catch {
        return false;
      }
    },
    async dirExists(path: string): Promise<boolean> {
      try {
        const info = await stat(path);
        return info.isDirectory();
      } catch {
        return false;
      }
    },
  });
}
