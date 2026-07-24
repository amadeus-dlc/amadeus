import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("run-model-check CLI", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  test("returns exit 2 and machine-readable stderr for a parse failure", () => {
    const result = Bun.spawnSync([
      "bun",
      "scripts/formal-verif/run-model-check.ts",
      "--model",
      "missing.tla",
    ], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const lines = result.stderr.toString().trim().split("\n");
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(lines[0]!)).toMatchObject({
      schema: "amadeus.run-model-check.v1",
      runId: null,
      outcome: "HARNESS_ERROR",
      exitCode: 2,
      errorCode: "MISSING_ARG",
    });
    expect(lines[1]).toBe("run-model-check: HARNESS_ERROR (MISSING_ARG)");
  });

  for (const expected of [
    { outcome: "NOT_DETECTED", exitCode: 0 },
    { outcome: "DETECTED", exitCode: 1 },
  ] as const) {
    test(`returns exit ${expected.exitCode} and a manifest-last ${expected.outcome} result`, () => {
      const root = mkdtempSync(join(tmpdir(), "run-model-check-e2e-"));
      roots.push(root);
      const workspace = join(root, "workspace");
      mkdirSync(workspace);
      const model = join(workspace, "FormalElection.tla");
      const cfg = join(workspace, "FormalElection.cfg");
      const out = join(root, "out");
      cpSync("specs/tla/FormalElection.tla", model);
      cpSync("specs/tla/FormalElection.cfg", cfg);
      const result = Bun.spawnSync([
        "bun",
        "tests/formal-verif/support/run-model-check-cli-fixture.ts",
        "--model", model,
        "--cfg", cfg,
        "--out", out,
        "--provider", "docker",
      ], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          AMADEUS_MODEL_CHECK_FIXTURE_OUTCOME: expected.outcome === "DETECTED"
            ? "DETECTED"
            : "NOT_DETECTED",
        },
        stdout: "pipe",
        stderr: "pipe",
      });
      const manifest = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
      expect(result.exitCode).toBe(expected.exitCode);
      expect(JSON.parse(result.stderr.toString().trim().split("\n")[0]!)).toMatchObject({
        outcome: expected.outcome,
        exitCode: expected.exitCode,
      });
      expect(manifest).toMatchObject({
        schema: "amadeus.model-check-manifest.v1",
        outcome: expected.outcome,
        exitCode: expected.exitCode,
      });
      for (const artifact of manifest.artifacts) {
        const bytes = readFileSync(join(out, artifact.path));
        expect({
          bytes: bytes.byteLength,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        }).toEqual({ bytes: artifact.bytes, sha256: artifact.sha256 });
      }
    });
  }

  for (const failure of ["REALPATH", "CACHE_MKDIR", "PUBLISHER_THROW_ONCE"] as const) {
    test(`keeps ${failure} filesystem failure on the exit-2 CLI contract`, () => {
      const root = mkdtempSync(join(tmpdir(), "run-model-check-failure-e2e-"));
      roots.push(root);
      const workspace = join(root, "workspace");
      mkdirSync(workspace);
      const model = join(workspace, "FormalElection.tla");
      const cfg = join(workspace, "FormalElection.cfg");
      const out = join(root, "out");
      cpSync("specs/tla/FormalElection.tla", model);
      cpSync("specs/tla/FormalElection.cfg", cfg);
      const result = Bun.spawnSync([
        "bun",
        "tests/formal-verif/support/run-model-check-cli-fixture.ts",
        "--model", model,
        "--cfg", cfg,
        "--out", out,
        "--provider", "docker",
      ], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          AMADEUS_MODEL_CHECK_FIXTURE_FAILURE: failure,
        },
        stdout: "pipe",
        stderr: "pipe",
      });
      const terminal = JSON.parse(result.stderr.toString().trim().split("\n")[0]!);
      expect(result.exitCode).toBe(2);
      expect(terminal).toMatchObject({
        schema: "amadeus.run-model-check.v1",
        outcome: "HARNESS_ERROR",
        exitCode: 2,
      });
      if (failure === "REALPATH") {
        expect(terminal).toMatchObject({ runId: null, errorCode: "OUT_PATH" });
        expect(existsSync(`${out}.failure-00000000-0000-4000-8000-000000000001`)).toBe(false);
      } else {
        const failureDir = `${out}.failure-00000000-0000-4000-8000-000000000001`;
        const manifest = JSON.parse(readFileSync(join(failureDir, "manifest.json"), "utf8"));
        expect(manifest).toMatchObject({
          schema: "amadeus.model-check-manifest.v1",
          outcome: "HARNESS_ERROR",
          exitCode: 2,
          partial: true,
          errorCode: failure === "CACHE_MKDIR" ? "CACHE_RESERVATION" : "WRITE",
        });
      }
    });
  }
});
