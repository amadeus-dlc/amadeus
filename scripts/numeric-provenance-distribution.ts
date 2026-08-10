// Canonical target resolution for the numeric-provenance packaging acceptance.
// This module owns no sensor semantics: it closes the package/self-install
// target sets and resolves their roots from the existing registry + manifests.

import { isAbsolute, join, normalize, relative, sep, win32 } from "node:path";

import {
  PACKAGE_HARNESS_IDS,
  SELF_INSTALL_HARNESS_IDS,
} from "../packages/framework/core/tools/amadeus-harness-registry.ts";
import type { HarnessManifest } from "./manifest-types.ts";
import { discoverHarnessNames } from "./package.ts";
import { SELF_INSTALL_HARNESSES } from "./plugin-projection.ts";

const HARNESS_ROOT = join(import.meta.dir, "..", "packages", "framework", "harness");

export interface NumericProvenanceDistributionTarget {
  readonly id: string;
  readonly harnessDir: string;
  readonly packageRoot: string;
  readonly selfInstallRoot: string | null;
}

export interface NumericProvenanceDistributionTargetInput {
  readonly packageIds: readonly string[];
  readonly selfInstallIds: readonly string[];
  readonly discoveredPackageIds: readonly string[];
  readonly promotedSelfInstallIds: readonly string[];
  readonly manifestFor: (id: string) => Pick<HarnessManifest, "name" | "harnessDir">;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`duplicate-${label}-id`);
}

function assertExactSet(expected: readonly string[], actual: readonly string[], label: string): void {
  if (JSON.stringify(sorted(expected)) !== JSON.stringify(sorted(actual))) {
    throw new Error(`${label}-set-mismatch`);
  }
}

function safeHarnessDirectory(harnessDir: string): boolean {
  if (harnessDir === "" || isAbsolute(harnessDir) || win32.isAbsolute(harnessDir)) return false;
  const segments = harnessDir.split(/[\\/]/u);
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function assertContained(root: string, target: string): void {
  const rel = relative(normalize(root), normalize(target));
  if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new Error("distribution-root-escape");
  }
}

export function resolveNumericProvenanceDistributionTargets(
  input: NumericProvenanceDistributionTargetInput,
): readonly NumericProvenanceDistributionTarget[] {
  assertUnique(input.packageIds, "package-harness");
  assertUnique(input.selfInstallIds, "self-install-harness");
  assertUnique(input.discoveredPackageIds, "discovered-package-harness");
  assertUnique(input.promotedSelfInstallIds, "promoted-self-install-harness");
  assertExactSet(input.packageIds, input.discoveredPackageIds, "package-harness");
  assertExactSet(input.selfInstallIds, input.promotedSelfInstallIds, "self-install-harness");

  const packageIds = new Set(input.packageIds);
  for (const id of input.selfInstallIds) {
    if (!packageIds.has(id)) throw new Error(`unknown-self-install-harness:${id}`);
  }

  const selfInstallIds = new Set(input.selfInstallIds);
  const packageRoots = new Set<string>();
  const selfInstallRoots = new Set<string>();
  const targets = sorted(input.packageIds).map((id): NumericProvenanceDistributionTarget => {
    const manifest = input.manifestFor(id);
    if (manifest.name !== id) throw new Error(`harness-manifest-name-mismatch:${id}`);
    if (!safeHarnessDirectory(manifest.harnessDir)) {
      throw new Error(`unsafe-harness-directory:${id}`);
    }

    const packageBase = join("dist", id);
    const packageRoot = join(packageBase, manifest.harnessDir);
    assertContained(packageBase, packageRoot);
    if (packageRoots.has(packageRoot)) throw new Error(`duplicate-package-root:${packageRoot}`);
    packageRoots.add(packageRoot);

    const selfInstallRoot = selfInstallIds.has(id) ? manifest.harnessDir : null;
    if (selfInstallRoot !== null) {
      assertContained(".", selfInstallRoot);
      if (selfInstallRoots.has(selfInstallRoot)) {
        throw new Error(`duplicate-self-install-root:${selfInstallRoot}`);
      }
      selfInstallRoots.add(selfInstallRoot);
    }

    return Object.freeze({ id, harnessDir: manifest.harnessDir, packageRoot, selfInstallRoot });
  });

  return Object.freeze(targets);
}

function loadHarnessManifest(id: string): HarnessManifest {
  const module = require(join(HARNESS_ROOT, id, "manifest.ts")) as { default?: HarnessManifest };
  if (module.default === undefined) throw new Error(`missing-harness-manifest:${id}`);
  return module.default;
}

export function numericProvenanceDistributionTargets(): readonly NumericProvenanceDistributionTarget[] {
  return resolveNumericProvenanceDistributionTargets({
    packageIds: PACKAGE_HARNESS_IDS,
    selfInstallIds: SELF_INSTALL_HARNESS_IDS,
    discoveredPackageIds: discoverHarnessNames(),
    promotedSelfInstallIds: SELF_INSTALL_HARNESSES,
    manifestFor: loadHarnessManifest,
  });
}
