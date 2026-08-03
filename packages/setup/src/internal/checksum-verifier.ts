import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { FetchError } from "../domain/payload.ts";
import { Result } from "../shared/result.ts";

const SHA256SUM_LINE = /^([0-9a-f]{64}) {2}([^/]+)$/;

export async function verifySha256(
  archivePath: string,
  checksumPath: string,
  archiveName: string,
): Promise<Result<void, FetchError>> {
  let checksumText: string;
  try {
    checksumText = await readFile(checksumPath, "utf8");
  } catch (cause) {
    return Result.err(FetchError.payloadInvalid(`could not read SHA256SUMS: ${String(cause)}`));
  }

  const lines = checksumText.endsWith("\n") ? checksumText.slice(0, -1).split("\n") : checksumText.split("\n");
  const expected: string[] = [];
  for (const line of lines) {
    const match = SHA256SUM_LINE.exec(line);
    if (!match) return Result.err(FetchError.payloadInvalid(`invalid SHA256SUMS line: ${line}`));
    if (match[2] === archiveName) expected.push(match[1] as string);
  }
  if (expected.length !== 1) {
    return Result.err(FetchError.payloadInvalid(`SHA256SUMS must contain exactly one entry for ${archiveName}`));
  }

  try {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(archivePath)) hash.update(chunk as Buffer);
    if (hash.digest("hex") !== expected[0]) {
      return Result.err(FetchError.checksumMismatch(archiveName));
    }
    return Result.ok(undefined);
  } catch (cause) {
    return Result.err(FetchError.payloadInvalid(`could not verify ${archiveName}: ${String(cause)}`));
  }
}
