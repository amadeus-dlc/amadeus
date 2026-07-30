import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "packages/framework/core/tools/team-up.sh");

function runLib(
  snippet: string,
  values: Record<string, string> = {},
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(
    [
      "bash",
      "-c",
      `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"; ${snippet}`,
      "_",
      TEAM_UP,
    ],
    {
      cwd: ROOT,
      env: { ...process.env, ...values },
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

describe("team-up member readiness payload (Issue #1663)", () => {
  test("binds evidence to the exact run, member, and stage", () => {
    const result = runLib(
      'member_readiness_payload "$EVIDENCE_RUN" "$EVIDENCE_MEMBER" "$EVIDENCE_STAGE"',
      {
        EVIDENCE_RUN: "run-1663",
        EVIDENCE_MEMBER: "engineer-4",
        EVIDENCE_STAGE: "ready",
      },
    );

    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      schemaVersion: 1,
      run: "run-1663",
      member: "engineer-4",
      stage: "ready",
    });
  });

  test("rejects unsafe run, member, and stage identities", () => {
    for (const values of [
      { EVIDENCE_RUN: "../run", EVIDENCE_MEMBER: "leader", EVIDENCE_STAGE: "ready" },
      { EVIDENCE_RUN: "run-1663", EVIDENCE_MEMBER: "engineer-7", EVIDENCE_STAGE: "ready" },
      { EVIDENCE_RUN: "run-1663", EVIDENCE_MEMBER: "leader", EVIDENCE_STAGE: "unknown" },
    ]) {
      const result = runLib(
        'member_readiness_payload "$EVIDENCE_RUN" "$EVIDENCE_MEMBER" "$EVIDENCE_STAGE"',
        values,
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toBe("");
    }
  });

  test("accepts only the canonical payload", () => {
    const canonical =
      '{"schemaVersion":1,"run":"run-1663","member":"engineer-4","stage":"checked-out"}';
    const result = runLib(
      'member_readiness_payload_matches "$EVIDENCE_RAW" run-1663 engineer-4 checked-out',
      { EVIDENCE_RAW: canonical },
    );
    expect(result.exitCode, result.stderr).toBe(0);
  });

  test("rejects stale, partial, wrong-stage, and extended payloads", () => {
    const invalidPayloads = [
      '{"schemaVersion":1,"run":"old-run","member":"engineer-4","stage":"ready"}',
      '{"schemaVersion":1,"run":"run-1663","member":"engineer-4"}',
      '{"schemaVersion":1,"run":"run-1663","member":"engineer-4","stage":"registered"}',
      '{"schemaVersion":1,"run":"run-1663","member":"engineer-4","stage":"ready","extra":true}',
    ];
    for (const payload of invalidPayloads) {
      const result = runLib(
        'member_readiness_payload_matches "$EVIDENCE_RAW" run-1663 engineer-4 ready',
        { EVIDENCE_RAW: payload },
      );
      expect(result.exitCode).not.toBe(0);
    }
  });
});
