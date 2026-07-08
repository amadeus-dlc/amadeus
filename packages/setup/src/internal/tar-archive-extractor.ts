import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { join, sep } from "node:path";
import type { TmpWrite } from "../ports/fsops.ts";
import { FetchError } from "../domain/payload.ts";
import { Result } from "../shared/result.ts";

// --- tar.gz extraction (BR-F10, SEC-F01) ---------------------------------
//
// Minimal streaming ustar reader with PAX ('x') and GNU longname ('L') support
// — the subset that `git archive` (which codeload calls internally) actually
// emits for long paths. General tar-format compatibility is a non-goal
// (tech-stack-decisions.md). Decompression and parsing both run as a 512-byte
// block state machine over the gunzip stream so the whole archive never sits
// in memory at once (performance-design.md).
//
// No dependency on Http or retry logic: this module only knows how to turn an
// already-downloaded archive file into a validated extracted tree, so it is
// independently testable from the fetch/retry concern in modules/fetcher.ts.

export const EXTRACT_RELATIVE_DIR = "extracted";

const BLOCK_SIZE = 512;

declare const safePathBrand: unique symbol;
// SafePath is local to this module: only validateEntry() can mint one, so a
// write call can never reach the filesystem with an unvalidated tar entry name.
type SafePath = string & { readonly [safePathBrand]: "SafePath" };

type TarHeader = { readonly name: string; readonly size: number; readonly typeflag: string };
type PendingFile = { readonly path: SafePath; remaining: number; readonly chunks: Buffer[] };

export async function extractTarGz(archivePath: string, extractDir: string, tmpWrite: TmpWrite): Promise<Result<void, FetchError>> {
  const gunzip = createReadStream(archivePath).pipe(createGunzip());

  let carry = Buffer.alloc(0);
  let pendingLongName: string | null = null;
  let current: PendingFile | null = null;

  try {
    for await (const chunk of gunzip) {
      const bufferChunk = Buffer.from(chunk as Uint8Array);
      carry = carry.length > 0 ? Buffer.concat([carry, bufferChunk]) : bufferChunk;
      const result = await drain(false);
      if (result) return result;
    }
    const result = await drain(true);
    if (result) return result;
  } catch (cause) {
    return Result.err(FetchError.payloadInvalid(`archive is not valid gzip/tar: ${String(cause)}`));
  }
  return Result.ok(undefined);

  async function drain(final: boolean): Promise<Result<void, FetchError> | null> {
    for (;;) {
      if (current) {
        const take = Math.min(current.remaining, carry.length);
        if (take > 0) {
          current.chunks.push(carry.subarray(0, take));
          carry = carry.subarray(take);
          current.remaining -= take;
        }
        if (current.remaining > 0) {
          if (final) return Result.err(FetchError.payloadInvalid("truncated tar entry"));
          return null;
        }
        const dataLen = current.chunks.reduce((n, b) => n + b.length, 0);
        const pad = paddingFor(dataLen);
        if (carry.length < pad) {
          if (final) return Result.err(FetchError.payloadInvalid("truncated tar padding"));
          return null;
        }
        carry = carry.subarray(pad);
        const written = await tmpWrite.writeFile(current.path, Buffer.concat(current.chunks));
        if (written.type === "err") {
          return Result.err(FetchError.payloadInvalid(`could not write extracted file: ${written.error.detail}`));
        }
        current = null;
        continue;
      }

      if (carry.length < BLOCK_SIZE) {
        if (final && carry.length > 0) return Result.err(FetchError.payloadInvalid("truncated tar header"));
        return null;
      }

      const block = carry.subarray(0, BLOCK_SIZE);
      carry = carry.subarray(BLOCK_SIZE);

      if (isZeroBlock(block)) continue; // end-of-archive marker block(s)

      const header = parseHeader(block);
      if (!header) return Result.err(FetchError.payloadInvalid("malformed tar header"));

      if (header.typeflag === "x" || header.typeflag === "g") {
        const pad = paddingFor(header.size);
        if (carry.length < header.size + pad) {
          if (final) return Result.err(FetchError.payloadInvalid("truncated PAX header"));
          return null;
        }
        const paxData = carry.subarray(0, header.size);
        carry = carry.subarray(header.size + pad);
        if (header.typeflag === "x") pendingLongName = parsePaxPath(paxData) ?? pendingLongName;
        continue;
      }

      if (header.typeflag === "L") {
        const pad = paddingFor(header.size);
        if (carry.length < header.size + pad) {
          if (final) return Result.err(FetchError.payloadInvalid("truncated GNU long-name header"));
          return null;
        }
        pendingLongName = carry.subarray(0, header.size).toString("utf8").replace(/\0+$/, "");
        carry = carry.subarray(header.size + pad);
        continue;
      }

      const rawName = pendingLongName ?? header.name;
      pendingLongName = null;

      if (header.typeflag === "5" || rawName.endsWith("/")) {
        const validated = validateEntry(rawName, extractDir);
        if (validated.type === "err") return validated;
        const dirResult = await tmpWrite.mkdir(validated.value);
        if (dirResult.type === "err") {
          return Result.err(FetchError.payloadInvalid(`could not create directory: ${dirResult.error.detail}`));
        }
        continue;
      }

      if (header.typeflag !== "0" && header.typeflag !== "\0") {
        // SEC-F01: symlink/hardlink/device/fifo/etc are rejected outright.
        return Result.err(FetchError.payloadInvalid(`unsupported tar entry type "${header.typeflag}" for ${rawName}`));
      }

      const validated = validateEntry(rawName, extractDir);
      if (validated.type === "err") return validated;

      if (header.size === 0) {
        const written = await tmpWrite.writeFile(validated.value, Buffer.alloc(0));
        if (written.type === "err") {
          return Result.err(FetchError.payloadInvalid(`could not write extracted file: ${written.error.detail}`));
        }
        continue;
      }
      current = { path: validated.value, remaining: header.size, chunks: [] };
    }
  }
}

// SEC-F01: reject absolute paths and any traversal outside extractDir. Returns
// the path relative to tmpWrite's own root (extractDir lives under it), which
// is the only form the TmpWrite port accepts.
function validateEntry(rawName: string, extractDir: string): Result<SafePath, FetchError> {
  if (rawName.length === 0) {
    return Result.err(FetchError.payloadInvalid("tar entry has an empty name"));
  }
  if (isAbsolutePath(rawName)) {
    return Result.err(FetchError.payloadInvalid(`tar entry has an absolute path: ${rawName}`));
  }
  const relative = rawName.replace(/\/+$/, "");
  const resolved = join(extractDir, relative);
  if (resolved !== extractDir && !resolved.startsWith(`${extractDir}${sep}`)) {
    return Result.err(FetchError.payloadInvalid(`tar entry escapes the extraction root: ${rawName}`));
  }
  return Result.ok(join(EXTRACT_RELATIVE_DIR, relative) as SafePath);
}

function isAbsolutePath(name: string): boolean {
  return name.startsWith("/") || name.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(name);
}

function parseHeader(block: Buffer): TarHeader | null {
  const name = readCString(block, 0, 100);
  const sizeRaw = readCString(block, 124, 12);
  const typeflagByte = block[156] ?? 0;
  const prefix = readCString(block, 345, 155);
  const size = parseOctal(sizeRaw);
  if (size === null) return null;
  const fullName = prefix ? `${prefix}/${name}` : name;
  const typeflag = typeflagByte === 0 ? "\0" : String.fromCharCode(typeflagByte);
  return { name: fullName, size, typeflag };
}

function readCString(block: Buffer, offset: number, length: number): string {
  const slice = block.subarray(offset, offset + length);
  const zeroIdx = slice.indexOf(0);
  const trimmed = zeroIdx === -1 ? slice : slice.subarray(0, zeroIdx);
  return trimmed.toString("utf8");
}

function parseOctal(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 0;
  if (!/^[0-7]+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 8);
}

function isZeroBlock(block: Buffer): boolean {
  return block.every((byte) => byte === 0);
}

function paddingFor(dataLen: number): number {
  const remainder = dataLen % BLOCK_SIZE;
  return remainder === 0 ? 0 : BLOCK_SIZE - remainder;
}

// PAX extended header records: "<len> <key>=<value>\n", len counts itself + the
// trailing newline. Returns the "path" record's value, if present.
function parsePaxPath(data: Buffer): string | null {
  let offset = 0;
  while (offset < data.length) {
    const spaceIdx = data.indexOf(0x20, offset);
    if (spaceIdx === -1) break;
    const lenStr = data.subarray(offset, spaceIdx).toString("utf8");
    const len = Number.parseInt(lenStr, 10);
    if (!Number.isFinite(len) || len <= 0) break;
    const record = data.subarray(offset, offset + len).toString("utf8");
    const eq = record.indexOf("=");
    if (eq !== -1) {
      const key = record.slice(lenStr.length + 1, eq);
      if (key === "path") return record.slice(eq + 1).replace(/\n$/, "");
    }
    offset += len;
  }
  return null;
}
