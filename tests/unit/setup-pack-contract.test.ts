import { describe, expect, test } from "bun:test";
import {
  type PackDryRunEnvironment,
  PackReport,
  runBunPackDryRun,
} from "../lib/setup-pack-contract.ts";

const VALID_OUTPUT = [
  "bun pm pack v1.3.13",
  "",
  "packed 1KB package.json",
  "packed 2KB dist/cli.js",
  "",
  "amadeus-dlc-setup-0.1.0.tgz",
].join("\n");

function environment(
  overrides: Partial<PackDryRunEnvironment> = {},
): PackDryRunEnvironment {
  return {
    pack: () => ({ exitCode: 0, stdout: VALID_OUTPUT, stderr: "" }),
    readManifest: () => '{"name":"@amadeus-dlc/setup"}',
    ...overrides,
  };
}

describe("PackReport.parse", () => {
  test("extracts files and version from Bun pack output, including ANSI output", () => {
    const result = PackReport.parse(
      `\u001b[32m${VALID_OUTPUT}\u001b[0m`,
      "@amadeus-dlc/setup",
    );

    expect(result.type).toBe("ok");
    if (result.type === "ok") {
      expect(result.value.files()).toEqual(["package.json", "dist/cli.js"]);
      expect(result.value.packageVersion()).toBe("0.1.0");
    }
  });

  test.each([
    [
      "missing file rows",
      "amadeus-dlc-setup-0.1.0.tgz",
      "expected file rows",
    ],
    [
      "missing tarball",
      "packed 1KB package.json",
      "expected a amadeus-dlc-setup-<version>.tgz",
    ],
    [
      "wrong tarball prefix",
      "packed 1KB package.json\nother-0.1.0.tgz",
      "expected a amadeus-dlc-setup-<version>.tgz",
    ],
    [
      "missing version",
      "packed 1KB package.json\namadeus-dlc-setup-.tgz",
      "expected a version",
    ],
  ])("rejects %s", (_name, output, detail) => {
    const result = PackReport.parse(output, "@amadeus-dlc/setup");

    expect(result).toEqual({
      type: "err",
      error: { type: "malformed-output", detail: expect.stringContaining(detail) },
    });
  });
});

describe("runBunPackDryRun", () => {
  test("reports a failed Bun pack command", () => {
    const result = runBunPackDryRun(
      "/package",
      environment({
        pack: () => ({ exitCode: 7, stdout: "", stderr: "pack failed" }),
      }),
    );

    expect(result).toEqual({
      type: "err",
      error: {
        type: "malformed-output",
        detail: "bun pm pack --dry-run exited 7: pack failed",
      },
    });
  });

  test("reports an unreadable or malformed manifest", () => {
    const unreadable = runBunPackDryRun(
      "/package",
      environment({
        readManifest: () => {
          throw new Error("permission denied");
        },
      }),
    );
    const malformed = runBunPackDryRun(
      "/package",
      environment({ readManifest: () => "not-json" }),
    );

    expect(unreadable.type).toBe("err");
    if (unreadable.type === "err") {
      expect(unreadable.error.detail).toContain("permission denied");
    }
    expect(malformed.type).toBe("err");
    if (malformed.type === "err") {
      expect(malformed.error.detail).toContain("JSON");
    }
  });

  test("requires the manifest package name to be a string", () => {
    const result = runBunPackDryRun(
      "/package",
      environment({ readManifest: () => '{"name":42}' }),
    );

    expect(result).toEqual({
      type: "err",
      error: {
        type: "malformed-output",
        detail: "expected a string package name in package.json",
      },
    });
  });
});
