// Minimal ustar archive builder used only by setup-fetcher tests. Produces
// spec-correct ustar headers (including the prefix/name split for long paths)
// so the tests exercise the same wire format codeload actually emits, without
// needing network access to fetch a real archive.

import { gzipSync } from "node:zlib";

const BLOCK_SIZE = 512;

export type TarFixtureEntry =
  | { readonly type: "file"; readonly name: string; readonly content: Buffer }
  | { readonly type: "dir"; readonly name: string }
  | { readonly type: "symlink"; readonly name: string; readonly linkname: string }
  | { readonly type: "hardlink"; readonly name: string; readonly linkname: string }
  // A PAX extended header ('x') carrying a "path" record for the entry that
  // immediately follows it. Used to reproduce issue #678: when the header
  // block lands right at a gunzip output-chunk boundary, the record body
  // arrives in the next chunk.
  | { readonly type: "pax-longname"; readonly longName: string }
  // A GNU longname header ('L') for the entry that immediately follows it.
  | { readonly type: "gnu-longname"; readonly longName: string };

const TYPEFLAG: Record<"file" | "dir" | "symlink" | "hardlink", string> = {
  file: "0",
  dir: "5",
  symlink: "2",
  hardlink: "1",
};

export function buildTar(entries: readonly TarFixtureEntry[]): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    if (entry.type === "dir") {
      const name = entry.name.endsWith("/") ? entry.name : `${entry.name}/`;
      parts.push(header(name, 0, TYPEFLAG.dir));
      continue;
    }
    if (entry.type === "symlink" || entry.type === "hardlink") {
      parts.push(header(entry.name, 0, TYPEFLAG[entry.type], entry.linkname));
      continue;
    }
    if (entry.type === "pax-longname") {
      const record = Buffer.from(`path=${entry.longName}\n`);
      // PAX record length counts itself (the "<len> " prefix) + the record text;
      // grow len until it is self-consistent, per the PAX spec.
      let len = record.length + 2;
      while (String(len).length + 1 + record.length !== len) len = String(len).length + 1 + record.length;
      const body = Buffer.from(`${len} path=${entry.longName}\n`);
      parts.push(header("./PaxHeaders/entry", body.length, "x"));
      parts.push(body);
      const pad = paddingFor(body.length);
      if (pad > 0) parts.push(Buffer.alloc(pad));
      continue;
    }
    if (entry.type === "gnu-longname") {
      const body = Buffer.from(`${entry.longName}\0`, "utf8");
      parts.push(header("././@LongLink", body.length, "L"));
      parts.push(body);
      const pad = paddingFor(body.length);
      if (pad > 0) parts.push(Buffer.alloc(pad));
      continue;
    }
    parts.push(header(entry.name, entry.content.length, TYPEFLAG.file));
    parts.push(entry.content);
    const pad = paddingFor(entry.content.length);
    if (pad > 0) parts.push(Buffer.alloc(pad));
  }
  parts.push(Buffer.alloc(BLOCK_SIZE * 2)); // end-of-archive marker
  return Buffer.concat(parts);
}

export function buildTarGz(entries: readonly TarFixtureEntry[]): Buffer {
  return gzipSync(buildTar(entries));
}

function header(name: string, size: number, typeflag: string, linkname = ""): Buffer {
  const { prefix, name: shortName } = splitUstarName(name);
  const block = Buffer.alloc(BLOCK_SIZE);
  block.write(shortName, 0, "utf8");
  writeOctal(block, 100, 8, 0o644);
  writeOctal(block, 108, 8, 0);
  writeOctal(block, 116, 8, 0);
  writeOctal(block, 124, 12, size);
  writeOctal(block, 136, 12, 0);
  block.write("        ", 148, "ascii"); // checksum placeholder (8 spaces) for the sum below
  block.write(typeflag, 156, "ascii");
  block.write(linkname, 157, "utf8");
  block.write("ustar\0", 257, "ascii");
  block.write("00", 263, "ascii");
  block.write(prefix, 345, "utf8");

  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  return block;
}

function writeOctal(block: Buffer, offset: number, length: number, value: number): void {
  block.write(value.toString(8).padStart(length - 1, "0"), offset, length - 1, "ascii");
}

function paddingFor(dataLen: number): number {
  const remainder = dataLen % BLOCK_SIZE;
  return remainder === 0 ? 0 : BLOCK_SIZE - remainder;
}

function splitUstarName(name: string): { prefix: string; name: string } {
  if (name.length <= 100) return { prefix: "", name };
  for (let i = name.indexOf("/"); i !== -1; i = name.indexOf("/", i + 1)) {
    const prefix = name.slice(0, i);
    const rest = name.slice(i + 1);
    if (rest.length <= 100 && prefix.length <= 155) return { prefix, name: rest };
  }
  throw new Error(`test fixture name too long for ustar without PAX: ${name}`);
}
