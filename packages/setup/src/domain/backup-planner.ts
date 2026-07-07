import { posix } from "node:path";
import type { BackupPath } from "./plan-types.ts";

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatUtcBasicTimestamp(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
    "T",
    pad2(date.getUTCHours()),
    pad2(date.getUTCMinutes()),
    pad2(date.getUTCSeconds()),
    "Z",
  ].join("");
}

export function buildBackupPath(input: {
  originalPath: string;
  timestamp: string;
  backupPathExists: (backupPath: string) => boolean;
}): BackupPath {
  const directory = posix.dirname(input.originalPath);
  const basename = posix.basename(input.originalPath);
  const prefix = directory === "." ? basename : `${directory}/${basename}`;
  let suffix: BackupPath["suffix"] = ".bk";
  let backupPath = `${prefix}.${input.timestamp}${suffix}`;
  let collisionIndex = 1;

  while (input.backupPathExists(backupPath)) {
    suffix = `.${collisionIndex}.bk`;
    backupPath = `${prefix}.${input.timestamp}${suffix}`;
    collisionIndex += 1;
  }

  return {
    originalPath: input.originalPath,
    timestamp: input.timestamp,
    suffix,
    backupPath,
  };
}
