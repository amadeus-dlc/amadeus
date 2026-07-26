import { homedir } from "node:os";
import { join } from "node:path";
import {
  applyMerge,
  checkTomlSyntax,
  MANAGED_BLOCK_BEGIN,
  MANAGED_BLOCK_END,
  type MergePlan,
  type MergePlanError,
  planMerge,
  removeManagedBlock,
  renderManagedBlock,
} from "../domain/kimi-hooks.ts";
import type { ApplyWrite } from "../ports/apply-write.ts";
import { type FsRead, type FsWrite, IoError } from "../ports/fsops.ts";
import type { TtyIO } from "../ports/tty.ts";
import { Result } from "../shared/result.ts";

// modules/kimi-hooks.ts — wires the pure merge logic into the installer's
// idioms (FR-3b/BR-6): read the user-level config, show the managed-block
// diff in a plan report, take wizard confirm approval, then back up and write
// atomically through the existing ports. This module owns no merge policy of
// its own (logical-components.md) — domain/kimi-hooks.ts decides everything
// about the block; this file only sequences ports and prints.

// KimiHome (domain-entities.md §KimiHome): the ONE place config.toml's
// location is decided — $KIMI_CODE_HOME when set, else ~/.kimi-code. Doctor
// (Bolt 4) shares this rule.
export function resolveKimiHome(env: Readonly<Record<string, string | undefined>> = process.env, home: string = homedir()): string {
  return env.KIMI_CODE_HOME ?? join(home, ".kimi-code");
}

export function kimiConfigPath(kimiHome: string): string {
  return join(kimiHome, "config.toml");
}

export type KimiHooksPorts = {
  readonly tty: TtyIO;
  readonly fsRead: FsRead;
  readonly fsWrite: FsWrite;
  readonly applyWrite: ApplyWrite;
  readonly out: (message: string) => void;
};

export type HooksMergeError = MergePlanError;

export type HooksMergeOutcome =
  | { readonly type: "noop" }
  | { readonly type: "applied"; readonly action: "add" | "replace"; readonly backupPath: string | null }
  | { readonly type: "not-applied"; readonly reason: "declined" | "non-interactive" };

export type HooksRemovalOutcome =
  | { readonly type: "noop" }
  | { readonly type: "removed"; readonly backupPath: string | null }
  | { readonly type: "not-applied"; readonly reason: "declined" | "non-interactive" };

export type HooksArgs = {
  readonly snippet: string; // the snippet master text (the caller reads it from the payload)
  readonly snippetSource: string; // display path used in messages and the manual procedure
  readonly interactive: boolean; // the install/upgrade mode (FR-3d: existing rules apply)
  readonly kimiHome?: string; // default: resolveKimiHome()
  readonly now?: () => Date; // backup timestamp seam for tests
};

// The install/upgrade flow's merge step (business-logic-model.md §マージフロー
// steps 2-6). Never writes without an interactive confirm (OC-1); in
// non-interactive mode it shows the report and stops, mirroring install's
// BR-I11 conflict rule.
export async function runHooksMerge(args: HooksArgs, ports: KimiHooksPorts): Promise<Result<HooksMergeOutcome, HooksMergeError>> {
  const configPath = kimiConfigPath(args.kimiHome ?? resolveKimiHome());
  const block = renderManagedBlock(args.snippet); // snippet corrupt → loud fail (decision tree)
  if (block.type === "err") return block;

  const read = await readConfig(ports.fsRead, configPath);
  if (read.type === "err") return read;
  const configText = read.value ?? "";
  const planned = planMerge(configText, block.value);
  if (planned.type === "err") return planned;
  const plan = planned.value;

  if (plan.action === "noop") {
    ports.out(`Kimi config: ${configPath} is already up to date (managed block unchanged).`);
    return Result.ok(outcome({ type: "noop" }));
  }

  ports.out(renderMergeReport(plan, configPath));
  const approved = await approve(args, ports, `Apply this change to ${configPath}?`, configPath);
  if (approved.type !== "approved") {
    return Result.ok(outcome({ type: "not-applied", reason: approved.reason }));
  }

  const now = args.now ?? (() => new Date());
  return writeMerged(configPath, configText, plan, read.value !== null, now, ports);
}

// The removal path (business-logic-model.md §除去フロー): same report →
// confirm → backup → atomic write sequence as the merge.
export async function runHooksRemoval(args: HooksArgs, ports: KimiHooksPorts): Promise<Result<HooksRemovalOutcome, HooksMergeError>> {
  const configPath = kimiConfigPath(args.kimiHome ?? resolveKimiHome());
  const block = renderManagedBlock(args.snippet); // content-wise removal needs the block's identities
  if (block.type === "err") return block;

  const read = await readConfig(ports.fsRead, configPath);
  if (read.type === "err") return read;
  if (read.value === null) {
    ports.out(`Kimi config: ${configPath} does not exist; nothing to remove.`);
    return Result.ok(outcome({ type: "noop" }));
  }
  const removal = removeManagedBlock(read.value, block.value);
  if (removal.type === "err") return removal;
  if (!removal.value.removed) {
    ports.out(`Kimi config: no amadeus managed block in ${configPath}; nothing to remove.`);
    return Result.ok(outcome({ type: "noop" }));
  }

  ports.out(`Kimi config: remove the amadeus managed block from ${configPath}:\n${removal.value.diffText}`);
  const approved = await approve(args, ports, `Remove the amadeus managed block from ${configPath}?`, configPath);
  if (approved.type !== "approved") {
    return Result.ok(outcome({ type: "not-applied", reason: approved.reason }));
  }

  const now = args.now ?? (() => new Date());
  const backup = await backupConfig(configPath, now, ports);
  if (backup.type === "err") return backup;
  const written = await ports.fsWrite.writeText(configPath, removal.value.text);
  if (written.type === "err") return Result.err(withBackupHint(written.error, backup.value));
  ports.out(`Kimi config: removed the managed block from ${configPath} (backup: ${backup.value}).`);
  return Result.ok(outcome({ type: "removed", backupPath: backup.value }));
}

// Caller-facing phrasing for the loud fails (the module's texts live here so
// the future cli wiring only ever prints rendered strings).
export function renderHooksError(error: HooksMergeError): string {
  if (error.type === "content-validation") {
    return `Kimi config merge refused: ${error.detail}`;
  }
  return `Kimi config merge failed: ${error.detail}`;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

// null = absent file (the "" convention's origin, business-logic-model.md
// §planMerge); a real read failure is a loud fail with manual guidance.
async function readConfig(fsRead: FsRead, configPath: string): Promise<Result<string | null, IoError>> {
  const read = await fsRead.readText(configPath);
  if (read.type === "ok") return Result.ok(read.value);
  if (read.error.notFound === true) return Result.ok(null);
  return Result.err(IoError.of(`${read.error.detail}; fix or remove the file manually, then re-run`));
}

type Approval = { readonly type: "approved" } | { readonly type: "refused"; readonly reason: "declined" | "non-interactive" };

async function approve(args: HooksArgs, ports: KimiHooksPorts, prompt: string, configPath: string): Promise<Approval> {
  if (!args.interactive) {
    ports.out(
      `No changes were made to ${configPath}: writing the managed block needs interactive approval (re-run without --yes).\n${manualProcedure(configPath, args.snippetSource)}`,
    );
    return { type: "refused", reason: "non-interactive" };
  }
  const confirmed = await ports.tty.confirm(prompt);
  if (!confirmed) {
    ports.out(`No changes were made to ${configPath}.\n${manualProcedure(configPath, args.snippetSource)}`);
    return { type: "refused", reason: "declined" };
  }
  return { type: "approved" };
}

async function writeMerged(
  configPath: string,
  configText: string,
  plan: MergePlan,
  existed: boolean,
  now: () => Date,
  ports: KimiHooksPorts,
): Promise<Result<HooksMergeOutcome, HooksMergeError>> {
  const action = plan.action;
  if (action === "noop") return Result.ok(outcome({ type: "noop" }));
  const newText = applyMerge(configText, plan);
  // Pre-write guard: validate the merged output once more before any byte is
  // written, so a splicing defect can never reach the user's config.
  const guard = checkTomlSyntax(newText);
  if (guard.type === "err") return guard;

  let backupPath: string | null = null;
  if (existed) {
    const backup = await backupConfig(configPath, now, ports);
    if (backup.type === "err") return backup;
    backupPath = backup.value;
  }
  const written = await ports.fsWrite.writeText(configPath, newText);
  if (written.type === "err") return Result.err(withBackupHint(written.error, backupPath));
  const verb = action === "add" ? "added to" : "updated in";
  const suffix = backupPath === null ? "" : ` (backup: ${backupPath})`;
  ports.out(`Kimi config: managed block ${verb} ${configPath}${suffix}.`);
  return Result.ok(outcome({ type: "applied", action, backupPath }));
}

// BR-4/BR-7: the backup is a COPY (original stays put until the atomic
// write lands), named config.toml.amadeus-backup-<ISO>, and never deleted by
// setup. ISO basic format (no colons/dots) keeps the name legal on Windows.
async function backupConfig(configPath: string, now: () => Date, ports: KimiHooksPorts): Promise<Result<string, IoError>> {
  const backupPath = `${configPath}.amadeus-backup-${now().toISOString().replace(/[-:.]/g, "")}`;
  const copied = await ports.applyWrite.copyFile(configPath, backupPath);
  if (copied.type === "err") return copied;
  return Result.ok(backupPath);
}

function withBackupHint(error: IoError, backupPath: string | null): IoError {
  if (backupPath === null) return error;
  return IoError.of(`${error.detail} (the pre-write backup remains at ${backupPath})`);
}

function renderMergeReport(plan: MergePlan, configPath: string): string {
  const heading =
    plan.action === "add"
      ? `Kimi config: add the amadeus managed block to ${configPath}:`
      : `Kimi config: update the amadeus managed block in ${configPath}:`;
  return `${heading}\n${plan.diffText}`;
}

function outcome<T extends HooksMergeOutcome | HooksRemovalOutcome>(value: T): T {
  return Object.freeze(value);
}

function manualProcedure(configPath: string, snippetSource: string): string {
  return [
    "To wire the hooks manually:",
    `1. Open ${configPath} in an editor.`,
    `2. Copy everything between "${MANAGED_BLOCK_BEGIN}" and "${MANAGED_BLOCK_END}" (inclusive)`,
    `   from ${snippetSource} to the end of the file, then save.`,
  ].join("\n");
}
