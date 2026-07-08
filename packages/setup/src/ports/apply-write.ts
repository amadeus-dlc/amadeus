import { mkdir as mkdirAsync, copyFile as copyFileAsync, rename as renameAsync, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { IoError } from "./fsops.ts";
import { Result } from "../shared/result.ts";

// U1's ports/fsops.ts FsWrite only supports writeText (for the manifest JSON)
// and is frozen for this Unit. The applier needs real file-tree operations
// (SEC-I01: mkdir/copyFile/rename under a validated target root), so this is
// a separate, new port rather than an extension of FsWrite.
export type ApplyWrite = {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<Result<void, IoError>>;
  copyFile(src: string, dest: string): Promise<Result<void, IoError>>;
  // "退避" (FR-008): rename is atomic on the same volume, tried first; falls
  // back to copy+remove only if the rename itself fails (e.g. cross-device).
  backup(path: string, backupPath: string): Promise<Result<void, IoError>>;
};

export function createApplyWrite(): ApplyWrite {
  return Object.freeze({
    async exists(path: string): Promise<boolean> {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },

    async mkdir(path: string): Promise<Result<void, IoError>> {
      try {
        await mkdirAsync(path, { recursive: true });
        return Result.ok(undefined);
      } catch (cause) {
        return Result.err(IoError.of(`could not create directory ${path}: ${String(cause)}`));
      }
    },

    async copyFile(src: string, dest: string): Promise<Result<void, IoError>> {
      try {
        await mkdirAsync(dirname(dest), { recursive: true });
        await copyFileAsync(src, dest);
        return Result.ok(undefined);
      } catch (cause) {
        return Result.err(IoError.of(`could not copy ${src} to ${dest}: ${String(cause)}`));
      }
    },

    async backup(path: string, backupPath: string): Promise<Result<void, IoError>> {
      try {
        await renameAsync(path, backupPath);
        return Result.ok(undefined);
      } catch (cause) {
        return Result.err(IoError.of(`could not back up ${path} to ${backupPath}: ${String(cause)}`));
      }
    },
  });
}
