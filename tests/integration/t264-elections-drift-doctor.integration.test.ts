// t264 — U4 doctor-drift-check real-FS tests (Bolt B4 space-record-catalog).
// Layer: integration (real tmp workspace — fs-tests-integration-first). Drives
// the in-process FS seam electionsRegistryDriftDoctorCheck against fixture
// elections registries + on-disk dirs, covering every finding branch: consistent
// (no drift), row→dir欠, dir→row欠, corrupt, readdir-fail, and absent.
//
// electionsRegistryDriftDoctorCheck is the in-process seam (handleDoctor is
// spawn-only — t83 header); testing it directly gives the added lines lcov
// coverage without a spawn (spawn-blindspot).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { electionsRegistryDriftDoctorCheck } from "../../packages/framework/core/tools/amadeus-utility.ts";

let proj = "";

beforeEach(() => {
  proj = mkdtempSync(join(tmpdir(), "amadeus-t264-"));
});

afterEach(() => {
  // Restore perms first so rmSync can clean a chmod-0300 elections dir.
  try {
    chmodSync(electionsRoot(), 0o755);
  } catch {
    /* best-effort — the dir only exists in some tests */
  }
  rmSync(proj, { recursive: true, force: true });
});

function electionsRoot(): string {
  return join(proj, "amadeus", "spaces", "default", "elections");
}

type Row = { electionId: string; dirName: string; createdAt: string; status: string };

// Write a registry + create the election directories named by `dirs`. The
// registry rows and the on-disk dirs are supplied independently so a test can
// inject drift (a row with no dir, or a dir with no row).
function seed(rows: Row[], dirs: string[]): void {
  const root = electionsRoot();
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "elections.json"), JSON.stringify(rows, null, 2), "utf-8");
  for (const d of dirs) mkdirSync(join(root, d), { recursive: true });
}

function row(electionId: string, dirName = electionId): Row {
  return { electionId, dirName, createdAt: "2026-07-22T00:00:00Z", status: "draft" };
}

// Probe whether chmod actually denies readdir on this platform (root and native
// Windows ignore the mode) — mirrors t221's enforcement probe.
function unreadableDirsEnforced(): boolean {
  if (process.platform === "win32") return false;
  const probe = mkdtempSync(join(tmpdir(), "amadeus-t264-probe-"));
  try {
    // 0o300 = -wx for owner: search (x) is kept so a known file inside is still
    // openable, but read (r) is removed so readdir is denied.
    chmodSync(probe, 0o300);
    try {
      readdirSync(probe);
      return false;
    } catch {
      return true;
    }
  } finally {
    try {
      chmodSync(probe, 0o755);
    } catch {
      /* best-effort */
    }
    rmSync(probe, { recursive: true, force: true });
  }
}

// Probe whether chmod 0o000 actually denies reading a file on this platform
// (root and native Windows ignore the mode) — mirrors t221's probe.
function unreadableFilesEnforced(): boolean {
  if (process.platform === "win32") return false;
  const probe = mkdtempSync(join(tmpdir(), "amadeus-t264-fprobe-"));
  const f = join(probe, "probe");
  try {
    writeFileSync(f, "x", "utf-8");
    chmodSync(f, 0o000);
    try {
      readFileSync(f, "utf-8");
      return false;
    } catch {
      return true;
    }
  } finally {
    try {
      chmodSync(f, 0o644);
    } catch {
      /* best-effort */
    }
    rmSync(probe, { recursive: true, force: true });
  }
}

describe("t264 electionsRegistryDriftDoctorCheck — real-FS finding branches", () => {
  test("consistent registry+dirs -> ALWAYS pass, no-drift label", () => {
    seed([row("260722-e-a"), row("260722-e-b")], ["260722-e-a", "260722-e-b"]);
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.pass).toBe(true);
    expect(r.label).toBe("elections registry: no drift (rows 2 / dirs 2)");
  });

  test("row whose dir is missing -> row→dir欠 1 with the electionId named", () => {
    // 260722-e-b has a row but no on-disk dir -> row→dir欠 names E-B's id.
    seed([row("260722-e-a"), row("260722-e-b")], ["260722-e-a"]);
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.pass).toBe(true);
    expect(r.label).toBe(
      "elections registry: rows 2 / dirs 1 / row→dir欠 1 [260722-e-b] / dir→row欠 0 []",
    );
  });

  test("extra dir with no row -> dir→row欠 1 with the dir named", () => {
    seed([row("260722-e-a")], ["260722-e-a", "260722-stray"]);
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.pass).toBe(true);
    expect(r.label).toBe(
      "elections registry: rows 1 / dirs 2 / row→dir欠 0 [] / dir→row欠 1 [260722-stray]",
    );
  });

  test("elections.json itself is not counted as a dir→row欠", () => {
    // The registry file lives inside root but is a FILE, so it must be excluded
    // from the directory enumeration — no phantom dir→row drift.
    seed([row("260722-e-a")], ["260722-e-a"]);
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.label).toBe("elections registry: no drift (rows 1 / dirs 1)");
    expect(r.label).not.toContain("elections.json");
  });

  test("corrupt registry (bad row) -> 要調査, still pass", () => {
    const root = electionsRoot();
    mkdirSync(root, { recursive: true });
    // A row missing the required createdAt field fails the 4-field check.
    writeFileSync(
      join(root, "elections.json"),
      JSON.stringify([{ electionId: "E-A", dirName: "260722-e-a", status: "draft" }]),
      "utf-8",
    );
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.pass).toBe(true);
    expect(r.label).toBe("elections registry: elections.json corrupt — 要調査");
  });

  test("non-JSON registry text -> corrupt 要調査", () => {
    const root = electionsRoot();
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, "elections.json"), "{ not json", "utf-8");
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.label).toBe("elections registry: elections.json corrupt — 要調査");
  });

  test("unreadable elections.json (read throws) -> corrupt 要調査", () => {
    const root = electionsRoot();
    mkdirSync(root, { recursive: true });
    const registry = join(root, "elections.json");
    writeFileSync(registry, JSON.stringify([row("260722-e-a")]), "utf-8");
    if (!unreadableFilesEnforced()) return; // root / Windows: denial unobservable.
    // chmod the FILE (not the dir) to 0o000 so existsSync still sees it but
    // readFileSync throws -> the read-failure corrupt branch (distinct from the
    // parse/bad-row corrupt branch covered above).
    chmodSync(registry, 0o000);
    try {
      const r = electionsRegistryDriftDoctorCheck(proj);
      expect(r.pass).toBe(true);
      expect(r.label).toBe("elections registry: elections.json corrupt — 要調査");
    } finally {
      chmodSync(registry, 0o644);
    }
  });

  test("absent registry -> 移行前, pass", () => {
    // No elections/ dir at all.
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.pass).toBe(true);
    expect(r.label).toBe("elections registry: elections.json 不在(移行前)");
  });

  test("readdir failure (unreadable elections/ dir) -> readdir 失敗 要調査", () => {
    seed([row("260722-e-a")], ["260722-e-a"]);
    if (!unreadableDirsEnforced()) return; // root / Windows: denial unobservable.
    // 0o300 keeps search (x) so readFileSync(elections.json) still succeeds, but
    // removes read (r) so readdirSync(root) throws -> readdir-fail branch.
    chmodSync(electionsRoot(), 0o300);
    const r = electionsRegistryDriftDoctorCheck(proj);
    expect(r.pass).toBe(true);
    expect(r.label).toBe("elections registry: elections/ readdir 失敗 — 要調査");
  });
});
