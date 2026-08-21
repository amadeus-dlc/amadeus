import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  copyFileSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import type { ApplyFailure, ApplyResult } from "../domain/apply-result.ts";
import type { Manifest, ManifestFile } from "../domain/manifest.ts";
import { ManifestFiles } from "../domain/manifest.ts";
import type { Plan, PlanEntry } from "../domain/plan.ts";

const MANIFEST_RELATIVE_PATH = "amadeus/.installer/amadeus-setup-manifest.json";

type Phase = "preparing" | "prepared" | "applying" | "commit-decided" | "committed" | "rolling-back" | "blocked";
type PriorState =
  | { readonly kind: "absent" }
  | { readonly kind: "file"; readonly ino: number; readonly size: number; readonly sha256: string };

type JournalEntry = {
  readonly path: string;
  readonly candidate: string | null;
  readonly candidateSha256: string | null;
  readonly prior: PriorState;
  quarantine: string | null;
  backup: string | null;
  installed: boolean;
};

type Journal = {
  readonly schema: 1;
  readonly id: string;
  readonly target: string;
  phase: Phase;
  readonly entries: JournalEntry[];
};

export type TransactionIoEvent = {
  readonly ordinal: number;
  readonly operation: string;
  readonly path: string;
};

export type SetupTransactionOptions = {
  /** Called immediately before every durability-relevant filesystem operation. */
  readonly beforeIo?: (event: TransactionIoEvent) => void;
  /** Test-only seam. Production always resolves a sibling of the target. */
  readonly privateRoot?: (canonicalTarget: string) => string;
};

export type SetupTransactionCoordinator = {
  apply(plan: Plan, target: string, manifest: Manifest): Promise<ApplyResult>;
  recover(target: string): Promise<ReadonlyArray<ApplyFailure>>;
};

class TransactionBlocked extends Error {
  constructor(
    readonly operation: ApplyFailure["operation"],
    readonly path: string,
    message: string,
  ) {
    super(message);
  }
}

class DurableFs {
  private ordinal = 0;

  constructor(private readonly hook?: (event: TransactionIoEvent) => void) {}

  step(operation: string, path: string): void {
    this.ordinal += 1;
    this.hook?.({ ordinal: this.ordinal, operation, path });
  }

  mkdir(path: string, mode = 0o700): void {
    this.step("mkdir", path);
    mkdirSync(path, { recursive: true, mode });
  }

  atomicJson(path: string, value: unknown): void {
    const temp = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    this.step("open-temp", temp);
    const fd = openSync(temp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | noFollowFlag(), 0o600);
    try {
      this.step("write-temp", temp);
      writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      this.step("fsync-file", temp);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    this.step("rename-temp", path);
    renameSync(temp, path);
    this.fsyncDir(dirname(path));
  }

  fsyncDir(path: string): void {
    this.step("fsync-dir", path);
    const fd = openSync(path, constants.O_RDONLY);
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }

  rename(from: string, to: string): void {
    // rename(2) itself may replace a destination that appears after this check.
    // Callers use it only while holding the owner-only transaction lock and
    // moving within the private 0700 root; public target installs use link().
    if (lstatIfExists(to) !== null) throw new TransactionBlocked("journal", to, `refusing to replace occupied path: ${to}`);
    this.step("rename", `${from} -> ${to}`);
    renameSync(from, to);
    this.fsyncDir(dirname(from));
    if (dirname(to) !== dirname(from)) this.fsyncDir(dirname(to));
  }

  link(from: string, to: string): void {
    this.step("link-no-clobber", `${from} -> ${to}`);
    // link(2) is atomic and fails with EEXIST. There is deliberately no
    // exists-then-write window and no overwrite fallback.
    linkSync(from, to);
    this.fsyncDir(dirname(to));
  }

  unlink(path: string): void {
    this.step("unlink", path);
    unlinkSync(path);
    this.fsyncDir(dirname(path));
  }
}

function noFollowFlag(): number {
  return typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
}

export namespace SetupTransactionCoordinator {
  export function create(options: SetupTransactionOptions = {}): SetupTransactionCoordinator {
    return Object.freeze({
      async apply(plan: Plan, target: string, manifest: Manifest): Promise<ApplyResult> {
        const applied: PlanEntry[] = [];
        const backups: string[] = [];
        const failures: ApplyFailure[] = [];
        try {
          const tx = openTransaction(target, options);
          try {
            recoverLocked(tx);
            let prepared: Journal;
            try {
              prepared = prepare(tx, plan, manifest);
            } catch (cause) {
              // preparing is WAL-backed too. A thrown staging operation must
              // be reconciled before releasing the target lock.
              recoverLocked(tx);
              throw cause;
            }
            applyPrepared(tx, prepared);
            applied.push(...plan.entries());
            for (const entry of prepared.entries) {
              if (entry.backup !== null && entry.path !== MANIFEST_RELATIVE_PATH) backups.push(entry.backup);
            }
          } finally {
            releaseLock(tx);
          }
        } catch (cause) {
          failures.push(toFailure(cause));
        }
        return makeResult(applied, backups, failures);
      },

      async recover(target: string): Promise<ReadonlyArray<ApplyFailure>> {
        try {
          const tx = openTransaction(target, options);
          try {
            recoverLocked(tx);
          } finally {
            releaseLock(tx);
          }
          return [];
        } catch (cause) {
          return [toFailure(cause)];
        }
      },
    });
  }
}

Object.freeze(SetupTransactionCoordinator);

type OpenTransaction = {
  readonly fs: DurableFs;
  readonly target: string;
  readonly root: string;
  readonly activeDir: string;
  readonly committedDir: string;
  readonly lockDir: string;
};

function canonicalTarget(target: string): string {
  const absolute = resolve(target);
  const parent = resolve(dirname(absolute));
  const canonicalParent = realpathSync(parent);
  return join(canonicalParent, basename(absolute));
}

function defaultPrivateRoot(target: string): string {
  const identity = createHash("sha256").update(target).digest("hex").slice(0, 20);
  return join(dirname(target), `.amadeus-installer-private-${identity}`);
}

function openTransaction(targetInput: string, options: SetupTransactionOptions): OpenTransaction {
  const target = canonicalTarget(targetInput);
  validateTargetRoot(target);
  const root = resolve((options.privateRoot ?? defaultPrivateRoot)(target));
  if (root === target || root.startsWith(`${target}${sep}`)) {
    throw new TransactionBlocked("preflight", root, "private installer root must be outside the target");
  }
  if (root.split(sep).includes(".git")) throw new TransactionBlocked("preflight", root, "private installer root must not be inside Git metadata");
  const fs = new DurableFs(options.beforeIo);
  fs.mkdir(root, 0o700);
  assertPrivateDirectory(root);
  const targetDevicePath = lstatIfExists(target) === null ? dirname(target) : target;
  if (statSync(root).dev !== statSync(targetDevicePath).dev) {
    throw new TransactionBlocked("preflight", root, "private installer root is not on the target filesystem");
  }
  const activeDir = join(root, "active");
  const committedDir = join(root, "committed");
  fs.mkdir(activeDir);
  fs.mkdir(committedDir);
  const lockDir = join(root, "lock");
  acquireLock(fs, lockDir);
  return { fs, target, root, activeDir, committedDir, lockDir };
}

function validateTargetRoot(target: string): void {
  if (lstatIfExists(dirname(target)) === null || !statSync(dirname(target)).isDirectory()) {
    throw new TransactionBlocked("preflight", target, "target parent is not a directory");
  }
  const st = lstatIfExists(target);
  if (st === null) return;
  if (st.isSymbolicLink() || !st.isDirectory()) {
    throw new TransactionBlocked("preflight", target, "target must be a real directory, not a symlink or special file");
  }
}

function assertPrivateDirectory(root: string): void {
  const st = lstatSync(root);
  if (st.isSymbolicLink() || !st.isDirectory()) throw new TransactionBlocked("preflight", root, "private root is not a real directory");
  if ((st.mode & 0o077) !== 0) throw new TransactionBlocked("preflight", root, "private root permissions must be 0700");
  if (typeof process.getuid === "function" && st.uid !== process.getuid()) {
    throw new TransactionBlocked("preflight", root, "private root is not owned by the current user");
  }
}

function acquireLock(fs: DurableFs, lockDir: string): void {
  try {
    createCompleteLock(fs, lockDir);
  } catch (cause) {
    if (!isLockOccupied(cause)) throw cause;
    const metadataPath = join(lockDir, "owner.json");
    let owner: { pid: number };
    try {
      owner = JSON.parse(readTextNoFollow(metadataPath)) as { pid: number };
    } catch {
      throw new TransactionBlocked("lock", lockDir, "lock metadata is missing or corrupt");
    }
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0 || processAlive(owner.pid)) {
      throw new TransactionBlocked("lock", lockDir, `target is locked by pid ${String(owner.pid)}`);
    }
    // A dead PID is the only stealable state. PID reuse remains fail-closed:
    // a live reused PID is treated as the owner rather than guessed stale.
    removeStaleLockPath(fs, "remove-stale-lock-owner", metadataPath, () => unlinkSync(metadataPath));
    removeStaleLockPath(fs, "remove-stale-lock-dir", lockDir, () => rmdirSync(lockDir));
    try {
      createCompleteLock(fs, lockDir);
    } catch (retryCause) {
      if (isLockOccupied(retryCause)) {
        throw new TransactionBlocked("lock", lockDir, "target was locked by another process during stale-lock recovery");
      }
      throw retryCause;
    }
  }
}

function isLockOccupied(cause: unknown): boolean {
  return isCode(cause, "EEXIST") || isCode(cause, "ENOTEMPTY");
}

function removeStaleLockPath(fs: DurableFs, operation: string, path: string, remove: () => void): void {
  fs.step(operation, path);
  try {
    remove();
  } catch (cause) {
    if (!isCode(cause, "ENOENT")) throw cause;
  }
}

function createCompleteLock(fs: DurableFs, lockDir: string): void {
  const temporary = `${lockDir}.${randomUUID()}.tmp`;
  fs.step("lock-temp-mkdir", temporary);
  mkdirSync(temporary, { mode: 0o700 });
  try {
    fs.atomicJson(join(temporary, "owner.json"), {
      schema: 1,
      pid: process.pid,
      nonce: randomUUID(),
      createdAt: new Date().toISOString(),
    });
    fs.step("lock-publish", `${temporary} -> ${lockDir}`);
    renameSync(temporary, lockDir);
    fs.fsyncDir(dirname(lockDir));
  } catch (cause) {
    const owner = join(temporary, "owner.json");
    if (lstatIfExists(owner) !== null) unlinkSync(owner);
    if (lstatIfExists(temporary) !== null) rmdirSync(temporary);
    throw cause;
  }
}

function releaseLock(tx: OpenTransaction): void {
  const metadata = join(tx.lockDir, "owner.json");
  if (lstatIfExists(metadata) !== null) tx.fs.unlink(metadata);
  try {
    tx.fs.step("lock-rmdir", tx.lockDir);
    rmdirSync(tx.lockDir);
    tx.fs.fsyncDir(tx.root);
  } catch {
    // Leaving a lock behind is safer than obscuring the transaction outcome.
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (cause) {
    return !isCode(cause, "ESRCH");
  }
}

function prepare(tx: OpenTransaction, plan: Plan, manifest: Manifest): Journal {
  const candidates = candidateFiles(plan, manifest);
  preflight(tx.target, candidates);

  const id = randomUUID();
  const retired = retiredOwnedPaths(tx.target, manifest);
  const entries = prepareEntries(tx.target, id, candidates, retired);

  const journal: Journal = { schema: 1, id, target: tx.target, phase: "preparing", entries };
  writeJournal(tx, journal);

  const txDir = join(tx.root, id);
  const staging = join(txDir, "staging");
  const quarantine = join(txDir, "quarantine");
  const backups = join(tx.committedDir, id);
  tx.fs.mkdir(staging);
  tx.fs.mkdir(quarantine);
  tx.fs.mkdir(backups);

  stageCandidates(tx, candidates, entries);

  journal.phase = "prepared";
  writeJournal(tx, journal);
  return journal;
}

function prepareEntries(target: string, id: string, candidates: readonly Candidate[], retired: readonly string[]): JournalEntry[] {
  const candidateIdentities = new Set(candidates.map((candidate) => pathIdentity(candidate.path)));
  for (const path of retired) {
    validateRelativePath(path);
    if (!candidates.some((candidate) => candidate.path === path) && candidateIdentities.has(pathIdentity(path))) {
      throw new TransactionBlocked("preflight", path, "retired path collides with a candidate after case-folding or Unicode normalization");
    }
    inspectTargetChain(target, path);
  }
  const entries: JournalEntry[] = candidates.map((candidate) => ({
    path: candidate.path,
    candidate: join(id, "staging", encodePath(candidate.path)),
    candidateSha256: candidateDigest(candidate),
    prior: priorState(targetPath(target, candidate.path)),
    quarantine: null,
    backup: null,
    installed: false,
  }));
  for (const path of retired) {
    if (entries.some((entry) => entry.path === path)) continue;
    const destination = targetPath(target, path);
    if (lstatIfExists(destination) === null) continue;
    entries.push({ path, candidate: null, candidateSha256: null, prior: priorState(destination), quarantine: null, backup: null, installed: false });
  }
  return entries;
}

function stageCandidates(tx: OpenTransaction, candidates: readonly Candidate[], entries: readonly JournalEntry[]): void {
  for (const candidate of candidates) {
    const entry = entries.find((item) => item.path === candidate.path);
    if (entry === undefined || entry.candidate === null) throw new Error(`missing prepared entry: ${candidate.path}`);
    const stagedRel = entry.candidate;
    const staged = join(tx.root, stagedRel);
    if (candidate.source !== undefined) {
      tx.fs.step("stage-copy", `${candidate.source} -> ${staged}`);
      copyFileSync(candidate.source, staged, constants.COPYFILE_EXCL);
    } else {
      tx.fs.step("stage-write", staged);
      writeFileSync(staged, candidate.content, { mode: 0o600, flag: "wx" });
    }
    chmodSync(staged, 0o600);
    fsyncFile(tx.fs, staged);
    if (sha256(staged) !== entry.candidateSha256) throw new TransactionBlocked("journal", candidate.path, "staged candidate digest mismatch");
  }
}

type Candidate =
  | { readonly path: string; readonly source: string; readonly content?: never }
  | { readonly path: string; readonly content: string; readonly source?: never };

function candidateFiles(plan: Plan, manifest: Manifest): Candidate[] {
  const candidates: Candidate[] = [];
  for (const entry of plan.entries()) {
    if (dispositionFor(entry) === "skip") continue;
    // #3388: entry.path is the DESTINATION; sourcePath is the payload path
    // when the onboarding ladder diverted the two apart.
    candidates.push({ path: entry.path, source: join(plan.harnessRoot(), entry.sourcePath ?? entry.path) });
  }
  candidates.push({ path: MANIFEST_RELATIVE_PATH, content: `${JSON.stringify(manifest.toJSON(), null, 2)}\n` });
  return candidates;
}

function candidateDigest(candidate: Candidate): string {
  return candidate.source !== undefined
    ? sha256(candidate.source)
    : createHash("sha256").update(candidate.content).digest("hex");
}

function preflight(target: string, candidates: readonly Candidate[]): void {
  const identities = new Set<string>();
  for (const candidate of candidates) {
    validateRelativePath(candidate.path);
    const identity = pathIdentity(candidate.path);
    if (identities.has(identity)) throw new TransactionBlocked("preflight", candidate.path, "case-folded or Unicode path collision");
    identities.add(identity);
    if (candidate.source !== undefined) assertRegularNoFollow(candidate.source, "candidate");
    inspectTargetChain(target, candidate.path);
  }
}

function pathIdentity(path: string): string {
  return path.normalize("NFC").toLocaleLowerCase("en-US");
}

function validateRelativePath(path: string): void {
  if (!path || isAbsolute(path) || path.includes("\\") || path.includes("\0") || path !== path.normalize("NFC") || posix.normalize(path) !== path) {
    throw new TransactionBlocked("preflight", path, "path is not canonical NFC relative POSIX form");
  }
  if (path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new TransactionBlocked("preflight", path, "path contains an invalid segment");
  }
}

function inspectTargetChain(target: string, relPath: string): void {
  let current = target;
  for (const segment of relPath.split("/")) {
    current = join(current, segment);
    const st = lstatIfExists(current);
    if (st === null) continue;
    if (st.isSymbolicLink()) throw new TransactionBlocked("preflight", relPath, `symlink in destination chain: ${current}`);
    if (current !== targetPath(target, relPath) && !st.isDirectory()) {
      throw new TransactionBlocked("preflight", relPath, `non-directory in destination chain: ${current}`);
    }
    if (current === targetPath(target, relPath) && !st.isFile()) {
      throw new TransactionBlocked("preflight", relPath, `destination is not a regular file: ${current}`);
    }
  }
}

function applyPrepared(tx: OpenTransaction, journal: Journal): void {
  journal.phase = "applying";
  writeJournal(tx, journal);
  try {
    for (const entry of journal.entries) applyEntry(tx, journal, entry);
    promoteBackups(tx, journal);
    writeBackupCatalog(tx, journal);
    journal.phase = "commit-decided";
    writeJournal(tx, journal);
    cleanupCommitted(tx, journal);
    journal.phase = "committed";
    writeJournal(tx, journal);
    archiveJournal(tx, journal);
  } catch (cause) {
    if (journal.phase === "commit-decided" || journal.phase === "committed") {
      try {
        cleanupCommitted(tx, journal);
      } catch (cleanupCause) {
        throw new TransactionBlocked(
          "recovery",
          journalPath(tx, journal.id),
          `apply failed (${String(cause)}); committed cleanup also failed (${String(cleanupCause)})`,
        );
      }
    } else {
      try {
        rollback(tx, journal);
      } catch (rollbackCause) {
        throw new TransactionBlocked(
          "recovery",
          journalPath(tx, journal.id),
          `apply failed (${String(cause)}); rollback also failed (${String(rollbackCause)})`,
        );
      }
    }
    throw cause;
  }
}

function applyEntry(tx: OpenTransaction, journal: Journal, entry: JournalEntry): void {
  const destination = targetPath(tx.target, entry.path);
  mkdirParentsNoSymlink(tx, dirname(destination));
  if (entry.prior.kind === "file") {
    assertMatches(destination, entry.prior, "destination changed since preflight");
    const quarantineRel = join(journal.id, "quarantine", encodePath(entry.path));
    const quarantine = join(tx.root, quarantineRel);
    entry.quarantine = quarantineRel;
    writeJournal(tx, journal); // capture intent is durable before rename
    tx.fs.rename(destination, quarantine);
    assertMatches(quarantine, entry.prior, "captured file identity mismatch");
  } else if (lstatIfExists(destination) !== null) {
    throw new TransactionBlocked("journal", entry.path, "destination appeared after preflight");
  }
  if (entry.candidate !== null) {
    tx.fs.link(join(tx.root, entry.candidate), destination);
    if (sha256(destination) !== entry.candidateSha256) throw new TransactionBlocked("journal", entry.path, "installed candidate digest mismatch");
    entry.installed = true;
  }
  writeJournal(tx, journal);
}

function promoteBackups(tx: OpenTransaction, journal: Journal): void {
  for (const entry of journal.entries) {
    if (entry.quarantine === null) continue;
    if (entry.prior.kind !== "file") throw new TransactionBlocked("journal", entry.path, "quarantine exists for absent prior state");
    const backupRel = join("committed", journal.id, encodePath(entry.path));
    const backup = join(tx.root, backupRel);
    if (lstatIfExists(backup) === null) {
      const source = join(tx.root, entry.quarantine);
      assertMatches(source, entry.prior, "captured original changed before backup promotion");
      tx.fs.rename(source, backup);
    }
    chmodSync(backup, 0o600);
    fsyncFile(tx.fs, backup);
    assertMatches(backup, entry.prior, "captured original changed during backup promotion");
    entry.backup = backupRel;
    entry.quarantine = null;
    writeJournal(tx, journal);
  }
}

function writeBackupCatalog(tx: OpenTransaction, journal: Journal): void {
  const catalog = {
    schema: 1,
    transactionId: journal.id,
    targetIdentity: createHash("sha256").update(tx.target).digest("hex"),
    backups: journal.entries
      .filter((entry) => entry.backup !== null)
      .map((entry) => ({ path: entry.path, file: entry.backup, prior: entry.prior })),
  };
  tx.fs.atomicJson(join(tx.committedDir, journal.id, "catalog.json"), catalog);
  tx.fs.fsyncDir(join(tx.committedDir, journal.id));
}

function rollback(tx: OpenTransaction, journal: Journal): void {
  journal.phase = "rolling-back";
  writeJournal(tx, journal);
  for (const entry of [...journal.entries].reverse()) {
    rollbackEntry(tx, journal, entry);
  }
  cleanupStaging(tx, journal);
  archiveJournal(tx, journal, "rolled-back");
}

function rollbackEntry(tx: OpenTransaction, journal: Journal, entry: JournalEntry): void {
  const destination = targetPath(tx.target, entry.path);
  if (lstatIfExists(destination) !== null) {
    if (entry.prior.kind === "file" && matchesPrior(destination, entry.prior)) {
      entry.installed = false;
      writeJournal(tx, journal);
      return;
    }
    if (entry.candidateSha256 === null || sha256(destination) !== entry.candidateSha256) {
      blockRollback(tx, journal, entry.path, "unknown destination content blocks rollback; both copies were preserved");
    }
    tx.fs.unlink(destination);
  }
  if (entry.prior.kind === "file") restoreCapturedFile(tx, journal, entry, destination);
  entry.installed = false;
  writeJournal(tx, journal);
}

function restoreCapturedFile(tx: OpenTransaction, journal: Journal, entry: JournalEntry, destination: string): void {
  if (entry.prior.kind !== "file") return;
  const captured = locateCapturedFile(tx, journal, entry);
  if (captured === null) blockRollback(tx, journal, entry.path, "captured original is missing");
  assertMatches(captured, entry.prior, "captured original changed during rollback");
  try {
    tx.fs.link(captured, destination);
  } catch (cause) {
    blockRollback(tx, journal, entry.path, `no-clobber restore failed; both copies were preserved: ${String(cause)}`);
  }
}

function blockRollback(tx: OpenTransaction, journal: Journal, path: string, detail: string): never {
  journal.phase = "blocked";
  writeJournal(tx, journal);
  throw new TransactionBlocked("rollback", path, detail);
}

function locateCapturedFile(tx: OpenTransaction, journal: Journal, entry: JournalEntry): string | null {
  if (entry.prior.kind !== "file") return null;
  const candidates = [
    entry.backup,
    entry.quarantine,
    join("committed", journal.id, encodePath(entry.path)),
    join(journal.id, "quarantine", encodePath(entry.path)),
  ];
  for (const relPath of new Set(candidates.filter((value): value is string => value !== null))) {
    const path = join(tx.root, relPath);
    if (lstatIfExists(path) !== null && matchesPrior(path, entry.prior)) return path;
  }
  return null;
}

function recoverLocked(tx: OpenTransaction): void {
  const activeEntries = readdirSync(tx.activeDir);
  if (activeEntries.some((name) => !name.endsWith(".json"))) {
    throw new TransactionBlocked("recovery", tx.activeDir, "unknown content in active transaction directory");
  }
  const journals = activeEntries.filter((name) => name.endsWith(".json"));
  if (journals.length > 1) throw new TransactionBlocked("recovery", tx.activeDir, "multiple active transaction journals");
  if (journals.length === 0) return;
  const path = join(tx.activeDir, journals[0] as string);
  let journal: Journal;
  try {
    journal = JSON.parse(readTextNoFollow(path)) as Journal;
    validateJournal(journal, tx);
  } catch (cause) {
    throw new TransactionBlocked("recovery", path, `corrupt transaction journal: ${String(cause)}`);
  }
  if (journal.phase === "commit-decided" || journal.phase === "committed") {
    cleanupCommitted(tx, journal);
    journal.phase = "committed";
    writeJournal(tx, journal);
    archiveJournal(tx, journal);
  } else if (journal.phase === "blocked") {
    throw new TransactionBlocked("recovery", path, "transaction is blocked and requires operator reconciliation");
  } else {
    rollback(tx, journal);
  }
}

function validateJournal(journal: Journal, tx: OpenTransaction): void {
  if (journal.schema !== 1 || journal.target !== tx.target || !journal.id || !Array.isArray(journal.entries)) throw new Error("identity mismatch");
  const phases: readonly Phase[] = ["preparing", "prepared", "applying", "commit-decided", "committed", "rolling-back", "blocked"];
  if (!phases.includes(journal.phase)) throw new Error("unknown phase");
  const seen = new Set<string>();
  for (const entry of journal.entries) {
    validateRelativePath(entry.path);
    if (seen.has(entry.path)) throw new Error("duplicate journal path");
    seen.add(entry.path);
    for (const privatePath of [entry.candidate, entry.quarantine, entry.backup]) {
      if (privatePath === null) continue;
      const resolved = resolve(tx.root, privatePath);
      if (!resolved.startsWith(`${tx.root}${sep}`)) throw new Error("private path escape");
    }
  }
}

function cleanupCommitted(tx: OpenTransaction, journal: Journal): void {
  cleanupStaging(tx, journal);
}

function cleanupStaging(tx: OpenTransaction, journal: Journal): void {
  for (const entry of journal.entries) {
    if (entry.candidate === null) continue;
    const staged = join(tx.root, entry.candidate);
    if (lstatIfExists(staged) === null) continue;
    if (entry.candidateSha256 === null || sha256(staged) !== entry.candidateSha256) {
      throw new TransactionBlocked("recovery", staged, "unknown staging content was preserved");
    }
    tx.fs.unlink(staged);
  }
}

function archiveJournal(tx: OpenTransaction, journal: Journal, suffix = "committed"): void {
  const active = journalPath(tx, journal.id);
  const archiveDir = join(tx.committedDir, journal.id);
  tx.fs.mkdir(archiveDir);
  const archive = join(archiveDir, `journal-${suffix}.json`);
  tx.fs.atomicJson(archive, journal);
  if (lstatIfExists(active) !== null) tx.fs.unlink(active);
}

function writeJournal(tx: OpenTransaction, journal: Journal): void {
  tx.fs.atomicJson(journalPath(tx, journal.id), journal);
}

function journalPath(tx: OpenTransaction, id: string): string {
  return join(tx.activeDir, `${id}.json`);
}

function retiredOwnedPaths(target: string, next: Manifest): string[] {
  const path = targetPath(target, MANIFEST_RELATIVE_PATH);
  if (lstatIfExists(path) === null) return [];
  try {
    const parsed = JSON.parse(readTextNoFollow(path)) as { files?: ManifestFile[] };
    const nextPaths = new Set(next.toJSON().files.map((entry) => entry.path));
    return (parsed.files ?? [])
      .filter((entry) => entry.class === "owned" && !nextPaths.has(entry.path))
      .filter((entry) => {
        const current = targetPath(target, entry.path);
        const state = lstatIfExists(current);
        // MD5 is retained solely for compatibility with the persisted manifest
        // schema. This equality check decides whether an installer-owned retired
        // file is unchanged; it is not a security-integrity primitive. A future
        // schema revision can add SHA-256 without invalidating existing manifests.
        return state !== null && !state.isSymbolicLink() && state.isFile() && md5(current) === entry.md5;
      })
      .map((entry) => entry.path);
  } catch {
    // A corrupt manifest is itself captured transactionally but is not trusted
    // as authority for destructive retired-file actions.
    return [];
  }
}

function md5(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

function priorState(path: string): PriorState {
  const st = lstatIfExists(path);
  if (st === null) return { kind: "absent" };
  if (st.isSymbolicLink() || !st.isFile()) throw new TransactionBlocked("preflight", path, "destination must be a regular non-symlink file");
  return { kind: "file", ino: Number(st.ino), size: st.size, sha256: sha256(path) };
}

function assertMatches(path: string, prior: Extract<PriorState, { kind: "file" }>, detail: string): void {
  assertRegularNoFollow(path, "captured file");
  const st = lstatSync(path);
  if (Number(st.ino) !== prior.ino || st.size !== prior.size || sha256(path) !== prior.sha256) {
    throw new TransactionBlocked("journal", path, detail);
  }
}

function matchesPrior(path: string, prior: Extract<PriorState, { kind: "file" }>): boolean {
  const st = lstatIfExists(path);
  if (st === null || st.isSymbolicLink() || !st.isFile()) return false;
  return Number(st.ino) === prior.ino && st.size === prior.size && sha256(path) === prior.sha256;
}

function assertRegularNoFollow(path: string, label: string): void {
  const st = lstatSync(path);
  if (st.isSymbolicLink() || !st.isFile()) throw new TransactionBlocked("preflight", path, `${label} must be a regular non-symlink file`);
}

function mkdirParentsNoSymlink(tx: OpenTransaction, dir: string): void {
  const rel = relative(tx.target, dir);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new TransactionBlocked("preflight", dir, "directory escapes target");
  let current = tx.target;
  if (lstatIfExists(current) === null) {
    tx.fs.step("mkdir-target", current);
    mkdirSync(current, { mode: 0o755 });
    tx.fs.fsyncDir(dirname(current));
  }
  for (const segment of rel.split(sep).filter(Boolean)) {
    current = join(current, segment);
    if (lstatIfExists(current) === null) {
      tx.fs.step("mkdir-parent", current);
      mkdirSync(current, { mode: 0o755 });
      tx.fs.fsyncDir(dirname(current));
    } else {
      const st = lstatSync(current);
      if (st.isSymbolicLink() || !st.isDirectory()) throw new TransactionBlocked("preflight", current, "unsafe destination parent");
    }
  }
}

function fsyncFile(fs: DurableFs, path: string): void {
  fs.step("fsync-file", path);
  const fd = openSync(path, constants.O_RDONLY | noFollowFlag());
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  fs.fsyncDir(dirname(path));
}

function targetPath(target: string, relPath: string): string {
  const path = resolve(target, relPath);
  if (!path.startsWith(`${target}${sep}`)) throw new TransactionBlocked("preflight", relPath, "path escapes target");
  return path;
}

function encodePath(path: string): string {
  return `${createHash("sha256").update(path).digest("hex")}.bin`;
}

function sha256(path: string): string {
  const fd = openSync(path, constants.O_RDONLY | noFollowFlag());
  try {
    if (!fstatSync(fd).isFile()) throw new TransactionBlocked("preflight", path, "digest source is not a regular file");
    return createHash("sha256").update(readFileSync(fd)).digest("hex");
  } finally {
    closeSync(fd);
  }
}

function readTextNoFollow(path: string): string {
  const fd = openSync(path, constants.O_RDONLY | noFollowFlag());
  try {
    if (!fstatSync(fd).isFile()) throw new TransactionBlocked("preflight", path, "read source is not a regular file");
    return readFileSync(fd, "utf8");
  } finally {
    closeSync(fd);
  }
}

function lstatIfExists(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (cause) {
    if (isCode(cause, "ENOENT")) return null;
    throw cause;
  }
}

function dispositionFor(entry: PlanEntry): "install" | "skip" {
  if (entry.action === "skip" || (entry.action === "conflict" && entry.class === "user-preserved")) return "skip";
  return "install";
}

function makeResult(applied: readonly PlanEntry[], backups: readonly string[], failures: readonly ApplyFailure[]): ApplyResult {
  return Object.freeze({
    hasFailures: () => failures.length > 0,
    failures: () => failures,
    appliedEntries: () => applied,
    backupPaths: () => backups,
    manifestFiles: () =>
      ManifestFiles.fromEntries(applied.map((entry) => ({ path: entry.path, class: entry.class, required: entry.required, md5: entry.md5 }))),
  });
}

function toFailure(cause: unknown): ApplyFailure {
  if (cause instanceof TransactionBlocked) return { path: cause.path, operation: cause.operation, detail: cause.message };
  return { path: "<transaction>", operation: "journal", detail: cause instanceof Error ? cause.message : String(cause) };
}

function isCode(cause: unknown, code: string): boolean {
  return cause instanceof Error && "code" in cause && (cause as { code?: string }).code === code;
}
