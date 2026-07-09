// covers: modules:setup-fetcher
//
// createFetcher — codeload download + exactly-one retry (BR-F06), gunzip/tar
// extraction, SEC-F01 path/link rejection, and BR-F10 wrapper-dir resolution.
// Archives are synthetic ustar fixtures (tests/lib/setup-tar-fixture.ts): no
// network access is available in this environment to pull a real codeload
// archive, so these pin the wire format instead.

import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import { createTmpWrite, type TmpWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createFetcher } from "../../packages/setup/src/modules/fetcher.ts";
import { FetchError } from "../../packages/setup/src/domain/payload.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import { buildTarGz, type TarFixtureEntry } from "../lib/setup-tar-fixture.ts";

function version(raw = "0.6.9") {
  const parsed = SemVer.parse(raw);
  if (parsed.type === "err") throw new Error("invalid fixture version");
  return ResolvedVersion.fromTag(parsed.value);
}

function fakeHttp(gz: Buffer, failures: FetchError[] = []): Http & { calls: number } {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    async getJson(): Promise<never> {
      throw new Error("fetcher must never call getJson");
    },
    async downloadArchive() {
      state.calls++;
      const failure = failures[state.calls - 1];
      if (failure) return Result.err(failure);
      const stream = Readable.toWeb(Readable.from(gz)) as unknown as ReadableStream<Uint8Array>;
      return Result.ok(stream);
    },
  };
}

async function withTmpWrite<T>(fn: (tmpWrite: TmpWrite) => Promise<T>): Promise<T> {
  const created = await createTmpWrite("amadeus-setup-fetcher-test-");
  if (created.type === "err") throw new Error(created.error.detail);
  try {
    return await fn(created.value);
  } finally {
    await created.value.remove();
  }
}

const CLAUDE = HarnessName.all.find((h) => (h as string) === "claude");
if (!CLAUDE) throw new Error("fixture setup: 'claude' is expected to be a known harness");

const VALID_ARCHIVE: TarFixtureEntry[] = [
  { type: "dir", name: "amadeus-0.6.9/dist/claude/empty-dir" },
  { type: "file", name: "amadeus-0.6.9/dist/claude/marker.txt", content: Buffer.from("hello") },
  { type: "file", name: "amadeus-0.6.9/README.md", content: Buffer.from("readme") },
];

describe("createFetcher — happy path", () => {
  test("extracts a valid archive and locates the harness dist root", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const http = fakeHttp(buildTarGz(VALID_ARCHIVE));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      expect(result.value.availableHarnesses()).toContain(CLAUDE);
      const root = result.value.harnessRoot(CLAUDE);
      expect(root.type).toBe("ok");
      if (root.type === "ok") {
        expect(existsSync(join(root.value, "marker.txt"))).toBe(true);
      }
    });
  });

  test("edge case: an explicit directory entry with no files is created on disk", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const http = fakeHttp(buildTarGz(VALID_ARCHIVE));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const root = result.value.harnessRoot(CLAUDE);
      if (root.type === "ok") {
        expect(existsSync(join(root.value, "empty-dir"))).toBe(true);
      }
    });
  });
});

describe("createFetcher — BR-F10 wrapper/dist validation", () => {
  test("payload-invalid when the wrapper directory has no dist/", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const archive: TarFixtureEntry[] = [{ type: "file", name: "amadeus-0.6.9/README.md", content: Buffer.from("hi") }];
      const http = fakeHttp(buildTarGz(archive));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("payload-invalid");
    });
  });

  test("payload-invalid when there is more than one top-level directory", async () => {
    await withTmpWrite(async (tmpWrite) => {
      // Both top-level dirs carry a valid dist/claude payload so this test
      // fails only via the wrapper-multiplicity rule itself (BR-F10), not
      // via a missing-dist error taken on whichever dir gets picked.
      const archive: TarFixtureEntry[] = [
        { type: "file", name: "a/dist/claude/marker.txt", content: Buffer.from("1") },
        { type: "file", name: "b/dist/claude/marker.txt", content: Buffer.from("2") },
      ];
      const http = fakeHttp(buildTarGz(archive));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("payload-invalid");
    });
  });
});

describe("createFetcher — SEC-F01 malicious entries", () => {
  test("payload-invalid on a path-traversal entry", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const archive: TarFixtureEntry[] = [{ type: "file", name: "../../evil.txt", content: Buffer.from("x") }];
      const http = fakeHttp(buildTarGz(archive));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("payload-invalid");
    });
  });

  test("payload-invalid on a symlink entry, regardless of target", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const archive: TarFixtureEntry[] = [{ type: "symlink", name: "amadeus-0.6.9/link", linkname: "/etc/passwd" }];
      const http = fakeHttp(buildTarGz(archive));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("payload-invalid");
    });
  });

  test("edge case: payload-invalid on a hardlink entry", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const archive: TarFixtureEntry[] = [{ type: "hardlink", name: "amadeus-0.6.9/link", linkname: "amadeus-0.6.9/README.md" }];
      const http = fakeHttp(buildTarGz(archive));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("payload-invalid");
    });
  });
});

describe("createFetcher — BR-F06 retry semantics", () => {
  test("a transient failure is retried exactly once and then succeeds", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const transient = FetchError.classify(new Error("HTTP 503"), { status: 503, url: "https://codeload.github.com/x" });
      const http = fakeHttp(buildTarGz(VALID_ARCHIVE), [transient]);
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("ok");
      expect(http.calls).toBe(2);
    });
  });

  test("edge case: a permanent failure is not retried", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const permanent = FetchError.classify(new Error("HTTP 404"), { status: 404, url: "https://codeload.github.com/x" });
      const http = fakeHttp(buildTarGz(VALID_ARCHIVE), [permanent, permanent]);
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      expect(http.calls).toBe(1); // BR-F07: no retry for a permanent failure
    });
  });

  test("edge case: two consecutive transient failures surface the second error", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const t1 = FetchError.classify(new Error("HTTP 503"), { status: 503, url: "https://codeload.github.com/x" });
      const t2 = FetchError.classify(new Error("HTTP 502"), { status: 502, url: "https://codeload.github.com/x" });
      const http = fakeHttp(buildTarGz(VALID_ARCHIVE), [t1, t2]);
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      expect(http.calls).toBe(2); // BR-F06: exactly one retry, not a loop
    });
  });
});

describe("createFetcher — PAX/GNU longname streaming boundary (issue #678)", () => {
  // 31 zero-size filler entries (512 bytes each = 15872 bytes) place the
  // extended-header block so it ends exactly at byte 16384 — the default
  // zlib gunzip output chunk size — forcing the header's body (+ padding)
  // into the *next* stream chunk. This is the exact boundary from the
  // issue's own repro script, not an arbitrary count.
  const FILLER_COUNT = 31;
  const LONG_PATH = `amadeus-0.6.9/dist/claude/${"x".repeat(120)}/marker.txt`;

  function fillers(): TarFixtureEntry[] {
    return Array.from({ length: FILLER_COUNT }, (_, i) => ({
      type: "file" as const,
      name: `filler${i}`,
      content: Buffer.alloc(0),
    }));
  }

  test("a PAX extended-header body split across a gunzip chunk boundary still extracts", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const archive: TarFixtureEntry[] = [
        ...fillers(),
        { type: "pax-longname", longName: LONG_PATH },
        { type: "file", name: "_", content: Buffer.from("ok") },
      ];
      const http = fakeHttp(buildTarGz(archive));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const root = result.value.harnessRoot(CLAUDE);
      expect(root.type).toBe("ok");
      if (root.type === "ok") {
        expect(existsSync(join(root.value, "x".repeat(120), "marker.txt"))).toBe(true);
      }
    });
  });

  test("a GNU longname header body split across a gunzip chunk boundary still extracts", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const archive: TarFixtureEntry[] = [
        ...fillers(),
        { type: "gnu-longname", longName: LONG_PATH },
        { type: "file", name: "_", content: Buffer.from("ok") },
      ];
      const http = fakeHttp(buildTarGz(archive));
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const root = result.value.harnessRoot(CLAUDE);
      expect(root.type).toBe("ok");
      if (root.type === "ok") {
        expect(existsSync(join(root.value, "x".repeat(120), "marker.txt"))).toBe(true);
      }
    });
  });

  test("edge case: a genuinely truncated PAX header (no boundary crossing) is still rejected", async () => {
    await withTmpWrite(async (tmpWrite) => {
      const archive: TarFixtureEntry[] = [{ type: "pax-longname", longName: LONG_PATH }];
      const full = buildTarGz(archive);
      // Cut the compressed stream short so the decompressed PAX body never
      // fully arrives, even at end-of-stream (`final`). AC-678-3: the
      // existing truncated-archive detection must still fire.
      const truncated = full.subarray(0, Math.max(1, full.length - 40));
      const http = fakeHttp(truncated);
      const result = await createFetcher(http, tmpWrite).fetchArchive(version());
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("payload-invalid");
    });
  });
});
