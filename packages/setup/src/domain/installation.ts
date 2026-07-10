import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { allEngineDirNames } from "./engine-layout.ts";
import type { Manifest, ManifestError } from "./manifest.ts";
import { manifestPathFor, type ManifestIo } from "../modules/manifest-io.ts";
import { Result } from "../shared/result.ts";

export type InstallationEvidence = {
  readonly paths: readonly string[];
  readonly versionFileContent: string | null;
  readonly anchors: { readonly toolsDir: boolean; readonly amadeusCommon: boolean };
};

export type InstallAdmission =
  | { readonly type: "proceed" }
  | { readonly type: "proceed-forced" }
  | { readonly type: "refuse-suggest-upgrade"; readonly detected: string };

export type Installation =
  | { readonly kind: "none"; admitsInstall(force: boolean): InstallAdmission }
  | { readonly kind: "manifested"; readonly manifest: Manifest; admitsInstall(force: boolean): InstallAdmission }
  | { readonly kind: "manual-or-unknown"; readonly evidence: InstallationEvidence; admitsInstall(force: boolean): InstallAdmission }
  | { readonly kind: "partial"; readonly missing: readonly string[]; admitsInstall(force: boolean): InstallAdmission };

// FR-742: a manifest that is present but unreadable (malformed JSON, an
// unsupported schema, or a genuine I/O failure) is a loud detection error,
// never silently treated as "not installed" — the caller surfaces the manifest
// path and reinstall/--force guidance and exits non-zero.
export type InstallationError = { readonly type: "corrupt-manifest"; readonly path: string; readonly cause: ManifestError };

export namespace Installation {
  // BR-I07/BR-I09: the detected kind decides admission, and this function is
  // the only place that decides it — cli/planner never branch on `kind`
  // themselves (Tell, Don't Ask).
  export async function detect(target: string, manifestIo: ManifestIo): Promise<Result<Installation, InstallationError>> {
    const manifestResult = await manifestIo.read(target);
    if (manifestResult.type === "err") {
      return Result.err({ type: "corrupt-manifest", path: manifestPathFor(target), cause: manifestResult.error });
    }
    if (manifestResult.value !== null) {
      const manifest = manifestResult.value;
      // FR-656-2: a readable manifest is not proof the installation is
      // intact — verify each manifest-listed required file still exists on
      // disk before trusting the manifest's own record unconditionally.
      const missingFiles = await missingRequiredFiles(target, manifest);
      if (missingFiles.length > 0) {
        return Result.ok(partialInstallation(missingFiles));
      }
      return Result.ok(manifestedInstallation(manifest));
    }

    const evidence = await scanEvidence(target);
    if (evidence.paths.length === 0) {
      return Result.ok(noneInstallation());
    }

    const missing: string[] = [];
    if (!evidence.anchors.toolsDir) missing.push("tools directory");
    if (!evidence.anchors.amadeusCommon) missing.push("amadeus-common directory");
    if (missing.length > 0) {
      // FR-656-1: both anchors missing but amadeus-prefixed evidence exists
      // (an anchor-less legacy layout, recognizable only by its owned-file
      // naming) is manual-or-unknown, not partial — this is exactly
      // LegacyLayout.isUnsupported's condition (b) input contract, which
      // must be reachable for BR-U07's hard-refuse to fire.
      if (!evidence.anchors.toolsDir && !evidence.anchors.amadeusCommon && hasAmadeusPrefixedPath(evidence.paths)) {
        return Result.ok(manualOrUnknownInstallation(evidence));
      }
      return Result.ok(partialInstallation(missing));
    }

    return Result.ok(manualOrUnknownInstallation(evidence));
  }
}

Object.freeze(Installation);

// --- Installation.detect internals (private) --------------------------------

function admissionFor(kind: Installation["kind"], force: boolean, detected: string): InstallAdmission {
  if (kind === "none") return Object.freeze({ type: "proceed" });
  if (force) return Object.freeze({ type: "proceed-forced" });
  return Object.freeze({ type: "refuse-suggest-upgrade", detected });
}

function noneInstallation(): Installation {
  return Object.freeze({
    kind: "none",
    admitsInstall(force: boolean): InstallAdmission {
      return admissionFor("none", force, "");
    },
  });
}

function manifestedInstallation(manifest: Manifest): Installation {
  const detected = `${manifest.harness} ${manifest.sourceTag} (installed ${manifest.installedAt})`;
  return Object.freeze({
    kind: "manifested",
    manifest,
    admitsInstall(force: boolean): InstallAdmission {
      return admissionFor("manifested", force, detected);
    },
  });
}

function manualOrUnknownInstallation(evidence: InstallationEvidence): Installation {
  const detected = `a manual or unrecognized Amadeus installation (found: ${evidence.paths.join(", ")})`;
  return Object.freeze({
    kind: "manual-or-unknown",
    evidence,
    admitsInstall(force: boolean): InstallAdmission {
      return admissionFor("manual-or-unknown", force, detected);
    },
  });
}

function partialInstallation(missing: readonly string[]): Installation {
  const detected = `a partial Amadeus installation (missing: ${missing.join(", ")})`;
  return Object.freeze({
    kind: "partial",
    missing,
    admitsInstall(force: boolean): InstallAdmission {
      return admissionFor("partial", force, detected);
    },
  });
}

// No manifest was found (or it could not be read): scan for any known
// engine directory across all harnesses, since detect() is not told which
// harness the caller intends to install. This is install-flow's own
// heuristic (functional-design-questions.md records no upstream ruling on
// this exact scan strategy) — collected evidence doubles as U3's LegacyLayout
// input contract per domain-entities.md.
//
// Review correction 3: the bare engineDir (e.g. ".claude") existing is not
// itself evidence of an Amadeus install — a project may have a ".claude"
// directory with unrelated content (a stray settings.json, say) and nothing
// else. Only an Amadeus-specific anchor (tools/, amadeus-common/, or VERSION)
// counts; a bare engineDir with none of those contributes nothing to `paths`.
async function scanEvidence(target: string): Promise<InstallationEvidence> {
  const paths: string[] = [];
  let toolsDir = false;
  let amadeusCommon = false;
  let versionFileContent: string | null = null;

  for (const engineDir of allEngineDirNames()) {
    const hasToolsDir = await dirExists(join(target, engineDir, "tools"));
    const hasAmadeusCommon = await dirExists(join(target, engineDir, "amadeus-common"));
    let versionContent: string | null = null;
    try {
      versionContent = await readFile(join(target, engineDir, "VERSION"), "utf8");
    } catch {
      // No VERSION file under this engine dir.
    }
    // FR-656-1: also collect loose amadeus-*-prefixed entries other than the
    // 3 known anchors (tools/, amadeus-common/, VERSION) — an older dist
    // shape recognizable only by its owned-file naming, not by today's
    // directory convention (see LegacyLayout.isUnsupported condition (b) in
    // upgrade.ts).
    const looseEntries = await looseAmadeusEntries(join(target, engineDir));

    if (!hasToolsDir && !hasAmadeusCommon && versionContent === null && looseEntries.length === 0) continue; // no anchor and no loose evidence: not evidence

    if (hasToolsDir) {
      paths.push(`${engineDir}/tools`);
      toolsDir = true;
    }
    if (hasAmadeusCommon) {
      paths.push(`${engineDir}/amadeus-common`);
      amadeusCommon = true;
    }
    if (versionContent !== null && versionFileContent === null) {
      versionFileContent = versionContent;
      paths.push(`${engineDir}/VERSION`);
    }
    for (const entry of looseEntries) {
      paths.push(`${engineDir}/${entry}`);
    }
  }

  return Object.freeze({
    paths: Object.freeze(paths),
    versionFileContent,
    anchors: Object.freeze({ toolsDir, amadeusCommon }),
  });
}

function hasAmadeusPrefixedPath(paths: readonly string[]): boolean {
  return paths.some((path) => basename(path).startsWith("amadeus-"));
}

async function looseAmadeusEntries(engineDirPath: string): Promise<readonly string[]> {
  let entries: string[];
  try {
    entries = await readdir(engineDirPath);
  } catch {
    return [];
  }
  return entries.filter((name) => name.startsWith("amadeus-") && name !== "amadeus-common");
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

// FR-656-2: a readable manifest alone is not proof the installation is
// intact — verify each manifest-listed required file still exists on disk.
async function missingRequiredFiles(target: string, manifest: Manifest): Promise<string[]> {
  const missing: string[] = [];
  for (const path of manifest.requiredPaths()) {
    if (!(await fileExists(join(target, path)))) missing.push(path);
  }
  return missing;
}
