import type { InstallationEvidence, Installation } from "./installation.ts";
import { Manifest, type BuildInput, type Disposition, type FileClass } from "./manifest.ts";
import type { ResolvedVersion } from "./resolved-version.ts";
import { SemVer } from "./semver.ts";
import type { VersionSpec } from "./version-spec.ts";
import { Result } from "../shared/result.ts";

// --- UpgradeAssessment (FR-005 version-boundary decision) --------------------

export type UpgradeOutcome =
  | { readonly type: "proceed"; readonly to: ResolvedVersion }
  | { readonly type: "already-up-to-date"; readonly installed: SemVer }
  | { readonly type: "downgrade-unsupported"; readonly installed: SemVer; readonly requested: SemVer }
  | { readonly type: "installed-newer-than-latest"; readonly installed: SemVer; readonly latest: SemVer };

// The three no-op-terminal variants; "proceed" is the only actionable one.
export type UpgradeOutcomeNonProceed = Exclude<UpgradeOutcome, { readonly type: "proceed" }>;

export type UpgradeAssessment = {
  outcome(): UpgradeOutcome;
  isActionable(): boolean;
};

function createUpgradeAssessment(outcome: UpgradeOutcome): UpgradeAssessment {
  return Object.freeze({
    outcome(): UpgradeOutcome {
      return outcome;
    },
    isActionable(): boolean {
      return outcome.type === "proceed";
    },
  });
}

export namespace UpgradeAssessment {
  // BR-U01~U04: the caller never compares installed/resolved itself — this is
  // the one place that owns the four-way boundary decision.
  export function of(installed: SemVer, resolved: ResolvedVersion, spec: VersionSpec): UpgradeAssessment {
    if (installed.equals(resolved.semver)) {
      return createUpgradeAssessment({ type: "already-up-to-date", installed });
    }
    if (resolved.semver.isLaterThan(installed)) {
      return createUpgradeAssessment({ type: "proceed", to: resolved });
    }
    // installed is later than the resolved version: whether that is a refused
    // downgrade or "installed is ahead of latest" depends on whether the user
    // asked for a specific version (BR-U02) or accepted the default latest
    // resolution (BR-U03).
    if (spec.kind === "latest") {
      return createUpgradeAssessment({ type: "installed-newer-than-latest", installed, latest: resolved.semver });
    }
    return createUpgradeAssessment({ type: "downgrade-unsupported", installed, requested: resolved.semver });
  }
}

Object.freeze(UpgradeAssessment);

// --- UpgradeRefusal (upgrade-side no-change-terminal union) ------------------

export type UpgradeRefusal =
  | { readonly type: "no-installation" }
  | { readonly type: "unsupported-layout"; readonly detail: string }
  | { readonly type: "partial-refused"; readonly missing: readonly string[] }
  | UpgradeOutcomeNonProceed;

export namespace UpgradeRefusal {
  export function fromOutcome(outcome: UpgradeOutcomeNonProceed): UpgradeRefusal {
    return outcome;
  }
  export function noInstallation(): UpgradeRefusal {
    return Object.freeze({ type: "no-installation" });
  }
  export function unsupportedLayout(detail: string): UpgradeRefusal {
    return Object.freeze({ type: "unsupported-layout", detail });
  }
  export function partialRefused(missing: readonly string[]): UpgradeRefusal {
    return Object.freeze({ type: "partial-refused", missing });
  }
}

Object.freeze(UpgradeRefusal);

// --- LegacyLayout (FR-005: non-supported pre-anchor layouts) -----------------

export type LegacyLayoutVerdict = { readonly unsupported: boolean; readonly detail: string };

export namespace LegacyLayout {
  // Fixed, testable rule (domain-entities.md): (a) a VERSION file whose
  // content is not a parseable SemVer predates the current versioning
  // convention entirely; (b) amadeus-* files exist without either current
  // layout anchor (tools/ or amadeus-common/) present — an older dist shape
  // recognizable only by its owned-file naming, not by today's directory
  // convention. If anchors are present, the installation is manual-or-unknown
  // (conservative plan), not unsupported, even if hand-customized.
  export function isUnsupported(evidence: InstallationEvidence): LegacyLayoutVerdict {
    if (evidence.versionFileContent !== null) {
      const parsed = SemVer.parse(evidence.versionFileContent);
      if (parsed.type === "err") {
        return Object.freeze({
          unsupported: true,
          detail: `VERSION file content predates the current versioning convention: ${evidence.versionFileContent.trim()}`,
        });
      }
    }

    const hasAmadeusPrefixedPath = evidence.paths.some((path) => {
      const segments = path.split("/");
      const basename = segments[segments.length - 1] ?? path;
      return basename.startsWith("amadeus-");
    });
    if (hasAmadeusPrefixedPath && !evidence.anchors.toolsDir && !evidence.anchors.amadeusCommon) {
      return Object.freeze({
        unsupported: true,
        detail: "amadeus-* files were found without either current layout anchor (tools/ or amadeus-common/) present",
      });
    }

    return Object.freeze({ unsupported: false, detail: "" });
  }
}

Object.freeze(LegacyLayout);

// --- UpgradeSource (installation state -> treatment strategy) ---------------

export type UpgradeSource = {
  readonly kind: "manifested" | "manual-or-unknown" | "partial-forced";
  dispositionFor(path: string, cls: FileClass, actualMd5: string): Disposition;
  assess(resolved: ResolvedVersion, spec: VersionSpec): UpgradeAssessment | null;
  nextManifest(input: BuildInput): Manifest;
  strategyNote(): string;
};

function manifestedSource(manifest: Manifest): UpgradeSource {
  return Object.freeze({
    kind: "manifested",
    // BR-U11: delegates to the manifest's own disposition judgment; no
    // independent classification logic lives here for this variant.
    dispositionFor(path: string, _cls: FileClass, actualMd5: string): Disposition {
      return manifest.dispositionFor(path, actualMd5);
    },
    assess(resolved: ResolvedVersion, spec: VersionSpec): UpgradeAssessment | null {
      return UpgradeAssessment.of(manifest.distributionVersion, resolved, spec);
    },
    nextManifest(input: BuildInput): Manifest {
      return manifest.upgradedTo(input);
    },
    strategyNote(): string {
      return `Upgrading a manifest-tracked ${manifest.harness} installation from ${manifest.sourceTag}.`;
    },
  });
}

// BR-U09: no expected md5 is available for manual-or-unknown/partial-forced
// sources, so every existing shared file is treated as user-modified and
// always backed up before copying (the same conservative rule install-flow
// applies on a fresh install with no manifest yet).
function conservativeSource(kind: "manual-or-unknown" | "partial-forced"): UpgradeSource {
  return Object.freeze({
    kind,
    dispositionFor(_path: string, cls: FileClass, _actualMd5: string): Disposition {
      if (cls === "owned") return Object.freeze({ type: "overwrite" });
      if (cls === "user-preserved") return Object.freeze({ type: "preserve" });
      return Object.freeze({ type: "backup-then-copy" });
    },
    assess(_resolved: ResolvedVersion, _spec: VersionSpec): UpgradeAssessment | null {
      return null; // BR-U05: installed version is unknown, so no boundary check applies
    },
    nextManifest(input: BuildInput): Manifest {
      return Manifest.build(input.payload, input.files, input.meta);
    },
    strategyNote(): string {
      return kind === "manual-or-unknown"
        ? "No installer manifest was found; using a conservative strategy that backs up every modified shared file before copying."
        : "Partial installation forced with --force; proceeding with the same conservative backup strategy.";
    },
  });
}

export namespace UpgradeSource {
  // BR-U06~U09: converts an Installation (U2) into an upgrade treatment
  // strategy, or refuses upfront when no productive strategy exists.
  export function fromInstallation(installation: Installation, force: boolean): Result<UpgradeSource, UpgradeRefusal> {
    if (installation.kind === "none") {
      return Result.err(UpgradeRefusal.noInstallation());
    }
    if (installation.kind === "partial") {
      if (!force) return Result.err(UpgradeRefusal.partialRefused(installation.missing));
      return Result.ok(conservativeSource("partial-forced"));
    }
    if (installation.kind === "manual-or-unknown") {
      const verdict = LegacyLayout.isUnsupported(installation.evidence);
      if (verdict.unsupported) return Result.err(UpgradeRefusal.unsupportedLayout(verdict.detail));
      return Result.ok(conservativeSource("manual-or-unknown"));
    }
    return Result.ok(manifestedSource(installation.manifest));
  }
}

Object.freeze(UpgradeSource);
