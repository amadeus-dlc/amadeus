import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type ContainedFileFailureReason =
  | "not-readable"
  | "no-nofollow"
  | "symlink"
  | "outside-root"
  | "not-regular"
  | "too-large"
  | "changed-before-open"
  | "changed-during-read"
  | "empty";

export type ContainedFileReadOutcome =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "text"; text: string }>
  | Readonly<{ kind: "failure"; reason: ContainedFileFailureReason }>;

export type ContainedFileReadHooks = Readonly<{
  beforeOpen?: (path: string) => void;
  beforeRead?: (path: string) => void;
}>;

export type ContainedFileReadInput = Readonly<{
  rootDir: string;
  path: string;
  maxBytes: number;
  allowEmpty?: boolean;
  hooks?: ContainedFileReadHooks;
}>;

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function contained(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

type ResolvedCandidate =
  | Readonly<{
      kind: "candidate";
      path: string;
      expected: Readonly<{ dev: number; ino: number }>;
    }>
  | Exclude<ContainedFileReadOutcome, Readonly<{ kind: "text"; text: string }>>;

function resolveCandidate(input: ContainedFileReadInput): ResolvedCandidate {
  let rootReal: string;
  try {
    rootReal = realpathSync(input.rootDir);
  } catch {
    return { kind: "failure", reason: "not-readable" };
  }
  const candidate = isAbsolute(input.path)
    ? input.path
    : resolve(rootReal, input.path);

  let expected: Readonly<{ dev: number; ino: number }>;
  try {
    const initial = lstatSync(candidate);
    if (initial.isSymbolicLink()) return { kind: "failure", reason: "symlink" };
    expected = { dev: initial.dev, ino: initial.ino };
  } catch (error) {
    return isEnoent(error)
      ? { kind: "absent" }
      : { kind: "failure", reason: "not-readable" };
  }

  try {
    if (!contained(rootReal, realpathSync(candidate))) {
      return { kind: "failure", reason: "outside-root" };
    }
  } catch {
    return { kind: "failure", reason: "not-readable" };
  }
  return { kind: "candidate", path: candidate, expected };
}

function openCandidate(candidate: string): number | ContainedFileReadOutcome {
  const noFollow = fsConstants.O_NOFOLLOW as number | undefined;
  if (typeof noFollow !== "number") {
    return { kind: "failure", reason: "no-nofollow" };
  }

  try {
    return openSync(candidate, fsConstants.O_RDONLY | noFollow);
  } catch {
    return { kind: "failure", reason: "changed-before-open" };
  }
}

function readBounded(fd: number, maxBytes: number): Buffer | null {
  const buffer = Buffer.alloc(maxBytes + 1);
  let total = 0;
  while (total < buffer.length) {
    const bytes = readSync(fd, buffer, total, buffer.length - total, total);
    if (bytes === 0) break;
    total += bytes;
  }
  return total > maxBytes ? null : buffer.subarray(0, total);
}

function descriptorChanged(start: Stats, end: Stats): boolean {
  return (
    end.dev !== start.dev ||
    end.ino !== start.ino ||
    end.size !== start.size ||
    end.mtimeMs !== start.mtimeMs
  );
}

function readVerifiedDescriptor(
  fd: number,
  candidate: Extract<ResolvedCandidate, { kind: "candidate" }>,
  input: ContainedFileReadInput,
): ContainedFileReadOutcome {
  const start = fstatSync(fd);
  if (start.dev !== candidate.expected.dev || start.ino !== candidate.expected.ino) {
    return { kind: "failure", reason: "changed-before-open" };
  }
  if (!start.isFile()) return { kind: "failure", reason: "not-regular" };
  if (start.size > input.maxBytes) {
    return { kind: "failure", reason: "too-large" };
  }

  input.hooks?.beforeRead?.(candidate.path);
  const buffer = readBounded(fd, input.maxBytes);
  if (buffer === null) return { kind: "failure", reason: "too-large" };

  if (descriptorChanged(start, fstatSync(fd))) {
    return { kind: "failure", reason: "changed-during-read" };
  }
  if (buffer.length === 0 && input.allowEmpty === false) {
    return { kind: "failure", reason: "empty" };
  }
  return { kind: "text", text: buffer.toString("utf-8") };
}

export function readContainedFile(
  input: ContainedFileReadInput,
): ContainedFileReadOutcome {
  const candidate = resolveCandidate(input);
  if (candidate.kind !== "candidate") return candidate;

  input.hooks?.beforeOpen?.(candidate.path);
  const opened = openCandidate(candidate.path);
  if (typeof opened !== "number") return opened;

  try {
    return readVerifiedDescriptor(opened, candidate, input);
  } catch {
    return { kind: "failure", reason: "not-readable" };
  } finally {
    closeSync(opened);
  }
}
