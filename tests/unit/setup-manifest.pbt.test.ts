// covers: domain:setup-manifest
// size: small
//
// Property-based tests for the setup CLI's Manifest domain (#697 / #684 Phase B).
// In-process: the domain is imported and exercised directly — no process is
// spawned, no filesystem or network is touched — so this file classifies as a
// SMALL test and joins the fast unit tier. The example-based sibling
// (tests/unit/setup-manifest.test.ts) pins specific build/parse/disposition
// cases; this file generalizes the two structural invariants below over the
// generated input space.
//
// The PBT conventions (fixed seed, default numRuns=100, AMADEUS_PBT_DEEP=1 for a
// 50k deep tier, shrunk-counterexample pinning) are defined canonically in
// tests/unit/setup-semver.pbt.test.ts; this file follows them.

import { describe, expect, test } from "bun:test";
import { Manifest, ManifestFiles, type ManifestFile } from "../../packages/setup/src/domain/manifest.ts";
import {
  duplicatePathFilesArb,
  installMetaArb,
  resolvedVersionArb,
  uniquePathFilesArb,
} from "../helpers/arbitraries/manifest.ts";
import { fakePayload } from "../lib/setup-domain-fixtures.ts";
import fc from "fast-check";

// Fixed seed: matches the semver PBT file so any counterexample replays
// deterministically in PR CI (convention #1).
const PBT_SEED = 0x5e_6970;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

function filesOrThrow(entries: readonly ManifestFile[]): ManifestFiles {
  const result = ManifestFiles.fromEntries(entries);
  if (result.type === "err") {
    throw new Error(`expected unique-path entries to build, got err: ${result.error.type}`);
  }
  return result.value;
}

describe("Manifest property: P-MF1 parse ∘ toJSON ∘ build recovers the ORIGINAL build input", () => {
  test("the parsed manifest's domain values equal the generated (entries, version, meta) input", () => {
    fc.assert(
      fc.property(uniquePathFilesArb, resolvedVersionArb, installMetaArb, (entries, version, meta) => {
        const built = Manifest.build(fakePayload(version), filesOrThrow(entries), meta);
        const reparsed = Manifest.parse(built.toJSON());
        // parse must accept every manifest build produces.
        expect(reparsed.type).toBe("ok");
        if (reparsed.type !== "ok") return;
        const parsed = reparsed.value;
        // ANCHOR TO INPUT, not to the emitted JSON: every recovered value is
        // asserted against the generated input (entries / version / meta), never
        // against built.toJSON(). This catches a value-mapping corruption in
        // toJSON that parse would otherwise re-accept (e.g. md5 → "BROKEN-MD5"),
        // which an emitted-vs-emitted comparison cannot see.
        expect(parsed.schemaVersion).toBe(1);
        expect(parsed.installerPackageVersion).toBe(meta.installerPackageVersion);
        expect(parsed.installedAt).toBe(meta.installStartedAt);
        expect(parsed.harness).toBe(meta.harness);
        // version: compare via the SemVer domain equality to the input semver,
        // and the tag/sourceTag to the input tag — no format() round-trip stands
        // in for the input.
        expect(parsed.distributionVersion.equals(version.semver)).toBe(true);
        expect(parsed.sourceTag).toBe(version.tag);
        // files: the recovered file table must reproduce the input entries
        // exactly (path/class/required/md5, order preserved).
        expect(parsed.toJSON().files).toEqual(
          entries.map((e) => ({ path: e.path, class: e.class, required: e.required, md5: e.md5 })),
        );
      }),
      OPTS,
    );
  });
});

describe("Manifest property: P-MF2 a duplicated path is always a Result error, never a throw", () => {
  test("ManifestFiles.fromEntries (the build path) rejects with duplicate-path", () => {
    fc.assert(
      fc.property(duplicatePathFilesArb, (entries) => {
        const result = ManifestFiles.fromEntries(entries);
        expect(result.type).toBe("err");
        if (result.type === "err") expect(result.error.type).toBe("duplicate-path");
      }),
      OPTS,
    );
  });

  test("Manifest.parse rejects a JSON whose files[] carries a duplicated path", () => {
    fc.assert(
      fc.property(duplicatePathFilesArb, installMetaArb, (entries, meta) => {
        // An otherwise well-formed manifest JSON (schema/harness/version/tag all
        // valid) whose only defect is a duplicated path in files[]. Parse must
        // reach the duplicate-path check and return it — not throw, not accept.
        const json = {
          schemaVersion: 1 as const,
          installerPackageVersion: meta.installerPackageVersion,
          distributionVersion: "v1.0.0",
          sourceTag: "v1.0.0",
          installedAt: meta.installStartedAt,
          harness: meta.harness,
          files: entries.map((e) => ({ path: e.path, class: e.class, required: e.required, md5: e.md5 })),
        };
        const result = Manifest.parse(json);
        expect(result.type).toBe("err");
        if (result.type === "err") expect(result.error.type).toBe("duplicate-path");
      }),
      OPTS,
    );
  });
});
