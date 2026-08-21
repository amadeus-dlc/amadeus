import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { HarnessName } from "./harness.ts";
import type { InstallAdmission } from "./installation.ts";
import type { Disposition, FileClass } from "./manifest.ts";
import {
  decideOnboardingDestination,
  noticeFor,
  onboardingAlternateFor,
  type OnboardingDestination,
  type OnboardingNotice,
} from "./onboarding-ladder.ts";
import type { ExtractedPayload } from "./payload.ts";
import type { UpgradeRefusal, UpgradeSource } from "./upgrade.ts";
import { Result } from "../shared/result.ts";
import { Timestamps } from "../shared/timestamps.ts";

export type PlanAction = "add" | "update" | "skip" | "backup" | "conflict";

export type PlanEntry = {
  readonly path: string;
  readonly action: PlanAction;
  readonly class: FileClass;
  readonly forced: boolean;
  readonly md5: string;
  readonly required: boolean;
  // #3388: the payload-relative path to copy FROM, when it differs from the
  // destination `path`. Present only for an onboarding doc the ladder diverted
  // to <STEM>-AMADEUS.md; absent everywhere else, where source and destination
  // are the same relative path. Consumers read `sourcePath ?? path`.
  readonly sourcePath?: string;
};

export type PlanSummary = {
  readonly add: number;
  readonly update: number;
  readonly skip: number;
  readonly backup: number;
  readonly conflict: number;
};

export type Plan = {
  readonly startedAtIso: string;
  readonly backupTimestamp: string;
  entries(): ReadonlyArray<PlanEntry>;
  entriesBy(action: PlanAction): ReadonlyArray<PlanEntry>;
  hasConflicts(): boolean;
  isNoop(): boolean;
  summary(): PlanSummary;
  // Review correction 2: replaces the PlanEntry.source deviation. Plan.forInstall
  // already resolves the payload's harness root; exposing it here lets Applier
  // rebuild each entry's source path (join(harnessRoot(), entry.path)) without
  // widening PlanEntry beyond domain-entities.md's canonical 6 fields.
  harnessRoot(): string;
  // #3388: every onboarding doc this plan diverted to <STEM>-AMADEUS.md, or
  // declined to write at all. Empty on the overwhelmingly common path. The
  // reporter turns each into harness-specific wiring guidance — an alternate
  // no harness auto-loads is inert until the user wires it, so a plan that
  // produced a notice and never showed it would be the #3386 bug again.
  onboardingNotices(): ReadonlyArray<OnboardingNotice>;
};

export type PlanOptions = { readonly force: boolean; readonly startedAt: string };

export type PlanRefusal =
  | { readonly type: "already-installed"; readonly admission: InstallAdmission }
  | { readonly type: "harness-not-in-payload"; readonly harness: HarnessName };

export namespace PlanRefusal {
  export function alreadyInstalled(admission: InstallAdmission): PlanRefusal {
    return Object.freeze({ type: "already-installed", admission });
  }
  export function harnessNotInPayload(harness: HarnessName): PlanRefusal {
    return Object.freeze({ type: "harness-not-in-payload", harness });
  }
}

Object.freeze(PlanRefusal);

function createPlan(
  built: BuiltEntries,
  startedAtIso: string,
  backupTimestamp: string,
  root: string,
): Plan {
  const { entries, notices } = built;
  return Object.freeze({
    startedAtIso,
    backupTimestamp,
    entries(): ReadonlyArray<PlanEntry> {
      return entries;
    },
    entriesBy(action: PlanAction): ReadonlyArray<PlanEntry> {
      return entries.filter((entry) => entry.action === action);
    },
    hasConflicts(): boolean {
      return entries.some((entry) => entry.action === "conflict");
    },
    isNoop(): boolean {
      return entries.every((entry) => entry.action === "skip");
    },
    summary(): PlanSummary {
      return Object.freeze({
        add: entries.filter((entry) => entry.action === "add").length,
        update: entries.filter((entry) => entry.action === "update").length,
        skip: entries.filter((entry) => entry.action === "skip").length,
        backup: entries.filter((entry) => entry.action === "backup").length,
        conflict: entries.filter((entry) => entry.action === "conflict").length,
      });
    },
    harnessRoot(): string {
      return root;
    },
    onboardingNotices(): ReadonlyArray<OnboardingNotice> {
      return notices;
    },
  });
}

export namespace Plan {
  // install's classification is "new vs existing" (business-logic-model
  // workflow 4): with no manifest yet to supply an expected md5, any existing
  // shared file is treated as user-modified and always backed up (FR-008).
  export function forInstall(
    payload: ExtractedPayload,
    harness: HarnessName,
    target: string,
    opts: PlanOptions,
  ): Result<Plan, PlanRefusal> {
    const rootResult = payload.harnessRoot(harness);
    if (rootResult.type === "err") {
      return Result.err(PlanRefusal.harnessNotInPayload(harness));
    }

    const built = buildEntries(rootResult.value, target, opts);
    const { iso, token } = Timestamps.of(new Date(opts.startedAt));
    return Result.ok(createPlan(built, iso, token, rootResult.value));
  }

  // U3's upgrade-side factory (functional-design/domain-entities.md, promised
  // by install-flow's own domain-entities.md as an extension point). Error
  // type widens to include PlanRefusal so the pre-existing
  // harness-not-in-payload edge case (identical failure mode to forInstall)
  // is not duplicated as a second UpgradeRefusal variant — ClassifiedError
  // already spans both unions, so reporter.renderError needs no new branch.
  export function forUpgrade(
    payload: ExtractedPayload,
    source: UpgradeSource,
    harness: HarnessName,
    target: string,
    opts: PlanOptions,
  ): Result<Plan, PlanRefusal | UpgradeRefusal> {
    const rootResult = payload.harnessRoot(harness);
    if (rootResult.type === "err") {
      return Result.err(PlanRefusal.harnessNotInPayload(harness));
    }

    const built = buildUpgradeEntries(rootResult.value, target, source, opts);
    const { iso, token } = Timestamps.of(new Date(opts.startedAt));
    return Result.ok(createPlan(built, iso, token, rootResult.value));
  }
}

Object.freeze(Plan);

// --- shared internals ---------------------------------------------------------

type BuiltEntries = { readonly entries: readonly PlanEntry[]; readonly notices: readonly OnboardingNotice[] };

// #3388: the payload path an onboarding doc would land on by default, resolved
// against what the target already holds. Used by install directly; upgrade
// consults the installed manifest first and falls back to this. The two
// filesystem probes are behind the alternate lookup on purpose — a payload is
// ~600 files and at most one of them is an onboarding doc, so every other file
// reaches its single existsSync in the caller, exactly as before #3388.
function probeOnboardingLadder(relPath: string, target: string, force: boolean): OnboardingDestination {
  const alternate = onboardingAlternateFor(relPath);
  if (alternate === null || force) return Object.freeze({ type: "primary", dest: relPath });
  return decideOnboardingDestination({
    relPath,
    force,
    primaryExists: existsSync(join(target, relPath)),
    alternateExists: existsSync(join(target, alternate)),
  });
}

// The destination path carries the entry identity from here on: it is what gets
// written, what the manifest records, and what a later upgrade follows. The
// payload path only survives as `sourcePath`, and only when the two differ.
function planEntry(root: string, destPath: string, sourceRelPath: string, action: PlanAction, forced: boolean): PlanEntry {
  const cls = classify(destPath);
  return Object.freeze({
    path: destPath,
    action,
    class: cls,
    forced,
    md5: md5OfFileSync(join(root, sourceRelPath)),
    required: cls === "owned",
    ...(destPath === sourceRelPath ? {} : { sourcePath: sourceRelPath }),
  });
}

// --- Plan.forInstall internals (private) -------------------------------------

function buildEntries(root: string, target: string, opts: PlanOptions): BuiltEntries {
  const entries: PlanEntry[] = [];
  const notices: OnboardingNotice[] = [];
  for (const relPath of walkFiles(root)) {
    const destination = probeOnboardingLadder(relPath, target, opts.force);
    const notice = noticeFor(relPath, destination);
    if (notice !== null) notices.push(notice);
    // Ladder rung 3: both names are taken, so nothing is written AND nothing is
    // recorded. Emitting a "skip" entry instead would put a path we never
    // installed into the manifest, and the next upgrade would then "follow" it
    // straight onto the user's own file.
    if (destination.type === "blocked") continue;

    const destPath = destination.dest;
    const action = classifyAction(existsSync(join(target, destPath)), opts.force, classify(destPath));
    entries.push(planEntry(root, destPath, relPath, action, action === "update" || action === "backup"));
  }
  return { entries, notices };
}

// BR-I10~I14: install's per-file action decision (business-logic-model workflow
// 4). Exported as a pure decision seam so property tests can exercise it in
// process without the filesystem. The rules, in evaluation order:
//   BR-I10: a file absent from the target is always "add" (force/class ignored).
//   BR-I11: an existing file without --force is always "conflict" — the one and
//           only branch that yields "conflict".
//   BR-I12~I14: under --force, the class alone decides — owned → "update",
//           user-preserved → "skip", shared → "backup" (FR-008).
export function classifyAction(exists: boolean, force: boolean, cls: FileClass): PlanAction {
  if (!exists) return "add";
  if (!force) return "conflict";
  if (cls === "owned") return "update";
  if (cls === "user-preserved") return "skip";
  return "backup";
}

// --- Plan.forUpgrade internals (private) -------------------------------------

// BR-U10~U16: upgrade has no "conflict" action — every existing file's
// disposition is already decided by source.dispositionFor (delegated to the
// installed manifest when one exists, BR-U11), so classification is a
// straight lookup rather than a force/exists branch like install's.
function buildUpgradeEntries(root: string, target: string, source: UpgradeSource, opts: PlanOptions): BuiltEntries {
  const entries: PlanEntry[] = [];
  const notices: OnboardingNotice[] = [];
  for (const relPath of walkFiles(root)) {
    const destination = routeUpgradeDestination(relPath, target, source, opts.force);
    const notice = noticeFor(relPath, destination);
    if (notice !== null) notices.push(notice);
    if (destination.type === "blocked") continue;

    const destPath = destination.dest;
    const cls = classify(destPath);
    if (!existsSync(join(target, destPath))) {
      entries.push(planEntry(root, destPath, relPath, "add", false));
      continue;
    }

    const actualMd5 = md5OfFileSync(join(target, destPath));
    const disposition = source.dispositionFor(destPath, cls, actualMd5);
    // Not a bypassed conflict (there is none in upgrade) — `forced` only flags
    // "a backup happened even under --force" so BR-U12 (backups are never
    // skipped by --force) stays visible in the plan report.
    const forced = opts.force && disposition.type === "backup-then-copy";
    entries.push(planEntry(root, destPath, relPath, toPlanAction(disposition), forced));
  }
  return { entries, notices };
}

// #3388 spec 5: an installation that landed its onboarding doc on the alternate
// name keeps being updated there. The installed manifest is the authority —
// it records where the file actually went — so it is consulted before the
// filesystem ladder. Only when the manifest knows neither name (a conservative
// manual-or-unknown source, or a pre-#3388 installation whose onboarding doc
// shipped inside the harness dir) does the install-side ladder decide, which
// keeps upgrade's no-clobber promise identical to install's.
function routeUpgradeDestination(relPath: string, target: string, source: UpgradeSource, force: boolean): OnboardingDestination {
  const alternate = onboardingAlternateFor(relPath);
  if (alternate === null || force) return Object.freeze({ type: "primary", dest: relPath });
  // The manifest is followed regardless of what sits at the real name today —
  // the user may have deleted their own CLAUDE.md since the install — so the
  // real name is probed rather than assumed occupied. Without it the notice
  // would tell a user with no CLAUDE.md that "CLAUDE.md already exists".
  if (source.knowsPath(alternate)) {
    return Object.freeze({ type: "alternate", dest: alternate, primaryExists: existsSync(join(target, relPath)) });
  }
  if (source.knowsPath(relPath)) return Object.freeze({ type: "primary", dest: relPath });
  return probeOnboardingLadder(relPath, target, force);
}

// BR-U10: the one place the Disposition -> PlanAction mapping is fixed.
// Exported as a pure decision seam for in-process property tests.
export function toPlanAction(disposition: Disposition): PlanAction {
  switch (disposition.type) {
    case "overwrite":
      return "update";
    case "backup-then-copy":
      return "backup";
    case "preserve":
      return "skip";
  }
}

// Framework tool/hook/agent/scope files carry an `amadeus-` prefix and are
// entirely framework-owned (FR-008: "amadeus-* プレフィックスを持たない共有
// ファイル" implies files *with* the prefix are the "owned" side of the
// distinction). Anything under a memory/ directory is the team's own
// long-lived practice record (org.md/team.md/project.md/phases/*.md) and is
// never framework-owned going forward, so it is user-preserved. Everything
// else is a shared framework template the team may hand-edit.
// BR-I01~I03: exported as a pure, total decision seam — every relative path maps
// to exactly one FileClass, so property tests can assert totality in process.
export function classify(relPath: string): FileClass {
  const segments = relPath.split("/");
  const basename = segments[segments.length - 1] ?? relPath;
  if (basename.startsWith("amadeus-")) return "owned";
  if (segments.slice(-3).join("/") === "tools/data/harness.json") return "owned";
  if (segments.includes("memory")) return "user-preserved";
  return "shared";
}

function walkFiles(root: string): string[] {
  const results: string[] = [];
  function walk(dir: string): void {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        results.push(relative(root, full).split(sep).join("/"));
      }
    }
  }
  walk(root);
  return results;
}

const MD5_CHUNK_SIZE = 64 * 1024;

// Streams the file through a fixed-size buffer (performance-design.md: "全
// 読み込みバッファなし") while keeping Plan.forInstall's own signature
// synchronous, using a sync read-loop instead of Node stream events.
function md5OfFileSync(path: string): string {
  const fd = openSync(path, "r");
  const hash = createHash("md5");
  const buffer = Buffer.alloc(MD5_CHUNK_SIZE);
  try {
    for (;;) {
      const bytesRead = readSync(fd, buffer, 0, MD5_CHUNK_SIZE, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    closeSync(fd);
  }
  return hash.digest("hex");
}
