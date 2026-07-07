import { copyFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TargetFilePort } from "../ports/filesystem.ts";

export class NodeTargetFile implements TargetFilePort {
  exists(path: string): boolean {
    return existsSync(path);
  }

  copyFile(sourcePath: string, destinationPath: string): void {
    mkdirSync(dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
  }

  backupFile(sourcePath: string, backupPath: string): void {
    mkdirSync(dirname(backupPath), { recursive: true });
    copyFileSync(sourcePath, backupPath);
  }

  writeFileAtomic(path: string, content: Uint8Array): void {
    const directory = dirname(path);
    mkdirSync(directory, { recursive: true });
    const tempPath = `${path}.${process.pid}.tmp`;
    writeFileSync(tempPath, content);
    renameSync(tempPath, path);
  }
}
