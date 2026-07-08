import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { HarnessName } from "./harness.ts";
import type { InstallAdmission } from "./installation.ts";
import type { Disposition, FileClass } from "./manifest.ts";
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

function createPlan(entries: readonly PlanEntry[], startedAtIso: string, backupTimestamp: string, root: string): Plan {
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

    const entries = buildEntries(rootResult.value, target, opts);
    const { iso, token } = Timestamps.of(new Date(opts.startedAt));
    return Result.ok(createPlan(entries, iso, token, rootResult.value));
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

    const entries = buildUpgradeEntries(rootResult.value, target, source, opts);
    const { iso, token } = Timestamps.of(new Date(opts.startedAt));
    return Result.ok(createPlan(entries, iso, token, rootResult.value));
  }
}

Object.freeze(Plan);

// --- Plan.forInstall internals (private) -------------------------------------

function buildEntries(root: string, target: string, opts: PlanOptions): PlanEntry[] {
  const entries: PlanEntry[] = [];
  for (const relPath of walkFiles(root)) {
    const cls = classify(relPath);
    const exists = existsSync(join(target, relPath));
    const action = classifyAction(exists, opts.force, cls);
    entries.push(
      Object.freeze({
        path: relPath,
        action,
        class: cls,
        forced: action === "update" || action === "backup",
        md5: md5OfFileSync(join(root, relPath)),
        required: cls === "owned",
      }),
    );
  }
  return entries;
}

function classifyAction(exists: boolean, force: boolean, cls: FileClass): PlanAction {
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
function buildUpgradeEntries(root: string, target: string, source: UpgradeSource, opts: PlanOptions): PlanEntry[] {
  const entries: PlanEntry[] = [];
  for (const relPath of walkFiles(root)) {
    const cls = classify(relPath);
    const newMd5 = md5OfFileSync(join(root, relPath));
    if (!existsSync(join(target, relPath))) {
      entries.push(
        Object.freeze({ path: relPath, action: "add", class: cls, forced: false, md5: newMd5, required: cls === "owned" }),
      );
      continue;
    }

    const actualMd5 = md5OfFileSync(join(target, relPath));
    const disposition = source.dispositionFor(relPath, cls, actualMd5);
    const action = toPlanAction(disposition);
    entries.push(
      Object.freeze({
        path: relPath,
        action,
        class: cls,
        // Not a bypassed conflict (there is none in upgrade) — this only
        // flags "a backup happened even under --force" so BR-U12 (backups
        // are never skipped by --force) stays visible in the plan report.
        forced: opts.force && disposition.type === "backup-then-copy",
        md5: newMd5,
        required: cls === "owned",
      }),
    );
  }
  return entries;
}

// BR-U10: the one place the Disposition -> PlanAction mapping is fixed.
function toPlanAction(disposition: Disposition): PlanAction {
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
function classify(relPath: string): FileClass {
  const segments = relPath.split("/");
  const basename = segments[segments.length - 1] ?? relPath;
  if (basename.startsWith("amadeus-")) return "owned";
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
