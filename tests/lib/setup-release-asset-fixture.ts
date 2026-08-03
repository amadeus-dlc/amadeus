import { createHash } from "node:crypto";

export function buildReleaseAssetChecksums(archive: Uint8Array, tag: `v${string}`): Buffer {
  const archiveName = `amadeus-dist-${tag}.tar.gz`;
  const archiveDigest = createHash("sha256").update(archive).digest("hex");
  return Buffer.from(`${archiveDigest}  ${archiveName}\n${"0".repeat(64)}  amadeus-dist-${tag}.manifest.json\n`);
}
