import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { Result } from "../shared/result.ts";

export type IoError = {
  readonly type: "io";
  readonly detail: string;
  // Optional so existing IoError literals (this port and ApplyWrite, which
  // reuses this type) keep compiling unchanged; true only for ENOENT — lets
  // callers distinguish "absent" from a real I/O failure.
  readonly notFound?: boolean;
};

export namespace IoError {
  export function of(detail: string, notFound = false): IoError {
    return Object.freeze({ type: "io", detail, notFound });
  }
}

Object.freeze(IoError);

export type FsRead = {
  readText(path: string): Promise<Result<string, IoError>>;
};

export type FsWrite = {
  writeText(path: string, content: string): Promise<Result<void, IoError>>;
};

// REL-F01/SEC-F03: TmpWrite can only address paths under its own mkdtemp root —
// it has no way to receive or resolve a caller-supplied absolute target path.
export type TmpWrite = {
  readonly root: string;
  writeFile(relPath: string, data: Uint8Array): Promise<Result<void, IoError>>;
  writeStream(relPath: string, stream: ReadableStream<Uint8Array>): Promise<Result<void, IoError>>;
  mkdir(relPath: string): Promise<Result<void, IoError>>;
  remove(): Promise<void>;
};

export function createFsRead(): FsRead {
  return Object.freeze({
    async readText(path: string): Promise<Result<string, IoError>> {
      try {
        return Result.ok(await readFile(path, "utf8"));
      } catch (cause) {
        return Result.err(IoError.of(`could not read ${path}: ${String(cause)}`, isEnoent(cause)));
      }
    },
  });
}

function isEnoent(cause: unknown): boolean {
  return cause instanceof Error && "code" in cause && (cause as { code?: string }).code === "ENOENT";
}

export function createFsWrite(): FsWrite {
  return Object.freeze({
    async writeText(path: string, content: string): Promise<Result<void, IoError>> {
      try {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, "utf8");
        return Result.ok(undefined);
      } catch (cause) {
        return Result.err(IoError.of(`could not write ${path}: ${String(cause)}`));
      }
    },
  });
}

export async function createTmpWrite(prefix: string): Promise<Result<TmpWrite, IoError>> {
  let root: string;
  try {
    root = await mkdtemp(join(tmpdir(), prefix));
  } catch (cause) {
    return Result.err(IoError.of(`could not create temp directory: ${String(cause)}`));
  }

  function resolveUnderRoot(relPath: string): string {
    const target = resolve(root, relPath);
    if (target !== root && !target.startsWith(`${root}/`)) {
      throw new Error(`path escapes temp root: ${relPath}`);
    }
    return target;
  }

  return Result.ok(
    Object.freeze({
      root,
      async writeFile(relPath: string, data: Uint8Array): Promise<Result<void, IoError>> {
        try {
          const target = resolveUnderRoot(relPath);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, data);
          return Result.ok(undefined);
        } catch (cause) {
          return Result.err(IoError.of(`could not write ${relPath} under temp root: ${String(cause)}`));
        }
      },
      async writeStream(relPath: string, stream: ReadableStream<Uint8Array>): Promise<Result<void, IoError>> {
        try {
          const target = resolveUnderRoot(relPath);
          await mkdir(dirname(target), { recursive: true });
          // Bridges the DOM ReadableStream (from fetch's Response.body) to Node's
          // own stream/web type, which is structurally identical but a distinct
          // nominal type as far as tsc is concerned.
          await pipeline(Readable.fromWeb(stream as unknown as NodeWebReadableStream<Uint8Array>), createWriteStream(target));
          return Result.ok(undefined);
        } catch (cause) {
          return Result.err(IoError.of(`could not stream ${relPath} under temp root: ${String(cause)}`));
        }
      },
      async mkdir(relPath: string): Promise<Result<void, IoError>> {
        try {
          await mkdir(resolveUnderRoot(relPath), { recursive: true });
          return Result.ok(undefined);
        } catch (cause) {
          return Result.err(IoError.of(`could not create directory ${relPath} under temp root: ${String(cause)}`));
        }
      },
      async remove(): Promise<void> {
        await rm(root, { recursive: true, force: true });
      },
    }),
  );
}
