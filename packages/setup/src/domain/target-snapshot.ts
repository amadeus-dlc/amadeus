import { join } from "node:path";
import type { DistributionFile } from "./source-types.ts";
import type { TargetDetection, TargetSnapshot, TargetSnapshotFile } from "./target-types.ts";
import type { TargetReadOnlyFilePort } from "../ports/target-state.ts";

export type SnapshotTargetRequest = {
  targetPath: string;
  detection: TargetDetection;
  distributionFiles: readonly DistributionFile[];
  files: TargetReadOnlyFilePort;
};

function expectedFiles(distributionFiles: readonly DistributionFile[], detection: TargetDetection): DistributionFile[] {
  const byPath = new Map<string, DistributionFile>();
  for (const file of distributionFiles) {
    byPath.set(file.path, file);
  }
  if (detection.state === "manifest-installed") {
    for (const file of detection.manifest.files) {
      if (!byPath.has(file.path)) {
        byPath.set(file.path, file);
      }
    }
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export async function snapshotTarget(request: SnapshotTargetRequest): Promise<TargetSnapshot> {
  const expected = expectedFiles(request.distributionFiles, request.detection);
  const existingFiles: TargetSnapshotFile[] = [];
  const unreadableFiles: TargetSnapshot["diagnostics"]["unreadableFiles"] = [];

  for (const file of expected) {
    const absolutePath = join(request.targetPath, file.path);
    const exists = await request.files.exists(absolutePath);
    if (!exists) {
      existingFiles.push({ path: file.path, exists: false });
      continue;
    }

    try {
      existingFiles.push({ path: file.path, exists: true, md5: await request.files.md5(absolutePath) });
    } catch {
      existingFiles.push({ path: file.path, exists: true });
      unreadableFiles.push({ path: file.path, reasonCode: "md5-unreadable" });
    }
  }

  return {
    target: request.targetPath,
    detection: request.detection,
    existingFiles,
    diagnostics: {
      expectedFileCount: expected.length,
      unknownMd5Count: unreadableFiles.length,
      unreadableFiles,
    },
  };
}
