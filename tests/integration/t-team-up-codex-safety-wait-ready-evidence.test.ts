// @test-size medium
import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSafetyWaitReadyEvidence,
  safetyWaitReadyPath,
  writeSafetyWaitReadyEvidence,
} from "../../packages/framework/core/tools/team-up-codex-safety-wait.ts";

describe("team-up Codex safety-wait ready evidence", () => {
  test("publishes exact JSON atomically and removes its temporary file", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-safety-wait-ready-"));
    const runRecord = join(root, "run-001");
    const evidence = createSafetyWaitReadyEvidence("run-001", "e3", 1234);
    const readyPath = safetyWaitReadyPath(runRecord, evidence.role);
    const tempPath = `${readyPath}.${evidence.pid}.tmp`;
    mkdirSync(join(runRecord, "members", "engineer-3"), { recursive: true });

    try {
      writeSafetyWaitReadyEvidence(runRecord, evidence);

      expect(readFileSync(readyPath, "utf8")).toBe(`${JSON.stringify(evidence)}\n`);
      expect(existsSync(tempPath)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
