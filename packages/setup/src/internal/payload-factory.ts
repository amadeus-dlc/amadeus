import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createFetchError } from "./fetch-error-factory.ts";
import type { ExtractedPayload, FetchError } from "../domain/payload.ts";
import type { HarnessName } from "../domain/harness.ts";
import type { ResolvedVersion } from "../domain/resolved-version.ts";
import { Result } from "../shared/result.ts";

// codeload always wraps the archive contents in exactly one top-level directory
// (e.g. "amadeus-0.6.9/") regardless of the requested tag — resolve it by
// position, never by name (BR-F10).
function resolveWrapperDir(extractedDir: string): Result<string, FetchError> {
  let entries: string[];
  try {
    entries = readdirSync(extractedDir);
  } catch (cause) {
    return Result.err(createFetchError("payload-invalid", `could not read extracted archive at ${extractedDir}: ${String(cause)}`));
  }
  const dirs = entries.filter((name) => statSync(join(extractedDir, name)).isDirectory());
  if (dirs.length !== 1) {
    return Result.err(
      createFetchError(
        "payload-invalid",
        `expected exactly one top-level directory in the extracted archive, found ${dirs.length}`,
      ),
    );
  }
  return Result.ok(join(extractedDir, dirs[0] as string));
}

export function createExtractedPayload(
  extractedDir: string,
  version: ResolvedVersion,
  harnessNames: readonly HarnessName[],
): Result<ExtractedPayload, FetchError> {
  const wrapper = resolveWrapperDir(extractedDir);
  if (wrapper.type === "err") return wrapper;
  const distDir = join(wrapper.value, "dist");

  let distEntries: string[];
  try {
    distEntries = readdirSync(distDir);
  } catch {
    return Result.err(createFetchError("payload-invalid", `missing dist/ directory in extracted archive (expected ${distDir})`));
  }
  const available = harnessNames.filter(
    (name) => distEntries.includes(name) && statSync(join(distDir, name)).isDirectory(),
  );

  return Result.ok(
    Object.freeze({
      version,
      harnessRoot(harness: HarnessName): Result<string, FetchError> {
        if (!available.includes(harness)) {
          return Result.err(createFetchError("payload-invalid", `harness "${harness}" is not present in this distribution`));
        }
        return Result.ok(join(distDir, harness));
      },
      availableHarnesses(): readonly HarnessName[] {
        return available;
      },
    }),
  );
}
