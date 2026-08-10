// control-byte.ts — the byte-class predicate behind the control-byte gate (#2814).
//
// WHAT THIS IS. Pure functions over bytes: no filesystem, no process, no
// configuration. A raw C0 control byte inside a tracked source file is
// structurally invisible — `git diff` stops rendering it past 8KB and the
// interactive `grep` treats the file as binary and reports nothing — so review
// cannot catch it. Detection has to be mechanical, and mechanical detection
// starts with one predicate everything else shares.
//
// WHERE THE BYTE CLASSES COME FROM.
//   - `isUtf8` (packages/framework/core/tools/amadeus-migrate.ts:477) already
//     rejects a buffer on `buffer.includes(0)`: a NUL byte means the payload is
//     not text. This gate generalises that judgement from NUL to the whole C0
//     block plus DEL.
//   - `CONTROL_CHARS` (packages/framework/core/tools/amadeus-lib.ts:4298) is the
//     repository's existing statement of which characters are illegitimate:
//     \x00-\x08, \x0B-\x1F and \x7F, i.e. C0 minus TAB, LF, CR.
//
// THE INTENTIONAL DIVERGENCE. `CONTROL_CHARS` keeps CR (\x0D) in the stripped
// set because it sanitises a SINGLE-LINE audit display string, where a carriage
// return would corrupt the record frame. This gate scans whole files, and CRLF
// line endings are legitimate file content — a Windows-authored file is not a
// defect. So CR is EXCLUDED here alongside TAB and LF. Same byte, different
// domain: display-line sanitisation versus file-content admissibility.
//
// NOTATION. Control bytes appear in this file only as escape notation
// (\x00-style) and numeric literals, never as raw bytes — a gate that trips on
// its own source would be unusable.

// The bytes a tracked file may not contain: everything below \x20 except TAB
// (\x09), LF (\x0A) and CR (\x0D), plus DEL (\x7F).
export function isForbiddenControlByte(byte: number): boolean {
  if (byte === 0x09 || byte === 0x0a || byte === 0x0d) return false;
  return byte < 0x20 || byte === 0x7f;
}

// The FIRST violating byte in the buffer, or null when the buffer is clean.
// First-match is deliberate: one diagnostic per file is enough to act on, and
// scanning stops as soon as the verdict is decided.
export function findControlByte(buffer: Uint8Array): { offset: number; byte: number } | null {
  for (let offset = 0; offset < buffer.length; offset += 1) {
    const byte = buffer[offset] as number;
    if (isForbiddenControlByte(byte)) return { offset, byte };
  }
  return null;
}

// One offending file: the tracked path, and where the first forbidden byte sits.
export type Violation = {
  readonly path: string;
  readonly offset: number;
  readonly byte: number;
};

// The gate's whole verdict. Every arm is reported, never summed into a single
// boolean: a stale allowlist entry and an unreadable file are distinct failures
// from a control byte, and collapsing them would hide which one happened.
export type GateResult = {
  readonly scannedCount: number;
  readonly violations: readonly Violation[];
  readonly staleAllowlist: readonly string[];
  readonly readErrors: readonly { readonly path: string; readonly message: string }[];
};
