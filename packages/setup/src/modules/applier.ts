import { dirname, join, resolve, sep } from "node:path";
import type { ApplyFailure, ApplyResult } from "../domain/apply-result.ts";
import { ManifestFiles } from "../domain/manifest.ts";
import type { Plan, PlanEntry } from "../domain/plan.ts";
import type { ApplyWrite } from "../ports/apply-write.ts";
import { Result } from "../shared/result.ts";

export type Applier = {
  apply(plan: Plan, target: string): Promise<ApplyResult>;
};

declare const safeTargetPathBrand: unique symbol;
// SEC-I01: only resolveWithin() can mint one, so a write can never reach the
// filesystem with a path that has not been checked against the target root —
// the same shape as fetcher.ts's local SafePath for tar extraction.
type SafeTargetPath = string & { readonly [safeTargetPathBrand]: "SafeTargetPath" };

export namespace Applier {
  export function create(fsWrite: ApplyWrite): Applier {
    return Object.freeze({
      async apply(plan: Plan, target: string): Promise<ApplyResult> {
        const targetRoot = resolve(target);
        const applied: PlanEntry[] = [];
        const backupPaths: string[] = [];
        const failures: ApplyFailure[] = [];
        const madeDirs = new Set<string>();

        for (const entry of plan.entries()) {
          if (entry.action === "skip") {
            applied.push(entry);
            continue;
          }

          const disposition = dispositionFor(entry);
          if (disposition === "skip") {
            applied.push(entry);
            continue;
          }

          const destResult = resolveWithin(targetRoot, entry.path, "copy");
          if (destResult.type === "err") {
            failures.push(destResult.error);
            break; // REL-I01: fail fast, do not apply past a failure
          }
          const dest = destResult.value;

          const destDir = dirname(dest);
          if (!madeDirs.has(destDir)) {
            const mkdirResult = await fsWrite.mkdir(destDir);
            if (mkdirResult.type === "err") {
              failures.push({ path: entry.path, operation: "mkdir", detail: mkdirResult.error.detail });
              break;
            }
            madeDirs.add(destDir);
          }

          if (disposition === "backup-then-copy" && (await fsWrite.exists(dest))) {
            const backupResult = resolveWithin(targetRoot, `${entry.path}.${plan.backupTimestamp}.bk`, "backup");
            if (backupResult.type === "err") {
              failures.push(backupResult.error);
              break;
            }
            const bkPath = backupResult.value;

            // SEC-U01: an existing .bk file is never overwritten — losing a
            // prior backup would be a silent loss of user data. This check
            // also protects install's own --force-over-a-previous-.bk path
            // (an intentional, safety-side shared effect of applier.ts).
            if (await fsWrite.exists(bkPath)) {
              failures.push({ path: entry.path, operation: "backup", detail: `backup path already exists: ${entry.path}.${plan.backupTimestamp}.bk` });
              break;
            }

            const backedUp = await fsWrite.backup(dest, bkPath);
            if (backedUp.type === "err") {
              failures.push({ path: entry.path, operation: "backup", detail: backedUp.error.detail });
              break;
            }
            backupPaths.push(`${entry.path}.${plan.backupTimestamp}.bk`);
          }

          const copied = await fsWrite.copyFile(join(plan.harnessRoot(), entry.path), dest);
          if (copied.type === "err") {
            failures.push({ path: entry.path, operation: "copy", detail: copied.error.detail });
            break;
          }

          applied.push(entry);
        }

        return Object.freeze({
          hasFailures(): boolean {
            return failures.length > 0;
          },
          failures(): ReadonlyArray<ApplyFailure> {
            return failures;
          },
          appliedEntries(): ReadonlyArray<PlanEntry> {
            return applied;
          },
          backupPaths(): ReadonlyArray<string> {
            return backupPaths;
          },
          manifestFiles() {
            return ManifestFiles.fromEntries(
              applied.map((entry) => ({ path: entry.path, class: entry.class, required: entry.required, md5: entry.md5 })),
            );
          },
        });
      },
    });
  }
}

Object.freeze(Applier);

// FR-008/FR-009: "conflict" entries reach here only once the caller has
// already decided to proceed (via --force or an interactive confirmation);
// the actual operation then follows the same file-class rule force would
// have applied. owned -> plain overwrite, shared -> always backed up first
// (no expected md5 exists yet on a first install), user-preserved -> never
// touched.
function dispositionFor(entry: PlanEntry): "copy" | "backup-then-copy" | "skip" {
  if (entry.action === "add" || entry.action === "update") return "copy";
  if (entry.action === "backup") return "backup-then-copy";
  // action === "conflict"
  if (entry.class === "owned") return "copy";
  if (entry.class === "user-preserved") return "skip";
  return "backup-then-copy";
}

function resolveWithin(targetRoot: string, relPath: string, operation: ApplyFailure["operation"]): Result<SafeTargetPath, ApplyFailure> {
  const resolved = resolve(targetRoot, relPath);
  if (resolved !== targetRoot && !resolved.startsWith(`${targetRoot}${sep}`)) {
    return Result.err({ path: relPath, operation, detail: `resolved path escapes the install target: ${relPath}` });
  }
  return Result.ok(resolved as SafeTargetPath);
}
