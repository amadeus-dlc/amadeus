// covers: workflow:setup-resolve-fetch-manifest
//
// Integration test for the U1 boundary chain: resolver -> fetcher -> manifest
// build -> manifest-io write/read, all through a single fake Http (releases +
// codeload archive) and real filesystem ports (a real temp target directory).
// No production module is faked here except the network boundary (Http).

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { createFsRead, createFsWrite, createTmpWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createResolver } from "../../packages/setup/src/modules/resolver.ts";
import { createFetcher } from "../../packages/setup/src/modules/fetcher.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { VersionSpec } from "../../packages/setup/src/domain/version-spec.ts";
import { ManifestFiles, Manifest } from "../../packages/setup/src/domain/manifest.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildTarGz, type TarFixtureEntry } from "../lib/setup-tar-fixture.ts";
import { Readable } from "node:stream";

const RELEASES_PATH = "/repos/amadeus-dlc/amadeus/releases";
const ARCHIVE: TarFixtureEntry[] = [
  { type: "file", name: "amadeus-1.2.3/dist/claude/settings.json", content: Buffer.from('{"a":1}') },
  { type: "file", name: "amadeus-1.2.3/dist/claude/team.md", content: Buffer.from("shared practice notes") },
];

function fakeHttp(): Http {
  return {
    async getJson(path: string) {
      if (path === RELEASES_PATH) {
        return Result.ok([{ tag_name: "v1.2.3", draft: false, prerelease: false }]);
      }
      throw new Error(`unexpected path in integration fixture: ${path}`);
    },
    async downloadArchive() {
      const stream = Readable.toWeb(Readable.from(buildTarGz(ARCHIVE))) as unknown as ReadableStream<Uint8Array>;
      return Result.ok(stream);
    },
  };
}

describe("resolver -> fetcher -> manifest-io boundary", () => {
  test("resolves latest, fetches the archive, builds a manifest, and round-trips it through manifest-io", async () => {
    const http = fakeHttp();
    const resolved = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(resolved.type).toBe("ok");
    if (resolved.type !== "ok") return;
    expect(resolved.value.tag).toBe("v1.2.3");

    const tmpWriteResult = await createTmpWrite("amadeus-setup-integration-");
    if (tmpWriteResult.type === "err") throw new Error(tmpWriteResult.error.detail);
    const tmpWrite = tmpWriteResult.value;

    try {
      const fetched = await createFetcher(http, tmpWrite).fetchArchive(resolved.value);
      expect(fetched.type).toBe("ok");
      if (fetched.type !== "ok") return;

      const claude = HarnessName.all.find((h) => (h as string) === "claude");
      if (!claude) throw new Error("fixture setup: 'claude' is expected to be a known harness");
      const harnessRoot = fetched.value.harnessRoot(claude);
      expect(harnessRoot.type).toBe("ok");

      const filesResult = ManifestFiles.fromEntries([
        { path: "settings.json", class: "owned", required: true, md5: "irrelevant-for-this-test" },
        { path: "team.md", class: "shared", required: true, md5: "irrelevant-for-this-test" },
      ]);
      if (filesResult.type === "err") throw new Error("unexpected err building manifest files");

      const manifest = Manifest.build(fetched.value, filesResult.value, {
        installerPackageVersion: "0.1.0",
        harness: claude,
        installStartedAt: "2026-07-08T12:00:00.000Z",
      });

      const targetDir = mkdtempSync(join(tmpdir(), "amadeus-setup-integration-target-"));
      try {
        const manifestIo = createManifestIo(createFsRead(), createFsWrite());
        const written = await manifestIo.write(targetDir, manifest);
        expect(written.type).toBe("ok");

        const read = await manifestIo.read(targetDir);
        expect(read.type).toBe("ok");
        if (read.type === "ok") {
          expect(read.value?.sourceTag).toBe("v1.2.3");
          expect([...(read.value?.requiredPaths() ?? [])].sort()).toEqual(["settings.json", "team.md"]);
        }
      } finally {
        rmSync(targetDir, { recursive: true, force: true });
      }
    } finally {
      await tmpWrite.remove();
    }
  });

  test("edge case: no candidate release surfaces ResolveError before any file is touched", async () => {
    const http: Http = {
      async getJson(path: string) {
        if (path === RELEASES_PATH) return Result.ok([]);
        return Result.ok([]);
      },
      async downloadArchive() {
        throw new Error("must not be called: resolution should fail before fetch");
      },
    };
    const resolved = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(resolved.type).toBe("err");
    if (resolved.type === "err") expect(resolved.error.type).toBe("no-stable-version");
  });
});
