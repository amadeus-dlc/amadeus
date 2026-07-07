// covers: package:@amadeus-dlc/setup, installer:version-resolution, requirements:FR-007, stories:US-008, stories:US-009

import { describe, expect, test } from "bun:test";
import { CANONICAL_SOURCE_REPO } from "../../packages/setup/src/domain/source-types.ts";
import { resolveVersion } from "../../packages/setup/src/domain/version-resolver.ts";
import type { TagSourcePort } from "../../packages/setup/src/ports/tag-source.ts";

function tagSource(tags: string[]): TagSourcePort {
  return {
    async listTags() {
      return { ok: true, value: tags };
    },
  };
}

async function resolve(tags: string[], requestedVersion?: string) {
  return resolveVersion({
    requestedVersion,
    sourceRepo: CANONICAL_SOURCE_REPO,
    allowExplicitPrerelease: requestedVersion !== undefined && requestedVersion.includes("-"),
    tagSource: tagSource(tags),
  });
}

describe("U2 version resolver", () => {
  test("default resolution uses SemVer ordering instead of lexicographic ordering", async () => {
    const result = await resolve(["v1.2.0", "v1.10.0", "v1.9.9"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.distributionVersion).toBe("1.10.0");
      expect(result.value.sourceTag).toBe("v1.10.0");
    }
  });

  test("v-prefixed duplicate wins and bare duplicate is reported as ignored", async () => {
    const result = await resolve(["1.2.3", "v1.2.3"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceTag).toBe("v1.2.3");
      expect(result.value.ignoredTags).toContainEqual({ tag: "1.2.3", reason: "duplicate-bare-tag" });
    }
  });

  test("prerelease tags are excluded by default", async () => {
    const result = await resolve(["v2.0.0-beta.1", "v1.9.0"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceTag).toBe("v1.9.0");
      expect(result.value.ignoredTags).toContainEqual({ tag: "v2.0.0-beta.1", reason: "prerelease-excluded" });
    }
  });

  test("explicit prerelease resolves when the exact prerelease tag exists", async () => {
    const result = await resolve(["v2.0.0-beta.1", "v1.9.0"], "2.0.0-beta.1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.distributionVersion).toBe("2.0.0-beta.1");
      expect(result.value.sourceTag).toBe("v2.0.0-beta.1");
    }
  });

  test("explicit v-prefixed version requires the exact v tag", async () => {
    const result = await resolve(["1.2.3"], "v1.2.3");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("version-not-found");
    }
  });

  test("explicit bare version falls back to a bare tag when v-prefixed tag is absent", async () => {
    const result = await resolve(["1.2.3"], "1.2.3");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceTag).toBe("1.2.3");
    }
  });

  test("missing explicit version returns version-not-found", async () => {
    const result = await resolve(["v1.2.3"], "1.2.4");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("version-not-found");
      expect(result.error.noFilesModified).toBe(true);
    }
  });

  test("no stable default candidate returns no-stable-version", async () => {
    const result = await resolve(["v1.0.0-beta.1", "release-candidate"]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("no-stable-version");
      expect(result.error.noFilesModified).toBe(true);
    }
  });

  test("malformed tags are diagnostic-only when a stable tag exists", async () => {
    const result = await resolve(["not-a-version", "v1.0.0"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sourceTag).toBe("v1.0.0");
      expect(result.value.ignoredTags).toContainEqual({ tag: "not-a-version", reason: "malformed" });
    }
  });
});
