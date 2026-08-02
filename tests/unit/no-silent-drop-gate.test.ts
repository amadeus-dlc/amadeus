// covers: subcommand:no-silent-drop:check, subcommand:no-silent-drop:census-evidence
// size: small
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { scanSourceForTest } from "../no-silent-drop/ast-scan.ts";
import { captureSnapshot, resultExitCode, runGate } from "../no-silent-drop/engine.ts";
import {
  addedFindings,
  assertShrinkOnly,
  parseBaseline,
  parseExemptions,
  validateApproval,
} from "../no-silent-drop/ledger.ts";
import {
  type ApprovalDoc,
  type BaselineDoc,
  type Finding,
  findingFingerprint,
  InfraFailure,
} from "../no-silent-drop/model.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function scan(source: string): Finding[] {
  return scanSourceForTest("fixture.ts", source, REPO_ROOT);
}

function baseline(fingerprints: readonly string[]): BaselineDoc {
  return {
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: { revision: "r", censusDigest: "c", approvalDigest: "a" },
    entries: fingerprints.map((fingerprint) => ({
      fingerprint,
      ruleId: "NSD001",
      file: "a.ts",
      reason: "legacy finding",
      issues: ["#1979"],
    })),
  };
}

describe("no-silent-drop AST rules", () => {
  test("NSD001 detects an empty catch block", () => {
    expect(scan("try { work(); } catch (error) {}").map((finding) => finding.ruleId)).toEqual(["NSD001"]);
  });

  test("NSD002 detects a log-only catch block", () => {
    expect(scan("try { work(); } catch (error) { console.warn(error); }").map((finding) => finding.ruleId)).toEqual(["NSD002"]);
  });

  test("a catch that returns or rethrows is not a finding", () => {
    expect(scan("function f() { try { work(); } catch (error) { throw error; } }")).toEqual([]);
    expect(scan("function f() { try { work(); } catch (error) { return failure(error); } }")).toEqual([]);
  });

  test("an intentional-drop marker with a reason suppresses the adjacent shape", () => {
    expect(scan("// intentional-drop: best-effort cleanup\ntry { work(); } catch (error) {}")).toEqual([]);
    expect(scan("// intentional-drop:\ntry { work(); } catch (error) {}")).toHaveLength(1);
  });

  test("NSD003 detects a discarded declared Result/boolean and known transition result", () => {
    const source = `
      function decide(): boolean { return true; }
      decide();
      applyTransition(ports, context, snapshot, transition);
    `;
    expect(scan(source).map((finding) => finding.ruleId)).toEqual(["NSD003", "NSD003"]);
  });

  test("NSD003 does not flag void functions or inspected results", () => {
    const source = `
      function report(): void {}
      function decide(): boolean { return true; }
      report();
      const accepted = decide();
      if (decide()) report();
    `;
    expect(scan(source)).toEqual([]);
  });

  test("fingerprints survive unrelated line movement but distinguish duplicate occurrences", () => {
    expect(findingFingerprint("NSD001", "a.ts", "catch (e) {}", 0)).toBe(
      findingFingerprint("NSD001", "a.ts", "catch (e) {}", 0),
    );
    expect(findingFingerprint("NSD001", "a.ts", "catch (e) {}", 0)).not.toBe(
      findingFingerprint("NSD001", "a.ts", "catch (e) {}", 1),
    );
  });
});

describe("no-silent-drop ledger", () => {
  test("baseline parser rejects unknown schema and duplicate fingerprints", () => {
    expect(() => parseBaseline('{"schemaVersion":2}')).toThrow(InfraFailure);
    const duplicate = baseline(["same", "same"]);
    expect(() => parseBaseline(JSON.stringify(duplicate))).toThrow("duplicate fingerprint");
  });

  test("exemption parser requires a non-empty reason", () => {
    expect(() => parseExemptions('{"schemaVersion":1,"entries":[{"fingerprint":"x","reason":""}]}')).toThrow(
      "is invalid",
    );
  });

  test("ratchet allows removals and rejects additions or same-count replacements", () => {
    expect(() => assertShrinkOnly(baseline(["a"]), baseline(["a", "b"]))).not.toThrow();
    expect(() => assertShrinkOnly(baseline(["a", "c"]), baseline(["a", "b"]))).toThrow("addition/replacement");
  });

  test("new findings are exactly those absent from the baseline", () => {
    const findings = scan("try { a(); } catch (error) {}\ntry { b(); } catch (error) {}");
    expect(addedFindings(findings, baseline([findings[0]!.fingerprint]))).toEqual([findings[1]]);
  });

  test("approval is exact, duplicate-free, and rejects FP admission", () => {
    const findings = scan("try { a(); } catch (error) {}");
    const approval: ApprovalDoc = {
      schemaVersion: 1,
      censusDigest: "digest",
      entries: [{ fingerprint: findings[0]!.fingerprint, classification: "TP", reason: "confirmed", issues: ["#1979"] }],
    };
    expect(() => validateApproval(approval, findings, "digest")).not.toThrow();
    expect(() => validateApproval({ ...approval, entries: [{ ...approval.entries[0]!, classification: "FP" }] }, findings, "digest"))
      .toThrow("cannot enter the baseline");
  });
});

describe("no-silent-drop boundaries", () => {
  test("snapshot rejects a symlink in an authoritative scan root", () => {
    const root = mkdtempSync(join(tmpdir(), "nsd-snapshot-"));
    temporaryDirectories.push(root);
    for (const path of ["packages/framework/core", "packages/framework/harness", "scripts"]) {
      mkdirSync(join(root, path), { recursive: true });
      writeFileSync(join(root, path, "source.ts"), "export const value = 1;\n");
    }
    symlinkSync(join(root, "scripts", "source.ts"), join(root, "scripts", "alias.ts"));
    expect(() => captureSnapshot(root)).toThrow("contains a symlink");
  });

  test("real repository check emits the public pass envelope and exit 0", async () => {
    const result = await runGate("check", REPO_ROOT);
    expect(result).toEqual({ schemaVersion: 1, status: "pass", code: "NO_SILENT_DROP_OK", findings: [] });
    expect(resultExitCode(result)).toBe(0);
  });

  test("CLI writes one JSON document to stdout", () => {
    const result = spawnSync("bun", ["run", "no-silent-drop"], { cwd: REPO_ROOT, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toEqual({
      schemaVersion: 1,
      status: "pass",
      code: "NO_SILENT_DROP_OK",
      findings: [],
    });
  });
});
