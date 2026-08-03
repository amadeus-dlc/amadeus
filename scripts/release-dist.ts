#!/usr/bin/env bun

import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readSync,
  renameSync,
  rmSync,
  statfsSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { createReadStream, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import { discoverHarnessNames } from "./package.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TAR_BLOCK_SIZE = 512;
const MINIMUM_DISK_HEADROOM = 512 * 1024 * 1024;
const ARCHIVE_WARNING_BYTES = 1024 ** 3;
const ARCHIVE_REJECT_BYTES = Math.floor(1.8 * 1024 ** 3);
const MANIFEST_FIELDS = [
  "schema",
  "version",
  "tarball",
  "sha256",
  "sizeBytes",
  "harnesses",
  "fileCount",
] as const;
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export type DistAssetVersion = string & { readonly __brand: "DistAssetVersion" };

export interface DistAssetManifest {
  readonly schema: 1;
  readonly version: string;
  readonly tarball: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly harnesses: readonly string[];
  readonly fileCount: number;
}

export interface DistAssetBundle {
  readonly tarPath: string;
  readonly checksumPath: string;
  readonly manifestPath: string;
}

interface ArchiveEntry {
  readonly archivePath: string;
  readonly sourcePath: string | null;
  readonly type: "directory" | "file";
  readonly size: number;
}

export interface ArchiveInspection {
  readonly wrapper: string;
  readonly harnesses: readonly string[];
  readonly fileCount: number;
}

interface ParsedTarEntry {
  readonly path: string;
  readonly type: "directory" | "file";
  readonly size: number;
}

export type SelfCheckResult = { readonly kind: "ok" };

export function parseDistAssetVersion(
  raw: string,
): { readonly ok: true; readonly value: DistAssetVersion } | { readonly ok: false; readonly error: string } {
  if (raw.startsWith("v")) return { ok: false, error: "version must be a semver without a v prefix" };
  if (!VERSION_PATTERN.test(raw)) return { ok: false, error: "version must be a valid semver without path characters" };
  return { ok: true, value: raw as DistAssetVersion };
}

export function requiredDiskHeadroom(inputBytes: number): number {
  return Math.max(MINIMUM_DISK_HEADROOM, inputBytes * 3);
}

export function archiveSizeStatus(sizeBytes: number): "ok" | "warning" | "reject" {
  if (sizeBytes > ARCHIVE_REJECT_BYTES) return "reject";
  if (sizeBytes > ARCHIVE_WARNING_BYTES) return "warning";
  return "ok";
}

function compareNames(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function posixRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function assertSafeArchivePath(path: string): void {
  if (path.startsWith("/") || path.includes("\0")) throw new Error(`unsafe archive path: ${path}`);
  const segments = path.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`unsafe archive path: ${path}`);
  }
}

function assertAllowedPayloadPath(path: string): void {
  const segments = path.split("/");
  const forbidden = [".env", ".amadeus-clone-id", ".amadeus-sessions", "active-intent", "runtime-graph.json"];
  const found = segments.find((segment) => forbidden.includes(segment) || segment.startsWith(".amadeus-session"));
  if (found) throw new Error(`forbidden per-user or credential payload entry: ${path}`);
}

function collectTreeEntries(sourceRoot: string, archiveRoot: string): ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];
  const visit = (sourcePath: string, archivePath: string): void => {
    assertSafeArchivePath(archivePath);
    assertAllowedPayloadPath(archivePath);
    const stat = lstatSync(sourcePath);
    if (stat.isSymbolicLink()) throw new Error(`symlink entries are not allowed: ${posixRelative(sourceRoot, sourcePath)}`);
    if (stat.isDirectory()) {
      entries.push({ archivePath: `${archivePath}/`, sourcePath, type: "directory", size: 0 });
      for (const name of readdirSync(sourcePath).sort(compareNames)) visit(join(sourcePath, name), `${archivePath}/${name}`);
      return;
    }
    if (!stat.isFile()) throw new Error(`unsupported payload entry type: ${posixRelative(sourceRoot, sourcePath)}`);
    entries.push({ archivePath, sourcePath, type: "file", size: stat.size });
  };
  visit(sourceRoot, archiveRoot);
  return entries;
}

function splitUstarPath(path: string): { readonly name: string; readonly prefix: string } {
  if (Buffer.byteLength(path) <= 100) return { name: path, prefix: "" };
  for (let index = path.lastIndexOf("/"); index > 0; index = path.lastIndexOf("/", index - 1)) {
    const prefix = path.slice(0, index);
    const name = path.slice(index + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) return { name, prefix };
  }
  throw new Error(`archive path cannot be represented as ustar: ${path}`);
}

function writeString(header: Buffer, offset: number, length: number, value: string): void {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length > length) throw new Error(`ustar field is too long: ${value}`);
  bytes.copy(header, offset);
}

function octalField(value: number, length: number): string {
  const octal = value.toString(8);
  if (octal.length > length - 1) throw new Error(`ustar numeric field overflow: ${value}`);
  return `${octal.padStart(length - 1, "0")}\0`;
}

function tarHeader(entry: ArchiveEntry): Buffer {
  const header = Buffer.alloc(TAR_BLOCK_SIZE);
  const { name, prefix } = splitUstarPath(entry.archivePath);
  writeString(header, 0, 100, name);
  writeString(header, 100, 8, octalField(entry.type === "directory" ? 0o755 : 0o644, 8));
  writeString(header, 108, 8, octalField(0, 8));
  writeString(header, 116, 8, octalField(0, 8));
  writeString(header, 124, 12, octalField(entry.size, 12));
  writeString(header, 136, 12, octalField(0, 12));
  header.fill(0x20, 148, 156);
  writeString(header, 156, 1, entry.type === "directory" ? "5" : "0");
  writeString(header, 257, 6, "ustar\0");
  writeString(header, 263, 2, "00");
  writeString(header, 329, 8, octalField(0, 8));
  writeString(header, 337, 8, octalField(0, 8));
  writeString(header, 345, 155, prefix);
  const checksum = [...header].reduce((sum, byte) => sum + byte, 0);
  writeString(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

function copyFileIntoTar(sourcePath: string, tarFd: number, size: number): void {
  const sourceFd = openSync(sourcePath, "r");
  const chunk = Buffer.allocUnsafe(64 * 1024);
  let position = 0;
  try {
    while (position < size) {
      const bytesRead = readSync(sourceFd, chunk, 0, Math.min(chunk.length, size - position), position);
      if (bytesRead === 0) throw new Error(`unexpected EOF while archiving ${sourcePath}`);
      writeSync(tarFd, chunk, 0, bytesRead);
      position += bytesRead;
    }
  } finally {
    closeSync(sourceFd);
  }
  const padding = (TAR_BLOCK_SIZE - (size % TAR_BLOCK_SIZE)) % TAR_BLOCK_SIZE;
  if (padding > 0) writeSync(tarFd, Buffer.alloc(padding));
}

async function writeDeterministicTarGz(entries: readonly ArchiveEntry[], tarPath: string): Promise<void> {
  const rawTar = `${tarPath}.tmp.tar`;
  const tarFd = openSync(rawTar, "wx", 0o600);
  try {
    for (const entry of entries) {
      writeSync(tarFd, tarHeader(entry));
      if (entry.type === "file" && entry.sourcePath) copyFileIntoTar(entry.sourcePath, tarFd, entry.size);
    }
    writeSync(tarFd, Buffer.alloc(TAR_BLOCK_SIZE * 2));
  } finally {
    closeSync(tarFd);
  }
  try {
    await pipeline(createReadStream(rawTar), createGzip({ level: 9 }), createWriteStream(tarPath, { mode: 0o644, flags: "wx" }));
  } finally {
    rmSync(rawTar, { force: true });
  }
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function readTarString(header: Buffer, offset: number, length: number): string {
  const field = header.subarray(offset, offset + length);
  const end = field.indexOf(0);
  return field.subarray(0, end === -1 ? field.length : end).toString("utf8");
}

function readTarOctal(header: Buffer, offset: number, length: number): number {
  const raw = readTarString(header, offset, length).trim();
  if (!/^[0-7]+$/.test(raw)) throw new Error(`invalid ustar numeric field: ${raw}`);
  return Number.parseInt(raw, 8);
}

function verifyTarHeaderChecksum(header: Buffer): void {
  const expected = readTarOctal(header, 148, 8);
  const copy = Buffer.from(header);
  copy.fill(0x20, 148, 156);
  const actual = [...copy].reduce((sum, byte) => sum + byte, 0);
  if (actual !== expected) throw new Error(`invalid ustar header checksum: expected ${expected}, got ${actual}`);
}

function parseTarEntry(header: Buffer): ParsedTarEntry {
  verifyTarHeaderChecksum(header);
  const name = readTarString(header, 0, 100);
  const prefix = readTarString(header, 345, 155);
  const archivePath = prefix ? `${prefix}/${name}` : name;
  const path = archivePath.endsWith("/") ? archivePath.slice(0, -1) : archivePath;
  assertSafeArchivePath(path);
  const rawType = String.fromCharCode(header[156]);
  const type = rawType === "5" ? "directory" : rawType === "0" || rawType === "\0" ? "file" : null;
  if (!type) throw new Error(`unsupported archive entry type ${rawType}: ${archivePath}`);
  return { path, type, size: readTarOctal(header, 124, 12) };
}

function inspectRawTar(rawTar: string): ArchiveInspection {
  const fd = openSync(rawTar, "r");
  const fileSize = statSync(rawTar).size;
  const wrappers = new Set<string>();
  const harnesses = new Set<string>();
  let fileCount = 0;
  let position = 0;
  let zeroBlocks = 0;
  try {
    while (position + TAR_BLOCK_SIZE <= fileSize) {
      const header = Buffer.alloc(TAR_BLOCK_SIZE);
      readSync(fd, header, 0, TAR_BLOCK_SIZE, position);
      position += TAR_BLOCK_SIZE;
      if (header.every((byte) => byte === 0)) {
        zeroBlocks += 1;
        if (zeroBlocks === 2) break;
        continue;
      }
      zeroBlocks = 0;
      const entry = parseTarEntry(header);
      const segments = entry.path.split("/");
      wrappers.add(segments[0]);
      if (segments[1]) harnesses.add(segments[1]);
      if (entry.type === "file") fileCount += 1;
      position += Math.ceil(entry.size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
      if (position > fileSize) throw new Error(`archive entry exceeds tar boundary: ${entry.path}`);
    }
  } finally {
    closeSync(fd);
  }
  if (zeroBlocks < 2) throw new Error("archive is missing the two terminating zero blocks");
  if (wrappers.size !== 1) throw new Error(`archive must contain exactly one wrapper directory, got ${wrappers.size}`);
  return { wrapper: [...wrappers][0], harnesses: [...harnesses].sort(compareNames), fileCount };
}

export async function inspectDistArchive(tarPath: string): Promise<ArchiveInspection> {
  const scratch = mkdtempSync(join(tmpdir(), "release-dist-inspect-"));
  const rawTar = join(scratch, "payload.tar");
  try {
    await pipeline(createReadStream(tarPath), createGunzip(), createWriteStream(rawTar, { flags: "wx", mode: 0o600 }));
    return inspectRawTar(rawTar);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function parseManifest(path: string): DistAssetManifest {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("manifest must be a JSON object");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).join(",") !== MANIFEST_FIELDS.join(",")) throw new Error("manifest schema fields do not match BR-U1-3");
  if (!hasValidManifestValues(record)) {
    throw new Error("manifest contains invalid field values");
  }
  return record as unknown as DistAssetManifest;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function hasValidManifestText(record: Record<string, unknown>): boolean {
  if (typeof record.version !== "string") return false;
  return (
    parseDistAssetVersion(record.version).ok &&
    typeof record.tarball === "string" &&
    typeof record.sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(record.sha256)
  );
}

function hasValidHarnesses(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasValidManifestValues(record: Record<string, unknown>): boolean {
  return (
    record.schema === 1 &&
    hasValidManifestText(record) &&
    isNonNegativeSafeInteger(record.sizeBytes) &&
    hasValidHarnesses(record.harnesses) &&
    isNonNegativeSafeInteger(record.fileCount)
  );
}

function parseChecksumFile(path: string): Map<string, string> {
  const lines = readFileSync(path, "utf8").trimEnd().split("\n");
  if (lines.length !== 2) throw new Error(`SHA256SUMS must contain exactly two lines, got ${lines.length}`);
  const checksums = new Map<string, string>();
  for (const line of lines) {
    const match = /^([0-9a-f]{64}) {2}([^/]+)$/.exec(line);
    if (!match || checksums.has(match[2])) throw new Error(`invalid SHA256SUMS line: ${line}`);
    checksums.set(match[2], match[1]);
  }
  return checksums;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export async function verifyDistAssets(bundle: DistAssetBundle): Promise<SelfCheckResult> {
  try {
    const manifest = parseManifest(bundle.manifestPath);
    const tarball = basename(bundle.tarPath);
    const manifestName = basename(bundle.manifestPath);
    if (manifest.tarball !== tarball) throw new Error(`manifest tarball mismatch: ${manifest.tarball} != ${tarball}`);
    if (tarball !== `amadeus-dist-v${manifest.version}.tar.gz`) throw new Error(`tarball name does not match version ${manifest.version}`);
    if (manifestName !== `amadeus-dist-v${manifest.version}.manifest.json`) {
      throw new Error(`manifest filename does not match version ${manifest.version}`);
    }
    const checksums = parseChecksumFile(bundle.checksumPath);
    const tarDigest = await sha256File(bundle.tarPath);
    const manifestDigest = await sha256File(bundle.manifestPath);
    if (manifest.sha256 !== tarDigest) throw new Error("manifest tar digest mismatch");
    if (checksums.get(tarball) !== tarDigest) throw new Error("SHA256SUMS tar digest mismatch");
    if (checksums.get(manifestName) !== manifestDigest) throw new Error("SHA256SUMS manifest digest mismatch");
    if (manifest.sizeBytes !== statSync(bundle.tarPath).size) throw new Error("manifest sizeBytes mismatch");
    const archive = await inspectDistArchive(bundle.tarPath);
    if (archive.wrapper !== `amadeus-dist-v${manifest.version}`) throw new Error("archive wrapper mismatch");
    if (!sameStrings(archive.harnesses, manifest.harnesses)) {
      throw new Error(`manifest harnesses mismatch: expected ${archive.harnesses.join(",")}, got ${manifest.harnesses.join(",")}`);
    }
    if (archive.fileCount !== manifest.fileCount) {
      throw new Error(`manifest fileCount mismatch: expected ${archive.fileCount}, got ${manifest.fileCount}`);
    }
    return { kind: "ok" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`release-dist: self-check FAILED — ${detail}`, { cause: error });
  }
}

function discoverPayloadRoots(distRoot: string): string[] {
  if (!existsSync(distRoot) || !lstatSync(distRoot).isDirectory()) throw new Error(`dist root does not exist: ${distRoot}`);
  const harnesses = discoverHarnessNames();
  if (harnesses.length === 0) throw new Error("no harness manifests were discovered");
  for (const harness of harnesses) {
    const path = join(distRoot, harness);
    if (!existsSync(path) || !lstatSync(path).isDirectory()) throw new Error(`generated dist root is missing harness: ${harness}`);
  }
  return [...harnesses, ...(existsSync(join(distRoot, "plugins")) ? ["plugins"] : [])].sort(compareNames);
}

function availableDiskBytes(path: string): number {
  const stats = statfsSync(path);
  return stats.bavail * stats.bsize;
}

function ensureOutputAvailable(outputDir: string): void {
  if (!existsSync(outputDir)) return;
  if (!lstatSync(outputDir).isDirectory()) throw new Error(`output path is not a directory: ${outputDir}`);
  if (readdirSync(outputDir).length > 0) throw new Error(`output directory is not empty: ${outputDir}`);
}

export async function buildDistAssets(args: {
  readonly version: string;
  readonly distRoot: string;
  readonly outputDir: string;
}): Promise<DistAssetBundle> {
  const parsedVersion = parseDistAssetVersion(args.version);
  if (!parsedVersion.ok) throw new Error(parsedVersion.error);
  ensureOutputAvailable(args.outputDir);
  const outputParent = dirname(args.outputDir);
  mkdirSync(outputParent, { recursive: true });
  const payloadRoots = discoverPayloadRoots(args.distRoot);
  const wrapper = `amadeus-dist-v${parsedVersion.value}`;
  const entries: ArchiveEntry[] = [{ archivePath: `${wrapper}/`, sourcePath: null, type: "directory", size: 0 }];
  for (const root of payloadRoots) entries.push(...collectTreeEntries(join(args.distRoot, root), `${wrapper}/${root}`));
  entries.sort((left, right) => compareNames(left.archivePath, right.archivePath));
  const inputBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const requiredBytes = requiredDiskHeadroom(inputBytes);
  const availableBytes = availableDiskBytes(outputParent);
  if (availableBytes < requiredBytes) {
    throw new Error(`insufficient disk headroom: required ${requiredBytes} bytes, available ${availableBytes} bytes`);
  }

  const stagingDir = mkdtempSync(join(outputParent, ".release-dist-"));
  const tarball = `${wrapper}.tar.gz`;
  const manifestName = `${wrapper}.manifest.json`;
  const stagingBundle: DistAssetBundle = {
    tarPath: join(stagingDir, tarball),
    manifestPath: join(stagingDir, manifestName),
    checksumPath: join(stagingDir, "SHA256SUMS"),
  };
  try {
    await writeDeterministicTarGz(entries, stagingBundle.tarPath);
    const sizeBytes = statSync(stagingBundle.tarPath).size;
    const sizeStatus = archiveSizeStatus(sizeBytes);
    if (sizeStatus === "reject") throw new Error(`archive exceeds the 1.8 GiB fail-closed threshold: ${sizeBytes} bytes`);
    if (sizeStatus === "warning") console.warn(`release-dist: archive exceeds 1 GiB: ${sizeBytes} bytes`);
    const tarDigest = await sha256File(stagingBundle.tarPath);
    const archive = await inspectDistArchive(stagingBundle.tarPath);
    const manifest: DistAssetManifest = {
      schema: 1,
      version: parsedVersion.value,
      tarball,
      sha256: tarDigest,
      sizeBytes,
      harnesses: archive.harnesses,
      fileCount: archive.fileCount,
    };
    writeFileSync(stagingBundle.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644, flag: "wx" });
    const manifestDigest = await sha256File(stagingBundle.manifestPath);
    writeFileSync(
      stagingBundle.checksumPath,
      `${tarDigest}  ${tarball}\n${manifestDigest}  ${manifestName}\n`,
      { mode: 0o644, flag: "wx" },
    );
    await verifyDistAssets(stagingBundle);
    if (existsSync(args.outputDir)) rmSync(args.outputDir, { recursive: true });
    renameSync(stagingDir, args.outputDir);
    return {
      tarPath: join(args.outputDir, tarball),
      manifestPath: join(args.outputDir, manifestName),
      checksumPath: join(args.outputDir, "SHA256SUMS"),
    };
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

export interface ReleaseDistCliEnvironment {
  readonly distRoot: string;
  readonly outputDir: string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

const DEFAULT_CLI_ENVIRONMENT: ReleaseDistCliEnvironment = {
  distRoot: join(REPO_ROOT, "dist"),
  outputDir: join(REPO_ROOT, "release-assets"),
  stdout: console.log,
  stderr: console.error,
};

export async function runReleaseDistCli(
  argv: readonly string[],
  environment: ReleaseDistCliEnvironment = DEFAULT_CLI_ENVIRONMENT,
): Promise<number> {
  try {
    if (argv.length !== 2 || argv[0] !== "--version") throw new Error("usage: release-dist.ts --version <semver>");
    const bundle = await buildDistAssets({ version: argv[1], distRoot: environment.distRoot, outputDir: environment.outputDir });
    const manifest = parseManifest(bundle.manifestPath);
    environment.stdout(
      `release-dist: self-check OK — version=${manifest.version} fileCount=${manifest.fileCount} harnesses=${manifest.harnesses.join(",")} sha256=${manifest.sha256}`,
    );
    return 0;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    environment.stderr(detail.startsWith("release-dist:") ? detail : `release-dist: ${detail}`);
    return 1;
  }
}

if (import.meta.main) process.exit(await runReleaseDistCli(process.argv.slice(2)));
