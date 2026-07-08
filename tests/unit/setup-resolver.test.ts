// covers: modules:setup-resolver
//
// createResolver — release-then-tag fallback, SemVer ordering, BR-F09's 2-call
// cap, and network-failure propagation (a gap the approved business-logic-model
// pseudocode left implicit — closed here by surfacing FetchError verbatim
// alongside ResolveError; see the module's own Resolver type).

import { describe, expect, test } from "bun:test";
import type { Http } from "../../packages/setup/src/ports/http.ts";
import type { FetchError } from "../../packages/setup/src/domain/payload.ts";
import { createResolver } from "../../packages/setup/src/modules/resolver.ts";
import { VersionSpec } from "../../packages/setup/src/domain/version-spec.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";

function fakeHttp(responses: Record<string, unknown[] | FetchError>): Http & { callLog: string[] } {
  const callLog: string[] = [];
  return {
    callLog,
    async getJson(path: string) {
      callLog.push(path);
      const response = responses[path];
      if (response === undefined) throw new Error(`unexpected path in test fixture: ${path}`);
      if (Array.isArray(response)) return Result.ok(response);
      return Result.err(response);
    },
    async downloadArchive() {
      throw new Error("resolver must never call downloadArchive");
    },
  };
}

const RELEASES = "/repos/amadeus-dlc/amadeus/releases";
const TAGS = "/repos/amadeus-dlc/amadeus/tags";

describe("createResolver — latest", () => {
  test("BR-F01: picks the newest stable release", async () => {
    const http = fakeHttp({
      [RELEASES]: [
        { tag_name: "v1.0.0", draft: false, prerelease: false },
        { tag_name: "v2.0.0", draft: false, prerelease: false },
      ],
    });
    const result = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.tag).toBe("v2.0.0");
    expect(http.callLog).toEqual([RELEASES]); // BR-F09: only 1 call when a release is found
  });

  test("BR-F02: excludes draft and prerelease releases", async () => {
    const http = fakeHttp({
      [RELEASES]: [
        { tag_name: "v9.9.9", draft: true, prerelease: false },
        { tag_name: "v9.9.8", draft: false, prerelease: true },
        { tag_name: "v1.0.0", draft: false, prerelease: false },
      ],
    });
    const result = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.tag).toBe("v1.0.0");
  });

  test("BR-F01: falls back to tags when there are no stable releases", async () => {
    const http = fakeHttp({
      [RELEASES]: [],
      [TAGS]: [{ name: "v1.5.0" }, { name: "v1.2.0" }],
    });
    const result = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(result.type).toBe("ok");
    if (result.type === "ok") {
      expect(result.value.tag).toBe("v1.5.0");
      expect(result.value.source).toBe("tag");
    }
    expect(http.callLog).toEqual([RELEASES, TAGS]); // BR-F09: exactly 2 calls on fallback
  });

  test("edge case: no-stable-version when both releases and tags are empty", async () => {
    const http = fakeHttp({ [RELEASES]: [], [TAGS]: [] });
    const result = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("no-stable-version");
  });

  test("BR-F05: silently skips malformed tag names instead of failing", async () => {
    const http = fakeHttp({ [RELEASES]: [], [TAGS]: [{ name: "not-a-version" }, { name: "v1.0.0" }] });
    const result = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.tag).toBe("v1.0.0");
  });

  test("edge case: a rate-limit response surfaces as FetchError, not a misleading no-stable-version", async () => {
    const rateLimited: FetchError = {
      type: "rate-limit",
      detail: "HTTP 403",
      status: 403,
      isTransient: () => false,
      guidance: () => "wait and retry",
    };
    const http = fakeHttp({ [RELEASES]: rateLimited });
    const result = await createResolver(http).resolveVersion(VersionSpec.latest());
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("rate-limit");
  });
});

describe("createResolver — exact", () => {
  test("BR-F04: finds the exact requested tag", async () => {
    const http = fakeHttp({ [TAGS]: [{ name: "v1.0.0" }, { name: "v1.2.3" }] });
    const specResult = VersionSpec.exact("1.2.3");
    if (specResult.type === "err") throw new Error("unexpected err");
    const result = await createResolver(http).resolveVersion(specResult.value);
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.tag).toBe("v1.2.3");
    expect(http.callLog).toEqual([TAGS]); // BR-F09: exact resolution never touches releases
  });

  test("edge case: not-found when the exact tag does not exist", async () => {
    const http = fakeHttp({ [TAGS]: [{ name: "v1.0.0" }] });
    const specResult = VersionSpec.exact("9.9.9");
    if (specResult.type === "err") throw new Error("unexpected err");
    const result = await createResolver(http).resolveVersion(specResult.value);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("not-found");
  });
});
