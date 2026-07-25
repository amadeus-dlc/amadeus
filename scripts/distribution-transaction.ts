#!/usr/bin/env bun
// Crash-recoverable, file-granular coordinator for public distribution files.

import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export const DISTRIBUTION_RUNTIME_DIR = ".amadeus/distribution-transaction";
export const DISTRIBUTION_LOCK_TIMEOUT_MS = 5_000;
export const DISTRIBUTION_FILE_LIMIT_BYTES = 2 * 1024 * 1024;
export const DISTRIBUTION_TOTAL_LIMIT_BYTES = 64 * 1024 * 1024;

export type DistributionCheckpoint =
  | "candidate-published"
  | "owner-published"
  | "recovery-published"
  | "writer-quarantined"
  | "journal-prepared"
  | "journal-committing"
  | "target-candidate-fsynced"
  | "target-renamed"
  | "parent-fsynced"
  | "journal-applied"
  | "journal-committed"
  | "recovery-restore"
  | "journal-cleaned";

export class DistributionLockTimeoutError extends Error {
  readonly kind = "distribution-lock-timeout";
  constructor(
    readonly lockKind: "reader" | "writer" | "recovery",
    readonly timeoutMs: number,
  ) {
    super(`distribution ${lockKind} lock timed out after ${timeoutMs}ms`);
  }
}

export class DistributionRecoveryError extends Error {
  readonly kind = "distribution-recovery-failed";
}

export type DistributionOwner = Readonly<{
  schema: 1;
  kind: "writer" | "reader" | "recovery";
  token: string;
  generation: number;
  host: string;
  pid: number;
  processStart: string;
  createdAt: string;
  journalId: string | null;
}>;

export type DistributionJournalFile = Readonly<{
  path: string;
  order: number;
  oldDigest: string | null;
  newDigest: string | null;
  backupPath: string | null;
  oldAbsent: boolean;
  candidatePath: string | null;
  deleteTombstonePath: string | null;
  applied: boolean;
}>;

export type DistributionJournal = Readonly<{
  schema: 2;
  id: string;
  registryDigest: string;
  generation: number;
  state: "prepared" | "committing" | "committed" | "cleaned";
  files: readonly DistributionJournalFile[];
}>;

export type DistributionFileUpdate = Readonly<{
  path: string;
  bytes: Buffer | null;
}>;

export type DistributionReadSession = Readonly<{
  token: string;
  generation: number;
  purpose: string;
  readFile(relativePath: string): Buffer;
  listPublicRoot(relativeRoot: string): readonly string[];
  close(): void;
}>;

export type DistributionPorts = Readonly<{
  now(): string;
  token(): string;
  host(): string;
  pid(): number;
  processStart(): string;
  monotonicMs(): number;
  wait(ms: number): void;
  ownerState(owner: DistributionOwner): "alive" | "stale" | "ambiguous";
  checkpoint(checkpoint: DistributionCheckpoint, detail: string): void;
}>;

const PROCESS_START = String(Math.floor(Date.now() - process.uptime() * 1_000));
const sleepArray = new Int32Array(new SharedArrayBuffer(4));
const defaultPorts: DistributionPorts = {
  now: () => new Date().toISOString(),
  token: randomUUID,
  host: () => process.env.HOSTNAME ?? "local",
  pid: () => process.pid,
  processStart: () => PROCESS_START,
  monotonicMs: () => performance.now(),
  wait: (ms) => {
    Atomics.wait(sleepArray, 0, 0, ms);
  },
  ownerState: (owner) => {
    if (owner.host !== (process.env.HOSTNAME ?? "local")) return "ambiguous";
    try {
      process.kill(owner.pid, 0);
    } catch {
      return "stale";
    }
    if (owner.pid !== process.pid) return "ambiguous";
    return owner.processStart === PROCESS_START ? "alive" : "stale";
  },
  checkpoint: () => {},
};

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fsyncPath(path: string): void {
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeAtomic(path: string, bytes: Buffer | string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.candidate.${process.pid}.${randomUUID()}`;
  writeFileSync(temp, bytes, { mode: 0o600, flag: "wx" });
  fsyncPath(temp);
  renameSync(temp, path);
  fsyncPath(dirname(path));
}

function safeRelative(root: string, requested: string): string {
  if (
    requested.length === 0 ||
    requested.includes("\0") ||
    requested.startsWith("/") ||
    /^[A-Za-z]:[\\/]/u.test(requested) ||
    requested.split(/[\\/]/u).includes("..")
  ) {
    throw new Error("distribution path is outside the repository");
  }
  const target = resolve(root, requested);
  if (target !== root && !target.startsWith(`${root}${sep}`))
    throw new Error("distribution path is outside the repository");
  let current = root;
  for (const segment of relative(root, target).split(sep).slice(0, -1)) {
    current = join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw new Error("distribution path traverses a symlink");
  }
  return target;
}

function publishOwner(slot: string, owner: DistributionOwner): void {
  const candidate = `${slot}.candidate.${owner.token}`;
  mkdirSync(candidate, { recursive: false, mode: 0o700 });
  writeAtomic(join(candidate, "owner.json"), `${JSON.stringify(owner)}\n`);
  fsyncPath(candidate);
  renameSync(candidate, slot);
  fsyncPath(dirname(slot));
}

function ownerAt(slot: string): DistributionOwner | null {
  try {
    const parsed = JSON.parse(
      readFileSync(join(slot, "owner.json"), "utf-8"),
    ) as DistributionOwner;
    return parsed.schema === 1 &&
      (parsed.kind === "writer" ||
        parsed.kind === "reader" ||
        parsed.kind === "recovery") &&
      typeof parsed.token === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function listFiles(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(current, entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink())
      throw new Error("public projection contains a symlink");
    if (stat.isDirectory()) result.push(...listFiles(root, path));
    else if (stat.isFile())
      result.push(relative(root, path).split(sep).join("/"));
  }
  return result;
}

function currentDigest(path: string): string | null {
  if (!existsSync(path)) return null;
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("distribution target is not a regular file");
  return digest(readFileSync(path));
}

function journalText(journal: DistributionJournal): string {
  return `${JSON.stringify(journal)}\n`;
}

export class DistributionTransactionCoordinator {
  readonly root: string;
  readonly runtimeRoot: string;
  readonly ports: DistributionPorts;

  constructor(root: string, ports: Partial<DistributionPorts> = {}) {
    this.root = resolve(root);
    this.runtimeRoot = join(this.root, DISTRIBUTION_RUNTIME_DIR);
    this.ports = { ...defaultPorts, ...ports };
  }

  private owner(
    kind: DistributionOwner["kind"],
    journalId: string | null,
  ): DistributionOwner {
    return {
      schema: 1,
      kind,
      token: this.ports.token(),
      generation: this.nextGeneration(),
      host: this.ports.host(),
      pid: this.ports.pid(),
      processStart: this.ports.processStart(),
      createdAt: this.ports.now(),
      journalId,
    };
  }

  private nextGeneration(): number {
    const path = join(this.runtimeRoot, "generation");
    let current = 0;
    try {
      current = Number.parseInt(readFileSync(path, "utf-8"), 10) || 0;
    } catch {
      // First transaction.
    }
    const next = current + 1;
    writeAtomic(path, `${next}\n`);
    return next;
  }

  private assertToken(slot: string, token: string): void {
    if (ownerAt(slot)?.token !== token)
      throw new Error("distribution lock ownership changed");
  }

  private waitUntil(
    kind: "reader" | "writer" | "recovery",
    ready: () => boolean,
  ): void {
    const started = this.ports.monotonicMs();
    while (!ready()) {
      if (
        this.ports.monotonicMs() - started >=
        DISTRIBUTION_LOCK_TIMEOUT_MS
      ) {
        throw new DistributionLockTimeoutError(
          kind,
          DISTRIBUTION_LOCK_TIMEOUT_MS,
        );
      }
      this.ports.wait(10);
    }
  }

  pendingJournalCount(): number {
    const journals = join(this.runtimeRoot, "journals");
    if (!existsSync(journals)) return 0;
    return readdirSync(journals).filter((name) => name.endsWith(".json")).length;
  }

  acquireWriter(journalId: string | null = null): DistributionOwner {
    mkdirSync(this.runtimeRoot, { recursive: true });
    const writerSlot = join(this.runtimeRoot, "writer");
    const recoverySlot = join(this.runtimeRoot, "recovery");
    this.waitUntil(
      "writer",
      () => !existsSync(writerSlot) && !existsSync(recoverySlot),
    );
    const owner = this.owner("writer", journalId);
    try {
      publishOwner(writerSlot, owner);
      this.ports.checkpoint("owner-published", owner.token);
    } catch {
      if (ownerAt(writerSlot)?.token === owner.token)
        this.releaseOwner(writerSlot, owner);
      throw new DistributionLockTimeoutError(
        "writer",
        DISTRIBUTION_LOCK_TIMEOUT_MS,
      );
    }
    if (existsSync(recoverySlot)) {
      this.releaseOwner(writerSlot, owner);
      throw new Error("distribution recovery raced with writer");
    }
    const readers = join(this.runtimeRoot, "readers");
    try {
      this.waitUntil(
        "writer",
        () => !existsSync(readers) || readdirSync(readers).length === 0,
      );
    } catch (error) {
      this.releaseOwner(writerSlot, owner);
      throw error;
    }
    this.assertToken(writerSlot, owner.token);
    return owner;
  }

  private releaseOwner(slot: string, owner: DistributionOwner): void {
    this.assertToken(slot, owner.token);
    rmSync(slot, { recursive: true });
    fsyncPath(dirname(slot));
  }

  releaseWriter(owner: DistributionOwner): void {
    this.releaseOwner(join(this.runtimeRoot, "writer"), owner);
  }

  private acquireRecovery(journalId: string): DistributionOwner {
    mkdirSync(this.runtimeRoot, { recursive: true });
    const writer = join(this.runtimeRoot, "writer");
    const recovery = join(this.runtimeRoot, "recovery");
    this.waitUntil(
      "recovery",
      () => !existsSync(writer) && !existsSync(recovery),
    );
    const owner = this.owner("recovery", journalId);
    publishOwner(recovery, owner);
    this.ports.checkpoint("recovery-published", owner.token);
    const readers = join(this.runtimeRoot, "readers");
    this.waitUntil(
      "recovery",
      () => !existsSync(readers) || readdirSync(readers).length === 0,
    );
    this.assertToken(recovery, owner.token);
    return owner;
  }

  takeoverStaleWriter(): DistributionOwner {
    const writerSlot = join(this.runtimeRoot, "writer");
    const stale = ownerAt(writerSlot);
    if (!stale) throw new Error("distribution writer lock is ambiguous");
    const state = this.ports.ownerState(stale);
    if (state !== "stale")
      throw new Error(
        state === "alive"
          ? "distribution writer is alive"
          : "distribution writer lock is ambiguous",
      );
    const recovery = this.owner("recovery", stale.journalId);
    const recoverySlot = join(this.runtimeRoot, "recovery");
    publishOwner(recoverySlot, recovery);
    this.ports.checkpoint("recovery-published", recovery.token);
    if (ownerAt(writerSlot)?.token !== stale.token) {
      rmSync(recoverySlot, { recursive: true, force: true });
      throw new Error("distribution writer changed during takeover");
    }
    const quarantine = join(
      this.runtimeRoot,
      "quarantine",
      `${stale.generation}-${stale.token}`,
    );
    mkdirSync(dirname(quarantine), { recursive: true });
    renameSync(writerSlot, quarantine);
    fsyncPath(dirname(writerSlot));
    this.ports.checkpoint("writer-quarantined", quarantine);
    this.assertToken(recoverySlot, recovery.token);
    return recovery;
  }

  releaseRecovery(owner: DistributionOwner): void {
    this.releaseOwner(join(this.runtimeRoot, "recovery"), owner);
  }

  openReadSession(purpose = "distribution-check"): DistributionReadSession {
    const readersRoot = join(this.runtimeRoot, "readers");
    const writer = join(this.runtimeRoot, "writer");
    const recovery = join(this.runtimeRoot, "recovery");
    mkdirSync(readersRoot, { recursive: true });
    this.waitUntil(
      "reader",
      () => !existsSync(writer) && !existsSync(recovery),
    );
    const owner = this.owner("reader", null);
    const slot = join(readersRoot, owner.token);
    publishOwner(slot, owner);
    if (existsSync(writer) || existsSync(recovery)) {
      rmSync(slot, { recursive: true, force: true });
      throw new Error("distribution writer raced with reader");
    }
    const check = () => this.assertToken(slot, owner.token);
    return {
      token: owner.token,
      generation: owner.generation,
      purpose,
      readFile: (relativePath) => {
        check();
        const path = safeRelative(this.root, relativePath);
        const stat = lstatSync(path);
        if (!stat.isFile() || stat.isSymbolicLink())
          throw new Error("distribution read target is not a regular file");
        const bytes = readFileSync(path);
        check();
        return bytes;
      },
      listPublicRoot: (relativeRoot) => {
        check();
        const files = listFiles(safeRelative(this.root, relativeRoot));
        check();
        return files;
      },
      close: () => this.releaseOwner(slot, owner),
    };
  }

  private prepareJournal(
    id: string,
    generation: number,
    registryDigest: string,
    updates: readonly DistributionFileUpdate[],
  ): DistributionJournal {
    const seen = new Set<string>();
    const files: DistributionJournalFile[] = [];
    const transactionRoot = join(this.runtimeRoot, "transactions", id);
    const candidates = join(transactionRoot, "candidates");
    const backups = join(transactionRoot, "backups");
    mkdirSync(candidates, { recursive: true });
    mkdirSync(backups, { recursive: true });
    const ordered = [...updates].sort((a, b) => a.path.localeCompare(b.path));
    for (let order = 0; order < ordered.length; order += 1) {
      const update = ordered[order];
      if (seen.has(update.path))
        throw new Error(`duplicate distribution target: ${update.path}`);
      seen.add(update.path);
      const target = safeRelative(this.root, update.path);
      const oldAbsent = !existsSync(target);
      if (
        !oldAbsent &&
        (!lstatSync(target).isFile() || lstatSync(target).isSymbolicLink())
      ) {
        throw new Error(`distribution target is not a regular file: ${update.path}`);
      }
      const backupPath = oldAbsent
        ? null
        : `${DISTRIBUTION_RUNTIME_DIR}/transactions/${id}/backups/${order}`;
      if (backupPath) {
        const backup = safeRelative(this.root, backupPath);
        copyFileSync(target, backup, constants.COPYFILE_EXCL);
        fsyncPath(backup);
      }
      const candidatePath =
        update.bytes === null
          ? null
          : `${DISTRIBUTION_RUNTIME_DIR}/transactions/${id}/candidates/${order}`;
      if (candidatePath && update.bytes !== null) {
        const candidate = safeRelative(this.root, candidatePath);
        writeFileSync(candidate, update.bytes, { flag: "wx", mode: 0o600 });
        fsyncPath(candidate);
      }
      files.push({
        path: update.path,
        order,
        oldDigest: oldAbsent ? null : currentDigest(target),
        newDigest: update.bytes === null ? null : digest(update.bytes),
        backupPath,
        oldAbsent,
        candidatePath,
        deleteTombstonePath:
          update.bytes === null && !oldAbsent
            ? `${update.path}.amadeus-delete-${id}`
            : null,
        applied: false,
      });
    }
    fsyncPath(candidates);
    fsyncPath(backups);
    fsyncPath(transactionRoot);
    return {
      schema: 2,
      id,
      registryDigest,
      generation,
      state: "prepared",
      files,
    };
  }

  private writeJournal(journal: DistributionJournal): void {
    writeAtomic(
      join(this.runtimeRoot, "journals", `${journal.id}.json`),
      journalText(journal),
    );
  }

  private applyFile(file: DistributionJournalFile, id: string): void {
    const target = safeRelative(this.root, file.path);
    mkdirSync(dirname(target), { recursive: true });
    if (file.candidatePath === null) {
      if (existsSync(target)) {
        const tombstone = safeRelative(
          this.root,
          file.deleteTombstonePath as string,
        );
        renameSync(target, tombstone);
        this.ports.checkpoint("target-renamed", file.path);
      }
    } else {
      const sameParentCandidate = `${target}.candidate.${id}`;
      copyFileSync(
        safeRelative(this.root, file.candidatePath),
        sameParentCandidate,
        constants.COPYFILE_EXCL,
      );
      fsyncPath(sameParentCandidate);
      this.ports.checkpoint("target-candidate-fsynced", file.path);
      renameSync(sameParentCandidate, target);
      this.ports.checkpoint("target-renamed", file.path);
    }
    fsyncPath(dirname(target));
    this.ports.checkpoint("parent-fsynced", file.path);
  }

  private cleanup(journal: DistributionJournal): void {
    for (const file of journal.files) {
      rmSync(`${safeRelative(this.root, file.path)}.candidate.${journal.id}`, {
        force: true,
      });
      if (file.deleteTombstonePath)
        rmSync(safeRelative(this.root, file.deleteTombstonePath), {
          force: true,
        });
    }
    rmSync(join(this.runtimeRoot, "transactions", journal.id), {
      recursive: true,
      force: true,
    });
    rmSync(join(this.runtimeRoot, "journals", `${journal.id}.json`), {
      force: true,
    });
  }

  apply(
    updates: readonly DistributionFileUpdate[],
    registryDigest = digest(
      Buffer.from(updates.map((item) => item.path).sort().join("\n")),
    ),
  ): void {
    let totalBytes = 0;
    for (const update of updates) {
      if (update.bytes === null) continue;
      if (update.bytes.length > DISTRIBUTION_FILE_LIMIT_BYTES)
        throw new Error(`distribution file exceeds 2 MiB: ${update.path}`);
      totalBytes += update.bytes.length;
    }
    if (totalBytes > DISTRIBUTION_TOTAL_LIMIT_BYTES)
      throw new Error("distribution transaction exceeds 64 MiB");
    if (this.pendingJournalCount() > 0) this.recover();
    const id = randomUUID();
    const owner = this.acquireWriter(id);
    let journal: DistributionJournal | null = null;
    try {
      journal = this.prepareJournal(
        id,
        owner.generation,
        registryDigest,
        updates,
      );
      this.writeJournal(journal);
      this.ports.checkpoint("candidate-published", id);
      this.ports.checkpoint("journal-prepared", id);
      journal = { ...journal, state: "committing" };
      this.writeJournal(journal);
      this.ports.checkpoint("journal-committing", id);
      for (let index = 0; index < journal.files.length; index += 1) {
        this.applyFile(journal.files[index], id);
        const files: DistributionJournalFile[] = journal.files.map((file, fileIndex) =>
          fileIndex === index ? { ...file, applied: true } : file,
        );
        journal = { ...journal, files };
        this.writeJournal(journal);
        this.ports.checkpoint("journal-applied", journal.files[index].path);
      }
      journal = { ...journal, state: "committed" };
      this.writeJournal(journal);
      this.ports.checkpoint("journal-committed", id);
      journal = { ...journal, state: "cleaned" };
      this.writeJournal(journal);
      this.cleanup(journal);
      this.ports.checkpoint("journal-cleaned", id);
    } finally {
      if (journal === null) {
        rmSync(join(this.runtimeRoot, "transactions", id), {
          recursive: true,
          force: true,
        });
      }
      this.releaseWriter(owner);
    }
  }

  private restoreFile(
    file: DistributionJournalFile,
    direction: "rollback" | "forward",
  ): void {
    const expectedDigest =
      direction === "forward" ? file.newDigest : file.oldDigest;
    const target = safeRelative(this.root, file.path);
    if (currentDigest(target) === expectedDigest) return;
    const source =
      direction === "forward" ? file.candidatePath : file.backupPath;
    const absent =
      direction === "forward" ? file.newDigest === null : file.oldAbsent;
    if (absent) {
      rmSync(target, { force: true });
      fsyncPath(dirname(target));
      return;
    }
    if (!source || !existsSync(safeRelative(this.root, source)))
      throw new DistributionRecoveryError(
        `recovery source is absent for ${file.path}`,
      );
    const candidate = `${target}.recovery.${randomUUID()}`;
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(
      safeRelative(this.root, source),
      candidate,
      constants.COPYFILE_EXCL,
    );
    fsyncPath(candidate);
    renameSync(candidate, target);
    fsyncPath(dirname(target));
  }

  private recoveryOwner(journal: DistributionJournal): DistributionOwner {
    const writerSlot = join(this.runtimeRoot, "writer");
    if (!existsSync(writerSlot)) return this.acquireRecovery(journal.id);
    const writer = ownerAt(writerSlot);
    if (!writer || writer.journalId !== journal.id)
      throw new DistributionRecoveryError(
        "distribution writer lock is ambiguous",
      );
    return this.takeoverStaleWriter();
  }

  recover(): "clean" | "recovered" {
    const journalsRoot = join(this.runtimeRoot, "journals");
    if (!existsSync(journalsRoot)) return "clean";
    const names = readdirSync(journalsRoot)
      .filter((name) => name.endsWith(".json"))
      .sort();
    if (names.length === 0) return "clean";
    if (names.length > 1)
      throw new DistributionRecoveryError("multiple distribution journals");
    const journalPath = join(journalsRoot, names[0]);
    const journal = JSON.parse(
      readFileSync(journalPath, "utf-8"),
    ) as DistributionJournal;
    if (journal.schema !== 2)
      throw new DistributionRecoveryError(
        "unsupported distribution journal schema",
      );
    const owner = this.recoveryOwner(journal);
    try {
      const direction =
        journal.state === "committed" || journal.state === "cleaned"
          ? "forward"
          : "rollback";
      for (const file of journal.files) {
        this.ports.checkpoint("recovery-restore", file.path);
        this.restoreFile(file, direction);
      }
      this.cleanup(journal);
      this.releaseRecovery(owner);
      return "recovered";
    } catch (error) {
      // Deliberately retain journal, transaction data, quarantine, and the
      // recovery owner so another process cannot publish over partial recovery.
      throw error instanceof DistributionRecoveryError
        ? error
        : new DistributionRecoveryError(String(error));
    }
  }
}

if (import.meta.main) {
  const command = process.argv[2];
  const coordinator = new DistributionTransactionCoordinator(process.cwd());
  if (command !== "recover") {
    console.error("usage: bun scripts/distribution-transaction.ts recover");
    process.exit(2);
  }
  console.log(coordinator.recover());
}
