// REL-F05: a single generator for the {iso, token} pair, so the two
// representations of "the same instant" — Manifest.installedAt and the backup
// filename token — can never be derived from two separate Date reads.
export type TimestampPair = {
  readonly iso: string;
  readonly token: string;
};

export namespace Timestamps {
  export function of(now: Date): TimestampPair {
    const iso = now.toISOString();
    // Basic ISO 8601 (no separators), safe in Windows NTFS filenames
    // (`: * ? " < > |` are reserved there). Strips '-', ':' and sub-second digits,
    // e.g. "2026-07-08T12:00:00.000Z" -> "20260708T120000Z".
    const token = iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    return Object.freeze({ iso, token });
  }
}

Object.freeze(Timestamps);
