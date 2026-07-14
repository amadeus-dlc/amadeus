// Provider-neutral native evidence capture for swarm-driver process supervisors.

import * as filesystem from "node:fs/promises";
import {
  close as closeDescriptor,
  constants as filesystemConstants,
  fstat as statDescriptor,
  readFile as readDescriptor,
} from "node:fs";
import { join, resolve } from "node:path";
import { dlopen, FFIType, read as readPointer, type Pointer } from "bun:ffi";
import type {
  EventBoundCaptureBinding,
  EvidenceCapturePlan,
  ProcessTerminal,
} from "./amadeus-swarm-driver-adapter-contract.ts";
import { digestValue } from "./amadeus-swarm-canonical.ts";
import type {
  EvidenceCapturePort,
  EvidenceCaptureSession,
  NativeProcessOutputFrame,
  RawEvidenceSink,
} from "./amadeus-swarm-native-execution.ts";

type FileStat = Readonly<{
  dev: bigint;
  ino: bigint;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}>;

export type NativeCaptureFile = Readonly<{
  stat(): Promise<FileStat>;
  readFile(): Promise<Uint8Array>;
  close(): Promise<void>;
}>;

export type NativeCaptureDirectory = Readonly<{
  stat(): Promise<FileStat>;
  openDirectoryNoFollow(name: string): Promise<NativeCaptureDirectory>;
  openFileNoFollow(name: string): Promise<NativeCaptureFile>;
  close(): Promise<void>;
}>;

export type NativeCaptureFilesystem = Readonly<{
  lstat(path: string): Promise<FileStat>;
  readdir(path: string): Promise<readonly string[]>;
  openDirectoryNoFollow(path: string): Promise<NativeCaptureDirectory>;
  openReadOnlyNoFollow(path: string): Promise<NativeCaptureFile>;
}>;

export type NativeProcessOutputPort = Readonly<{
  publish(nativeRunId: string, frame: NativeProcessOutputFrame): void;
  close(nativeRunId: string): void;
  fail(nativeRunId: string, error: unknown): void;
}>;

export type NativeCaptureSupervisor = Readonly<{
  capture: EvidenceCapturePort;
  output: NativeProcessOutputPort;
  activeObserverCount(): number;
}>;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function beforeDeadline<T>(promise: Promise<T>, deadline: number, code: string): Promise<T> {
  return new Promise<T>((resolveValue, reject) => {
    const timer = setTimeout(
      () => reject(new Error(code)),
      Math.max(0, deadline - Date.now()),
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolveValue(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function bytesCopy(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as Readonly<{ code?: unknown }>).code)
    : undefined;
}

function canonicalPaths(paths: readonly string[]): readonly string[] {
  const canonical = [...new Set(paths.map((path) => resolve(path)))].sort();
  if (canonical.length === 0 || canonical.length !== paths.length) {
    throw new Error("CAPTURE_BINDING_INVALID");
  }
  return Object.freeze(canonical);
}

type FileIdentity = Readonly<{ dev: bigint; ino: bigint }>;

function identityOf(stat: FileStat): FileIdentity {
  return Object.freeze({ dev: stat.dev, ino: stat.ino });
}

function sameIdentity(stat: FileStat, expected: FileIdentity): boolean {
  return stat.dev === expected.dev && stat.ino === expected.ino;
}

function captureReadError(error: unknown): Error {
  return error instanceof Error && error.message.startsWith("CAPTURE_")
    ? error
    : new Error("CAPTURE_READ_FAILED", { cause: error });
}

function captureOpenError(error: unknown): Error {
  if (errorCode(error) === "ELOOP") {
    return new Error("CAPTURE_SYMLINK_REJECTED", { cause: error });
  }
  if (errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR") {
    return new Error("CAPTURE_PATH_CHANGED", { cause: error });
  }
  return captureReadError(error);
}

async function closeCaptureFile(file: NativeCaptureFile): Promise<Error | undefined> {
  try {
    await file.close();
    return undefined;
  } catch (error) {
    return new Error("CAPTURE_READ_FAILED", { cause: error });
  }
}

async function closeCaptureDirectory(
  directory: NativeCaptureDirectory,
): Promise<Error | undefined> {
  try {
    await directory.close();
    return undefined;
  } catch (error) {
    return new Error("CAPTURE_READ_FAILED", { cause: error });
  }
}

type OpenAtRuntime = Readonly<{
  openAt(directoryFd: number, name: Uint8Array, flags: number): number;
  errno(): number;
}>;

let openAtRuntime: OpenAtRuntime | undefined;

const OPEN_CLOSE_ON_EXEC = process.platform === "darwin"
  ? 0x01000000
  : process.platform === "linux"
    ? 0x00080000
    : 0;

function loadOpenAtRuntime(): OpenAtRuntime {
  if (openAtRuntime) return openAtRuntime;
  if (process.platform === "darwin") {
    const library = dlopen("/usr/lib/libSystem.B.dylib", {
      openat: { args: [FFIType.i32, FFIType.cstring, FFIType.i32], returns: FFIType.i32 },
      __error: { returns: FFIType.ptr },
    });
    openAtRuntime = Object.freeze({
      openAt: (directoryFd, name, flags) => library.symbols.openat(directoryFd, name, flags),
      errno: () => readPointer.i32(library.symbols.__error() as Pointer),
    });
    return openAtRuntime;
  }
  if (process.platform === "linux") {
    const library = dlopen("libc.so.6", {
      openat: { args: [FFIType.i32, FFIType.cstring, FFIType.i32], returns: FFIType.i32 },
      __errno_location: { returns: FFIType.ptr },
    });
    openAtRuntime = Object.freeze({
      openAt: (directoryFd, name, flags) => library.symbols.openat(directoryFd, name, flags),
      errno: () => readPointer.i32(library.symbols.__errno_location() as Pointer),
    });
    return openAtRuntime;
  }
  throw new Error("CAPTURE_PLATFORM_UNSUPPORTED");
}

// Exported as an in-process test seam because the platform FFI reports only the
// host errno values during integration tests.
export function captureErrnoCode(errno: number): string {
  if (errno === 2) return "ENOENT";
  if (errno === 20) return "ENOTDIR";
  if (errno === 40 || errno === 62) return "ELOOP";
  return "EIO";
}

function openAtDescriptor(directoryFd: number, name: string, flags: number): number {
  if (!name || name.includes("/") || name.includes("\\") || name.includes("\0")) {
    throw new Error("CAPTURE_PATH_ESCAPE");
  }
  const runtime = loadOpenAtRuntime();
  const descriptor = runtime.openAt(directoryFd, Buffer.from(`${name}\0`), flags);
  if (descriptor >= 0) return descriptor;
  const code = captureErrnoCode(runtime.errno());
  throw Object.assign(new Error(`CAPTURE_OPENAT_FAILED: ${code}`), { code });
}

function descriptorStat(descriptor: number): Promise<FileStat> {
  return new Promise((resolveStat, reject) => {
    statDescriptor(descriptor, { bigint: true }, (error, stat) => {
      if (error) reject(error);
      else resolveStat(stat);
    });
  });
}

function descriptorRead(descriptor: number): Promise<Uint8Array> {
  return new Promise((resolveBytes, reject) => {
    readDescriptor(descriptor, (error, bytes) => {
      if (error) reject(error);
      else resolveBytes(bytes);
    });
  });
}

function descriptorClose(descriptor: number): Promise<void> {
  return new Promise((resolveClose, reject) => {
    closeDescriptor(descriptor, (error) => {
      if (error) reject(error);
      else resolveClose();
    });
  });
}

function captureFileFromDescriptor(descriptor: number): NativeCaptureFile {
  return Object.freeze({
    stat: async () => descriptorStat(descriptor),
    readFile: async () => descriptorRead(descriptor),
    close: async () => descriptorClose(descriptor),
  });
}

function captureDirectory(
  descriptor: number,
  stat: () => Promise<FileStat>,
  close: () => Promise<void>,
): NativeCaptureDirectory {
  return Object.freeze({
    stat,
    openDirectoryNoFollow: async (name) => {
      const child = openAtDescriptor(
        descriptor,
        name,
        filesystemConstants.O_RDONLY |
          filesystemConstants.O_DIRECTORY |
          filesystemConstants.O_NOFOLLOW |
          OPEN_CLOSE_ON_EXEC,
      );
      return captureDirectory(
        child,
        async () => descriptorStat(child),
        async () => descriptorClose(child),
      );
    },
    openFileNoFollow: async (name) => captureFileFromDescriptor(openAtDescriptor(
      descriptor,
      name,
      filesystemConstants.O_RDONLY |
        filesystemConstants.O_NOFOLLOW |
        OPEN_CLOSE_ON_EXEC,
    )),
    close,
  });
}

type ObserverOptions = Readonly<{
  filesystem: NativeCaptureFilesystem;
  pollIntervalMs: number;
  settleMs: number;
  joinTimeoutMs: number;
  onFinished(nativeRunId: string): void;
}>;

class CaptureObserver {
  readonly #seenFiles = new Map<string, string>();
  readonly #seenBoundRoots = new Set<string>();
  readonly #hookRoot: string;
  readonly #options: ObserverOptions;
  readonly #evidence: RawEvidenceSink;
  #boundPaths: readonly string[] = Object.freeze([]);
  #bindingApplied = false;
  #outputClosed = false;
  #finished = false;
  #pollingDisabled = false;
  #fatalError: unknown;
  #lastChangeAt = Date.now();
  #polling: Promise<void> = Promise.resolve();
  #timer?: ReturnType<typeof setTimeout>;
  #stopPromise?: Promise<void>;

  constructor(
    readonly nativeRunId: string,
    readonly plan: EvidenceCapturePlan,
    evidence: RawEvidenceSink,
    options: ObserverOptions,
  ) {
    this.#options = options;
    this.#evidence = evidence;
    this.#hookRoot = resolve(plan.hookDir);
    if (plan.kind === "fixed-provider-path") {
      this.#boundPaths = canonicalPaths(plan.initialBinding.exactPaths);
      this.#bindingApplied = true;
    }
    this.#schedulePoll(0);
  }

  session(): EvidenceCaptureSession {
    return Object.freeze({
      applyBinding: async (binding) => this.applyBinding(binding),
      stopAndWait: async (terminal) => this.stopAndWait(terminal),
      abortAndWait: async (reason) => this.abortAndWait(reason),
    });
  }

  publish(bytes: Uint8Array): void {
    this.#assertActive();
    this.#evidence.ingest(Object.freeze({
      source: "process-stream" as const,
      bytes: bytesCopy(bytes),
    }));
    this.#lastChangeAt = Date.now();
  }

  closeOutput(): void {
    this.#assertActive();
    this.#outputClosed = true;
    this.#evidence.close();
  }

  failOutput(error: unknown): void {
    if (this.#finished) return;
    this.#fail(error instanceof Error ? error : new Error("CAPTURE_PROCESS_OUTPUT_FAILED"));
  }

  async applyBinding(binding: EventBoundCaptureBinding): Promise<void> {
    this.#assertActive();
    if (
      this.plan.kind !== "event-bound-provider-path" ||
      this.#bindingApplied ||
      binding.kind !== "event-bound-provider-path" ||
      binding.nativeRunId !== this.nativeRunId
    ) {
      throw new Error("CAPTURE_BINDING_INVALID");
    }
    const paths = canonicalPaths(binding.exactPaths);
    if (binding.exactPathDigest !== digestValue(paths)) throw new Error("CAPTURE_BINDING_INVALID");
    this.#boundPaths = paths;
    this.#bindingApplied = true;
    this.#lastChangeAt = Date.now();
    await this.#poll();
  }

  stopAndWait(terminal: ProcessTerminal): Promise<void> {
    this.#stopPromise ??= this.#stop(terminal);
    return this.#stopPromise;
  }

  async abortAndWait(_reason: string): Promise<void> {
    if (this.#finished) return;
    this.#pollingDisabled = true;
    if (this.#timer) clearTimeout(this.#timer);
    this.#finish();
    await beforeDeadline(
      this.#polling,
      Date.now() + this.#options.joinTimeoutMs,
      "CAPTURE_ABORT_TIMEOUT",
    ).catch(() => {});
  }

  #assertActive(): void {
    if (this.#finished) throw new Error("CAPTURE_SESSION_NOT_FOUND");
  }

  #schedulePoll(afterMs: number): void {
    if (this.#finished || this.#pollingDisabled || this.#fatalError !== undefined) return;
    this.#timer = setTimeout(() => {
      void this.#poll()
        .catch((error) => this.#fail(error))
        .finally(() => this.#schedulePoll(this.#options.pollIntervalMs));
    }, afterMs);
  }

  #poll(): Promise<void> {
    const next = this.#polling.then(() => this.#pollOnce());
    this.#polling = next.catch(() => {});
    return next;
  }

  async #pollOnce(): Promise<void> {
    if (this.#finished || this.#fatalError !== undefined) return;
    await this.#scanRoot(this.#hookRoot, "hook", false);
    for (const path of this.#boundPaths) await this.#scanRoot(path, "provider-state", true);
  }

  async #scanRoot(
    root: string,
    channel: "hook" | "provider-state",
    markBoundRoot: boolean,
  ): Promise<void> {
    const observed = await this.#scanPath(root, root, channel);
    if (observed && markBoundRoot) this.#seenBoundRoots.add(root);
  }

  async #scanPath(
    root: string,
    path: string,
    channel: "hook" | "provider-state",
    parent?: NativeCaptureDirectory,
    entryName?: string,
  ): Promise<boolean> {
    const stat = await this.#captureStat(path);
    if (!stat) return false;
    if (!this.#pollIsActive()) return false;
    if (stat.isSymbolicLink()) throw new Error("CAPTURE_SYMLINK_REJECTED");
    if (stat.isFile()) {
      const file = parent && entryName
        ? await this.#openChildFile(parent, entryName)
        : await this.#openCaptureFile(path);
      await this.#captureFile(path, channel, stat, file);
      return true;
    }
    if (!stat.isDirectory()) throw new Error("CAPTURE_PATH_INVALID");
    const directory = parent && entryName
      ? await this.#openChildDirectory(parent, entryName)
      : await this.#openCaptureDirectory(path);
    await this.#scanDirectory(root, path, channel, stat, directory);
    return true;
  }

  async #captureStat(path: string): Promise<FileStat | undefined> {
    try {
      return await this.#options.filesystem.lstat(path);
    } catch (error) {
      if (errorCode(error) === "ENOENT") return undefined;
      throw new Error("CAPTURE_READ_FAILED", { cause: error });
    }
  }

  async #scanDirectory(
    root: string,
    path: string,
    channel: "hook" | "provider-state",
    stat: FileStat,
    directory: NativeCaptureDirectory,
  ): Promise<void> {
    let scanError: Error | undefined;
    try {
      await this.#validateDirectory(directory, path, stat);
      const entries = [...await this.#options.filesystem.readdir(path)].sort();
      if (!this.#pollIsActive()) throw new Error("CAPTURE_POLL_ABORTED");
      for (const entry of entries) {
        const child = this.#captureChildPath(root, path, entry);
        await this.#scanPath(root, child, channel, directory, entry);
      }
      await this.#validateDirectory(directory, path, stat);
    } catch (error) {
      scanError = captureReadError(error);
    }
    const closeError = await closeCaptureDirectory(directory);
    if (scanError) throw scanError;
    if (closeError) throw closeError;
  }

  #captureChildPath(root: string, path: string, entry: string): string {
    const child = resolve(path, entry);
    if (child !== join(path, entry) || (child !== root && !child.startsWith(`${root}/`))) {
      throw new Error("CAPTURE_PATH_ESCAPE");
    }
    return child;
  }

  async #validateDirectory(
    directory: NativeCaptureDirectory,
    path: string,
    expected: FileStat,
  ): Promise<void> {
    const opened = await directory.stat();
    if (!this.#pollIsActive()) throw new Error("CAPTURE_POLL_ABORTED");
    if (!opened.isDirectory() || !sameIdentity(opened, identityOf(expected))) {
      throw new Error("CAPTURE_PATH_CHANGED");
    }
    let current: FileStat;
    try {
      current = await this.#options.filesystem.lstat(path);
    } catch (error) {
      throw new Error("CAPTURE_PATH_CHANGED", { cause: error });
    }
    if (!this.#pollIsActive()) throw new Error("CAPTURE_POLL_ABORTED");
    if (current.isSymbolicLink()) throw new Error("CAPTURE_SYMLINK_REJECTED");
    if (!current.isDirectory() || !sameIdentity(current, identityOf(opened))) {
      throw new Error("CAPTURE_PATH_CHANGED");
    }
  }

  async #captureFile(
    path: string,
    channel: "hook" | "provider-state",
    before: FileStat,
    file: NativeCaptureFile,
  ): Promise<void> {
    let bytes: Uint8Array | undefined;
    let readError: Error | undefined;
    try {
      bytes = await this.#readCaptureFile(file, path, before);
    } catch (error) {
      readError = captureReadError(error);
    }
    const closeError = await closeCaptureFile(file);
    if (readError) throw readError;
    if (closeError) throw closeError;
    if (!this.#pollIsActive()) return;
    const key = `${channel}\u0000${path}`;
    const digest = digestValue(bytes!);
    if (this.#seenFiles.get(key) === digest) return;
    this.#seenFiles.set(key, digest);
    this.#lastChangeAt = Date.now();
    this.#evidence.ingest(Object.freeze({
      source: channel,
      pathDigest: digestValue(resolve(path)),
      bytes: bytes!,
    }));
  }

  async #openCaptureFile(path: string): Promise<NativeCaptureFile> {
    try {
      return await this.#options.filesystem.openReadOnlyNoFollow(path);
    } catch (error) {
      throw captureOpenError(error);
    }
  }

  async #openCaptureDirectory(path: string): Promise<NativeCaptureDirectory> {
    try {
      return await this.#options.filesystem.openDirectoryNoFollow(path);
    } catch (error) {
      throw captureOpenError(error);
    }
  }

  async #openChildFile(
    parent: NativeCaptureDirectory,
    name: string,
  ): Promise<NativeCaptureFile> {
    try {
      return await parent.openFileNoFollow(name);
    } catch (error) {
      throw captureOpenError(error);
    }
  }

  async #openChildDirectory(
    parent: NativeCaptureDirectory,
    name: string,
  ): Promise<NativeCaptureDirectory> {
    try {
      return await parent.openDirectoryNoFollow(name);
    } catch (error) {
      throw captureOpenError(error);
    }
  }

  async #readCaptureFile(
    file: NativeCaptureFile,
    path: string,
    before: FileStat,
  ): Promise<Uint8Array> {
    const opened = await file.stat();
    if (!this.#pollIsActive()) throw new Error("CAPTURE_POLL_ABORTED");
    if (!opened.isFile() || !sameIdentity(opened, identityOf(before))) {
      throw new Error("CAPTURE_PATH_CHANGED");
    }
    const bytes = bytesCopy(await file.readFile());
    if (!this.#pollIsActive()) throw new Error("CAPTURE_POLL_ABORTED");
    const afterRead = await file.stat();
    if (!afterRead.isFile() || !sameIdentity(afterRead, identityOf(opened))) {
      throw new Error("CAPTURE_PATH_CHANGED");
    }
    const after = await this.#options.filesystem.lstat(path);
    if (!this.#pollIsActive()) throw new Error("CAPTURE_POLL_ABORTED");
    if (after.isSymbolicLink()) throw new Error("CAPTURE_SYMLINK_REJECTED");
    if (!after.isFile() || !sameIdentity(after, identityOf(opened))) {
      throw new Error("CAPTURE_PATH_CHANGED");
    }
    return bytes;
  }

  async #stop(terminal: ProcessTerminal): Promise<void> {
    if (terminal.nativeRunId !== this.nativeRunId) {
      this.#finish();
      throw new Error("CAPTURE_TERMINAL_MISMATCH");
    }
    const deadline = Date.now() + this.#options.joinTimeoutMs;
    try {
      while (Date.now() <= deadline) {
        if (this.#fatalError !== undefined) throw this.#fatalError;
        await beforeDeadline(this.#poll(), deadline, "CAPTURE_JOIN_TIMEOUT");
        if (this.plan.kind === "event-bound-provider-path" && !this.#bindingApplied) {
          if (this.#outputClosed) throw new Error("CAPTURE_BINDING_MISSING");
        } else if (
          this.#outputClosed &&
          this.#boundPaths.every((path) => this.#seenBoundRoots.has(path)) &&
          Date.now() - this.#lastChangeAt >= this.#options.settleMs
        ) {
          this.#finish();
          return;
        }
        await delay(this.#options.pollIntervalMs);
      }
      throw new Error("CAPTURE_JOIN_TIMEOUT");
    } catch (error) {
      this.#finish();
      throw error;
    }
  }

  #fail(error: unknown): void {
    if (this.#finished || this.#fatalError !== undefined) return;
    this.#fatalError = error;
    this.#evidence.fail(error);
  }

  #pollIsActive(): boolean {
    return !this.#finished && !this.#pollingDisabled;
  }

  #finish(): void {
    if (this.#finished) return;
    this.#finished = true;
    this.#pollingDisabled = true;
    if (this.#timer) clearTimeout(this.#timer);
    this.#options.onFinished(this.nativeRunId);
  }
}

const DEFAULT_FILESYSTEM: NativeCaptureFilesystem = Object.freeze({
  lstat: async (path) => filesystem.lstat(path, { bigint: true }),
  readdir: async (path) => filesystem.readdir(path),
  openDirectoryNoFollow: async (path) => {
    const handle = await filesystem.open(
      path,
      filesystemConstants.O_RDONLY |
        filesystemConstants.O_DIRECTORY |
        filesystemConstants.O_NOFOLLOW,
    );
    return captureDirectory(
      handle.fd,
      async () => handle.stat({ bigint: true }),
      async () => handle.close(),
    );
  },
  openReadOnlyNoFollow: async (path) => {
    const handle = await filesystem.open(
      path,
      filesystemConstants.O_RDONLY |
        filesystemConstants.O_NOFOLLOW,
    );
    return Object.freeze({
      stat: async () => handle.stat({ bigint: true }),
      readFile: async () => handle.readFile(),
      close: async () => handle.close(),
    });
  },
});

export function createNativeCaptureSupervisor(input: Readonly<{
  filesystem?: Partial<NativeCaptureFilesystem>;
  pollIntervalMs?: number;
  settleMs?: number;
  joinTimeoutMs?: number;
}> = {}): NativeCaptureSupervisor {
  const observers = new Map<string, CaptureObserver>();
  const options = Object.freeze({
    filesystem: Object.freeze({ ...DEFAULT_FILESYSTEM, ...input.filesystem }),
    pollIntervalMs: input.pollIntervalMs ?? 20,
    settleMs: input.settleMs ?? 50,
    joinTimeoutMs: input.joinTimeoutMs ?? 2_000,
    onFinished(nativeRunId: string): void {
      observers.delete(nativeRunId);
    },
  });
  const observer = (nativeRunId: string): CaptureObserver => {
    const found = observers.get(nativeRunId);
    if (!found) throw new Error("CAPTURE_SESSION_NOT_FOUND");
    return found;
  };
  return Object.freeze({
    capture: Object.freeze({
      async start(
        startInput: Parameters<EvidenceCapturePort["start"]>[0],
      ): Promise<EvidenceCaptureSession> {
        if (!startInput.nativeRunId || observers.has(startInput.nativeRunId)) {
          throw new Error("CAPTURE_SESSION_INVALID");
        }
        const created = new CaptureObserver(
          startInput.nativeRunId,
          startInput.plan,
          startInput.evidence,
          options,
        );
        observers.set(startInput.nativeRunId, created);
        return created.session();
      },
    }),
    output: Object.freeze({
      publish(nativeRunId: string, frame: NativeProcessOutputFrame): void {
        const active = observer(nativeRunId);
        if (frame.kind === "evidence") active.publish(frame.bytes);
      },
      close(nativeRunId: string): void {
        observer(nativeRunId).closeOutput();
      },
      fail(nativeRunId: string, error: unknown): void {
        observer(nativeRunId).failOutput(error);
      },
    }),
    activeObserverCount(): number {
      return observers.size;
    },
  });
}
