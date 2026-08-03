// @test-size medium
// covers: workflow:setup-release-asset-fetch

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { createFetcher } from "../../packages/setup/src/modules/fetcher.ts";
import { createTmpWrite } from "../../packages/setup/src/ports/fsops.ts";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildDistAssets } from "../../scripts/release-dist.ts";
import { discoverHarnessNames } from "../../scripts/package.ts";

const roots: string[] = [];
const CLAUDE = HarnessName.all[0] as HarnessName;

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function stream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from(bytes)) as unknown as ReadableStream<Uint8Array>;
}

describe("u1 release asset -> u2 installer", () => {
  test("installs a harness from the exact asset and SHA256SUMS produced by buildDistAssets", async () => {
    const root = mkdtempSync(join(tmpdir(), "setup-release-asset-fetch-"));
    roots.push(root);
    const distRoot = join(root, "dist");
    for (const harness of discoverHarnessNames()) {
      mkdirSync(join(distRoot, harness), { recursive: true });
      writeFileSync(join(distRoot, harness, "marker.txt"), `${harness}\n`);
    }
    const bundle = await buildDistAssets({ version: "0.1.8", distRoot, outputDir: join(root, "assets") });
    const http: Http = {
      async getJson(): Promise<never> {
        throw new Error("fetcher must never call getJson");
      },
      async downloadArchive(url) {
        return Result.ok(stream(readFileSync(url.pathname.endsWith("/SHA256SUMS") ? bundle.checksumPath : bundle.tarPath)));
      },
    };
    const parsed = SemVer.parse("0.1.8");
    if (parsed.type === "err") throw new Error("invalid fixture version");
    const tmpResult = await createTmpWrite("setup-release-asset-fetch-work-");
    if (tmpResult.type === "err") throw new Error(tmpResult.error.detail);
    const tmpWrite = tmpResult.value;
    try {
      const result = await createFetcher(http, tmpWrite).fetchArchive(ResolvedVersion.fromRelease(parsed.value));
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const harnessRoot = result.value.harnessRoot(CLAUDE);
      expect(harnessRoot.type).toBe("ok");
      if (harnessRoot.type === "ok") expect(readFileSync(join(harnessRoot.value, "marker.txt"), "utf8")).toBe("claude\n");
    } finally {
      await tmpWrite.remove();
    }
  });
});
