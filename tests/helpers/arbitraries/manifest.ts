// Arbitraries for property-based tests over the setup CLI's Manifest domain
// (#697 / #684 Phase B). Like the semver arbitraries, these produce PLAIN
// STRUCTURAL data — ManifestFile records and the pieces Manifest.build consumes
// — never brand-typed values fabricated behind a smart constructor. A ManifestFile
// is an ordinary record type (manifest.ts), so it is built structurally; the two
// brands in play (SemVer, HarnessName) are only ever produced through their own
// constructors: SemVer via SemVer.parse (reached through validSemVerStringArb +
// ResolvedVersion.fromRelease) and HarnessName by drawing from the canonical
// HarnessName.all list — never cast into existence here.

import fc from "fast-check";
import { HarnessName } from "../../../packages/setup/src/domain/harness.ts";
import type { FileClass, InstallMeta, ManifestFile } from "../../../packages/setup/src/domain/manifest.ts";
import type { ResolvedVersion } from "../../../packages/setup/src/domain/resolved-version.ts";
import { ResolvedVersion as ResolvedVersionNs } from "../../../packages/setup/src/domain/resolved-version.ts";
import { SemVer } from "../../../packages/setup/src/domain/semver.ts";
import { validSemVerStringArb } from "./semver.ts";

// A path segment: the characters that show up in the framework's on-disk layout
// (letters, digits, ".", "-", "_"). Kept ASCII so the generated paths read like
// real manifest entries rather than arbitrary unicode.
const SEGMENT_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_".split("");
const segmentArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...SEGMENT_CHARS), { minLength: 1, maxLength: 10 })
  .map((chars) => chars.join(""));

// A relative path of 1..4 "/"-joined segments (e.g. ".claude/settings.json").
const pathArb: fc.Arbitrary<string> = fc
  .array(segmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join("/"));

// A 32-char lowercase hex digest, shaped like the md5 the installer records.
// The domain never re-validates the digest's shape, so shape is purely cosmetic;
// what matters is that it is a stable string that survives the round trip.
const HEX_CHARS = "0123456789abcdef".split("");
const md5Arb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...HEX_CHARS), { minLength: 32, maxLength: 32 })
  .map((chars) => chars.join(""));

const fileClassArb: fc.Arbitrary<FileClass> = fc.constantFrom<FileClass>("owned", "shared", "user-preserved");

/** A single manifest entry. Path uniqueness across a list is NOT enforced here —
 *  it is a property of the list-level arbitraries below. */
export const manifestFileArb: fc.Arbitrary<ManifestFile> = fc.record({
  path: pathArb,
  class: fileClassArb,
  required: fc.boolean(),
  md5: md5Arb,
});

/** An entry list whose paths are all distinct (0..8 entries). This is the shape
 *  ManifestFiles.fromEntries accepts: the duplicate-path invariant holds by
 *  construction, so Manifest.build over this list always succeeds. */
export const uniquePathFilesArb: fc.Arbitrary<ManifestFile[]> = fc.uniqueArray(manifestFileArb, {
  selector: (entry) => entry.path,
  minLength: 0,
  maxLength: 8,
});

/** An entry list that is guaranteed to contain at least one duplicated path.
 *  Built structurally: start from a non-empty unique list, clone the path of one
 *  existing entry into a fresh entry (its other fields drawn independently), and
 *  splice that clone in at an arbitrary position. The shared path — not the whole
 *  record — is what the duplicate-path invariant keys on, so a clone that differs
 *  in class/required/md5 is still a genuine duplicate. */
export const duplicatePathFilesArb: fc.Arbitrary<ManifestFile[]> = fc
  .uniqueArray(manifestFileArb, { selector: (entry) => entry.path, minLength: 1, maxLength: 8 })
  .chain((entries) =>
    fc
      .record({
        sourceIndex: fc.integer({ min: 0, max: entries.length - 1 }),
        clone: fc.record({ class: fileClassArb, required: fc.boolean(), md5: md5Arb }),
        insertAt: fc.integer({ min: 0, max: entries.length }),
      })
      .map(({ sourceIndex, clone, insertAt }) => {
        const duplicate: ManifestFile = { path: entries[sourceIndex].path, ...clone };
        const out = [...entries];
        out.splice(insertAt, 0, duplicate);
        return out;
      }),
  );

/** A resolved distribution version, produced only through the SemVer smart
 *  constructor. validSemVerStringArb emits strings SemVer.parse always accepts,
 *  so the err branch here is unreachable and signals a broken generator. */
export const resolvedVersionArb: fc.Arbitrary<ResolvedVersion> = validSemVerStringArb.map((raw) => {
  const parsed = SemVer.parse(raw);
  if (parsed.type === "err") {
    throw new Error(`validSemVerStringArb produced a rejected string: ${JSON.stringify(raw)}`);
  }
  return ResolvedVersionNs.fromRelease(parsed.value);
});

/** Install metadata for Manifest.build. installerPackageVersion / installStartedAt
 *  are free-form strings at the domain boundary (Manifest.parse only type-checks
 *  them), so they are drawn as arbitrary strings; harness is drawn from the
 *  canonical HarnessName.all so it always survives parse's harness check. */
export const installMetaArb: fc.Arbitrary<InstallMeta> = fc.record({
  installerPackageVersion: fc.string(),
  harness: fc.constantFrom(...HarnessName.all),
  installStartedAt: fc.string(),
});
