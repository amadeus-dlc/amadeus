// covers: domain:setup-timestamps
// size: small
//
// Timestamps.of() — {iso, token} pair from a single Date read (REL-F05/NFR-004).

import { describe, expect, test } from "bun:test";
import { Timestamps } from "../../packages/setup/src/shared/timestamps.ts";

describe("Timestamps.of", () => {
  test("returns the extended ISO 8601 form unmodified", () => {
    const now = new Date("2026-07-08T12:00:00.000Z");
    expect(Timestamps.of(now).iso).toBe("2026-07-08T12:00:00.000Z");
  });

  test("returns a basic-format token derived from the same instant", () => {
    const now = new Date("2026-07-08T12:00:00.000Z");
    expect(Timestamps.of(now).token).toBe("20260708T120000Z");
  });

  test("NFR-004: token contains none of the Windows-reserved filename characters", () => {
    const { token } = Timestamps.of(new Date("2026-01-02T03:04:05.678Z"));
    expect(token).not.toMatch(/[:*?"<>|]/);
  });

  test("edge case: iso and token always describe the same instant", () => {
    const now = new Date();
    const { iso, token } = Timestamps.of(now);
    const isoBasic = iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    expect(token).toBe(isoBasic);
  });

  test("edge case: sub-second precision is dropped from the token", () => {
    const { token } = Timestamps.of(new Date("2026-07-08T12:00:00.999Z"));
    expect(token).toBe("20260708T120000Z");
  });
});
